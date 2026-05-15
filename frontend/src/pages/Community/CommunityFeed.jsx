import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import * as tierlistService from '../../services/tierlistService';
import AnimatedPage from '../../components/AnimatedPage';
import Background from '../../components/Background';
import './CommunityFeed.css';

export default function CommunityFeed() {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await tierlistService.getCommunityTierLists(page);
        if (res.success) {
          setLists(res.data);
          setPages(res.pages || 1);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [page]);

  return (
    <AnimatedPage>
      <div className="tierlists-page">
        <Background />
        <main className="tierlists-shell">
          <motion.div className="tierlists-header" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="tierlists-header-left">
              <span className="tierlists-eyebrow">Community</span>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>Community Tier Lists</h1>
            </div>
          </motion.div>

          {loading ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: 'rgba(255,255,255,0.4)' }}>
              Loading tier lists...
            </div>
          ) : lists.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: 'rgba(255,255,255,0.4)' }}>
              <Layers size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p>No public tier lists yet.</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>Be the first to create and share one!</p>
            </div>
          ) : (
            <>
              <div className="community-feed-grid">
                {lists.map((list, i) => {
                  const user = list.user || {};
                  const ranked = Object.values(list.tiers || {}).reduce((s, arr) => s + (arr?.length || 0), 0);
                  return (
                    <motion.div
                      key={list._id}
                      className="community-feed-card"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/tierlist/${list._id}`)}
                    >
                      <div className="community-feed-card-header">
                        <h4>{list.title}</h4>
                      </div>
                      <div className="community-feed-card-creator" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user.username}`); }}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} className="community-feed-avatar" />
                        ) : (
                          <div className="community-feed-avatar community-feed-avatar--fallback">
                            {user.username?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span>{user.username || 'Unknown'}</span>
                      </div>
                      <div className="community-feed-card-meta">
                        <span>{ranked} ranked items</span>
                        <span><Globe size={12} /> Public</span>
                      </div>
                      <div className="tierlist-profile-card-tiers">
                        {Object.entries(list.tiers || {}).map(([tier, items]) =>
                          items?.length > 0 ? (
                            <span key={tier} className="tierlist-profile-tier-pill" data-tier={tier}>
                              {tier.toUpperCase()}: {items.length}
                            </span>
                          ) : null
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {pages > 1 && (
                <div className="community-feed-pagination">
                  <button
                    className="community-feed-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="community-feed-page-info">{page} / {pages}</span>
                  <button
                    className="community-feed-page-btn"
                    disabled={page >= pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </AnimatedPage>
  );
}
