// Home page - main landing page for AnimeWch
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  RefreshCw,
  Sparkles,
  Star,
  Sword,
  TrendingUp,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Skeleton from "../components/Skeleton";
import Categories from "../components/Categories";
import TopUpcoming from "../components/TopUpcoming";
import TopTrending from "../components/TopTrending";
import Footer from "../components/Footer";
import { fetchTopAnime, fetchSeasonalAnime, fetchAnimeGenres, fetchAnimeById } from "../services/anilistApi";
import { fetchRandomQuote } from "../services/communityApi";
import { loadWatchlist, loadWatchHistory, loadRatings, removeFromWatchHistory } from "../services/storage";
import usePrefetchAnime from "../hooks/usePrefetchAnime";
import useDocumentTitle from "../hooks/useDocumentTitle";
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
        const [topAir, highRated, seasonal, genres, upcoming, popular, trending] = await Promise.allSettled([
          fetchTopAnime(1, "airing"),
          fetchTopAnime(1, ""),
          fetchSeasonalAnime(),
          fetchAnimeGenres(),
          fetchTopAnime(1, "upcoming"),
          fetchTopAnime(1, "bypopularity"),
          fetchTopAnime(1, "trending"),
        ]);

        if (topAir.status === "fulfilled" && topAir.value.data.length > 0) {
          const queue = topAir.value.data.slice(0, 5);
          setSpotlightQueue(queue);
          setSpotlight(queue[0]);
        }

        const usedIds = new Set();

        if (highRated.status === "fulfilled") {
          const list = highRated.value.data.slice(0, 10);
          list.forEach(a => usedIds.add(a.id));
          setTopTen(list);
        }

        if (trending.status === "fulfilled") {
          const list = trending.value.data.filter(a => !usedIds.has(a.id)).slice(0, 15);
          list.forEach(a => usedIds.add(a.id));
          setTrendingList(list);
        }

        if (seasonal.status === "fulfilled") {
          const list = seasonal.value.data.filter(a => !usedIds.has(a.id)).slice(0, 20);
          list.forEach(a => usedIds.add(a.id));
          setSeasonPicks(list);
        }

        if (genres.status === "fulfilled") {
          setCategories(genres.value);
        }

        if (upcoming.status === "fulfilled") {
          const list = upcoming.value.data.filter(a => !usedIds.has(a.id)).slice(0, 12);
          list.forEach(a => usedIds.add(a.id));
          setUpcomingList(list);
        }

        if (popular.status === "fulfilled") {
          const list = popular.value.data.filter(a => !usedIds.has(a.id)).slice(0, 20);
          setPopularList(list);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (spotlightQueue.length < 2) return;
    let interval;
    const start = () => {
      interval = setInterval(() => {
        setSpotlightIndex(i => {
          const next = (i + 1) % spotlightQueue.length;
          setSpotlight(spotlightQueue[next]);
          return next;
        });
      }, 20000);
    };
    const onVisibility = () => {
      clearInterval(interval);
      if (!document.hidden) start();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, [spotlightQueue]);

  const refreshTrending = useCallback(async () => {
    try {
      const r = await fetchTopAnime(1, "trending");
      if (r.data.length) {
        const used = new Set(topTen.map(a => a.id));
        setTrendingList(r.data.filter(a => !used.has(a.id)).slice(0, 15));
      }
    } catch {}
  }, [topTen]);

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
  const [stats, setStats] = useState([]);

  useEffect(() => {
    function compute() {
      const wl = loadWatchlist();
      const history = loadWatchHistory();
      const ratings = Object.keys(loadRatings()).length;
      const items = [
        { icon: Bookmark, label: "Watchlist", value: wl.length, cls: "bookmark" },
        { icon: Eye, label: "Episodes Watched", value: history.length, cls: "eye" },
        { icon: Star, label: "Anime Rated", value: ratings, cls: "trophy" },
      ];
      setStats(items);
    }
    compute();
    window.addEventListener("storage", compute);
    window.addEventListener("profile-data-changed", compute);
    window.addEventListener("watchlist-updated", compute);
    return () => {
      window.removeEventListener("storage", compute);
      window.removeEventListener("profile-data-changed", compute);
      window.removeEventListener("watchlist-updated", compute);
    };
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
            whileHover={{ boxShadow: "0 16px 48px rgba(255,255,255,0.12)", transition: { type: "spring", stiffness: 300 } }}
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


// Seconds -> "m:ss" (e.g. 112 -> "1:52")
function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function ContinueWatchingRow() {
  const navigate = useNavigate();
  const prefetch = usePrefetchAnime();
  const [items, setItems] = useState([]);

  const handleRemove = (item) => {
    removeFromWatchHistory(item.timestamp);
    setItems((prev) =>
      prev.filter((i) => !(i.animeId === item.animeId && i.episode === item.episode))
    );
  };

  useEffect(() => {
    const stored = loadWatchHistory();
    const seen = new Set();
    const recent = stored.filter(item => {
      if (seen.has(item.animeId)) return false;
      seen.add(item.animeId);
      return true;
    }).slice(0, 6);
    Promise.allSettled(
      recent.map(async item => {
        try {
          const data = await fetchAnimeById(item.animeId);
          if (data) {
            return {
              animeId: item.animeId,
              episode: item.episode,
              position: item.position || 0,
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
      <div className="cw-header">
        <h2 className="cw-header-title">Continue Watching</h2>
        <button className="cw-see-all" onClick={() => navigate("/history")}>
          See All →
        </button>
      </div>
      <div className="cw-scroll-wrap">
       <div className="cw-scroll">
        {items.map((item) => {
          const total = item.duration || 24 * 60; // fallback: 24:00
          const current = Math.min(item.position || 0, total);
          const pct = total ? Math.min(100, (current / total) * 100) : 0;
          return (
            <div
              key={`${item.animeId}-${item.episode}`}
              className="cw-card"
              onClick={() => navigate(`/anime/${item.animeId}?ep=${item.episode}`)}
              onMouseEnter={() => prefetch.onMouseEnter(item.animeId)}
              onMouseLeave={prefetch.onMouseLeave}
            >
              <div className="cw-card-img">
                <img src={item.img} alt={item.name} loading="lazy" decoding="async" />
                <span className="cw-card-ep">EP {item.episode}</span>
                <button
                  className="cw-card-close"
                  aria-label="Remove from Continue Watching"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item);
                  }}
                >
                  <X size={14} />
                </button>
                <div className="cw-card-overlay">
                  <span className="cw-card-play">
                    <Play size={18} fill="#fff" />
                  </span>
                </div>
                <div className="cw-card-fade" />
              </div>
              <div className="cw-card-body">
                <div className="cw-card-time">
                  <span className="cw-card-current">{formatClock(current)}</span>
                  <span className="cw-card-sep">/</span>
                  <span className="cw-card-total">{formatClock(total)}</span>
                </div>
                <div className="cw-card-bar">
                  <div className="cw-card-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
       </div>
      </div>
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
        <Icon color="#ffffff" size={24} />
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </motion.div>
      {action && (
        <motion.button
          className="section-action"
          onClick={action}
          aria-label="Browse all"
          title="Browse all"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.94 }}
        >
          <ChevronRight size={18} />
        </motion.button>
      )}
    </div>
  );
}

function SeasonGrid({ animeList }) {
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
            onClick={() => navigate(`/anime/${anime.id}/info`)}
            variants={cardSlideUp}
            whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
          >
            <div className="upcoming-card-img">
              <img src={anime.img} alt={anime.name} loading="lazy" decoding="async" />
              <div className="upcoming-card-badge">
                {anime.rating && <><Star size={10} fill="#ffffff" color="#ffffff" /> {anime.rating?.toFixed(1)}</>}
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

function TopTenRow({ animeList }) {
  const navigate = useNavigate();
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
            onClick={() => navigate(`/anime/${anime.id}/info`)}
            variants={cardSlideUp}
            whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
          >
            <div className="upcoming-card-img">
              <img src={anime.img} alt={anime.name} loading="lazy" decoding="async" />
              <div className="upcoming-card-badge">
                {anime.rating && <><Star size={10} fill="#ffffff" color="#ffffff" /> {anime.rating?.toFixed(1)}</>}
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

function UpcomingSection({ animeList }) {
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
            onClick={() => navigate(`/anime/${anime.id}/info`)}
            variants={cardSlideUp}
            whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
          >
            <div className="upcoming-card-img">
              <img src={anime.img} alt={anime.name} loading="lazy" decoding="async" />
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

function HeroSpotlight({ spotlight, quote, onQuoteRefresh, quoteLoading, onWatch, onDetails }) {
  const [muted, setMuted] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
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
        <motion.h1 className="home-hero-title" variants={heroItem}>{spotlight.name}</motion.h1>
        <motion.p variants={heroItem} className="home-hero-desc">{(spotlight.synopsis || '').replace(/<[^>]*>/g, '').slice(0, 280)}</motion.p>
        <motion.div variants={heroItem} className="hero-pills">
          {spotlight.rating && (
            <span className="hero-pill hero-pill--match">
              <Star size={10} fill="currentColor" /> {spotlight.rating.toFixed(1)}% Match
            </span>
          )}
          <span className="hero-pill hero-pill--meta">{spotlight.episodes || '??'} EP</span>
          <span className="hero-pill hero-pill--meta">{spotlight.year || spotlight.season || '?'}</span>
        </motion.div>
        <motion.div variants={heroItem} className="hero-actions">
          {spotlight.status === "NOT_YET_RELEASED" || spotlight.status === "CANCELLED" ? (
            <span className="hero-btn-primary" style={{ opacity: 0.5, cursor: 'default' }}>
              {spotlight.status === "NOT_YET_RELEASED" ? "Coming Soon" : "Cancelled"}
            </span>
          ) : (
            <button className="hero-btn-main" onClick={onWatch}>
              <Play size={16} fill="currentColor" /> Watch Now
            </button>
          )}
          <button className="hero-btn-icon" onClick={() => setInWatchlist(v => !v)} aria-label="Add to watchlist">
            <Bookmark size={16} fill={inWatchlist ? 'currentColor' : 'none'} />
          </button>
          <button className="hero-btn-icon" onClick={() => setMuted(v => !v)} aria-label="Toggle audio">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </motion.div>
        <SpotlightQuote quote={quote} onRefresh={onQuoteRefresh} loading={quoteLoading} />
      </motion.div>

      <motion.div
        className="glow-card-sidecard"
        variants={heroItem}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="home-hero-sidecard">
          <div className="hero-sidecard-img">
            <img src={spotlight.img} alt={spotlight.name} />
          </div>
          <div className="hero-sidecard-info">
            <span className="hero-sidecard-label">NOW TRENDING</span>
            <strong className="hero-sidecard-title">{spotlight.name}</strong>
            <span className="hero-sidecard-rating">
              <Star size={11} fill="#ffffff" color="#ffffff" /> {spotlight.rating?.toFixed(1) || "?"}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Main Home component ────────────────────────────────

export default function Home() {
  useDocumentTitle("Home");
  const navigate = useNavigate();
  const { spotlight, topTen, trendingList, seasonPicks, upcomingList, popularList, categories, loading, refreshTrending } = useAnimeData();
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

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
        onWatch={() => spotlight && navigate(`/anime/${spotlight.id}?ep=1`)}
        onDetails={() => spotlight && navigate(`/anime/${spotlight.id}/info`)}
      />

      <div className="home-container">
       <div className="main-layout-container">
        <div className="main-content-left">
        <StatsBar />

        <GenreBar genres={categories} />

        <ContinueWatchingRow />

        <TopUpcoming />

        {topTen.length > 0 && (
          <TopTenRow animeList={topTen} />
        )}

        {trendingList.length > 0 && (
          <section className="home-section">
            <SectionHeader
              icon={TrendingUp}
              title="Trending Now"
              subtitle="Most watched anime this week"
              action={refreshTrending}
            />
            <div className="upcoming-grid">
              {trendingList.map((anime) => (
                <div
                  key={anime.id}
                  className="upcoming-card"
                  onClick={() => navigate(`/anime/${anime.id}/info`)}
                >
                  <div className="upcoming-card-img">
                    <img src={anime.img} alt={anime.name} loading="lazy" decoding="async" />
                    <div className="upcoming-card-badge">
                      {anime.rating && <><Star size={10} fill="#ffffff" color="#ffffff" /> {anime.rating?.toFixed(1)}</>}
                    </div>
                  </div>
                  <div className="upcoming-card-body">
                    <h3>{anime.name}</h3>
                    <div className="upcoming-card-meta">
                      {anime.genres?.[0] && <span className="upcoming-card-tag">{anime.genres[0]}</span>}
                      <span className="upcoming-card-type">{anime.status || "TV"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {seasonPicks.length > 0 && (
          <SeasonGrid animeList={seasonPicks} />
        )}

        {upcomingList.length > 0 && (
          <UpcomingSection animeList={upcomingList} />
        )}

        {popularList.length > 0 && (
          <section className="home-section">
            <SectionHeader
              icon={Flame}
              title="Most Popular"
              subtitle="All-time fan favorites everyone's watching"
              action={() => navigate("/browse/anime")}
            />
            <div className="upcoming-grid">
              {popularList.map((anime) => (
                <div
                  key={anime.id}
                  className="upcoming-card"
                  onClick={() => navigate(`/anime/${anime.id}/info`)}
                >
                  <div className="upcoming-card-img">
                    <img src={anime.img} alt={anime.name} loading="lazy" decoding="async" />
                    <div className="upcoming-card-badge">
                      {anime.rating && <><Star size={10} fill="#ffffff" color="#ffffff" /> {anime.rating?.toFixed(1)}</>}
                    </div>
                  </div>
                  <div className="upcoming-card-body">
                    <h3>{anime.name}</h3>
                    <div className="upcoming-card-meta">
                      {anime.genres?.[0] && <span className="upcoming-card-tag">{anime.genres[0]}</span>}
                      <span className="upcoming-card-type">{anime.status || "TV"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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

        <div className="sidebar-column-right">
          <TopTrending />
          {/* TEMP diagnostic: should sit directly under the trending card */}
          <div style={{ background: "red", padding: 20, color: "white", zIndex: 999 }}>
            TEST BOX HERE
          </div>
        </div>
       </div>
      </div>

      <Footer />
    </AnimatedPage>
  );
}
