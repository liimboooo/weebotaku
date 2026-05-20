import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, ChevronRight, Film, Flame, Play, Plus, TrendingUp } from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import { fetchTopAnime, fetchSeasonalAnime } from "../services/anilistApi";
import { addToWatchlist, removeFromWatchlist, loadWatchlist } from "../services/storage";
import "./Home.css";

function useHomeData() {
  const [spotlight, setSpotlight] = useState(null);
  const [spotlightIdx, setSpotlightIdx] = useState(0);
  const [spotlightQueue, setSpotlightQueue] = useState([]);
  const [trending, setTrending] = useState([]);
  const [airing, setAiring] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, a, r] = await Promise.allSettled([
          fetchTopAnime(1, ""),
          fetchTopAnime(1, "airing"),
          fetchSeasonalAnime(),
        ]);
        if (t.status === "fulfilled" && t.value.data.length) {
          const q = t.value.data.slice(0, 5);
          setSpotlightQueue(q);
          setSpotlight(q[0]);
          setTrending(t.value.data.slice(0, 10));
        }
        if (a.status === "fulfilled") setAiring(a.value.data.slice(0, 10));
        if (r.status === "fulfilled") setRecent(r.value.data.slice(0, 10));
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

  return { spotlight, setSpotlight, spotlightIdx, setSpotlightIdx, spotlightQueue, trending, airing, recent, loading };
}

function BentoCard({ anime, large, onClick }) {
  const [wl, setWl] = useState(() => loadWatchlist());
  const inWl = wl.some(i => i.id === anime.id);

  const toggleWl = e => {
    e.stopPropagation();
    if (inWl) { removeFromWatchlist(anime.id); setWl(loadWatchlist()); }
    else { addToWatchlist(anime); setWl(loadWatchlist()); }
  };

  return (
    <motion.div
      className={`bento-card ${large ? "bento-large" : ""}`}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <div className="bento-img">
        <img src={anime.img} alt={anime.name} loading="lazy" />
        <div className="bento-overlay">
          <button className="bento-play-btn" onClick={e => { e.stopPropagation(); onClick(); }}>
            <Play size={large ? 28 : 18} fill="currentColor" />
          </button>
        </div>
        <button className={`bento-bookmark ${inWl ? "saved" : ""}`} onClick={toggleWl}>
          <Bookmark size={large ? 14 : 10} fill={inWl ? "currentColor" : "none"} />
        </button>
        <div className="bento-badge">{anime.episodes || "?"} EP</div>
      </div>
      <div className="bento-body">
        <h3>{anime.name}</h3>
        <div className="bento-meta">
          <span className="bento-score">{anime.rating?.toFixed(1)}</span>
          {anime.genres?.[0] && <span>{anime.genres[0]}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function BentoGrid({ title, icon: Icon, list }) {
  const navigate = useNavigate();
  if (!list?.length) return null;
  const cards = list.slice(0, 5);

  return (
    <section className="bento-section">
      <div className="bento-header">
        <Icon size={20} />
        <h2>{title}</h2>
      </div>
      <div className="bento-grid">
        {cards.map((a, i) => (
          <BentoCard
            key={a.id}
            anime={a}
            large={i === 0}
            onClick={() => navigate(`/anime/${a.id}`)}
          />
        ))}
      </div>
    </section>
  );
}

function ContinueWidget() {
  const navigate = useNavigate();
  const [item, setItem] = useState(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    if (stored.length) setItem(stored[0]);
  }, []);

  if (!item) return null;

  return (
    <motion.div
      className="continue-widget"
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.5 }}
      onClick={() => navigate(`/anime/${item.animeId}?ep=${item.episode || 1}`)}
    >
      <div className="cw-widget-thumb">
        <img src={item.img || ""} alt="" />
        <div className="cw-widget-play"><Play size={14} fill="currentColor" /></div>
      </div>
      <div className="cw-widget-info">
        <span className="cw-widget-label">Up Next</span>
        <strong>{item.name || "Unknown"}</strong>
        <span className="cw-widget-ep">Episode {item.episode || 1}</span>
      </div>
      <ChevronRight size={14} className="cw-widget-arrow" />
    </motion.div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { spotlight, setSpotlight, spotlightIdx, setSpotlightIdx, spotlightQueue, trending, airing, recent, loading } = useHomeData();
  const [hoverColor, setHoverColor] = useState(null);

  useEffect(() => {
    if (!spotlight?.img) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = spotlight.img;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1; canvas.height = 1;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      setHoverColor(`${r},${g},${b}`);
    };
  }, [spotlight?.img]);

  if (loading) {
    return (
      <AnimatedPage>
        <div className="home-loading"><div className="load-spinner" /></div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="home">
        <div className="hero" style={{ background: hoverColor ? `rgba(${hoverColor},0.15)` : "transparent" }}>
          <div className="hero-bg-img">
            <AnimatePresence mode="wait">
              <motion.img
                key={spotlight?.id}
                src={spotlight?.img}
                alt=""
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.7 }}
              />
            </AnimatePresence>
          </div>
          <div className="hero-gradient" />
          <div className="hero-gradient-bottom" />

          <div className="hero-content">
            <div className="hero-featured-badge">Featured</div>
            <h1 className="hero-title">{spotlight?.name}</h1>
            <div className="hero-pills">
              <span className="pill">HD</span>
              <span className="pill">SUB</span>
              <span className="pill">DUB</span>
              {spotlight?.genres?.slice(0, 3).map(g => <span key={g} className="pill">{g}</span>)}
            </div>
            <p className="hero-desc">{spotlight?.synopsis?.slice(0, 280)}</p>
            <div className="hero-actions">
              <button className="hero-btn" onClick={() => spotlight && navigate(`/anime/${spotlight.id}`)}>
                <Play size={18} fill="currentColor" /> Watch Now
              </button>
              <button className="hero-btn-ghost" onClick={() => spotlight && navigate(`/anime/${spotlight.id}`)}>
                <Plus size={16} /> Details
              </button>
            </div>
          </div>

          <div className="hero-dots">
            {spotlightQueue.map((_, i) => (
              <button
                key={i}
                className={`hero-dot ${i === spotlightIdx ? "active" : ""}`}
                onClick={() => { setSpotlightIdx(i); setSpotlight(spotlightQueue[i]); }}
              />
            ))}
          </div>
        </div>

        <div className="content">
          <BentoGrid title="Trending Now" icon={Flame} list={trending} />
          <BentoGrid title="Top Airing" icon={TrendingUp} list={airing} />
          <BentoGrid title="Recently Added" icon={Film} list={recent} />
        </div>

        <ContinueWidget />
      </div>
    </AnimatedPage>
  );
}
