import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const [bgOpacity, setBgOpacity] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const onScroll = () => {
      const opacity = Math.min(1, window.scrollY / 100);
      setBgOpacity(opacity);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleSidebar = () => window.dispatchEvent(new CustomEvent('sidebar-toggle'));

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <nav className="top-nav">
      <div className="top-nav-bg" style={{ opacity: bgOpacity }} />
      <div className="top-nav-bg-border" style={{ opacity: Math.min(1, bgOpacity * 2) }} />
      <div className="top-nav-left">
        <button className="top-nav-hamburger" onClick={toggleSidebar} aria-label="Toggle navigation">
          <Menu size={20} />
        </button>
        <button className="top-nav-brand" onClick={() => navigate('/home')} aria-label="Home">
          Anime<span className="brand-highlight">Wch</span>
        </button>
      </div>

      <div className="top-nav-right">
        <div className="top-nav-search">
          <Search size={15} className="top-nav-search-icon" />
          <input
            type="text"
            placeholder="Search anime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>
    </nav>
  );
}
