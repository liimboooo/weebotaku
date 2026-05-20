import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, ChevronRight, Clock, Eye, Film, Flame, Info, Play, Plus, Star, TrendingUp, Zap, Users } from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Background from "../components/Background";
import { fetchTopAnime, fetchSeasonalAnime } from "../services/anilistApi";
import { addToWatchlist, removeFromWatchlist, loadWatchlist } from "../services/storage";
import { getCurrentLevel } from "../services/progression";
import "./Home.css";

function useHomeData() {
  const [spotlight, setSpotlight] = useState(null);
  const [spotlightIdx, setSpotlightIdx] = useState(0);
  const [spotlightQueue, setSpotlightQueue] = useState([]);
  const [trending, setTrending] = useState([]);
  const [topAiring, setTopAiring] = useState([]);
  const [recent, setRecent] = useState([]);
  const [topViewed, setTopViewed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [trend, airing, seasonal] = await Promise.allSettled([
          fetchTopAnime(1, ""),
          fetchTopAnime(1, "airing"),
          fetchSeasonalAnime(),
        ]);

        if (trend.status === "fulfilled" && trend.value.data.length) {
          const q = trend.value.data.slice(0, 5);
          setSpotlightQueue(q);
          setSpotlight(q[0]);
          setTrending(trend.value.data.slice(0, 20));
          setTopViewed(trend.value.data.slice(0, 10));
        }

        if (airing.status === "fulfilled") {
          setTopAiring(airing.value.data.slice(0, 20));
        }

        if (seasonal.status === "fulfilled") {
          setRecent(seasonal.value.data.slice(0, 20));
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (spotlightQueue.length < 2) return;
    const t = setInterval(() => {
      setSpotlightIdx(i => {
        const n = (i + 1) % spotlightQueue.length;
        setSpotlight(spotlightQueue[n]);
        return n;
      });
    }, 20000);
    return () => clearInterval(t);
  }, [spotlightQueue]);

  const goToSlide = (i) => {
    setSpotlightIdx(i);
    setSpotlight(spotlightQueue[i]);
  };

  return { spotlight, spotlightIdx, spotlightQueue, trending, topAiring, recent, topViewed, loading, goToSlide };
}

const rankMedal = ["🥇", "🥈", "🥉"];

function HeroSection({ spotlight, spotlightIdx, spotlightQueue, onNavigate, onDotClick }) {
  if (!spotlight) return null;
  return (
    <section className="home-hero">
      <div className="home-hero-bg">
        <AnimatePresence mode="wait">
          <motion.img
            key={spotlight.id}
            src={spotlight.bannerImage || spotlight.img}
            alt=""
            className="home-hero-img"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        </AnimatePresence>
        <div className="home-hero-gradient" />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          className="home-hero-content"
          key={spotlight.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="hero-badge">
            <Zap size={10} /> Spotlight #{spotlightIdx + 1}
          </div>
          <h1 className="hero-title">{spotlight.name}</h1>
          <div className="hero-meta-pills">
            <span className="pill pill-hd">HD</span>
            {spotlight.episodes && <span className="pill pill-sub">Sub: {spotlight.episodes}</span>}
            {spotlight.episodes && <span className="pill pill-dub">Dub: {spotlight.episodes}</span>}
            {spotlight.genres?.slice(0, 3).map(g => <span key={g} className="pill pill-genre">{g}</span>)}
          </div>
          <p className="hero-synopsis">{spotlight.synopsis?.replace(/<[^>]+>/g, "").slice(0, 280)}</p>
          <div className="hero-actions">
            <button className="hero-btn-primary" onClick={onNavigate}>
              <Play size={16} fill="currentColor" /> Watch Now
            </button>
            <button className="hero-btn-secondary" onClick={onNavigate}>
              <Info size={15} /> Details
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="hero-dots">
        {spotlightQueue.map((_, i) => (
          <span key={i} className={`hero-dot ${i === spotlightIdx ? "active" : ""}`} onClick={() => onDotClick?.(i)} />
        ))}
      </div>
    </section>
  );
}

function ContinueWatching() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("watchHistory") || "[]").slice(0, 6);
    setItems(stored);
  }, []);

  if (!items.length) return null;

  return (
    <section className="cw-section">
      <div className="section-header">
        <Clock size={18} color="#e63636" />
        <h2>Continue Watching</h2>
      </div>
      <div className="cw-row">
        {items.map((item, i) => {
          const progress = Math.min((item.episode || 1) / 12 * 100, 100);
          return (
            <div key={i} className="cw-card" onClick={() => navigate(`/anime/${item.animeId}?ep=${item.episode || 1}`)}>
              <div className="cw-thumb">
                <img src={item.img || item.animeImg || ""} alt="" />
                <div className="cw-play-icon"><Play size={14} fill="currentColor" /></div>
                <div className="cw-progress-bar" style={{ width: `${progress}%` }} />
              </div>
              <div className="cw-info">
                <h4>{item.name || item.animeName || "Unknown"}</h4>
                <span>Episode {item.episode || 1}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PosterCard({ anime, onClick }) {
  const [watchlist, setWatchlist] = useState(() => loadWatchlist());
  const inWl = watchlist.some(i => i.id === anime.id);

  const toggleWl = e => {
    e.stopPropagation();
    if (inWl) { removeFromWatchlist(anime.id); setWatchlist(loadWatchlist()); }
    else { addToWatchlist(anime); setWatchlist(loadWatchlist()); }
  };

  return (
    <motion.div className="poster-card" onClick={onClick} whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
      <div className="poster-img">
        <img src={anime.img} alt={anime.name} loading="lazy" />
        <div className="poster-overlay"><Play size={22} fill="currentColor" /></div>
        <div className="poster-badge-top">{anime.episodes || "?"} Ep</div>
        <div className="poster-badge-rating"><Star size={10} fill="#ffd700" color="#ffd700" /> {anime.rating?.toFixed(1)}</div>
        <button className={`poster-bookmark ${inWl ? "saved" : ""}`} onClick={toggleWl}>
          <Bookmark size={12} fill={inWl ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="poster-body">
        <h3>{anime.name}</h3>
        <div className="poster-meta">
          {anime.genres?.[0] && <span>{anime.genres[0]}</span>}
          {anime.type && <span>{anime.type}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function PosterRow({ title, icon: Icon, list }) {
  const navigate = useNavigate();
  if (!list?.length) return null;
  return (
    <section className="poster-section">
      <div className="section-header">
        <Icon size={18} color="#e63636" />
        <h2>{title}</h2>
      </div>
      <div className="poster-row">
        {list.map(a => <PosterCard key={a.id} anime={a} onClick={() => navigate(`/anime/${a.id}`)} />)}
      </div>
    </section>
  );
}

function TopViewedSidebar({ list }) {
  const navigate = useNavigate();
  if (!list?.length) return null;
  return (
    <aside className="sidebar">
      <div className="section-header">
        <Eye size={18} color="#e63636" />
        <h2>Top Viewed Today</h2>
      </div>
      <div className="sidebar-list">
        {list.map((a, i) => (
          <div key={a.id} className={`sidebar-item ${i < 3 ? `rank-${i + 1}` : ""}`} onClick={() => navigate(`/anime/${a.id}`)}>
            <span className="sidebar-rank">{i < 3 ? rankMedal[i] : `#${i + 1}`}</span>
            <img src={a.img} alt="" className="sidebar-thumb" />
            <div className="sidebar-info">
              <strong>{a.name}</strong>
              <span className="sidebar-views">{a.votes?.toLocaleString() || "0"} views</span>
            </div>
            <Star size={12} fill="#ffd700" color="#ffd700" />
            <span className="sidebar-score">{a.rating?.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function StatsBar() {
  const stats = useMemo(() => {
    const wl = loadWatchlist();
    const history = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    return [
      { icon: Bookmark, label: "Watchlist", value: wl.length },
      { icon: Eye, label: "Watched", value: history.length },
      { icon: Zap, label: "Level", value: getCurrentLevel() },
    ];
  }, []);
  return (
    <div className="stats-bar">
      {stats.map(s => (
        <div key={s.label} className="stat-card">
          <s.icon size={16} />
          <div><strong>{s.value}</strong><span>{s.label}</span></div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { spotlight, spotlightIdx, spotlightQueue, trending, topAiring, recent, topViewed, loading, goToSlide } = useHomeData();

  if (loading) {
    return (
      <AnimatedPage>
        <div className="home-loading">
          <Background />
          <div className="loading-spinner" />
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <Background />
      <HeroSection spotlight={spotlight} spotlightIdx={spotlightIdx} spotlightQueue={spotlightQueue} onNavigate={() => spotlight && navigate(`/anime/${spotlight.id}`)} onDotClick={goToSlide} />
      <div className="home-container">
        <StatsBar />
        <ContinueWatching />

        <div className="home-layout">
          <div className="home-main">
            <PosterRow title="Trending Now" icon={TrendingUp} list={trending} />
            <PosterRow title="Top Airing" icon={Flame} list={topAiring} />
            <PosterRow title="Recently Added" icon={Film} list={recent} />
          </div>
          <TopViewedSidebar list={topViewed} />
        </div>

        <div className="home-footer-cta">
          <Users size={20} />
          <div>
            <strong>Join the Community</strong>
            <span>Discuss episodes, share edits, vote in arena battles</span>
          </div>
          <button className="cta-btn" onClick={() => navigate("/watch-together")}>Explore <ChevronRight size={14} /></button>
        </div>
      </div>
    </AnimatedPage>
  );
}
