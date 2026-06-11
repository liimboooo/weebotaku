import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader } from "lucide-react";
import { GIPHY_LIMIT } from "../utils/constants";
import "./GifPicker.css";

const GIFS_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000/api") + "/gifs";

export default function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    inputRef.current?.focus();
    fetchTrending();
    return () => { mountedRef.current = false; clearTimeout(timerRef.current); };
  }, []);

  const fetchTrending = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${GIFS_URL}/trending?limit=${GIPHY_LIMIT}`);
      const text = await r.text();
      let d;
      try { d = JSON.parse(text); } catch { d = {}; }
      if (!mountedRef.current) return;
      if (!r.ok) { console.warn('[GifPicker] trending error:', d.error || text); setError(d.error || "Failed to load GIFs"); setResults([]); return; }
      setResults(d.data || []);
    } catch (e) {
      console.warn('[GifPicker] trending exception:', e);
      if (mountedRef.current) setError("Failed to load GIFs");
    }
    if (mountedRef.current) setLoading(false);
  };

  const searchGifs = useCallback(async (q) => {
    if (!q.trim()) { fetchTrending(); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${GIFS_URL}/search?q=${encodeURIComponent(q)}&limit=${GIPHY_LIMIT}`);
      const text = await r.text();
      let d;
      try { d = JSON.parse(text); } catch { d = {}; }
      if (!mountedRef.current) return;
      if (!r.ok) { console.warn('[GifPicker] search error:', d.error || text); setError(d.error || "Search failed"); setResults([]); return; }
      setResults(d.data || []);
    } catch (e) {
      console.warn('[GifPicker] search exception:', e);
      if (mountedRef.current) setError("Search failed");
    }
    if (mountedRef.current) setLoading(false);
  }, []);

  const handleQueryChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchGifs(v), 400);
  };

  const handleSelect = (gif) => {
    const url = gif.images?.fixed_height?.url || gif.images?.original?.url;
    if (url) onSelect(url);
  };

  return (
    <div className="awc-gif-picker">
      <div className="awc-gif-picker-header">
        <div className="awc-gif-picker-search">
          <Search size={14} className="awc-gif-picker-search-icon" />
          <input ref={inputRef} className="awc-gif-picker-input" type="text" placeholder="Search GIFs..." value={query} onChange={handleQueryChange} />
          {query && <button className="awc-gif-picker-clear" onClick={() => { setQuery(""); fetchTrending(); }}><X size={14} /></button>}
        </div>
        <button className="awc-gif-picker-close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="awc-gif-picker-grid">
        {loading && (
          <div className="awc-gif-picker-loading"><Loader size={20} className="awc-spin" /></div>
        )}
        {error && <div className="awc-gif-picker-error">{error}</div>}
        {!loading && !error && results.length === 0 && (
          <div className="awc-gif-picker-empty">No GIFs found</div>
        )}
        {!loading && results.map(gif => (
          <button key={gif.id} className="awc-gif-picker-item" onClick={() => handleSelect(gif)} title={gif.title || "GIF"}>
            <img src={gif.images?.fixed_height_small?.url || gif.images?.fixed_height?.url} alt={gif.title || "GIF"} loading="lazy" />
          </button>
        ))}
      </div>
      <div className="awc-gif-picker-footer">Powered by GIPHY</div>
    </div>
  );
}
