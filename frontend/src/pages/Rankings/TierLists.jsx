import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { Save, LogIn, Search, X, Loader, Sparkles, Download } from 'lucide-react';
import * as tierlistService from '../../services/tierlistService';
import authService from '../../services/authService';
import html2canvas from 'html2canvas';
import AnimatedPage from '../../components/AnimatedPage';
import Background from '../../components/Background';
import DroppableTier from './DroppableTier';
import TierCard from './TierCard';
import './TierLists.css';

const TIER_CONFIG = [
  { id: 's', label: 'S', sub: 'PINNACLE', color: '#ff4444' },
  { id: 'a', label: 'A', sub: 'SUPERIOR', color: '#ff8c00' },
  { id: 'b', label: 'B', sub: 'GREAT', color: '#ffd700' },
  { id: 'c', label: 'C', sub: 'DECENT', color: '#4dabf7' },
  { id: 'd', label: 'D', sub: 'POOR', color: '#868e96' },
];

function buildEmptyTiers() {
  return { s: [], a: [], b: [], c: [], d: [], unranked: [] };
}

const JIKA_ANIME = 'https://api.jikan.moe/v4/anime?q={q}&limit=20&sfw=true';
const JIKA_MANGA = 'https://api.jikan.moe/v4/manga?q={q}&limit=20&sfw=true';
const TOP_ANIME = 'https://api.jikan.moe/v4/top/anime?limit=10&sfw=true';
const TOP_MANGA = 'https://api.jikan.moe/v4/top/manga?limit=10&sfw=true';

export default function TierLists() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const isLoggedIn = authService.isLoggedIn();
  const searchRef = useRef(null);
  const [tiers, setTiers] = useState(() => {
    const saved = localStorage.getItem('tierListDraft');
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return buildEmptyTiers();
  });
  const [title, setTitle] = useState(localStorage.getItem('tierListTitle') || 'My Tier List');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(localStorage.getItem('tierListSavedId') || null);
  const [loaded, setLoaded] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pulsingTier, setPulsingTier] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const autoSaveRef = useRef(null);
  const lastSavedRef = useRef(JSON.stringify(tiers));

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchType, setSearchType] = useState('anime');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchIndex, setSearchIndex] = useState(-1);

  const debounceRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('tierListDraft');
    if (stored) {
      try { setTiers(JSON.parse(stored)); } catch {} }
  }, []);

  useEffect(() => {
    if (isLoggedIn && !loaded) {
      (async () => {
        try {
          const res = await tierlistService.getUserTierLists(currentUser.id);
          if (res.success && res.data.length > 0) {
            const list = res.data[0];
            setTiers({
              s: list.tiers.s || [], a: list.tiers.a || [], b: list.tiers.b || [],
              c: list.tiers.c || [], d: list.tiers.d || [],
              unranked: [],
            });
            setTitle(list.title || 'My Tier List');
            setSavedId(list._id);
            localStorage.setItem('tierListSavedId', list._id);
          }
        } catch {}
        setLoaded(true);
        setInitialLoading(false);
      })();
    } else if (!isLoggedIn) {
      setLoaded(true);
      setInitialLoading(false);
    }
  }, [isLoggedIn, currentUser?.id, loaded]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem('tierListDraft', JSON.stringify(tiers));
      localStorage.setItem('tierListTitle', title);
    }
  }, [tiers, title, loaded]);

  // ─── Auto-save to backend with debounce ───────
  useEffect(() => {
    if (!loaded || !isLoggedIn) return;
    const current = JSON.stringify(tiers);
    if (current === lastSavedRef.current) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      lastSavedRef.current = current;
      try {
        const payload = { title, isPublic: true, tiers: {}, unranked: [] };
        for (const t of TIER_CONFIG) payload.tiers[t.id] = tiers[t.id];
        if (savedId) {
          await tierlistService.updateTierList(savedId, payload);
        } else {
          const res = await tierlistService.saveTierList(payload);
          if (res.success) {
            setSavedId(res.data._id);
            localStorage.setItem('tierListSavedId', res.data._id);
          }
        }
      } catch {}
    }, 1500);
    return () => clearTimeout(autoSaveRef.current);
  }, [tiers, title, loaded, isLoggedIn, savedId]);

  // ─── Set initialLoading false when no backend data ───
  useEffect(() => {
    if (loaded && !isLoggedIn) setInitialLoading(false);
  }, [loaded, isLoggedIn]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // ─── Search ───────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchIndex(-1); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const url = (searchType === 'manga' ? JIKA_MANGA : JIKA_ANIME).replace('{q}', encodeURIComponent(searchQuery));
        const res = await fetch(url);
        const json = await res.json();
        const items = (json.data || []).map((d) => ({
          id: `j-${d.mal_id}`,
          name: d.title,
          image: d.images?.jpg?.image_url || null,
          type: searchType,
          genres: (d.genres || []).map(g => g.name),
          malId: d.mal_id,
        }));
        setSearchResults(items);
        setSearchIndex(-1);
      } catch { setSearchResults([]); }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, searchType]);

  // ─── Reload suggestions on type toggle ────────
  useEffect(() => {
    if (searchQuery.trim()) return;
    (async () => {
      try {
        const url = searchType === 'manga' ? TOP_MANGA : TOP_ANIME;
        const res = await fetch(url);
        const json = await res.json();
        const items = (json.data || []).map((d) => ({
          id: `j-${d.mal_id}`,
          name: d.title,
          image: d.images?.jpg?.image_url || null,
          type: searchType,
          genres: (d.genres || []).map(g => g.name),
          malId: d.mal_id,
        }));
        setSearchResults(items);
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchType]);

  function getContentType() {
    for (const t of TIER_CONFIG) {
      const found = tiers[t.id].find(i => i.type);
      if (found) return found.type;
    }
    return null;
  }

  function handleAddFromSearch(item, tierId) {
    const existingType = getContentType();
    if (existingType && item.type && item.type !== existingType) {
      showToast(`Cannot add ${item.type} to a ${existingType} tier list`);
      return;
    }
    setTiers((prev) => {
      const exists = Object.values(prev).flat().some((i) => i.id === item.id);
      if (exists) return prev;
      return { ...prev, [tierId]: [...prev[tierId], item] };
    });
    setPulsingTier(tierId);
    setTimeout(() => setPulsingTier(null), 600);
  }

  function handleRemoveItem(itemId) {
    setTiers((prev) => {
      const next = { ...prev };
      for (const t of TIER_CONFIG) {
        next[t.id] = prev[t.id].filter(i => i.id !== itemId);
      }
      return next;
    });
  }

  function handleSearchKeyDown(e) {
    if (!searchResults.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchIndex((i) => (i < searchResults.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchIndex((i) => (i > 0 ? i - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter' && searchIndex >= 0) {
      e.preventDefault();
      const item = searchResults[searchIndex];
      handleAddFromSearch(item, 's');
      setSearchResults((prev) => prev.filter((_, i) => i !== searchIndex));
      setSearchIndex(-1);
    }
  }

  async function handleLoadTop() {
    setSearchLoading(true);
    try {
      const url = searchType === 'manga' ? TOP_MANGA : TOP_ANIME;
      const res = await fetch(url);
      const json = await res.json();
      const items = (json.data || []).map((d) => ({
        id: `j-${d.mal_id}`,
        name: d.title,
        image: d.images?.jpg?.image_url || null,
        type: searchType,
        malId: d.mal_id,
      }));
      setSearchResults(items);
      setSearchQuery('');
      setSearchIndex(-1);
      searchRef.current?.focus();
    } catch {}
    setSearchLoading(false);
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearchQuery('');
        setSearchIndex(-1);
        searchRef.current?.blur();
        (async () => {
          try {
            const url = searchType === 'manga' ? TOP_MANGA : TOP_ANIME;
            const res = await fetch(url);
            const json = await res.json();
            const items = (json.data || []).map((d) => ({
              id: `j-${d.mal_id}`,
              name: d.title,
              image: d.images?.jpg?.image_url || null,
              type: searchType,
              malId: d.mal_id,
            }));
            setSearchResults(items);
          } catch {}
        })();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Drag ──────────────────────────────────────
  function handleDragStart(event) {
    const { active } = event;
    for (const key of Object.keys(tiers)) {
      const item = tiers[key].find((i) => i.id === active.id);
      if (item) { setActiveItem(item); return; }
    }
    setActiveItem(active.data.current?.item || null);
  }

  function handleDragEnd(event) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;
    const from = Object.keys(tiers).find((k) => tiers[k].some((i) => i.id === active.id));
    const to = over.id;
    if (!to || from === to || to === 'unranked') return;

    setTiers((prev) => {
      if (!from) return prev;
      const item = prev[from].find((i) => i.id === active.id);
      if (!item) return prev;
      return {
        ...prev,
        [from]: prev[from].filter((i) => i.id !== active.id),
        [to]: [...prev[to], item],
      };
    });
    setPulsingTier(to);
    setTimeout(() => setPulsingTier(null), 600);
  }

  function handleDragCancel() { setActiveItem(null); }

  // ─── Save / Reset ─────────────────────────────
  async function handleSave() {
    if (!isLoggedIn) { showToast('Log in to save'); return; }
    setSaving(true);
    try {
      const payload = { title, isPublic: true, tiers: {}, unranked: [] };
      for (const t of TIER_CONFIG) payload.tiers[t.id] = tiers[t.id];
      const res = savedId
        ? await tierlistService.updateTierList(savedId, payload)
        : await tierlistService.saveTierList(payload);
      if (res.success) {
        setSavedId(res.data._id);
        localStorage.setItem('tierListSavedId', res.data._id);
        showToast('Saved to profile!');
      }
    } catch { showToast('Save failed'); }
    setSaving(false);
  }

  async function handleExport() {
    const el = document.querySelector('.tl-workspace');
    if (!el) return;
    try {
      const allItems = Object.values(tiers).flat().filter(Boolean);
      await Promise.allSettled(allItems.map(item => {
        if (!item.image) return null;
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = item.image;
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
      const canvas = await html2canvas(el, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch { showToast('Export failed'); }
  }

  function handleReset() {
    setTiers(buildEmptyTiers());
    setSavedId(null);
    setTitle('My Tier List');
    setSearchQuery('');
    setSearchResults([]);
    setSearchIndex(-1);
    localStorage.removeItem('tierListSavedId');
    localStorage.removeItem('tierListDraft');
    localStorage.removeItem('tierListTitle');
    setConfirmReset(false);
    lastSavedRef.current = JSON.stringify(buildEmptyTiers());
    showToast('Reset');
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
      shouldActivate: (event) => event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA',
    })
  );

  const tierCounts = {};
  for (const t of TIER_CONFIG) tierCounts[t.id] = tiers[t.id]?.length || 0;
  const rankedCount = Object.values(tierCounts).reduce((a, b) => a + b, 0);

  return (
    <AnimatedPage>
      <div className="tl-page">
        <Background />

        <AnimatePresence>
          {toast && (
            <motion.div className="tl-toast" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="tl-header">
          <div className="tl-header-left">
            <span className="tl-brand">ANIME TIERS</span>
            <div className="tl-title-group">
              <span className="tl-eyebrow">Live Room</span>
              <input className="tl-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={100} />
            </div>
          </div>
          <div className="tl-header-right">
            <div className="tl-stats">
              {TIER_CONFIG.map((t) => (
                <div key={t.id} className="tl-stat">
                  <span className="tl-stat-label" style={{ color: t.color }}>{t.label}</span>
                  <span className="tl-stat-value">{tierCounts[t.id]}</span>
                </div>
              ))}
              <div className="tl-stat tl-stat--total">
                <span className="tl-stat-label">Σ</span>
                <span className="tl-stat-value">{rankedCount}</span>
              </div>
            </div>
            <div className="tl-actions">
              <button className="tl-save" onClick={handleSave} disabled={saving}>
                <Save size={13} />
                <span>{saving ? 'SAVING...' : savedId ? 'SAVED' : 'SAVE'}</span>
              </button>
              <button className="tl-reset" onClick={() => setConfirmReset(true)}>RESET</button>
              <button className="tl-export" onClick={handleExport}><Download size={13} /> EXPORT</button>
              {!isLoggedIn && (
                <button className="tl-login" onClick={() => navigate('/')}>
                  <LogIn size={13} /> LOGIN
                </button>
              )}
            </div>
          </div>
        </div>

          {initialLoading ? (
            <div className="tl-center-loading"><Loader size={24} className="tl-ws-search-spin" /><p>Loading your tier list...</p></div>
          ) : (
          <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          <div className="tl-scroll">
          <div className="tl-workspace">
            {/* ── Search Bar ── */}
            <div className={`tl-ws-search ${searchFocused ? 'tl-ws-search--focused' : ''}`}>
              <div className="tl-ws-search-bar">
                <div className="tl-ws-search-icon"><Search size={14} /></div>
                <input
                  ref={searchRef}
                  className="tl-ws-search-input"
                  placeholder="Search anime or manga..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchLoading && <Loader size={14} className="tl-ws-search-spin" />}
                {searchQuery && (
                  <button className="tl-ws-search-clear" onClick={() => {
                    setSearchQuery('');
                    setSearchIndex(-1);
                    (async () => {
                      try {
                        const url = searchType === 'manga' ? TOP_MANGA : TOP_ANIME;
                        const res = await fetch(url);
                        const json = await res.json();
                        const items = (json.data || []).map((d) => ({
                          id: `j-${d.mal_id}`,
                          name: d.title,
                          image: d.images?.jpg?.image_url || null,
                          type: searchType,
                          malId: d.mal_id,
                        }));
                        setSearchResults(items);
                      } catch {}
                    })();
                  }}>
                    <X size={14} />
                  </button>
                )}
                <div className="tl-ws-search-toggle">
                  <button className={`tl-ws-stab ${searchType === 'anime' ? 'active' : ''}`} onClick={() => setSearchType('anime')}>ANIME</button>
                  <button className={`tl-ws-stab ${searchType === 'manga' ? 'active' : ''}`} onClick={() => setSearchType('manga')}>MANGA</button>
                </div>
                <button className="tl-ws-load-top" onClick={handleLoadTop} title="Load Top 10">
                  <Sparkles size={13} /> TOP
                </button>
              </div>

              <AnimatePresence>
                {searchFocused && (searchQuery || searchResults.length > 0) && (
                  <motion.div className="tl-ws-results" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                    <div className="tl-ws-results-inner">
                      {!searchQuery && searchResults.length > 0 && (
                        <div className="tl-ws-label">Suggestions</div>
                      )}
                      {searchLoading && <div className="tl-ws-empty">Searching...</div>}
                      {!searchLoading && searchResults.length === 0 && (
                        <div className="tl-ws-empty">No results</div>
                      )}
                      {searchResults.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`tl-ws-result ${idx === searchIndex ? 'tl-ws-result--active' : ''}`}
                          onMouseEnter={() => setSearchIndex(idx)}
                          onClick={() => handleAddFromSearch(item, 's')}
                        >
                          <div className="tl-ws-result-img">
                            {item.image ? <img src={item.image} alt="" draggable={false} /> : <div className="tl-ws-result-fallback">{item.name.charAt(0)}</div>}
                          </div>
                          <div className="tl-ws-result-name">{item.name}</div>
                          {item.genres?.length > 0 && (
                            <div className="tl-ws-result-genres">
                              {item.genres.slice(0, 3).join(' · ')}
                            </div>
                          )}
                          <div className="tl-ws-result-tiers">
                            {TIER_CONFIG.map((t) => (
                              <button
                                key={t.id}
                                className="tl-ws-tier-btn"
                                style={{ backgroundColor: t.color }}
                                onClick={(e) => { e.stopPropagation(); handleAddFromSearch(item, t.id); }}
                                title={`Add to ${t.label}`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Tier Rows ── */}
            <div className="tl-tiers">
              {TIER_CONFIG.map((tier, idx) => (
                <DroppableTier
                  key={tier.id} id={tier.id} label={tier.label}
                  color={tier.color} items={tiers[tier.id]} delay={idx * 0.05}
                  pulse={pulsingTier === tier.id} onRemove={handleRemoveItem}
                />
              ))}
            </div>
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeItem ? <TierCard item={activeItem} isDragOverlay /> : null}
          </DragOverlay>
        </DndContext>
        )}

        <AnimatePresence>
          {confirmReset && (
            <motion.div className="tl-confirm-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmReset(false)}>
              <motion.div className="tl-confirm-modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()}>
                <h3>Reset Tier List?</h3>
                <p>This will remove all items from your tier list. This cannot be undone.</p>
                <div className="tl-confirm-actions">
                  <button className="tl-confirm-cancel" onClick={() => setConfirmReset(false)}>Cancel</button>
                  <button className="tl-confirm-delete" onClick={handleReset}>Reset</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
