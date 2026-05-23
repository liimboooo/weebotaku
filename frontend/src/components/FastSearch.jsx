import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Film, User, ArrowRight, Star, Clock, TrendingUp, Loader, Command } from 'lucide-react';
import { fetchSearchAnime, fetchTopAnime } from '../services/anilistApi';
import authService from '../services/authService';
import './FastSearch.css';

const DEBOUNCE_MS = 250;
const MAX_ANIME = 6;
const MAX_USERS = 4;

export default function FastSearch() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const overlayRef = useRef(null);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animeResults, setAnimeResults] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [trending, setTrending] = useState([]);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recentSearches') || '[]'); } catch { return []; }
  });

  const openSearch = useCallback(() => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setQuery('');
    setDebounced('');
    setAnimeResults([]);
    setUserResults([]);
    setSelectedIdx(-1);
  }, []);

  useEffect(() => {
    if (open && trending.length === 0) {
      fetchTopAnime(1, 'airing').then(r => setTrending(r.data.slice(0, 5))).catch(() => {});
    }
  }, [open, trending.length]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debounced.trim()) {
      setAnimeResults([]);
      setUserResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [anime, users] = await Promise.all([
          fetchSearchAnime(debounced, 1).then(r => r.data.slice(0, MAX_ANIME)).catch(() => []),
          authService.searchUsers(debounced).catch(() => []),
        ]);
        if (cancelled) return;
        setAnimeResults(anime);
        setUserResults(Array.isArray(users) ? users.slice(0, MAX_USERS) : []);
        setSelectedIdx(-1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (open) closeSearch();
        else openSearch();
      }
      if (e.key === 'Escape' && open) closeSearch();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, openSearch, closeSearch]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const totalItems = animeResults.length + userResults.length;
  const hasResults = animeResults.length > 0 || userResults.length > 0;
  const showIdle = !debounced.trim();

  const navigateToResult = (path) => {
    closeSearch();
    navigate(path);
  };

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    const recent = [q, ...recentSearches.filter(s => s !== q)].slice(0, 8);
    setRecentSearches(recent);
    localStorage.setItem('recentSearches', JSON.stringify(recent));
    closeSearch();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const removeRecent = (term, e) => {
    e.stopPropagation();
    const next = recentSearches.filter(s => s !== term);
    setRecentSearches(next);
    localStorage.setItem('recentSearches', JSON.stringify(next));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0 && selectedIdx < animeResults.length) {
        navigateToResult(`/anime/${animeResults[selectedIdx].id}/info`);
      } else if (selectedIdx >= animeResults.length) {
        const uIdx = selectedIdx - animeResults.length;
        navigateToResult(`/profile/${userResults[uIdx]?.username}`);
      } else {
        submitSearch();
      }
    }
  };

  return (
    <>
      <button className="fs-trigger" onClick={openSearch} aria-label="Search">
        <Search size={15} />
        <span className="fs-trigger-text">Search...</span>
        <kbd className="fs-trigger-kbd"><Command size={10} />K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fs-overlay"
            ref={overlayRef}
            onClick={(e) => { if (e.target === overlayRef.current) closeSearch(); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="fs-modal"
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              transition={{ duration: 0.2, ease: [0.2, 0.9, 0.2, 1] }}
            >
              {/* Search input */}
              <div className="fs-input-row">
                <Search size={18} className="fs-input-icon" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search anime, users..."
                  autoComplete="off"
                  spellCheck="false"
                />
                {query && (
                  <button className="fs-input-clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
                    <X size={14} />
                  </button>
                )}
                <button className="fs-input-esc" onClick={closeSearch}>esc</button>
              </div>

              {/* Content area */}
              <div className="fs-body">
                {loading && (
                  <div className="fs-loading">
                    <Loader size={16} className="fs-spin" />
                    <span>Searching...</span>
                  </div>
                )}

                {!loading && !hasResults && debounced.trim() && (
                  <div className="fs-empty">
                    <Search size={28} />
                    <span>No results for "{debounced}"</span>
                    <button className="fs-empty-action" onClick={submitSearch}>
                      Search with full filters <ArrowRight size={14} />
                    </button>
                  </div>
                )}

                {/* Idle state: recent + trending */}
                {showIdle && !loading && (
                  <div className="fs-idle">
                    {recentSearches.length > 0 && (
                      <div className="fs-group">
                        <div className="fs-group-header"><Clock size={13} /> Recent</div>
                        <div className="fs-group-items">
                          {recentSearches.slice(0, 5).map(term => (
                            <button key={term} className="fs-recent-item" onClick={() => { setQuery(term); }}>
                              <Clock size={14} />
                              <span>{term}</span>
                              <button className="fs-recent-remove" onClick={(e) => removeRecent(term, e)} aria-label="Remove"><X size={12} /></button>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {trending.length > 0 && (
                      <div className="fs-group">
                        <div className="fs-group-header"><TrendingUp size={13} /> Trending Now</div>
                        <div className="fs-trending-grid">
                          {trending.map(a => (
                            <button key={a.id} className="fs-trending-card" onClick={() => navigateToResult(`/anime/${a.id}/info`)}>
                              <img src={a.img} alt={a.name} />
                              <div className="fs-trending-info">
                                <span className="fs-trending-name">{a.name}</span>
                                <span className="fs-trending-meta">
                                  {a.rating > 0 && <><Star size={10} fill="currentColor" /> {a.rating.toFixed(1)}</>}
                                  {a.episodes > 0 && <> · {a.episodes} eps</>}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Anime results */}
                {!loading && animeResults.length > 0 && (
                  <div className="fs-group">
                    <div className="fs-group-header"><Film size={13} /> Anime</div>
                    <div className="fs-group-items">
                      {animeResults.map((item, i) => (
                        <button
                          key={item.id}
                          className={`fs-result-item${selectedIdx === i ? ' selected' : ''}`}
                          onClick={() => navigateToResult(`/anime/${item.id}/info`)}
                          onMouseEnter={() => setSelectedIdx(i)}
                        >
                          <div className="fs-result-poster">
                            <img src={item.img} alt={item.name} />
                          </div>
                          <div className="fs-result-info">
                            <span className="fs-result-title">{item.name}</span>
                            <span className="fs-result-meta">
                              {item.type || 'TV'}
                              {item.year ? ` · ${item.year}` : ''}
                              {item.episodes ? ` · ${item.episodes} eps` : ''}
                            </span>
                          </div>
                          {item.rating > 0 && (
                            <span className="fs-result-rating"><Star size={11} fill="currentColor" /> {item.rating.toFixed(1)}</span>
                          )}
                          <ArrowRight size={14} className="fs-result-arrow" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* User results */}
                {!loading && userResults.length > 0 && (
                  <div className="fs-group">
                    <div className="fs-group-header"><User size={13} /> Users</div>
                    <div className="fs-group-items">
                      {userResults.map((u, i) => {
                        const idx = animeResults.length + i;
                        return (
                          <button
                            key={u.id}
                            className={`fs-result-item${selectedIdx === idx ? ' selected' : ''}`}
                            onClick={() => navigateToResult(`/profile/${u.username}`)}
                            onMouseEnter={() => setSelectedIdx(idx)}
                          >
                            <div className="fs-result-avatar">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.username} />
                              ) : (
                                <span>{u.username.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="fs-result-info">
                              <span className="fs-result-title">{u.username}</span>
                              <span className="fs-result-meta">{u.statusMessage || u.bio || 'Member'}</span>
                            </div>
                            <ArrowRight size={14} className="fs-result-arrow" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer: view all */}
                {!loading && hasResults && (
                  <div className="fs-footer">
                    <button className="fs-view-all" onClick={submitSearch}>
                      <Search size={14} />
                      View all results with filters
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
