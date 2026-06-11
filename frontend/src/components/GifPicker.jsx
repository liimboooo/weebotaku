import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader, Heart, TrendingUp, Clock } from "lucide-react";
import { GIPHY_LIMIT } from "../utils/constants";
import "./GifPicker.css";

const GIFS_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000/api") + "/gifs";

const FAV_KEY = "awc_gif_favorites";
const RECENT_KEY = "awc_gif_recent";
const RECENT_MAX = 24;
const FAV_MAX = 100;

const loadStore = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
};
const saveStore = (key, list) => {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* quota — ignore */ }
};

// Normalize an API item or a stored item into { id, title, preview, full }
const norm = (g) => {
  if (!g) return null;
  if (g.full) return g; // already a stored/normalized item
  const i = g.images || {};
  return {
    id: g.id,
    title: g.title || "",
    preview: i.fixed_height_small?.url || i.fixed_height?.url || "",
    full: i.fixed_height?.url || i.original?.url || "",
  };
};

export default function GifPicker({ onSelect, onClose }) {
  const [tab, setTab] = useState("trending"); // trending | recent | favorites
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState(() => loadStore(FAV_KEY));
  const [recent, setRecent] = useState(() => loadStore(RECENT_KEY));
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const searching = query.trim().length > 0;

  useEffect(() => {
    mountedRef.current = true;
    inputRef.current?.focus();
    fetchTrending();
    return () => { mountedRef.current = false; clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTrending = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${GIFS_URL}/trending?limit=${GIPHY_LIMIT}`);
      const text = await r.text();
      let d; try { d = JSON.parse(text); } catch { d = {}; }
      if (!mountedRef.current) return;
      if (!r.ok) { setError(d.error || "Failed to load GIFs"); setResults([]); return; }
      setResults((d.data || []).map(norm));
    } catch (e) {
      if (mountedRef.current) setError("Failed to load GIFs");
    }
    if (mountedRef.current) setLoading(false);
  };

  const searchGifs = useCallback(async (q) => {
    if (!q.trim()) { fetchTrending(); return; }
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${GIFS_URL}/search?q=${encodeURIComponent(q)}&limit=${GIPHY_LIMIT}`);
      const text = await r.text();
      let d; try { d = JSON.parse(text); } catch { d = {}; }
      if (!mountedRef.current) return;
      if (!r.ok) { setError(d.error || "Search failed"); setResults([]); return; }
      setResults((d.data || []).map(norm));
    } catch (e) {
      if (mountedRef.current) setError("Search failed");
    }
    if (mountedRef.current) setLoading(false);
  }, []);

  const handleQueryChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchGifs(v), 350);
  };

  const clearSearch = () => { setQuery(""); clearTimeout(timerRef.current); if (tab === "trending") fetchTrending(); };

  const pushRecent = (g) => {
    setRecent(prev => {
      const next = [g, ...prev.filter(x => x.id !== g.id)].slice(0, RECENT_MAX);
      saveStore(RECENT_KEY, next);
      return next;
    });
  };

  const handleSelect = (g) => {
    if (!g.full) return;
    pushRecent(g);
    onSelect(g.full);
  };

  const isFav = useCallback((id) => favorites.some(f => f.id === id), [favorites]);

  const toggleFav = (e, g) => {
    e.stopPropagation();
    setFavorites(prev => {
      const exists = prev.some(f => f.id === g.id);
      const next = exists ? prev.filter(f => f.id !== g.id) : [g, ...prev].slice(0, FAV_MAX);
      saveStore(FAV_KEY, next);
      return next;
    });
  };

  // Which list is shown right now
  let view = results;          // trending / search results
  if (!searching) {
    if (tab === "favorites") view = favorites;
    else if (tab === "recent") view = recent;
  }

  const emptyMsg = searching
    ? "No GIFs found"
    : tab === "favorites"
      ? "No favorites yet — tap the ♥ on any GIF"
      : tab === "recent"
        ? "GIFs you send will show up here"
        : "No GIFs found";

  const showLoading = loading && (searching || tab === "trending");
  const showError = error && (searching || tab === "trending");

  return (
    <div className="awc-gif-picker">
      <div className="awc-gif-picker-header">
        <div className="awc-gif-picker-search">
          <Search size={14} className="awc-gif-picker-search-icon" />
          <input ref={inputRef} className="awc-gif-picker-input" type="text" placeholder="Search GIFs..." value={query} onChange={handleQueryChange} />
          {query && <button className="awc-gif-picker-clear" onClick={clearSearch} title="Clear"><X size={14} /></button>}
        </div>
        <button className="awc-gif-picker-close" onClick={onClose} title="Close"><X size={16} /></button>
      </div>

      {!searching && (
        <div className="awc-gif-tabs">
          <button className={`awc-gif-tab ${tab === "trending" ? "active" : ""}`} onClick={() => { setTab("trending"); if (!results.length) fetchTrending(); }}>
            <TrendingUp size={13} /> Trending
          </button>
          <button className={`awc-gif-tab ${tab === "recent" ? "active" : ""}`} onClick={() => setTab("recent")}>
            <Clock size={13} /> Recent
          </button>
          <button className={`awc-gif-tab ${tab === "favorites" ? "active" : ""}`} onClick={() => setTab("favorites")}>
            <Heart size={13} /> Favorites{favorites.length ? ` ${favorites.length}` : ""}
          </button>
        </div>
      )}

      <div className="awc-gif-picker-grid">
        {showLoading && <div className="awc-gif-picker-loading"><Loader size={20} className="awc-spin" /></div>}
        {showError && <div className="awc-gif-picker-error">{error}</div>}
        {!showLoading && !showError && view.length === 0 && <div className="awc-gif-picker-empty">{emptyMsg}</div>}
        {!showLoading && view.map(g => (
          <div
            key={g.id}
            className="awc-gif-picker-item"
            role="button"
            tabIndex={0}
            title={g.title || "GIF"}
            onClick={() => handleSelect(g)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(g); } }}
          >
            <img src={g.preview || g.full} alt={g.title || "GIF"} loading="lazy" />
            <button
              className={`awc-gif-fav ${isFav(g.id) ? "active" : ""}`}
              onClick={(e) => toggleFav(e, g)}
              title={isFav(g.id) ? "Remove favorite" : "Add favorite"}
            >
              <Heart size={14} fill={isFav(g.id) ? "currentColor" : "none"} />
            </button>
          </div>
        ))}
      </div>
      <div className="awc-gif-picker-footer">Powered by GIPHY</div>
    </div>
  );
}
