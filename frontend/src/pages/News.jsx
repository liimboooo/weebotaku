import React, { useEffect, useState } from "react";
import AnimatedPage from "../components/AnimatedPage";
import Header from "../components/Header";
import Background from "../components/Background";
import { fetchAnimeNews } from "../services/animeNewsApi";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./News.css";

const TYPE_CONFIG = {
  new_episode: { label: "New Episode", className: "tag-airing", icon: "▶" },
  trending: { label: "Trending", className: "tag-trending", icon: "🔥" },
  announcement: { label: "Announcement", className: "tag-announce", icon: "📢" },
  popular: { label: "Popular", className: "tag-popular", icon: "⭐" },
  new_chapter: { label: "New Chapter", className: "tag-chapter", icon: "📖" },
  manga_trending: { label: "Manga Trending", className: "tag-manga-trend", icon: "🔥" },
  manga_announcement: { label: "New Manga", className: "tag-manga-announce", icon: "📢" },
  manga_popular: { label: "Popular Manga", className: "tag-manga-pop", icon: "⭐" },
};

const MEDIA_TABS = {
  all: [
    { key: "all", label: "All News" },
    { key: "new_episode", label: "New Episodes" },
    { key: "new_chapter", label: "New Chapters" },
    { key: "trending", label: "Trending" },
    { key: "announcement", label: "Announcements" },
    { key: "popular", label: "Popular" },
  ],
  anime: [
    { key: "all", label: "All Anime" },
    { key: "new_episode", label: "New Episodes" },
    { key: "trending", label: "Trending" },
    { key: "announcement", label: "Announcements" },
    { key: "popular", label: "Popular" },
  ],
  manga: [
    { key: "all", label: "All Manga" },
    { key: "new_chapter", label: "New Chapters" },
    { key: "manga_trending", label: "Trending" },
    { key: "manga_announcement", label: "New Manga" },
    { key: "manga_popular", label: "Popular" },
  ],
};

export default function News() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mediaFilter, setMediaFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAnimeNews()
      .then((res) => { if (mounted) setData(res); })
      .catch((err) => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const tabs = MEDIA_TABS[mediaFilter] || MEDIA_TABS.all;
  const validTab = tabs.find(t => t.key === activeTab) ? activeTab : "all";

  const filteredNews = (data?.allNews || []).filter((item) => {
    if (mediaFilter !== "all" && item.mediaType !== mediaFilter) return false;
    if (validTab !== "all" && item.type !== validTab) return false;
    return true;
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  const animeFeatured = data?.animeAiring?.slice(0, 3) || [];
  const mangaFeatured = data?.mangaPublishing?.slice(0, 3) || [];
  const showFeatured = mediaFilter !== "manga" && animeFeatured.length > 0;
  const showMangaFeatured = mediaFilter !== "anime" && mangaFeatured.length > 0;

  const handleCardClick = (item) => {
    if (item.mediaType === "manga") {
      navigate(`/browse/manga`);
    } else {
      navigate(`/anime/${item.animeId}`);
    }
  };

  const refresh = () => {
    setLoading(true);
    setError(null);
    fetchAnimeNews()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <AnimatedPage>
      <div className="news-page">
        <Background />
        <Header />
        <div className="news-container">
          <div className="news-header">
            <div>
              <h1 className="news-title">Anime & Manga News</h1>
              <p className="news-subtitle">Trending, new episodes, chapters & announcements</p>
            </div>
            <button className="news-refresh" onClick={refresh} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {error && <div className="news-error">{error} <button className="news-retry-btn" onClick={refresh}>Retry</button></div>}

          <div className="media-toggle">
            <button className={`media-btn ${mediaFilter === "all" ? "active" : ""}`} onClick={() => { setMediaFilter("all"); setActiveTab("all"); }}>All</button>
            <button className={`media-btn ${mediaFilter === "anime" ? "active" : ""}`} onClick={() => { setMediaFilter("anime"); setActiveTab("all"); }}>Anime</button>
            <button className={`media-btn ${mediaFilter === "manga" ? "active" : ""}`} onClick={() => { setMediaFilter("manga"); setActiveTab("all"); }}>Manga</button>
          </div>

          {!loading && showFeatured && (
            <section className="news-featured">
              <h2 className="section-title">Currently Airing</h2>
              <div className="featured-grid">
                {animeFeatured.map((anime, i) => (
                  <motion.div
                    key={anime.id}
                    className="featured-card"
                    onClick={() => navigate(`/anime/${anime.id}`)}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.12, duration: 0.5 }}
                  >
                    <div className="featured-backdrop" style={{ backgroundImage: `url(${anime.image})` }} />
                    <div className="featured-overlay" />
                    <div className="featured-content">
                      <span className="featured-badge">Airing</span>
                      <h3 className="featured-title">{anime.title}</h3>
                      <div className="featured-meta">
                        {anime.score && <span>Score: {anime.score}</span>}
                        {anime.nextEpisode && <span>Ep {anime.nextEpisode.ep} soon</span>}
                      </div>
                      <p className="featured-genres">{anime.genres?.slice(0, 3).join(" / ")}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {!loading && showMangaFeatured && (
            <section className="news-featured">
              <h2 className="section-title">Publishing Manga</h2>
              <div className="featured-grid">
                {mangaFeatured.map((manga, i) => (
                  <motion.div
                    key={manga.id}
                    className="featured-card"
                    onClick={() => navigate("/browse/manga")}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.12, duration: 0.5 }}
                  >
                    <div className="featured-backdrop" style={{ backgroundImage: `url(${manga.image})` }} />
                    <div className="featured-overlay" />
                    <div className="featured-content">
                      <span className="featured-badge featured-badge-manga">Publishing</span>
                      <h3 className="featured-title">{manga.title}</h3>
                      <div className="featured-meta">
                        {manga.score && <span>Score: {manga.score}</span>}
                        {manga.chapters && <span>{manga.chapters} chapters</span>}
                      </div>
                      <p className="featured-genres">{manga.genres?.slice(0, 3).join(" / ")}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          <section className="news-section">
            <div className="news-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`news-tab ${validTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="news-tab-content">
              {loading ? (
                <div className="news-loading">
                  <div className="spinner" />
                  <span>Loading news...</span>
                </div>
              ) : filteredNews.length === 0 ? (
                <div className="news-empty">No news items found.</div>
              ) : (
                <motion.div className="news-feed" variants={container} initial="hidden" animate="show">
                  {filteredNews.map((item) => {
                    const config = TYPE_CONFIG[item.type] || { label: item.type, className: "", icon: "" };
                    return (
                      <motion.article
                        key={item.id}
                        className={`news-card ${item.mediaType === "manga" ? "news-card-manga" : ""}`}
                        onClick={() => handleCardClick(item)}
                        variants={itemAnim}
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="news-card-img">
                          <img src={item.image} alt={item.animeTitle} loading="lazy" />
                          {item.mediaType === "manga" && <span className="news-media-badge">MANGA</span>}
                        </div>
                        <div className="news-card-body">
                          <div className="news-card-header">
                            <span className={`news-tag ${config.className}`}>{config.icon} {config.label}</span>
                            {item.score && <span className="news-score">{item.score}</span>}
                          </div>
                          <h3 className="news-card-title">{item.title}</h3>
                          <p className="news-card-desc">{item.description}</p>
                          <div className="news-card-footer">
                            {item.genres?.slice(0, 3).map((g) => (
                              <span key={g} className="news-genre">{g}</span>
                            ))}
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AnimatedPage>
  );
}
