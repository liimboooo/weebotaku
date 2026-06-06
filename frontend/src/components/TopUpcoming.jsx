import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import api from '../services/api';
import './TopUpcoming.css';

const tagClass = (t) => `tu-tag tu-tag--${t.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

export default function TopUpcoming() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/catalog/upcoming?perPage=10');
        if (!cancelled && res.data) {
          setItems(res.data.map(a => ({
            id: String(a.id),
            title: a.name || 'Unknown',
            img: a.img || '',
            studio: a.studio || 'Unknown',
            date: a.season || 'TBA',
            desc: (a.synopsis || '').replace(/<[^>]*>/g, '').slice(0, 200),
            tags: (a.genres || []).slice(0, 3),
          })));
        }
      } catch (e) { console.error('[AnimeWch] Failed to load upcoming:', e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="tu-section">
        <header className="tu-header">
          <h2 className="tu-title">Top Upcoming</h2>
          <div className="tu-arrow" style={{ width: 32, height: 32 }} />
        </header>
        <div className="tu-scroll">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="tu-card tu-card--skeleton">
              <div className="tu-card-cover">
                <div className="tu-shimmer" style={{ width: '100%', height: '100%' }} />
              </div>
              <div className="tu-card-body">
                <div className="tu-shimmer" style={{ width: '60%', height: 12, borderRadius: 4, marginBottom: 8 }} />
                <div className="tu-shimmer" style={{ width: '90%', height: 10, borderRadius: 4, marginBottom: 6 }} />
                <div className="tu-shimmer" style={{ width: '40%', height: 10, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="tu-section">
      <header className="tu-header">
        <h2 className="tu-title">Top Upcoming</h2>
        <button className="tu-arrow" onClick={() => navigate('/browse/anime?status=NOT_YET_RELEASED')} aria-label="View all upcoming">
          <ArrowRight size={18} strokeWidth={2.4} />
        </button>
      </header>

      <div className="tu-scroll" ref={scrollRef}>
        {items.map((item) => (
          <Link key={item.id} to={`/anime/${item.id}/info`} className="tu-card">
            <div className="tu-card-cover">
              <img src={item.img} alt={item.title} loading="lazy" />
              <div className="tu-cover-overlay" />
              <div className="tu-cover-text">
                <h3 className="tu-cover-title">{item.title}</h3>
                <span className="tu-studio">
                  {item.studio}
                </span>
              </div>
            </div>

            <div className="tu-card-body">
              <span className="tu-date">{item.date}</span>
              <p className="tu-desc">{item.desc}</p>
              <div className="tu-tags">
                {item.tags.map((t) => (
                  <span key={t} className={tagClass(t)}>{t}</span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
