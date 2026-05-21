import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Calendar,
  ChevronRight,
  Clock,
  Crown,
  Eye,
  Film,
  Flame,
  Heart,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Sword,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Skeleton from "../components/Skeleton";
import LiveRooms from "../components/LiveRooms";
import Categories from "../components/Categories";
import Background from "../components/Background";
import AnimePreviewPanel from "../components/AnimePreviewPanel";
import { fetchTopAnime, fetchSeasonalAnime, fetchAnimeGenres, fetchAnimeById } from "../services/anilistApi";
import { fetchRandomQuote } from "../services/communityApi";
import { loadWatchlist } from "../services/storage";
import { getCurrentLevel, getStreak } from "../services/progression";
import "./Home.css";

function useAnimeData() {
  const [spotlight, setSpotlight] = useState(null);
  const [, setSpotlightIndex] = useState(0);
  const [spotlightQueue, setSpotlightQueue] = useState([]);
  const [topTen, setTopTen] = useState([]);
  const [trendingList, setTrendingList] = useState([]);
  const [seasonPicks, setSeasonPicks] = useState([]);
  const [upcomingList, setUpcomingList] = useState([]);
  const [popularList, setPopularList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [topAir, topAll, seasonal, genres, upcoming, popular] = await Promise.allSettled([
          fetchTopAnime(1, "airing"),
          fetchTopAnime(1, ""),
          fetchSeasonalAnime(),
          fetchAnimeGenres(),
          fetchTopAnime(1, "upcoming"),
          fetchTopAnime(1, "bypopularity"),
        ]);

        if (topAir.status === "fulfilled" && topAir.value.data.length > 0) {
          const queue = topAir.value.data.slice(0, 5);
          setSpotlightQueue(queue);
          setSpotlight(queue[0]);
        }

        if (topAll.status === "fulfilled") {
          setTopTen(topAll.value.data.slice(0, 10));
          setTrendingList(topAll.value.data.slice(10, 25));
        }

        if (seasonal.status === "fulfilled") {
          setSeasonPicks(seasonal.value.data.slice(0, 20));
        }

        if (genres.status === "fulfilled") {
          setCategories(genres.value);
        }

        if (upcoming.status === "fulfilled") {
          setUpcomingList(upcoming.value.data.slice(0, 12));
        }

        if (popular.status === "fulfilled") {
          setPopularList(popular.value.data.slice(0, 20));
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (spotlightQueue.length < 2) return;
    const interval = setInterval(() => {
      setSpotlightIndex(i => {
        const next = (i + 1) % spotlightQueue.length;
        setSpotlight(spotlightQueue[next]);
        return next;
      });
    }, 20000);
    return () => clearInterval(interval);
  }, [spotlightQueue]);

  const refreshTrending = useCallback(async () => {
    try {
      const r = await fetchTopAnime(1, "");
      if (r.data.length) {
        setTrendingList(r.data.slice(10, 25));
      }
    } catch {}
  }, []);

  return { spotlight, topTen, trendingList, seasonPicks, upcomingList, popularList, categories, loading, refreshTrending };
}

// ─── Sub-components ────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.25 },
  },
};

const cardSlideUp = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
};

function StatsBar() {
  const stats = useMemo(() => {
    const wl = loadWatchlist();
    const history = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    const ratings = Object.keys(JSON.parse(localStorage.getItem("userRatings") || "{}")).length;
    const level = getCurrentLevel();
    const streak = getStreak();
    const items = [
      { icon: Bookmark, label: "Watchlist", value: wl.length, cls: "bookmark" },
      { icon: Eye, label: "Episodes Watched", value: history.length, cls: "eye" },
      { icon: Star, label: "Anime Rated", value: ratings, cls: "trophy" },
      { icon: Zap, label: "Level", value: level, cls: "level" },
    ];
    if (streak.current > 0) {
      items.push({ icon: TrendingUp, label: "Day Streak", value: streak.current, cls: "streak" });
    }
    return items;
  }, []);

  return (
    <motion.div
      className="home-stats-bar"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {stats.map((s) => (
        <motion.div
          key={s.label}
          className="home-stat-card"
          variants={cardSlideUp}
            whileHover={{ boxShadow: "0 16px 48px rgba(139,92,246,0.12)", transition: { type: "spring", stiffness: 300 } }}
        >
          <div className={`home-stat-icon ${s.cls}`}>
            <s.icon size={18} />
          </div>
          <div className="home-stat-info">
            <span className="home-stat-value">{s.value}</span>
            <span className="home-stat-label">{s.label}</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function SpotlightQuote({ quote, onRefresh, loading }) {
  if (!quote) return null;
  return (
    <motion.div
      className="spotlight-quote"
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.6 }}
    >
      <p className="spotlight-quote-text">"{quote.quote}"</p>
      <div className="spotlight-quote-attribution">
        <span className="spotlight-quote-char">{quote.character}</span>
        <span className="spotlight-quote-dash">—</span>
        <span className="spotlight-quote-anime">{quote.anime}</span>
        <button className="spotlight-quote-refresh" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={12} />
        </button>
      </div>
    </motion.div>
  );
}

function ContinueWatchingRow({ onCardClick }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    const recent = stored.slice(0, 6);
    Promise.allSettled(
      recent.map(async item => {
        try {
          const data = await fetchAnimeById(item.animeId);
          if (data) {
            return {
              animeId: item.animeId,
              episode: item.episode,
              timestamp: item.timestamp,
              id: data.id,
              name: data.name,
              img: data.img,
              rating: data.rating,
              episodes: data.episodes,
            };
          }
        } catch {}
        return null;
      })
    ).then(results => {
      setItems(results.map(r => r.status === "fulfilled" ? r.value : null).filter(Boolean));
    });
  }, []);

  if (items.length === 0) return (
    <section className="home-section">
      <SectionHeader icon={Clock} title="Continue Watching" subtitle="Pick up where you left off" />
      <div className="home-empty-state">
        <div className="home-empty-icon-wrap">
          <Play size={24} />
        </div>
        <p>No watch history yet — start watching to see your progress here.</p>
        <button className="home-empty-action" onClick={() => navigate("/browse/anime")}>
          Browse Anime
        </button>
      </div>
    </section>
  );

  return (
    <section className="home-section">
      <SectionHeader icon={Clock} title="Continue Watching" subtitle="Pick up where you left off" />
      <motion.div
        className="upcoming-grid"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {items.map((item) => (
          <motion.div
            key={`${item.animeId}-${item.episode}`}
            className="upcoming-card"
            onClick={() => onCardClick?.({ ...item, id: item.animeId })}
            variants={cardSlideUp}
            whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
          >
            <div className="upcoming-card-img">
              <img src={item.img} alt={item.name} loading="lazy" />
              <div className="upcoming-card-badge">
                <Star size={10} fill="#ffd700" color="#ffd700" /> {item.rating?.toFixed(1)}
              </div>
            </div>
            <div className="upcoming-card-body">
              <h3>{item.name}</h3>
              <div className="upcoming-card-meta">
                <span className="upcoming-card-type">{item.episode ? `Ep ${item.episode}` : "Continue"}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="section-title">
      <motion.div
        initial={{ opacity: 0, x: -28 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="title-with-icon"
      >
        <Icon color="#8b5cf6" size={24} />
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </motion.div>
      {action && (
        <motion.button
          className="section-action"
          onClick={action}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          View all <ChevronRight size={14} />
        </motion.button>
      )}
    </div>
  );
}

function SeasonGrid({ animeList, onCardClick }) {
  const navigate = useNavigate();

  if (!animeList?.length) return null;

  return (
    <section className="home-section">
      <SectionHeader icon={Sparkles} title="Season Highlights" subtitle="Top picks this season" action={() => navigate("/browse/anime")} />
      <motion.div
        className="upcoming-grid"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {animeList.map((anime) => (
          <motion.div
            key={anime.id}
            className="upcoming-card"
            onClick={() => onCardClick?.(anime)}
            variants={cardSlideUp}
            whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
          >
            <div className="upcoming-card-img">
              <img src={anime.img} alt={anime.name} loading="lazy" />
              <div className="upcoming-card-badge">
                {anime.rating && <><Star size={10} fill="#ffd700" color="#ffd700" /> {anime.rating?.toFixed(1)}</>}
              </div>
            </div>
            <div className="upcoming-card-body">
              <h3>{anime.name}</h3>
              <div className="upcoming-card-meta">
                {anime.genres?.[0] && <span className="upcoming-card-tag">{anime.genres[0]}</span>}
                <span className="upcoming-card-type">{anime.status || "TV"}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function TopTenRow({ animeList, onCardClick }) {
  if (!animeList?.length) return null;
  return (
    <section className="home-section">
      <SectionHeader icon={Crown} title="Top 10 Anime" subtitle="Highest rated of all time" />
      <motion.div
        className="upcoming-grid"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {animeList.map((anime) => (
          <motion.div
            key={anime.id}
            className="upcoming-card"
            onClick={() => onCardClick?.(anime)}
            variants={cardSlideUp}
            whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
          >
            <div className="upcoming-card-img">
              <img src={anime.img} alt={anime.name} loading="lazy" />
              <div className="upcoming-card-badge">
                {anime.rating && <><Star size={10} fill="#ffd700" color="#ffd700" /> {anime.rating?.toFixed(1)}</>}
              </div>
            </div>
            <div className="upcoming-card-body">
              <h3>{anime.name}</h3>
              <div className="upcoming-card-meta">
                {anime.genres?.[0] && <span className="upcoming-card-tag">{anime.genres[0]}</span>}
                <span className="upcoming-card-type">{anime.status || "TV"}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function GenreBar({ genres }) {
  const navigate = useNavigate();
  if (!genres?.length) return null;
  const genreIcons = {
    Action: Sword, Adventure: Layers, Comedy: Sparkles, Drama: Heart,
    Fantasy: Crown, Horror: Flame, Romance: Heart, "Sci-Fi": Zap,
    Sports: Trophy, Mystery: Eye, "Slice of Life": Film,
  };
  return (
    <div className="genre-bar">
      <div className="genre-bar-inner">
        {genres.slice(0, 14).map(g => {
          const Icon = genreIcons[g] || Film;
          return (
            <button key={g} className="genre-bar-chip" onClick={() => navigate(`/browse/anime`)}>
              <Icon size={14} />
              <span>{g}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingSection({ animeList, onCardClick }) {
  const navigate = useNavigate();
  if (!animeList?.length) return null;
  return (
    <section className="home-section">
      <SectionHeader icon={Calendar} title="Coming Soon" subtitle="Upcoming anime to watch out for" action={() => navigate("/browse/anime")} />
      <motion.div
        className="upcoming-grid"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {animeList.map((anime) => (
          <motion.div
            key={anime.id}
            className="upcoming-card"
            onClick={() => onCardClick?.(anime)}
            variants={cardSlideUp}
            whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
          >
            <div className="upcoming-card-img">
              <img src={anime.img} alt={anime.name} loading="lazy" />
              <div className="upcoming-card-badge">
                <Calendar size={10} /> {anime.season || "TBA"}
              </div>
            </div>
            <div className="upcoming-card-body">
              <h3>{anime.name}</h3>
              <div className="upcoming-card-meta">
                {anime.genres?.[0] && <span className="upcoming-card-tag">{anime.genres[0]}</span>}
                <span className="upcoming-card-type">{anime.type || "TV"}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

const heroStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 200, damping: 24 },
  },
};

function HeroSpotlight({ spotlight, quote, onQuoteRefresh, quoteLoading, onNavigate }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  if (!spotlight) return null;

  return (
    <section className="home-hero">
      <div className="home-hero-bg">
        {spotlight.trailerUrl ? (
          <div className="home-hero-video-wrap">
            <iframe
              src={`${spotlight.trailerUrl}${spotlight.trailerUrl.includes("?") ? "&" : "?"}autoplay=1&mute=1&controls=0&loop=1&playlist=${spotlight.trailerUrl.split("/").pop().split("?" )[0]}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=0`}
              title={spotlight.name}
              allow="autoplay; encrypted-media"
              className="home-hero-video"
              loading="lazy"
            />
            <div className="home-hero-video-shield" />
          </div>
        ) : (
          <img
            src={spotlight.img}
            alt=""
            className="home-hero-img"
            onLoad={() => setImgLoaded(true)}
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
        )}
        <div className="home-hero-gradient" />
        <div className="home-hero-gradient-side" />
      </div>

      <motion.div
        className="home-hero-content"
        variants={heroStagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="spotlight-kicker" variants={heroItem}>
          <Sparkles size={14} /> Featured
        </motion.div>
        <motion.h1 variants={heroItem}>{spotlight.name}</motion.h1>
        <motion.p variants={heroItem} className="home-hero-desc">{spotlight.synopsis?.slice(0, 280)}</motion.p>
        <motion.div variants={heroItem} className="home-hero-meta">
          {spotlight.rating && <span><Star size={12} fill="#ffd700" color="#ffd700" /> {spotlight.rating.toFixed(1)}</span>}
          <span>{spotlight.year || "?"}</span>
          <span>{spotlight.episodes} EP</span>
          <span>{spotlight.status}</span>
        </motion.div>
        <motion.div variants={heroItem} className="home-hero-actions">
          <button className="hero-btn-primary" onClick={onNavigate}>
            <Play size={16} fill="currentColor" /> Watch Now
          </button>
          <button className="hero-btn-secondary" onClick={onNavigate}>
            <Plus size={16} /> Details
          </button>
        </motion.div>
        <SpotlightQuote quote={quote} onRefresh={onQuoteRefresh} loading={quoteLoading} />
      </motion.div>

      <motion.div
        className="home-hero-sidecard"
        variants={heroItem}
        initial="hidden"
        animate="visible"
      >
        <div className="hero-sidecard-img">
          <img src={spotlight.img} alt={spotlight.name} />
        </div>
        <div className="hero-sidecard-info">
          <span className="hero-sidecard-label">NOW TRENDING</span>
          <strong className="hero-sidecard-title">{spotlight.name}</strong>
          <span className="hero-sidecard-rating">
            <Star size={11} fill="#ffd700" color="#ffd700" /> {spotlight.rating?.toFixed(1) || "?"}
          </span>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Main Home component ────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const { spotlight, topTen, trendingList, seasonPicks, upcomingList, popularList, categories, loading, refreshTrending } = useAnimeData();
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState(null);

  const handleCardClick = (anime) => {
    setSelectedAnime(prev => prev?.id === anime.id ? null : anime);
  };

  useEffect(() => {
    fetchRandomQuote().then(setQuote).catch(() => {});
  }, []);

  const refreshQuote = useCallback(() => {
    setQuoteLoading(true);
    fetchRandomQuote().then(q => { setQuote(q); setQuoteLoading(false); }).catch(() => setQuoteLoading(false));
  }, []);

  if (loading) {
    return (
      <AnimatedPage>
        <div className="home-container">
          <Background />
          <div className="home-loading">
            {[1, 2, 3].map(i => (
              <div key={i} className="home-loading-section">
                <Skeleton variant="title" width="180px" />
                <div className="home-loading-grid">
                  {[1, 2, 3, 4].map(j => (
                    <Skeleton key={j} variant="card" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <HeroSpotlight
        spotlight={spotlight}
        quote={quote}
        onQuoteRefresh={refreshQuote}
        quoteLoading={quoteLoading}
        onNavigate={() => spotlight && navigate(`/anime/${spotlight.id}`)}
      />

      <div className="home-container">
        <Background />

        <StatsBar />

        <GenreBar genres={categories} />

        <ContinueWatchingRow onCardClick={handleCardClick} />

        {topTen.length > 0 && (
          <TopTenRow animeList={topTen} onCardClick={handleCardClick} />
        )}

        {trendingList.length > 0 && (
          <section className="home-section">
            <SectionHeader
              icon={TrendingUp}
              title="Trending Now"
              subtitle="Most watched anime this week"
              action={refreshTrending}
            />
            <motion.div
              className="upcoming-grid"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              {trendingList.map((anime) => (
                <motion.div
                  key={anime.id}
                  className="upcoming-card"
                  onClick={() => handleCardClick(anime)}
                  variants={cardSlideUp}
                  whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
                >
                  <div className="upcoming-card-img">
                    <img src={anime.img} alt={anime.name} loading="lazy" />
                    <div className="upcoming-card-badge">
                      {anime.rating && <><Star size={10} fill="#ffd700" color="#ffd700" /> {anime.rating?.toFixed(1)}</>}
                    </div>
                  </div>
                  <div className="upcoming-card-body">
                    <h3>{anime.name}</h3>
                    <div className="upcoming-card-meta">
                      {anime.genres?.[0] && <span className="upcoming-card-tag">{anime.genres[0]}</span>}
                      <span className="upcoming-card-type">{anime.status || "TV"}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {seasonPicks.length > 0 && (
          <SeasonGrid animeList={seasonPicks} onCardClick={handleCardClick} />
        )}

        {upcomingList.length > 0 && (
          <UpcomingSection animeList={upcomingList} onCardClick={handleCardClick} />
        )}

        {popularList.length > 0 && (
          <section className="home-section">
            <SectionHeader
              icon={Flame}
              title="Most Popular"
              subtitle="All-time fan favorites everyone's watching"
              action={() => navigate("/browse/anime")}
            />
            <motion.div
              className="upcoming-grid"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              {popularList.map((anime) => (
                <motion.div
                  key={anime.id}
                  className="upcoming-card"
                  onClick={() => handleCardClick(anime)}
                  variants={cardSlideUp}
                  whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
                >
                  <div className="upcoming-card-img">
                    <img src={anime.img} alt={anime.name} loading="lazy" />
                    <div className="upcoming-card-badge">
                      {anime.rating && <><Star size={10} fill="#ffd700" color="#ffd700" /> {anime.rating?.toFixed(1)}</>}
                    </div>
                  </div>
                  <div className="upcoming-card-body">
                    <h3>{anime.name}</h3>
                    <div className="upcoming-card-meta">
                      {anime.genres?.[0] && <span className="upcoming-card-tag">{anime.genres[0]}</span>}
                      <span className="upcoming-card-type">{anime.status || "TV"}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        <AnimatePresence>
          {selectedAnime && (
            <AnimePreviewPanel
              anime={selectedAnime}
              onClose={() => setSelectedAnime(null)}
              onPlay={() => { setSelectedAnime(null); navigate(`/anime/${selectedAnime.id}`); }}
              onWatchlist={() => {}}
              onLike={() => {}}
            />
          )}
        </AnimatePresence>

        <div className="section-divider">
          <span>Community</span>
        </div>

        <section className="home-section" id="live-rooms">
          <LiveRooms />
        </section>

        {categories.length > 0 && (
          <Categories categories={categories} />
        )}

        <div className="section-divider" style={{ marginTop: 0 }}>
          <span>Join the movement</span>
        </div>

        <motion.div
          className="home-cta-banner"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
        >
          <div className="home-cta-glow" />
          <div className="home-cta-content">
            <Users size={24} />
            <div>
              <strong>Join the Community</strong>
              <span>Discuss episodes, share edits, vote in arena battles</span>
            </div>
            <button className="home-cta-btn" onClick={() => navigate("/watch-together")}>
              Explore <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
