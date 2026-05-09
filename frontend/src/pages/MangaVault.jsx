import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Star, BookOpen, Eye, Heart, Sparkles, Zap, Library, List, Grid3x3 } from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Background from "../components/Background";
import "./MangaVault.css";

const MANGA = [
  { id: 1, title: "One Piece", author: "Eiichiro Oda", cover: "/beta-1.jpg", demo: "Shonen", status: "Ongoing", ch: 1120, last: 1080, rating: 9.5, genres: ["Adventure", "Comedy", "Fantasy"], desc: "Luffy and the Straw Hat crew sail the Grand Line pursuing the greatest treasure.", progress: 0.71 },
  { id: 2, title: "Berserk", author: "Kentaro Miura", cover: "/beta-2.jpg", demo: "Seinen", status: "Hiatus", ch: 376, last: 376, rating: 9.6, genres: ["Dark Fantasy", "Action", "Drama"], desc: "A lone mercenary battles fate and monsters in a brutal medieval world.", progress: 0.38 },
  { id: 3, title: "Jujutsu Kaisen", author: "Gege Akutami", cover: "/beta-3.jpg", demo: "Shonen", status: "Completed", ch: 271, last: 271, rating: 9.0, genres: ["Action", "Supernatural", "Horror"], desc: "Sorcerers and curses collide where power has a brutal cost.", progress: 0.86 },
  { id: 4, title: "Vinland Saga", author: "Makoto Yukimura", cover: "/beta-1.jpg", demo: "Seinen", status: "Ongoing", ch: 214, last: 206, rating: 9.2, genres: ["Historical", "Drama", "Action"], desc: "A Viking saga of revenge, redemption, and the true meaning of freedom.", progress: 0.52 },
  { id: 5, title: "Blue Lock", author: "Muneyuki Kaneshiro", cover: "/beta-2.jpg", demo: "Shonen", status: "Ongoing", ch: 290, last: 257, rating: 8.9, genres: ["Sports", "Psychological", "Drama"], desc: "Japan's future strikers fight in a ruthless football program.", progress: 0.48 },
  { id: 6, title: "Monster", author: "Naoki Urasawa", cover: "/beta-3.jpg", demo: "Seinen", status: "Completed", ch: 162, last: 162, rating: 9.3, genres: ["Thriller", "Mystery", "Drama"], desc: "A surgeon chases a serial killer whose life he once saved.", progress: 0.2 },
  { id: 7, title: "Skip & Loafer", author: "Misaki Takamatsu", cover: "/beta-1.jpg", demo: "Josei", status: "Ongoing", ch: 67, last: 62, rating: 8.7, genres: ["Romance", "Slice of Life", "School"], desc: "A small-town student navigates Tokyo high school life.", progress: 0.12 },
  { id: 8, title: "Nana", author: "Ai Yazawa", cover: "/beta-2.jpg", demo: "Josei", status: "Hiatus", ch: 84, last: 84, rating: 9.1, genres: ["Drama", "Music", "Romance"], desc: "Two women named Nana build a fragile friendship in Tokyo.", progress: 0.63 },
  { id: 9, title: "Yotsuba&!", author: "Kiyohiko Azuma", cover: "/beta-3.jpg", demo: "Shonen", status: "Ongoing", ch: 116, last: 113, rating: 8.8, genres: ["Comedy", "Slice of Life"], desc: "A curious child transforms everyday moments into adventure.", progress: 0.33 },
  { id: 10, title: "Kingdom", author: "Yasuhisa Hara", cover: "/beta-1.jpg", demo: "Seinen", status: "Ongoing", ch: 816, last: 802, rating: 9.4, genres: ["Historical", "War", "Action"], desc: "An orphan soldier rises through ancient China's wars.", progress: 0.58 },
  { id: 11, title: "Fruits Basket", author: "Natsuki Takaya", cover: "/beta-2.jpg", demo: "Shojo", status: "Completed", ch: 136, last: 136, rating: 8.9, genres: ["Romance", "Drama", "Fantasy"], desc: "A girl becomes involved with a family cursed as zodiac spirits.", progress: 0.4 },
  { id: 12, title: "Oyasumi Punpun", author: "Inio Asano", cover: "/beta-3.jpg", demo: "Seinen", status: "Completed", ch: 147, last: 147, rating: 9.0, genres: ["Psychological", "Drama"], desc: "A surreal coming-of-age story of trauma and alienation.", progress: 0.15 },
];

const DEMOGRAPHICS = ["All", "Shonen", "Seinen", "Shojo", "Josei"];
const STATUSES = ["All", "Ongoing", "Completed", "Hiatus"];

export default function MangaVault() {
  const [search, setSearch] = useState("");
  const [demo, setDemo] = useState("All");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("rating");
  const [view, setView] = useState("grid");
  const [preview, setPreview] = useState(null);
  const [wishlist, setWishlist] = useState([]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return MANGA
      .filter(m => {
        if (demo !== "All" && m.demo !== demo) return false;
        if (status !== "All" && m.status !== status) return false;
        if (q && !m.title.toLowerCase().includes(q) && !m.author.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "rating") return b.rating - a.rating;
        if (sort === "chapters") return b.ch - a.ch;
        if (sort === "title") return a.title.localeCompare(b.title);
        return 0;
      });
  }, [search, demo, status, sort]);

  const topRated = MANGA.reduce((best, m) => m.rating > best.rating ? m : best, MANGA[0]);

  const toggleWishlist = (id) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <AnimatedPage>
      <div className="mv">
        <Background />
        <Header />
        <div className="mv-bg-ornament" />

        <main className="mv-shell">
          <motion.section
            className="mv-hero"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mv-hero-content">
              <span className="mv-eyebrow"><Sparkles size={14} /> Manga Collection</span>
              <h1>
                <span className="mv-hero-title-small">Discover</span>
                <span className="mv-hero-title-big">Library</span>
              </h1>
              <p className="mv-hero-desc">
                Browse thousands of series across every genre. Track your reading, discover hidden gems, 
                and build your perfect manga collection.
              </p>
              <div className="mv-hero-actions">
                <div className="mv-hero-metrics">
                  <div className="mv-metric">
                    <strong>{MANGA.length}</strong>
                    <span>Series</span>
                  </div>
                  <div className="mv-metric">
                    <strong>3.8K</strong>
                    <span>Chapters</span>
                  </div>
                  <div className="mv-metric">
                    <strong>12</strong>
                    <span>Genres</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mv-hero-visual">
              <div className="mv-hero-orb" />
              <div className="mv-hero-grid" />
              <div className="mv-hero-spotlight">
                <span className="mv-spotlight-label">TOP RATED</span>
                <span className="mv-spotlight-title">{topRated.title}</span>
                <span className="mv-spotlight-rating"><Star size={12} fill="currentColor" /> {topRated.rating}</span>
              </div>
            </div>
          </motion.section>

          <section className="mv-controls">
            <div className="mv-search-box">
              <Search size={18} className="mv-search-icon" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search manga, author, or genre..."
              />
            </div>
            <div className="mv-controls-right">
              <div className="mv-pills">
                {DEMOGRAPHICS.map(d => (
                  <button key={d} className={`mv-pill ${demo === d ? "active" : ""}`} onClick={() => setDemo(d)}>{d}</button>
                ))}
                <div className="mv-pill-divider" />
                {STATUSES.map(s => (
                  <button key={s} className={`mv-pill ${status === s ? "active" : ""}`} onClick={() => setStatus(s)}>{s}</button>
                ))}
              </div>
              <div className="mv-utils">
                <select value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="rating">Rating</option>
                  <option value="chapters">Chapters</option>
                  <option value="title">Title</option>
                </select>
                <div className="mv-view-toggle">
                  <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><Grid3x3 size={15} /></button>
                  <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={15} /></button>
                </div>
              </div>
            </div>
          </section>

          <section className="mv-grid-section">
            <div className="mv-grid-header">
              <h2><Library size={18} /> Browse All</h2>
              <span className="mv-count">{filtered.length} series found</span>
            </div>

            <div className={`mv-grid ${view === "list" ? "mv-list" : ""}`}>
              <AnimatePresence mode="popLayout">
                {filtered.map((m, i) => (
                  <motion.article
                    key={m.id}
                    className={view === "grid" ? "mv-card" : "mv-row-card"}
                    layout
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ delay: (i % 12) * 0.025 }}
                  >
                    {view === "grid" ? (
                      <>
                        <div className="mv-card-thumb" onClick={() => setPreview(m)}>
                          <img src={m.cover} alt={m.title} loading="lazy" />
                          <div className="mv-card-overlay">
                            <div className="mv-card-play">
                              <Eye size={20} />
                            </div>
                            <div className="mv-card-tech">
                              <span>Ch. {m.last}</span>
                              <span>{m.demo}</span>
                            </div>
                          </div>
                          <div className="mv-card-badge">
                            {m.status === "Ongoing" ? <Zap size={10} /> : null}
                            {m.status}
                          </div>
                          <div className="mv-card-progress" style={{ width: `${m.progress * 100}%` }} />
                        </div>
                        <div className="mv-card-body">
                          <div className="mv-card-head">
                            <div>
                              <h3>{m.title}</h3>
                              <span className="mv-card-author">{m.author}</span>
                            </div>
                            <button
                              className={`mv-wish-btn ${wishlist.includes(m.id) ? "active" : ""}`}
                              onClick={() => toggleWishlist(m.id)}
                            >
                              <Heart size={14} fill={wishlist.includes(m.id) ? "currentColor" : "none"} />
                            </button>
                          </div>
                          <p className="mv-card-desc">{m.desc}</p>
                          <div className="mv-card-foot">
                            <span className="mv-card-rating"><Star size={11} fill="currentColor" /> {m.rating}</span>
                            <span className="mv-card-ch"><BookOpen size={11} /> {m.ch} ch</span>
                            <span className="mv-card-tag">{m.demo}</span>
                          </div>
                        </div>
                        <div className="mv-card-glow" />
                      </>
                    ) : (
                      <>
                        <div className="mv-row-thumb" onClick={() => setPreview(m)}>
                          <img src={m.cover} alt={m.title} loading="lazy" />
                        </div>
                        <div className="mv-row-body" onClick={() => setPreview(m)}>
                          <div className="mv-row-head">
                            <h3>{m.title}</h3>
                            <span className="mv-row-author">{m.author}</span>
                          </div>
                          <p className="mv-row-desc">{m.desc}</p>
                          <div className="mv-row-meta">
                            <span><Star size={11} /> {m.rating}</span>
                            <span><BookOpen size={11} /> {m.ch} chapters</span>
                            <span className="mv-row-tag">{m.demo}</span>
                            <span className={`mv-row-status ${m.status.toLowerCase()}`}>{m.status}</span>
                          </div>
                        </div>
                        <button
                          className={`mv-row-wish ${wishlist.includes(m.id) ? "active" : ""}`}
                          onClick={() => toggleWishlist(m.id)}
                        >
                          <Heart size={15} fill={wishlist.includes(m.id) ? "currentColor" : "none"} />
                        </button>
                        <div className="mv-card-glow" />
                      </>
                    )}
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>

            {filtered.length === 0 && (
              <div className="mv-empty">
                <BookOpen size={40} />
                <h3>No results found</h3>
                <p>Try adjusting your search or filters.</p>
              </div>
            )}
          </section>
        </main>

        <Footer />

        <AnimatePresence>
          {preview && (
            <div className="mv-modal-overlay" onClick={() => setPreview(null)}>
              <motion.div
                className="mv-modal"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="mv-modal-head">
                  <div className="mv-modal-head-info">
                    <span className="mv-modal-status"><span className="mv-pulse-dot" /> {preview.status}</span>
                    <h2>{preview.title}</h2>
                  </div>
                  <button className="mv-modal-close" onClick={() => setPreview(null)}><X size={22} /></button>
                </div>
                <div className="mv-modal-body">
                  <div className="mv-modal-cover">
                    <img src={preview.cover} alt={preview.title} />
                  </div>
                  <div className="mv-modal-sidebar">
                    <div className="mv-modal-section">
                      <label>Author</label>
                      <div className="mv-modal-author">{preview.author}</div>
                    </div>
                    <div className="mv-modal-section">
                      <label>Details</label>
                      <div className="mv-modal-details">
                        <div className="mv-modal-detail"><Star size={13} /> {preview.rating} Rating</div>
                        <div className="mv-modal-detail"><BookOpen size={13} /> {preview.ch} Chapters</div>
                        <div className="mv-modal-detail"><Zap size={13} /> {preview.progress * 100}% Read</div>
                      </div>
                    </div>
                    <div className="mv-modal-section">
                      <label>Genres</label>
                      <div className="mv-modal-tags">
                        {preview.genres.map(g => <span key={g}>{g}</span>)}
                        <span className="mv-modal-tag-accent">{preview.demo}</span>
                      </div>
                    </div>
                    <div className="mv-modal-section">
                      <label>Synopsis</label>
                      <p>{preview.desc}</p>
                    </div>
                    <div className="mv-modal-bar">
                      <div className="mv-modal-bar-fill" style={{ width: `${preview.progress * 100}%` }} />
                    </div>
                    <button className="mv-modal-btn" onClick={() => toggleWishlist(preview.id)}>
                      <Heart size={16} fill={wishlist.includes(preview.id) ? "currentColor" : "none"} />
                      {wishlist.includes(preview.id) ? "In Your List" : "Add to List"}
                    </button>
                    <button className="mv-modal-btn mv-modal-btn-primary">Continue Ch. {preview.last}</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
