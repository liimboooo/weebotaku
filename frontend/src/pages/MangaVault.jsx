import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Search, X, List, LayoutGrid, ChevronDown, Star, Eye, Filter, SlidersHorizontal, BookMarked, TrendingUp, Sparkles } from "lucide-react";
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

const demos = ["Shonen", "Seinen", "Shojo", "Josei"];
const stat = ["Ongoing", "Hiatus", "Completed"];
const ranges = [
  { key: "short", label: "1-100" },
  { key: "mid", label: "101-300" },
  { key: "long", label: "301-700" },
  { key: "epic", label: "701+" },
];

function matchRange(ch, key) {
  if (!key) return true;
  if (key === "short") return ch <= 100;
  if (key === "mid") return ch >= 101 && ch <= 300;
  if (key === "long") return ch >= 301 && ch <= 700;
  return ch >= 701;
}

function FilterGroup({ title, icon, open, onToggle, children, count }) {
  return (
    <div className="mv-filter">
      <button className="mv-filter-trigger" onClick={onToggle} aria-expanded={open}>
        <span className="mv-filter-label">{icon} {title}</span>
        <span className="mv-filter-right">
          {count > 0 && <span className="mv-filter-badge">{count}</span>}
          <ChevronDown size={14} className={`mv-chevron ${open ? "open" : ""}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="mv-filter-body" initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}>
            <div className="mv-filter-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Card({ m, onOpen }) {
  return (
    <motion.article className="mv-card" layout onClick={() => onOpen(m)} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
      <div className="mv-cover">
        <img src={m.cover} alt={m.title} loading="lazy" />
        <div className="mv-cover-glow" />
        <div className="mv-cover-gradient" />
        <span className="mv-ch">#{m.last}</span>
        <span className="mv-rating"><Star size={10} fill="currentColor" /> {m.rating}</span>
        <button className="mv-quick-read" onClick={(e) => { e.stopPropagation(); onOpen(m); }}><Eye size={13} /> Read</button>
      </div>
      <div className="mv-body">
        <h3>{m.title}</h3>
        <p>{m.author}</p>
        <div className="mv-meta">
          <span>{m.ch} ch.</span>
          <span>{m.demo}</span>
        </div>
        <div className="mv-progress"><div className="mv-progress-fill" style={{ width: `${m.progress * 100}%` }} /></div>
      </div>
    </motion.article>
  );
}

function ListCard({ m, onOpen }) {
  return (
    <motion.article className="mv-lrow" layout onClick={() => onOpen(m)} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
      <img src={m.cover} alt={m.title} className="mv-lcover" />
      <div className="mv-lbody">
        <h3>{m.title}</h3>
        <p>{m.desc}</p>
        <div className="mv-ltags">{m.genres.slice(0, 3).map(g => <span key={g}>{g}</span>)}</div>
      </div>
      <div className="mv-lstats">
        <span><BookOpen size={12} /> {m.last}/{m.ch}</span>
        <span><Star size={12} /> {m.rating}</span>
        <span className={`mv-ldot ${m.status.toLowerCase()}`}>{m.status}</span>
      </div>
    </motion.article>
  );
}

export default function MangaVault() {
  const [demo, setDemo] = useState([]);
  const [status, setStatus] = useState([]);
  const [range, setRange] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [preview, setPreview] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState("rating");
  const [groups, setGroups] = useState({ demo: true, status: true, ch: true });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return MANGA.filter(m => {
      if (q && !m.title.toLowerCase().includes(q) && !m.author.toLowerCase().includes(q) && !m.genres.some(g => g.toLowerCase().includes(q))) return false;
      if (demo.length && !demo.includes(m.demo)) return false;
      if (status.length && !status.includes(m.status)) return false;
      if (!matchRange(m.ch, range)) return false;
      return true;
    }).sort((a, b) => sort === "rating" ? b.rating - a.rating : sort === "ch" ? b.ch - a.ch : b.id - a.id);
  }, [search, demo, status, range, sort]);

  const pills = [
    ...demo.map(v => ({ k: `d:${v}`, l: v, off: () => setDemo(p => p.filter(x => x !== v)) })),
    ...status.map(v => ({ k: `s:${v}`, l: v, off: () => setStatus(p => p.filter(x => x !== v)) })),
    ...(range ? [{ k: `r:${range}`, l: `${ranges.find(r => r.key === range)?.label} ch.`, off: () => setRange("") }] : []),
  ];
  const count = demo.length + status.length + (range ? 1 : 0);
  const topManga = [...MANGA].sort((a, b) => b.progress - a.progress).slice(0, 5);

  return (
    <AnimatedPage>
      <div className={`mv ${filtersOpen ? "mv-fo" : ""}`}>
        <Background />
        <Header />
        <div className="mv-overlay" onClick={() => setFiltersOpen(false)} />
        <main className="mv-shell">
          <section className="mv-hero">
            <div className="mv-hero-bg" style={{ backgroundImage: `url(${MANGA[0].cover})` }} />
            <div className="mv-hero-gradient" />
            <div className="mv-hero-content">
              <span className="mv-hero-chip"><BookMarked size={13} /> Manga Collection</span>
              <h1>Discover Manga</h1>
              <p>Browse hundreds of series, track your progress, and dive into new worlds.</p>
              <div className="mv-hero-stats">
                <div><strong>{MANGA.length}</strong><span>Series</span></div>
                <div><strong>{MANGA.reduce((s, m) => s + m.ch, 0).toLocaleString()}</strong><span>Chapters</span></div>
                <div><strong>9.1</strong><span>Avg Rating</span></div>
              </div>
            </div>
          </section>

          <div className="mv-layout">
            <aside className="mv-side">
              <div className="mv-side-head">
                <h2>Filters</h2>
                <Filter size={16} />
              </div>
              <FilterGroup title="Demographic" icon={<SlidersHorizontal size={14} />} open={groups.demo} onToggle={() => setGroups(p => ({ ...p, demo: !p.demo }))} count={demo.length}>
                <div className="mv-pills">{demos.map(d => <button key={d} className={`mv-pill ${demo.includes(d) ? "active" : ""}`} onClick={() => setDemo(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])}>{d}</button>)}</div>
              </FilterGroup>
              <FilterGroup title="Status" icon={<SlidersHorizontal size={14} />} open={groups.status} onToggle={() => setGroups(p => ({ ...p, status: !p.status }))} count={status.length}>
                <div className="mv-pills">{stat.map(s => <button key={s} className={`mv-pill ${status.includes(s) ? "active" : ""}`} onClick={() => setStatus(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])}>{s}</button>)}</div>
              </FilterGroup>
              <FilterGroup title="Length" icon={<SlidersHorizontal size={14} />} open={groups.ch} onToggle={() => setGroups(p => ({ ...p, ch: !p.ch }))} count={range ? 1 : 0}>
                <div className="mv-pills">{ranges.map(r => <button key={r.key} className={`mv-pill ${range === r.key ? "active" : ""}`} onClick={() => setRange(p => p === r.key ? "" : r.key)}>{r.label}</button>)}</div>
              </FilterGroup>
            </aside>

            <section className="mv-main">
              <div className="mv-toolbar">
                <button className="mv-filter-btn" onClick={() => setFiltersOpen(true)}><Filter size={16} /></button>
                <div className="mv-search"><Search size={14} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search manga, author, genre..." /></div>
                <div className="mv-sort">
                  <select value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="rating">Rating</option>
                    <option value="ch">Chapters</option>
                    <option value="recent">New</option>
                  </select>
                </div>
                <div className="mv-toggle">
                  <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><LayoutGrid size={14} /></button>
                  <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={14} /></button>
                </div>
              </div>

              {pills.length > 0 && (
                <div className="mv-pill-row">{pills.map(p => <button key={p.k} className="mv-active-pill" onClick={p.off}>{p.l} <span>x</span></button>)}
                  <button className="mv-active-pill mv-clear" onClick={() => { setDemo([]); setStatus([]); setRange(""); }}>Clear</button>
                </div>
              )}

              <div className="mv-summary"><span>{filtered.length} series</span><span>{count > 0 ? `${count} filters` : "No filters"}</span></div>

              <AnimatePresence mode="wait">
                <motion.div key={`${view}-${sort}`} className={view === "grid" ? "mv-grid" : "mv-list"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AnimatePresence mode="popLayout">
                    {filtered.map(m => view === "grid" ? <Card key={m.id} m={m} onOpen={setPreview} /> : <ListCard key={m.id} m={m} onOpen={setPreview} />)}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>

              {filtered.length === 0 && (
                <div className="mv-empty">
                  <BookOpen size={32} />
                  <h3>No results</h3>
                  <p>Try adjusting your filters or search.</p>
                </div>
              )}
            </section>

            <aside className="mv-rail">
              <h3><TrendingUp size={14} /> Top Readers</h3>
              <div className="mv-rail-list">
                {topManga.map(m => (
                  <button key={m.id} className="mv-rail-item" onClick={() => setPreview(m)}>
                    <img src={m.cover} alt={m.title} />
                    <div><strong>{m.title}</strong><span>{Math.round(m.progress * 100)}% done</span></div>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </main>

        <Footer />

        <AnimatePresence>
          {preview && (
            <>
              <motion.div className="mv-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreview(null)} />
              <motion.aside className="mv-drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}>
                <button className="mv-drawer-close" onClick={() => setPreview(null)}><X size={16} /></button>
                <img src={preview.cover} alt={preview.title} className="mv-drawer-img" />
                <h2>{preview.title}</h2>
                <p className="mv-drawer-author">by {preview.author}</p>
                <p className="mv-drawer-text">{preview.desc}</p>
                <div className="mv-drawer-tags">{preview.genres.map(g => <span key={g}>{g}</span>)}<span>{preview.demo}</span></div>
                <div className="mv-drawer-stats"><span><BookOpen size={13} /> {preview.ch} chapters</span><span><Star size={13} /> {preview.rating}</span></div>
                <button className="mv-drawer-btn">Start Reading</button>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
