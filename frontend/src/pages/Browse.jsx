import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
	ChevronDown,
	Filter,
	Play,
	Plus,
	Search,
	SlidersHorizontal,
	Star,
} from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Background from "../components/Background";
import { getAllAnime, getAllGenres } from "../data/animeData";
import "./AnimeVault.css";

const PAGE_SIZE = 15;

const sortOptions = [
	{ value: "popularity", label: "Popularity" },
	{ value: "score", label: "Score" },
	{ value: "recent", label: "Recently Added" },
];

const formatOptions = ["TV", "Movie", "OVA"];
const statusOptions = [
	{ value: "Airing", label: "Airing" },
	{ value: "Finished", label: "Finished" },
];

function getAnimeFormat(anime) {
	return anime?.type || "TV";
}

function getAnimeStatusBucket(anime) {
	return anime?.status === "Ongoing" ? "Airing" : "Finished";
}

function getAnimeSeasonLabel(anime) {
	return anime?.season || "Unknown";
}

function normalize(value) {
	return String(value || "").toLowerCase();
}

function loadWatchlist() {
	try {
		return JSON.parse(localStorage.getItem("watchlist") || "[]");
	} catch (error) {
		return [];
	}
}

function addToWatchlist(anime) {
	const current = loadWatchlist();
	if (current.includes(anime.id)) return current;
	const next = [...current, anime.id];
	localStorage.setItem("watchlist", JSON.stringify(next));
	return next;
}

function FilterGroup({ title, icon: Icon, open, onToggle, children, count }) {
	return (
		<section className="filter-group">
			<button className="filter-group-trigger" type="button" onClick={onToggle} aria-expanded={open}>
				<span className="filter-group-title">
					<Icon size={16} />
					{title}
				</span>
				<span className="filter-group-meta">
					{count > 0 && <span className="filter-group-count">{count}</span>}
					<ChevronDown size={16} className={`filter-group-chevron ${open ? "open" : ""}`} />
				</span>
			</button>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						className="filter-group-panel"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.24, ease: "easeOut" }}
					>
						<div className="filter-group-panel-inner">{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}

function AnimeCard({ anime, onOpen, onAdd }) {
	return (
		<motion.article
			layout
			className="browse-card manga-card"
			initial={{ opacity: 0, y: 18 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 14 }}
			transition={{ duration: 0.28, ease: "easeOut" }}
			onClick={() => onOpen(anime)}
		>
			<div className="browse-card-poster-wrap manga-card-cover-wrap">
				<span className="manga-chapter-pill">Ch. {anime.latestChapter ?? anime.episodes}</span>
				<div className="manga-rating-top">
					<Star size={12} fill="currentColor" /> {anime.rating.toFixed(1)}
				</div>
				<img className="browse-card-poster manga-card-cover" src={anime.img} alt={anime.name} loading="lazy" />
				<div className="manga-rating-strip" />
				<div className="manga-progress" style={{ width: `${Math.round((anime.readProgress || 0) * 100)}%` }} />
				<div className="browse-card-glow" />
				<button
					type="button"
					className="browse-card-add"
					onClick={(event) => {
						event.stopPropagation();
						onAdd(anime);
					}}
					aria-label={`Quick add ${anime.name} to watchlist`}
				>
					<Plus size={14} />
				</button>
				<div className="browse-card-play">
					<Play size={18} fill="currentColor" />
				</div>
			</div>

				<div className="browse-card-body manga-card-copy">
					<h3>{anime.name}</h3>
					<p>{anime.studio}</p>
					<div className="browse-card-meta">
						<span>{anime.episodes} eps</span>
						<span>{anime.year}</span>
					</div>
				</div>
		</motion.article>
	);
}

export default function Browse() {
	const navigate = useNavigate();
	const allAnime = useMemo(() => getAllAnime(), []);
	const allGenres = useMemo(() => getAllGenres(), []);
	const allStudios = useMemo(() => Array.from(new Set(allAnime.map((anime) => anime.studio))).sort(), [allAnime]);
	const allSeasons = useMemo(() => Array.from(new Set(allAnime.map((anime) => getAnimeSeasonLabel(anime)))).sort(), [allAnime]);
	const allYears = useMemo(() => Array.from(new Set(allAnime.map((anime) => anime.year))).sort((a, b) => b - a), [allAnime]);

	const [activeGenres, setActiveGenres] = useState([]);
	const [activeFormats, setActiveFormats] = useState([]);
	const [activeStatuses, setActiveStatuses] = useState([]);
	const [activeSeasons, setActiveSeasons] = useState([]);
	const [activeYears, setActiveYears] = useState([]);
	const [activeStudios, setActiveStudios] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [sortBy, setSortBy] = useState("popularity");
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const [openGroups, setOpenGroups] = useState({
		genres: true,
		format: true,
		status: true,
		season: true,
		year: true,
		studio: true,
	});
	const [watchlist, setWatchlist] = useState(() => loadWatchlist());
	const [filtersOpen, setFiltersOpen] = useState(false);
	const sentinelRef = useRef(null);

	const filteredAnime = useMemo(() => {
		const query = normalize(searchTerm);

		const filtered = allAnime.filter((anime) => {
			const matchesQuery =
				!query ||
				normalize(anime.name).includes(query) ||
				normalize(anime.studio).includes(query) ||
				anime.genres.some((genre) => normalize(genre).includes(query));

			const matchesGenres = activeGenres.length === 0 || activeGenres.some((genre) => anime.genres.includes(genre));
			const matchesFormats = activeFormats.length === 0 || activeFormats.includes(getAnimeFormat(anime));
			const matchesStatuses = activeStatuses.length === 0 || activeStatuses.includes(getAnimeStatusBucket(anime));
			const matchesSeasons = activeSeasons.length === 0 || activeSeasons.includes(getAnimeSeasonLabel(anime));
			const matchesYears = activeYears.length === 0 || activeYears.includes(String(anime.year));
			const matchesStudios = activeStudios.length === 0 || activeStudios.includes(anime.studio);

			return (
				matchesQuery &&
				matchesGenres &&
				matchesFormats &&
				matchesStatuses &&
				matchesSeasons &&
				matchesYears &&
				matchesStudios
			);
		});

		const sorted = [...filtered].sort((left, right) => {
			if (sortBy === "score") return right.rating - left.rating;
			if (sortBy === "recent") return right.id - left.id;
			return right.votes - left.votes;
		});

		return sorted;
	}, [allAnime, activeFormats, activeGenres, activeSeasons, activeStatuses, activeStudios, activeYears, searchTerm, sortBy]);

	useEffect(() => {
		setVisibleCount(PAGE_SIZE);
	}, [searchTerm, activeGenres, activeFormats, activeStatuses, activeSeasons, activeYears, activeStudios, sortBy]);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					setVisibleCount((current) => Math.min(current + PAGE_SIZE, filteredAnime.length));
				}
			},
			{ rootMargin: "240px" }
		);

		if (sentinelRef.current) observer.observe(sentinelRef.current);

		return () => observer.disconnect();
	}, [filteredAnime.length]);

	useEffect(() => {
		setVisibleCount((current) => Math.min(current, filteredAnime.length));
	}, [filteredAnime.length]);

	const visibleAnime = filteredAnime.slice(0, visibleCount);

	const selectedPills = [
		...activeGenres.map((value) => ({ key: `genre:${value}`, label: value, remove: () => setActiveGenres((current) => current.filter((item) => item !== value)) })),
		...activeFormats.map((value) => ({ key: `format:${value}`, label: value, remove: () => setActiveFormats((current) => current.filter((item) => item !== value)) })),
		...activeStatuses.map((value) => ({ key: `status:${value}`, label: value, remove: () => setActiveStatuses((current) => current.filter((item) => item !== value)) })),
		...activeSeasons.map((value) => ({ key: `season:${value}`, label: value, remove: () => setActiveSeasons((current) => current.filter((item) => item !== value)) })),
		...activeYears.map((value) => ({ key: `year:${value}`, label: value, remove: () => setActiveYears((current) => current.filter((item) => item !== value)) })),
		...activeStudios.map((value) => ({ key: `studio:${value}`, label: value, remove: () => setActiveStudios((current) => current.filter((item) => item !== value)) })),
	];

	const toggleGroup = (key) => {
		setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
	};

	const toggleValue = (setter, value) => {
		setter((current) =>
			current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
		);
	};

	const handleQuickAdd = (anime) => {
		setWatchlist(addToWatchlist(anime));
	};

	const activeCount =
		activeGenres.length +
		activeFormats.length +
		activeStatuses.length +
		activeSeasons.length +
		activeYears.length +
		activeStudios.length;

	return (
		<AnimatedPage>
			<div className={`browse-page ${filtersOpen ? "filters-open" : ""}`}>
				<Background />
				<Header />

				<main className="browse-shell">
					<div className="filters-overlay" onClick={() => setFiltersOpen(false)} />

					<div className="browse-layout">
						<aside className="filter-lab">
							<div className="filter-lab-head">
								<div>
									<span className="filter-lab-kicker">Glassmorphism</span>
									<h2>The Filter Lab</h2>
								</div>
								<Filter size={18} />
							</div>

							<FilterGroup
								title="Genres"
								icon={SlidersHorizontal}
								open={openGroups.genres}
								onToggle={() => toggleGroup("genres")}
								count={activeGenres.length}
							>
								<div className="filter-chip-grid">
									{allGenres.map((genre) => (
										<button
											key={genre}
											type="button"
											className={`filter-chip ${activeGenres.includes(genre) ? "active" : ""}`}
											onClick={() => toggleValue(setActiveGenres, genre)}
										>
											{genre}
										</button>
									))}
								</div>
							</FilterGroup>

							<FilterGroup
								title="Format"
								icon={SlidersHorizontal}
								open={openGroups.format}
								onToggle={() => toggleGroup("format")}
								count={activeFormats.length}
							>
								<div className="filter-chip-grid">
									{formatOptions.map((format) => (
										<button
											key={format}
											type="button"
											className={`filter-chip ${activeFormats.includes(format) ? "active" : ""}`}
											onClick={() => toggleValue(setActiveFormats, format)}
										>
											{format}
										</button>
									))}
								</div>
							</FilterGroup>

							<FilterGroup
								title="Status"
								icon={SlidersHorizontal}
								open={openGroups.status}
								onToggle={() => toggleGroup("status")}
								count={activeStatuses.length}
							>
								<div className="filter-chip-grid">
									{statusOptions.map((status) => (
										<button
											key={status.value}
											type="button"
											className={`filter-chip ${activeStatuses.includes(status.value) ? "active" : ""}`}
											onClick={() => toggleValue(setActiveStatuses, status.value)}
										>
											{status.label}
										</button>
									))}
								</div>
							</FilterGroup>

							<FilterGroup
								title="Season"
								icon={SlidersHorizontal}
								open={openGroups.season}
								onToggle={() => toggleGroup("season")}
								count={activeSeasons.length}
							>
								<div className="filter-chip-grid filter-chip-grid--scroll">
									{allSeasons.map((season) => (
										<button
											key={season}
											type="button"
											className={`filter-chip ${activeSeasons.includes(season) ? "active" : ""}`}
											onClick={() => toggleValue(setActiveSeasons, season)}
										>
											{season}
										</button>
									))}
								</div>
							</FilterGroup>

							<FilterGroup
								title="Year"
								icon={SlidersHorizontal}
								open={openGroups.year}
								onToggle={() => toggleGroup("year")}
								count={activeYears.length}
							>
								<div className="filter-chip-grid filter-chip-grid--scroll">
									{allYears.map((year) => (
										<button
											key={year}
											type="button"
											className={`filter-chip ${activeYears.includes(String(year)) ? "active" : ""}`}
											onClick={() => toggleValue(setActiveYears, String(year))}
										>
											{year}
										</button>
									))}
								</div>
							</FilterGroup>

							<FilterGroup
								title="Studio"
								icon={SlidersHorizontal}
								open={openGroups.studio}
								onToggle={() => toggleGroup("studio")}
								count={activeStudios.length}
							>
								<div className="filter-chip-grid">
									{allStudios.map((studio) => (
										<button
											key={studio}
											type="button"
											className={`filter-chip ${activeStudios.includes(studio) ? "active" : ""}`}
											onClick={() => toggleValue(setActiveStudios, studio)}
										>
											{studio}
										</button>
									))}
								</div>
							</FilterGroup>
						</aside>

						<section className="browse-results">
							<div className="control-bar">
							<button className="filter-toggle" type="button" onClick={() => setFiltersOpen(true)} aria-label="Open filters">
								<Filter size={18} />
							</button>
								<div className="control-search">
									<Search size={16} />
									<input
										value={searchTerm}
										onChange={(event) => setSearchTerm(event.target.value)}
										placeholder="Search within results"
										aria-label="Search within results"
									/>
								</div>

								<div className="control-sort">
									<label htmlFor="browse-sort">Sort</label>
									<select id="browse-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
										{sortOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								</div>
							</div>

							{selectedPills.length > 0 && (
								<div className="active-pill-row">
									{selectedPills.map((pill) => (
										<button key={pill.key} type="button" className="active-pill" onClick={pill.remove}>
											{pill.label}
											<span>×</span>
										</button>
									))}
									<button
										type="button"
										className="active-pill active-pill--clear"
										onClick={() => {
											setActiveGenres([]);
											setActiveFormats([]);
											setActiveStatuses([]);
											setActiveSeasons([]);
											setActiveYears([]);
											setActiveStudios([]);
										}}
									>
										Clear all
									</button>
								</div>
							)}

							<div className="results-summary">
								<span>{filteredAnime.length} results</span>
								<span>{watchlist.length} in watchlist</span>
								<span>{activeCount} filters active</span>
							</div>

											<motion.div
												layout
												key={`${searchTerm}-${sortBy}-${activeCount}`}
												className="anime-grid"
												initial="hidden"
												animate="show"
												variants={{
													hidden: {},
													show: { transition: { staggerChildren: 0.05 } },
												}}
											>
								<AnimatePresence mode="popLayout">
									{visibleAnime.map((anime) => (
										<AnimeCard
											key={anime.id}
											anime={anime}
											onOpen={(item) => navigate(`/anime/${item.id}`)}
											onAdd={handleQuickAdd}
										/>
									))}
								</AnimatePresence>
							</motion.div>

							{visibleCount < filteredAnime.length && <div ref={sentinelRef} className="browse-sentinel" />}

							{filteredAnime.length === 0 && (
								<div className="browse-empty">
									<h3>No matches</h3>
									<p>Try clearing a filter or widening your search term.</p>
								</div>
							)}
						</section>
					</div>
				</main>

				<Footer />
			</div>
		</AnimatedPage>
	);
}
