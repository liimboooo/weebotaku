import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, SlidersHorizontal, X } from 'lucide-react';
import { fetchSearchAnime, fetchTopAnime } from '../services/anilistApi';
import './SpotlightSearch.css';

const DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 8;
const TRENDING_CACHE_KEY = 'spotlight_trending_cache';

function highlightMatch(text, query) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i}>{part}</mark>
      : part
  );
}

function loadTrendingCache() {
  try {
    const raw = localStorage.getItem(TRENDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > 1800000) {
      localStorage.removeItem(TRENDING_CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function saveTrendingCache(data) {
  try {
    localStorage.setItem(TRENDING_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export default function SpotlightSearch({ open, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [trending, setTrending] = useState(() => loadTrendingCache() || []);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);

  const hasTrending = trending.length > 0;

  useEffect(() => {
    if (open) {
      setQuery('');
      setDebounced('');
      setSuggestions([]);
      setSelectedIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    if (!open || hasTrending || trendingLoading) return;
    setTrendingLoading(true);
    fetchTopAnime(1, 'trending')
      .then(r => {
        if (r.data?.length > 0) {
          const items = r.data.slice(0, 6);
          setTrending(items);
          saveTrendingCache(items);
        }
      })
      .catch(() => {
        const cached = loadTrendingCache();
        if (cached) setTrending(cached);
      })
      .finally(() => setTrendingLoading(false));
  }, [open, hasTrending, trendingLoading]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debounced.trim()) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchSearchAnime(debounced, 1);
        if (cancelled) return;
        setSuggestions(res.data.slice(0, MAX_SUGGESTIONS));
        setSelectedIdx(-1);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debounced]);

  const handleClose = useCallback(() => {
    setQuery('');
    setDebounced('');
    setSuggestions([]);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleKeyDown = (e) => {
    const total = suggestions.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0 && selectedIdx < suggestions.length) {
        const item = suggestions[selectedIdx];
        handleClose();
        navigate(`/anime/${item.id}?ep=1`);
      } else if (query.trim()) {
        handleClose();
        navigate(`/browse/anime?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const handleTrendingClick = (name) => {
    setQuery(name);
    setDebounced(name);
    setSelectedIdx(-1);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (item) => {
    handleClose();
    navigate(`/anime/${item.id}?ep=1`);
  };

  const showTrending = !debounced.trim() && !query.trim();
  const showSuggestions = debounced.trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ss-backdrop"
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        />
      )}

      {open && (
        <motion.div
          className="ss-panel"
          style={{ left: '50%' }}
          initial={{ opacity: 0, y: -10, x: '-50%', scale: 0.98 }}
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: -10, x: '-50%', scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="ss-input-row">
            <Search size={16} className="ss-input-icon" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search anime..."
              autoComplete="off"
              spellCheck="false"
            />
            {query && (
              <button
                className="ss-clear-btn"
                onClick={() => { setQuery(''); setDebounced(''); setSuggestions([]); inputRef.current?.focus(); }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
            <button
              className="ss-filter-btn"
              onClick={() => { handleClose(); navigate('/browse/anime'); }}
              aria-label="Open search filters"
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>

          <div className="ss-body">
            {showTrending && (
              <div className="ss-empty">
                <p className="ss-empty-prompt">What do you wanna watch today?</p>
                {hasTrending && (
                  <div className="ss-trending-section">
                    <div className="ss-trending-header">
                      <TrendingUp size={13} />
                      <span>Trending Now</span>
                    </div>
                    <div className="ss-trending-list">
                      {trending.map((item, i) => (
                        <button
                          key={item.id || i}
                          className="ss-trending-item"
                          onClick={() => handleTrendingClick(item.name || item.title?.english || item.title?.romaji || '')}
                        >
                          <span className="ss-trending-rank">{String(i + 1).padStart(2, '0')}</span>
                          <span className="ss-trending-name">
                            {item.name || item.title?.english || item.title?.romaji}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="ss-loading">
                <span>Searching…</span>
              </div>
            )}

            {showSuggestions && !loading && suggestions.length === 0 && (
              <div className="ss-no-results">
                <span>No results for "{debounced}"</span>
              </div>
            )}

            {showSuggestions && !loading && suggestions.length > 0 && (
              <div className="ss-suggestions">
                {suggestions.map((item, i) => (
                  <button
                    key={item.id}
                    className="ss-suggestion-item"
                    onClick={() => handleSuggestionClick(item)}
                    onMouseEnter={() => setSelectedIdx(i)}
                    style={{ background: selectedIdx === i ? 'rgba(255,255,255,0.06)' : 'transparent' }}
                  >
                    <div className="ss-suggestion-info">
                      <span className="ss-suggestion-title">
                        {highlightMatch(item.name, debounced)}
                      </span>
                    </div>
                    <span className="ss-suggestion-tag">
                      {item.type === 'TV' ? 'Series' : item.type === 'MOVIE' ? 'Movie' : item.type || 'Series'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
