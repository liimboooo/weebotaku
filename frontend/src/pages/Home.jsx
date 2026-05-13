import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bookmark,
  ChevronRight,
  Clock,
  Eye,
  Film,
  Heart,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Slider from "../components/Slider";
import LiveRooms from "../components/LiveRooms";
import Categories from "../components/Categories";
import Background from "../components/Background";
import { fetchTopAnime, fetchSeasonalAnime, fetchAnimeGenres } from "../services/jikanApi";
import { fetchRandomQuote } from "../services/communityApi";
import {
  addToWatchlist,
  removeFromWatchlist,
  loadWatchlist,
  isInWatchlist,
} from "../services/storage";
import "./Home.css";

function useAnimeData() {
  const [spotlight, setSpotlight] = useState(null);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightQueue, setSpotlightQueue] = useState([]);
  const [trendingList, setTrendingList] = useState([]);
  const [seasonPicks, setSeasonPicks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [topAir, topAll, seasonal, genres] = await Promise.allSettled([
          fetchTopAnime(1, "airing"),
          fetchTopAnime(1, ""),
          fetchSeasonalAnime(),
          fetchAnimeGenres(),
        ]);

        if (topAir.status === "fulfilled" && topAir.value.data.length > 0) {
          const queue = topAir.value.data.slice(0, 5);
          setSpotlightQueue(queue);
          setSpotlight(queue[0]);
        }

        if (topAll.status === "fulfilled") {
          setTrendingList(topAll.value.data.filter(a => a.id !== (spotlight?.id)).slice(0, 15));
        }

        if (seasonal.status === "fulfilled") {
          setSeasonPicks(seasonal.value.data.slice(0, 10));
        }

        if (genres.status === "fulfilled") {
          setCategories(genres.value);
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
        setTrendingList(r.data.slice(0, 15));
      }
    } catch {}
  }, []);

  return { spotlight, trendingList, seasonPicks, categories, loading, refreshTrending };
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
    return [
      { icon: Bookmark, label: "Watchlist", value: wl.length, cls: "bookmark" },
      { icon: Eye, label: "Episodes Watched", value: history.length, cls: "eye" },
    ];
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
            whileHover={{ boxShadow: "0 16px 48px rgba(230,54,54,0.12)", transition: { type: "spring", stiffness: 300 } }}
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

function ContinueWatchingRow() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    const recent = stored.slice(0, 6);
    Promise.allSettled(
      recent.map(async item => {
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${item.animeId}`);
          const json = await res.json();
          if (json.data) {
            return {
              animeId: item.animeId,
              episode: item.episode,
              timestamp: item.timestamp,
              id: json.data.mal_id,
              name: json.data.title_english || json.data.title,
              img: json.data.images?.jpg?.large_image_url || json.data.images?.jpg?.image_url || "",
              rating: json.data.score,
              episodes: json.data.episodes,
            };
          }
        } catch {}
        return null;
      })
    ).then(results => {
      setItems(results.map(r => r.status === "fulfilled" ? r.value : null).filter(Boolean));
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="home-section">
      <SectionHeader icon={Clock} title="Continue Watching" subtitle="Pick up where you left off" />
      <motion.div
        className="continue-grid"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {items.map((item) => (
          <motion.div
            key={`${item.animeId}-${item.episode}`}
            className="continue-card"
            onClick={() => navigate(`/anime/${item.animeId}`)}
            variants={cardSlideUp}
           whileHover={{ boxShadow: "0 12px 40px rgba(230,54,54,0.12)", transition: { type: "spring", stiffness: 300 } }}
          >
            <div className="continue-card-img">
              <img src={item.img} alt={item.name} />
              <div className="continue-card-overlay">
                <Play size={18} fill="currentColor" />
              </div>
            </div>
            <div className="continue-card-body">
              <h4>{item.name}</h4>
              <span className="continue-card-ep-label">{item.episode ? `Episode ${item.episode}` : "Continue"}</span>
              {item.rating && (
                <span className="continue-card-rating">
                  <Star size={10} fill="#ffd700" color="#ffd700" /> {item.rating.toFixed(1)}
                </span>
              )}
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
        <Icon color="#e63636" size={24} />
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

function SeasonGrid({ animeList }) {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState(() => loadWatchlist().map(i => i.id));

  const toggleWishlist = (e, anime) => {
    e.stopPropagation();
    const id = anime.id;
    if (isInWatchlist(id)) {
      removeFromWatchlist(id);
      setWatchlist(prev => prev.filter(i => i !== id));
    } else {
      addToWatchlist({ id: anime.id, name: anime.name, img: anime.img, rating: anime.rating, episodes: anime.episodes, year: anime.year, genres: anime.genres, status: anime.status });
      setWatchlist(prev => [...prev, id]);
    }
  };

  if (!animeList?.length) return null;

  const seasonCardReveal = {
    hidden: { opacity: 0, y: 30, scale: 0.93 },
    visible: {
      opacity: 1, y: 0, scale: 1,
      transition: { type: "spring", stiffness: 200, damping: 22 },
    },
  };

  return (
    <section className="home-section">
      <SectionHeader icon={Sparkles} title="Season Highlights" subtitle="Top picks this season" action={() => navigate("/browse/anime")} />
      <motion.div
        className="season-grid"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {animeList.map((anime) => (
          <motion.div
            key={anime.id}
            className="season-card"
            onClick={() => navigate(`/anime/${anime.id}`)}
            variants={seasonCardReveal}
            whileHover={{ boxShadow: "0 12px 40px rgba(230,54,54,0.12)", transition: { type: "spring", stiffness: 300 } }}
          >
            <div className="season-card-img">
              <img src={anime.img} alt={anime.name} loading="lazy" />
              <div className="season-card-overlay">
                <button className="season-card-play" onClick={e => e.stopPropagation()}>
                  <Play size={18} fill="currentColor" />
                </button>
              </div>
              <button
                className={`season-wish-btn ${watchlist.includes(anime.id) ? "active" : ""}`}
                onClick={e => toggleWishlist(e, anime)}
              >
                <Heart size={12} fill={watchlist.includes(anime.id) ? "currentColor" : "none"} />
              </button>
              <div className="season-card-badge">{anime.status === "Ongoing" ? <Zap size={10} /> : null}{anime.status || "TV"}</div>
            </div>
            <div className="season-card-body">
              <h3>{anime.name}</h3>
              <div className="season-card-meta">
                <span className="season-card-rating"><Star size={10} fill="#ffd700" color="#ffd700" /> {anime.rating?.toFixed(1)}</span>
                <span className="season-card-eps"><Film size={10} /> {anime.episodes} ep</span>
                {anime.genres?.[0] && <span className="season-card-tag">{anime.genres[0]}</span>}
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
  const { spotlight, trendingList, seasonPicks, categories, loading, refreshTrending } = useAnimeData();
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
          <Background />
          <div className="home-loading">
            {[1, 2, 3].map(i => (
              <div key={i} className="home-skeleton-row">
                <div className="home-skeleton-line w-48" />
                <div className="home-skeleton-cards">
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className="home-skeleton-card" />
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

        <ContinueWatchingRow />

        {trendingList.length > 0 && (
          <section className="home-section">
            <SectionHeader
              icon={TrendingUp}
              title="Trending Now"
              subtitle="Most watched anime this week"
              action={refreshTrending}
            />
            <Slider sliderData={trendingList} noHeader />
          </section>
        )}

        {seasonPicks.length > 0 && (
          <SeasonGrid animeList={seasonPicks} />
        )}

        <section className="home-section" id="live-rooms">
          <LiveRooms />
        </section>

        {categories.length > 0 && (
          <Categories categories={categories} />
        )}

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
