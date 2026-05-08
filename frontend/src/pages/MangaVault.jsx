import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Search, X, List, LayoutGrid, ChevronDown } from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Background from "../components/Background";
import "./MangaVault.css";

const MANGA_LIBRARY = [
	{
		id: 1,
		title: "One Piece",
		author: "Eiichiro Oda",
		cover: "/beta-1.jpg",
		demographic: "Shonen",
		status: "Ongoing",
		chapters: 1120,
		latestChapter: 1080,
		rating: 9.5,
		genres: ["Adventure", "Comedy", "Fantasy"],
		synopsis: "Luffy and the Straw Hat crew sail the Grand Line pursuing the greatest treasure while empires clash.",
		readProgress: 0.71,
		readingMode: "Right-to-Left",
	},
	{
		id: 2,
		title: "Berserk",
		author: "Kentaro Miura",
		cover: "/beta-2.jpg",
		demographic: "Seinen",
		status: "Hiatus",
		chapters: 376,
		latestChapter: 376,
		rating: 9.6,
		genres: ["Dark Fantasy", "Action", "Drama"],
		synopsis: "A lone mercenary battles fate, monsters, and kings in a brutal medieval world soaked in tragedy.",
		readProgress: 0.38,
		readingMode: "Right-to-Left",
	},
	{
		id: 3,
		title: "Jujutsu Kaisen",
		author: "Gege Akutami",
		cover: "/beta-3.jpg",
		demographic: "Shonen",
		status: "Completed",
		chapters: 271,
		latestChapter: 271,
		rating: 9.0,
		genres: ["Action", "Supernatural", "Horror"],
		synopsis: "Sorcerers and curses collide in a modern city where power has a brutal cost.",
		readProgress: 0.86,
		readingMode: "Right-to-Left",
	},
	{
		id: 4,
		title: "Vinland Saga",
		author: "Makoto Yukimura",
		cover: "/beta-1.jpg",
		demographic: "Seinen",
		status: "Ongoing",
		chapters: 214,
		latestChapter: 206,
		rating: 9.2,
		genres: ["Historical", "Drama", "Action"],
		synopsis: "A war-torn Viking era story about revenge, redemption, and the true meaning of freedom.",
		readProgress: 0.52,
		readingMode: "Right-to-Left",
	},
	{
		id: 5,
		title: "Blue Lock",
		author: "Muneyuki Kaneshiro",
		cover: "/beta-2.jpg",
		demographic: "Shonen",
		status: "Ongoing",
		chapters: 290,
		latestChapter: 257,
		rating: 8.9,
		genres: ["Sports", "Psychological", "Drama"],
		synopsis: "Japan's future strikers fight in a ruthless football program engineered to create the ultimate egoist.",
		readProgress: 0.48,
		readingMode: "Right-to-Left",
	},
	{
		id: 6,
		title: "Monster",
		author: "Naoki Urasawa",
		cover: "/beta-3.jpg",
		demographic: "Seinen",
		status: "Completed",
		chapters: 162,
		latestChapter: 162,
		rating: 9.3,
		genres: ["Thriller", "Mystery", "Drama"],
		synopsis: "A brilliant surgeon chases a serial killer whose life he once saved, unraveling a conspiracy of identity.",
		readProgress: 0.2,
		readingMode: "Right-to-Left",
	},
	{
		id: 7,
		title: "Skip and Loafer",
		author: "Misaki Takamatsu",
		cover: "/beta-1.jpg",
		demographic: "Josei",
		status: "Ongoing",
		chapters: 67,
		latestChapter: 62,
		rating: 8.7,
		genres: ["Romance", "Slice of Life", "School"],
		synopsis: "A small-town honors student navigates Tokyo high school life with warmth, awkwardness, and sincerity.",
		readProgress: 0.12,
		readingMode: "Right-to-Left",
	},
	{
		id: 8,
		title: "Nana",
		author: "Ai Yazawa",
		cover: "/beta-2.jpg",
		demographic: "Josei",
		status: "Hiatus",
		chapters: 84,
		latestChapter: 84,
		rating: 9.1,
		genres: ["Drama", "Music", "Romance"],
		synopsis: "Two women named Nana build a fragile friendship while chasing music, love, and identity in Tokyo.",
		readProgress: 0.63,
		readingMode: "Right-to-Left",
	},
	{
		id: 9,
		title: "Yotsuba&!",
		author: "Kiyohiko Azuma",
		cover: "/beta-3.jpg",
		demographic: "Shonen",
		status: "Ongoing",
		chapters: 116,
		latestChapter: 113,
		rating: 8.8,
		genres: ["Comedy", "Slice of Life"],
		synopsis: "A curious child transforms everyday moments into adventure, wonder, and chaos.",
		readProgress: 0.33,
		readingMode: "Right-to-Left",
	},
	{
		id: 10,
		title: "Kingdom",
		author: "Yasuhisa Hara",
		cover: "/beta-1.jpg",
		demographic: "Seinen",
		status: "Ongoing",
		chapters: 816,
		latestChapter: 802,
		rating: 9.4,
		genres: ["Historical", "War", "Action"],
		synopsis: "An orphan soldier rises through ancient China's wars to become a legendary general.",
		readProgress: 0.58,
		readingMode: "Right-to-Left",
	},
	{
		id: 11,
		title: "Fruits Basket",
		author: "Natsuki Takaya",
		cover: "/beta-2.jpg",
		demographic: "Shojo",
		status: "Completed",
		chapters: 136,
		latestChapter: 136,
		rating: 8.9,
		genres: ["Romance", "Drama", "Fantasy"],
		synopsis: "A compassionate girl becomes involved with a family cursed to transform into zodiac spirits.",
		readProgress: 0.4,
		readingMode: "Right-to-Left",
	},
	{
		id: 12,
		title: "Oyasumi Punpun",
		author: "Inio Asano",
		cover: "/beta-3.jpg",
		demographic: "Seinen",
		status: "Completed",
		chapters: 147,
		latestChapter: 147,
		rating: 9.0,
		genres: ["Psychological", "Drama", "Slice of Life"],
		synopsis: "A surreal coming-of-age story tracing one boy's descent through trauma, longing, and alienation.",
		readProgress: 0.15,
		readingMode: "Right-to-Left",
	},
];

const TOP_WEEKLY = [
	{ title: "One Piece", chapter: 1080 },
	{ title: "Kingdom", chapter: 802 },
	{ title: "Blue Lock", chapter: 257 },
	{ title: "Vinland Saga", chapter: 206 },
	{ title: "Jujutsu Kaisen", chapter: 271 },
	{ title: "Skip and Loafer", chapter: 62 },
];

const chapterRanges = [
	{ key: "0-100", label: "0-100" },
	{ key: "101-300", label: "101-300" },
	{ key: "301-700", label: "301-700" },
	{ key: "701+", label: "701+" },
];

const demographics = ["Shonen", "Seinen", "Shojo", "Josei"];
const statuses = ["Ongoing", "Hiatus", "Completed"];

function chapterRangeMatch(chapters, selectedRange) {
	if (!selectedRange) return true;
	if (selectedRange === "0-100") return chapters <= 100;
	if (selectedRange === "101-300") return chapters >= 101 && chapters <= 300;
	if (selectedRange === "301-700") return chapters >= 301 && chapters <= 700;
	return chapters >= 701;
}

function FilterBlock({ title, open, onToggle, children }) {
	return (
		<section className="manga-filter-block">
			<button type="button" className="manga-filter-head" onClick={onToggle} aria-expanded={open}>
				<span>{title}</span>
				<ChevronDown size={15} className={`manga-filter-chevron ${open ? "open" : ""}`} />
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						className="manga-filter-content"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.22, ease: "easeOut" }}
					>
						<div>{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}

function MangaGridCard({ manga, onPreview, isLoggedIn }) {
	const longPressRef = useRef(null);

	const startLongPress = () => {
		longPressRef.current = window.setTimeout(() => onPreview(manga), 420);
	};

	const cancelLongPress = () => {
		if (longPressRef.current) {
			window.clearTimeout(longPressRef.current);
			longPressRef.current = null;
		}
	};

	return (
		<motion.article
			className="manga-card"
			layout
			initial={{ opacity: 0, y: 40 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.92 }}
			transition={{ duration: 0.28, ease: "easeOut" }}
			onDoubleClick={() => onPreview(manga)}
			onMouseDown={startLongPress}
			onMouseUp={cancelLongPress}
			onMouseLeave={cancelLongPress}
			onTouchStart={startLongPress}
			onTouchEnd={cancelLongPress}
		>
			<div className="manga-card-cover-wrap">
				<img src={manga.cover} alt={manga.title} className="manga-card-cover" />
				<span className="manga-chapter-pill">Ch. {manga.latestChapter}</span>
				<div className="manga-rating-strip">
					<span>⭐ {manga.rating.toFixed(1)}</span>
				</div>
				{isLoggedIn && <div className="manga-progress" style={{ width: `${Math.round(manga.readProgress * 100)}%` }} />}
			</div>
			<div className="manga-card-copy">
				<h3>{manga.title}</h3>
				<p>{manga.author}</p>
			</div>
		</motion.article>
	);
}

function MangaListCard({ manga, onPreview, isLoggedIn }) {
	return (
		<motion.article
			className="manga-list-row"
			layout
			initial={{ opacity: 0, y: 40 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.94 }}
			transition={{ duration: 0.28, ease: "easeOut" }}
			onDoubleClick={() => onPreview(manga)}
		>
			<img src={manga.cover} alt={manga.title} className="manga-list-cover" />
			<div className="manga-list-copy">
				<h3>{manga.title}</h3>
				<p>{manga.synopsis}</p>
			</div>
			<div className="manga-list-meta">
				<span>Author: {manga.author}</span>
				<span>Latest: Ch. {manga.latestChapter}</span>
				<span>Rating: ⭐ {manga.rating.toFixed(1)}</span>
			</div>
			{isLoggedIn && <div className="manga-list-progress" style={{ width: `${Math.round(manga.readProgress * 100)}%` }} />}
		</motion.article>
	);
}

export default function MangaVault() {
	const [demographicFilter, setDemographicFilter] = useState([]);
	const [statusFilter, setStatusFilter] = useState([]);
	const [readingModeFilter, setReadingModeFilter] = useState(true);
	const [chapterFilter, setChapterFilter] = useState("");
	const [search, setSearch] = useState("");
	const [viewMode, setViewMode] = useState("grid");
	const [previewTarget, setPreviewTarget] = useState(null);
	const [heroOffset, setHeroOffset] = useState(0);
	const [openFilterGroups, setOpenFilterGroups] = useState({
		demographics: true,
		status: true,
		reading: true,
		chapters: true,
	});

	const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

	useEffect(() => {
		const onScroll = () => setHeroOffset(window.scrollY * 0.25);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const filteredManga = useMemo(() => {
		const query = search.trim().toLowerCase();
		return MANGA_LIBRARY.filter((manga) => {
			const queryMatch =
				query.length === 0 ||
				manga.title.toLowerCase().includes(query) ||
				manga.author.toLowerCase().includes(query) ||
				manga.genres.some((genre) => genre.toLowerCase().includes(query));

			const demographicMatch =
				demographicFilter.length === 0 || demographicFilter.includes(manga.demographic);

			const statusMatch = statusFilter.length === 0 || statusFilter.includes(manga.status);

			const readingMatch = !readingModeFilter || manga.readingMode === "Right-to-Left";

			const chapterMatch = chapterRangeMatch(manga.chapters, chapterFilter);

			return queryMatch && demographicMatch && statusMatch && readingMatch && chapterMatch;
		});
	}, [chapterFilter, demographicFilter, readingModeFilter, search, statusFilter]);

	const filterKey = `${demographicFilter.join("|")}-${statusFilter.join("|")}-${readingModeFilter}-${chapterFilter}-${search}-${viewMode}`;

	const heroPanelStyle = {
		"--manga-hero-1": `url(${process.env.PUBLIC_URL}/beta-1.jpg)`,
		"--manga-hero-2": `url(${process.env.PUBLIC_URL}/beta-2.jpg)`,
		"--manga-hero-3": `url(${process.env.PUBLIC_URL}/beta-3.jpg)`,
	};

	const toggleArrayValue = (value, setter) => {
		setter((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
	};

	const toggleFilterGroup = (group) => {
		setOpenFilterGroups((current) => ({ ...current, [group]: !current[group] }));
	};

	return (
		<AnimatedPage>
			<div className="manga-vault-page">
				<Background />
				<Header />

				<main className="manga-vault-shell">
					<section className="manga-hero" style={heroPanelStyle}>
						<div className="manga-hero-parallax" style={{ transform: `translateY(${heroOffset}px)` }} />
						<div className="manga-hero-overlay" />
						<div className="manga-hero-copy">
							<span>Manga of the Week</span>
							<h1>One Piece</h1>
							<p>The Egghead incident reaches peak chaos as alliances fracture and a new era starts at sea.</p>
						</div>
					</section>

					<section className="manga-main-layout">
						<aside className="manga-filters">
							<h2>The Filters</h2>

							<FilterBlock
								title="Demographics"
								open={openFilterGroups.demographics}
								onToggle={() => toggleFilterGroup("demographics")}
							>
								<div className="manga-filter-pill-wrap">
									{demographics.map((demographic) => (
										<button
											key={demographic}
											type="button"
											className={`manga-filter-pill ${demographicFilter.includes(demographic) ? "active" : ""}`}
											onClick={() => toggleArrayValue(demographic, setDemographicFilter)}
										>
											{demographic}
										</button>
									))}
								</div>
							</FilterBlock>

							<FilterBlock
								title="Status"
								open={openFilterGroups.status}
								onToggle={() => toggleFilterGroup("status")}
							>
								<div className="manga-filter-pill-wrap">
									{statuses.map((status) => (
										<button
											key={status}
											type="button"
											className={`manga-filter-pill ${statusFilter.includes(status) ? "active" : ""}`}
											onClick={() => toggleArrayValue(status, setStatusFilter)}
										>
											{status}
										</button>
									))}
								</div>
							</FilterBlock>

							<FilterBlock
								title="Reading Mode"
								open={openFilterGroups.reading}
								onToggle={() => toggleFilterGroup("reading")}
							>
								<label className="manga-mode-toggle">
									<input
										type="checkbox"
										checked={readingModeFilter}
										onChange={(event) => setReadingModeFilter(event.target.checked)}
									/>
									<span>Right-to-Left</span>
								</label>
							</FilterBlock>

							<FilterBlock
								title="Chapters Count"
								open={openFilterGroups.chapters}
								onToggle={() => toggleFilterGroup("chapters")}
							>
								<div className="manga-filter-pill-wrap">
									{chapterRanges.map((range) => (
										<button
											key={range.key}
											type="button"
											className={`manga-filter-pill ${chapterFilter === range.key ? "active" : ""}`}
											onClick={() => setChapterFilter((current) => (current === range.key ? "" : range.key))}
										>
											{range.label}
										</button>
									))}
								</div>
							</FilterBlock>
						</aside>

						<section className="manga-archive">
							<div className="manga-archive-controls">
								<div className="manga-search-input">
									<Search size={16} />
									<input
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										placeholder="Search manga, author, genre"
										aria-label="Search manga"
									/>
								</div>

								<div className="manga-view-switcher">
									<button
										type="button"
										className={viewMode === "grid" ? "active" : ""}
										onClick={() => setViewMode("grid")}
									>
										<LayoutGrid size={15} /> Grid View
									</button>
									<button
										type="button"
										className={viewMode === "list" ? "active" : ""}
										onClick={() => setViewMode("list")}
									>
										<List size={15} /> List View
									</button>
								</div>
							</div>

							<AnimatePresence mode="wait">
								<motion.div
									key={filterKey}
									className={viewMode === "grid" ? "manga-grid" : "manga-list"}
									initial={{ opacity: 0, scale: 0.97 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 1.03 }}
									transition={{ duration: 0.22, ease: "easeOut" }}
									variants={{
										hidden: {},
										show: {
											transition: {
												staggerChildren: 0.1,
											},
										},
									}}
									initial="hidden"
									animate="show"
								>
									<AnimatePresence mode="popLayout">
										{filteredManga.map((manga) =>
											viewMode === "grid" ? (
												<MangaGridCard
													key={manga.id}
													manga={manga}
													onPreview={setPreviewTarget}
													isLoggedIn={isLoggedIn}
												/>
											) : (
												<MangaListCard
													key={manga.id}
													manga={manga}
													onPreview={setPreviewTarget}
													isLoggedIn={isLoggedIn}
												/>
											)
										)}
									</AnimatePresence>
								</motion.div>
							</AnimatePresence>
						</section>

						<aside className="weekly-scroll-sidebar">
							<h3>Top Weekly Chapters</h3>
							<div className="weekly-scroll-list">
								{TOP_WEEKLY.map((entry) => (
									<article key={entry.title} className="weekly-scroll-item">
										<div>
											<strong>{entry.title}</strong>
											<span>Ch. {entry.chapter}</span>
										</div>
										<BookOpen size={14} />
									</article>
								))}
							</div>
						</aside>
					</section>
				</main>

				<Footer />

				<AnimatePresence>
					{previewTarget && (
						<>
							<motion.button
								type="button"
								className="manga-preview-backdrop"
								onClick={() => setPreviewTarget(null)}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
							/>
							<motion.aside
								className="manga-preview-drawer"
								initial={{ x: "100%" }}
								animate={{ x: 0 }}
								exit={{ x: "100%" }}
								transition={{ duration: 0.3, ease: "easeOut" }}
							>
								<button
									type="button"
									className="manga-preview-close"
									onClick={() => setPreviewTarget(null)}
								>
									<X size={16} />
								</button>

								<img src={previewTarget.cover} alt={previewTarget.title} className="manga-preview-cover" />
								<h2>{previewTarget.title}</h2>
								<p>{previewTarget.synopsis}</p>
								<div className="manga-preview-genres">
									{previewTarget.genres.map((genre) => (
										<span key={genre}>{genre}</span>
									))}
								</div>
								<button type="button" className="manga-preview-primary">
									Read Chapter 1
								</button>
							</motion.aside>
						</>
					)}
				</AnimatePresence>
			</div>
		</AnimatedPage>
	);
}
