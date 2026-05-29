import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Star, TrendingUp } from 'lucide-react';
import { fetchSearchAnime } from '../services/anilistApi';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showPopout, setShowPopout] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const inputRef = useRef(null);
  const popoutRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (popoutRef.current && !popoutRef.current.contains(e.target) && e.target !== inputRef.current) {
        setShowPopout(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggleSidebar = () => window.dispatchEvent(new CustomEvent('sidebar-toggle'));

  const doSearch = (q) => {
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      setSearchQuery('');
      setShowPopout(false);
      inputRef.current?.blur();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') doSearch(searchQuery);
    if (e.key === 'Escape') setShowPopout(false);
  };

  const handleChange = (val) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setSearchResults([]); setShowPopout(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetchSearchAnime(val, 1);
        setSearchResults(res.data.slice(0, 8));
        setShowPopout(true);
      } catch { setSearchResults([]); }
    }, 300);
  };

  const handleFocus = () => {
    if (searchResults.length > 0) setShowPopout(true);
  };

  return (
    <nav className={`top-nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="top-nav-bg" />

      <div className="top-nav-left">
        <button className="top-nav-hamburger" onClick={toggleSidebar} aria-label="Toggle navigation">
          <Menu size={17} strokeWidth={1.75} />
        </button>
        <span className="top-nav-divider" />
        <button className="top-nav-brand" onClick={() => navigate('/home')} aria-label="Home">
          <span className="brand-dot" />
          <span className="brand-text">AnimeWch</span>
        </button>
      </div>

      <div className="top-nav-right">
        <div className="top-nav-search">
          <Search size={13} className="top-nav-search-icon" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
          />
          <span className="search-kbd">⌘K</span>
        </div>

        {showPopout && searchResults.length > 0 && (
          <div className="search-popout" ref={popoutRef}>
            <div className="search-popout-header">
              <TrendingUp size={12} strokeWidth={2} />
              <span>Results</span>
              <button
                className="search-popout-esc"
                onClick={() => { setShowPopout(false); inputRef.current?.blur(); }}
                aria-label="Close"
              >
                Esc
              </button>
            </div>
            {searchResults.map((item) => (
              <button
                key={item.id}
                className="search-popout-item"
                onClick={() => { navigate(`/anime/${item.id}?ep=1`); setShowPopout(false); setSearchQuery(''); inputRef.current?.blur(); }}
              >
                <div className="spi-img">
                  <img src={item.img} alt={item.name} />
                </div>
                <div className="spi-info">
                  <span className="spi-title">{item.name}</span>
                  <span className="spi-meta">
                    {item.rating && (
                      <span className="spi-rating"><Star size={10} strokeWidth={0} fill="#a855f7" /> {item.rating.toFixed(1)}</span>
                    )}
                    {item.episodes && <span>{item.episodes} EP</span>}
                    {item.year && <span>{item.year}</span>}
                  </span>
                </div>
              </button>
            ))}
            <button className="search-popout-footer" onClick={() => doSearch(searchQuery)}>
              <Search size={12} strokeWidth={2} />
              <span>View all results for "{searchQuery}"</span>
              <span className="search-popout-footer-arrow">→</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
