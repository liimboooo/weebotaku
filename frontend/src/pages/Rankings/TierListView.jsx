import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Star, Calendar, Globe, Lock } from 'lucide-react';
import * as tierlistService from '../../services/tierlistService';
import AnimatedPage from '../../components/AnimatedPage';
import Background from '../../components/Background';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import './TierLists.css';

const TIER_CONFIG = [
  { id: 's', label: 'S', color: '#a78bfa' },
  { id: 'a', label: 'A', color: '#ff8c00' },
  { id: 'b', label: 'B', color: '#ffd700' },
  { id: 'c', label: 'C', color: '#4dabf7' },
  { id: 'd', label: 'D', color: '#868e96' },
];

export default function TierListView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  useDocumentTitle(list?.name || "Tier List");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await tierlistService.getTierListById(id);
        if (res.success) {
          setList(res.data);
        } else {
          setError('Tier list not found');
        }
      } catch {
        setError('Failed to load tier list');
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <AnimatedPage>
        <div className="tierlists-page">
          <Background />
          <div className="tierlists-shell" style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(255,255,255,0.4)' }}>
            Loading...
          </div>
        </div>
      </AnimatedPage>
    );
  }

  if (error || !list) {
    return (
      <AnimatedPage>
        <div className="tierlists-page">
          <Background />
          <div className="tierlists-shell" style={{ textAlign: 'center', paddingTop: 80 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>{error || 'Not found'}</p>
            <button onClick={() => navigate('/arena/tier-lists')} className="tierlists-save-btn" style={{ display: 'inline-flex' }}>
              <ArrowLeft size={15} /> Back to tier lists
            </button>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  const user = list.user || {};
  const allItems = TIER_CONFIG.reduce((sum, t) => sum + (list.tiers[t.id]?.length || 0), 0) + (list.unranked?.length || 0);
  const rankedCount = allItems - (list.unranked?.length || 0);

  return (
    <AnimatedPage>
      <div className="tierlists-page">
        <Background />

        {tooltip && (
          <div
            className="tier-tooltip"
            style={{
              position: 'fixed',
              top: tooltip.y,
              left: tooltip.x,
              transform: 'translate(-50%, -100%)',
              marginTop: -12,
            }}
          >
            <div className="tier-tooltip-image">
              <img src={tooltip.item.image} alt={tooltip.item.name} />
            </div>
            <div className="tier-tooltip-info">
              <strong>{tooltip.item.name}</strong>
              <span>{tooltip.item.studio}</span>
              <span>Rating: {tooltip.item.rating?.toFixed(1)} / 10</span>
              {tooltip.item.genres?.length > 0 && (
                <span>Genres: {tooltip.item.genres.slice(0, 3).join(', ')}</span>
              )}
            </div>
          </div>
        )}

        <main className="tierlists-shell">
          <div className="tierlists-view-header">
            <button className="tierlists-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
            </button>
            <Link to={`/profile/${user.username}`} className="tierlists-view-user" style={{ textDecoration: 'none' }}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="tierlists-view-avatar" />
              ) : (
                <div className="tierlists-view-avatar tierlists-view-avatar--fallback">
                  {user.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <span className="tierlists-view-username">{user.username || 'Unknown'}</span>
                <span className="hud-clearance-badge" style={{ marginTop: 4 }}>Level {((user.username?.length || 0) % 5) + 1} Operator</span>
                <span className="tierlists-view-title">{list.title}</span>
              </div>
            </Link>
            <div className="tierlists-view-meta">
              <span><Calendar size={13} /> {new Date(list.createdAt).toLocaleDateString()}</span>
              <span>{list.isPublic ? <Globe size={13} /> : <Lock size={13} />} {list.isPublic ? 'PUBLIC' : 'CLASSIFIED'}</span>
              <span>{rankedCount} RANKED / {allItems} TOTAL</span>
            </div>
          </div>

          <div className="tierlists-board tierlists-board--view">
            {TIER_CONFIG.map((tier) => (
              <div key={tier.id} className="tier-row tier-row--view">
                <div className="tier-label" style={{ backgroundColor: tier.color }}>
                  <span>{tier.label}</span>
                </div>
                <div className="tier-items">
                  {(!list.tiers[tier.id] || list.tiers[tier.id].length === 0) && (
                    <span className="tier-placeholder">Empty</span>
                  )}
                  {(list.tiers[tier.id] || []).map((item) => (
                    <div
                      key={item.id}
                      className="tier-card tier-card--view"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ item, x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div className="tier-card-image">
                        {item.image ? (
                          <img src={item.image} alt={item.name} draggable={false} />
                        ) : (
                          <div className="tier-card-fallback">{item.name.charAt(0)}</div>
                        )}
                      </div>
                      <div className="tier-card-body">
                        <span className="tier-card-name">{item.name}</span>
                        <div className="tier-card-meta">
                          {item.rating > 0 && (
                            <span className="tier-card-rating">
                              <Star size={10} /> {item.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {list.unranked && list.unranked.length > 0 && (
              <div className="tierlists-unranked-section">
                <div className="tierlists-unranked-header">
                  <span>Unranked</span>
                  <span className="tierlists-unranked-count">{list.unranked.length} items</span>
                </div>
                <div className="tier-row tier-row--unranked tier-row--view">
                  <div className="tier-items">
                    {list.unranked.map((item) => (
                      <div
                        key={item.id}
                        className="tier-card tier-card--view"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({ item, x: rect.left + rect.width / 2, y: rect.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <div className="tier-card-image">
                          {item.image ? (
                            <img src={item.image} alt={item.name} draggable={false} />
                          ) : (
                            <div className="tier-card-fallback">{item.name.charAt(0)}</div>
                          )}
                        </div>
                        <div className="tier-card-body">
                          <span className="tier-card-name">{item.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </AnimatedPage>
  );
}
