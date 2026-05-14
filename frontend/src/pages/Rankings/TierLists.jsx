import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { Save, Lock, Globe, LogIn } from 'lucide-react';
import { getAllAnime } from '../../data/animeData';
import * as tierlistService from '../../services/tierlistService';
import authService from '../../services/authService';
import AnimatedPage from '../../components/AnimatedPage';
import Background from '../../components/Background';
import DroppableTier from './DroppableTier';
import TierCard from './TierCard';
import './TierLists.css';

const TIER_CONFIG = [
  { id: 's', label: 'S', color: '#ff4444' },
  { id: 'a', label: 'A', color: '#ff8c00' },
  { id: 'b', label: 'B', color: '#ffd700' },
  { id: 'c', label: 'C', color: '#4dabf7' },
  { id: 'd', label: 'D', color: '#868e96' },
];

function buildInitialItems() {
  return getAllAnime().map((anime) => ({
    id: `anime-${anime.id}`,
    name: anime.name,
    image: anime.img || '',
    rating: anime.rating || 0,
    studio: anime.studio || '',
    genres: anime.genres || [],
    votes: anime.votes || 0,
  }));
}

function buildEmptyTiers() {
  return { s: [], a: [], b: [], c: [], d: [], unranked: [] };
}

export default function TierLists() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const isLoggedIn = authService.isLoggedIn();

  const [tiers, setTiers] = useState(() => {
    const saved = localStorage.getItem('tierListDraft');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return { ...buildEmptyTiers(), unranked: buildInitialItems() };
  });
  const [title, setTitle] = useState(localStorage.getItem('tierListTitle') || 'My Tier List');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(localStorage.getItem('tierListSavedId') || null);
  const [loaded, setLoaded] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [toast, setToast] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    if (isLoggedIn && !loaded) {
      (async () => {
        try {
          const res = await tierlistService.getUserTierLists(currentUser.id);
          if (res.success && res.data.length > 0) {
            const list = res.data[0];
            setTiers({
              s: list.tiers.s || [],
              a: list.tiers.a || [],
              b: list.tiers.b || [],
              c: list.tiers.c || [],
              d: list.tiers.d || [],
              unranked: list.unranked?.length ? list.unranked : [],
            });
            setTitle(list.title || 'My Tier List');
            setIsPublic(list.isPublic !== false);
            setSavedId(list._id);
            localStorage.setItem('tierListSavedId', list._id);
          }
        } catch { /* no saved list */ }
        setLoaded(true);
      })();
    } else if (!isLoggedIn) {
      setLoaded(true);
    }
  }, [isLoggedIn, currentUser?.id, loaded]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem('tierListDraft', JSON.stringify(tiers));
      localStorage.setItem('tierListTitle', title);
    }
  }, [tiers, title, loaded]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  function findContainer(id) {
    for (const key of Object.keys(tiers)) {
      if (tiers[key].some((item) => item.id === id)) return key;
    }
    return null;
  }

  function handleDragStart(event) {
    const { active } = event;
    const container = findContainer(active.id);
    if (container) {
      const item = tiers[container].find((i) => i.id === active.id);
      setActiveItem(item || null);
    }
  }

  function handleDragEnd(event) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = findContainer(active.id);
    const to = over.id;

    if (!from || !to || from === to) return;

    const item = tiers[from].find((i) => i.id === active.id);
    if (!item) return;

    setTiers((prev) => ({
      ...prev,
      [from]: prev[from].filter((i) => i.id !== active.id),
      [to]: [...prev[to], item],
    }));
  }

  function handleDragCancel() {
    setActiveItem(null);
  }

  async function handleSave() {
    if (!isLoggedIn) {
      showToast('Log in to save your tier list');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title,
        isPublic,
        tiers: { s: tiers.s, a: tiers.a, b: tiers.b, c: tiers.c, d: tiers.d },
        unranked: tiers.unranked,
      };
      let res;
      if (savedId) {
        res = await tierlistService.updateTierList(savedId, payload);
      } else {
        res = await tierlistService.saveTierList(payload);
      }
      if (res.success) {
        setSavedId(res.data._id);
        localStorage.setItem('tierListSavedId', res.data._id);
        showToast('Tier list saved!');
      }
    } catch {
      showToast('Failed to save');
    }
    setSaving(false);
  }

  function handleReset() {
    setTiers({ ...buildEmptyTiers(), unranked: buildInitialItems() });
    setSavedId(null);
    setTitle('My Tier List');
    localStorage.removeItem('tierListSavedId');
    localStorage.removeItem('tierListDraft');
    localStorage.removeItem('tierListTitle');
    showToast('Reset to default');
  }

  const allItemsCount = Object.values(tiers).reduce((sum, arr) => sum + arr.length, 0);
  const rankedCount = allItemsCount - tiers.unranked.length;

  return (
    <AnimatedPage>
      <div className="tierlists-page">
        <Background />

        {toast && (
          <div className="tier-toast">
            <span>{toast}</span>
          </div>
        )}

        <main className="tierlists-shell">
          <motion.div className="tierlists-header" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="tierlists-header-left">
              <span className="tierlists-eyebrow">Tier lists</span>
              <input
                className="tierlists-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Tier List"
                maxLength={100}
              />
            </div>
            <div className="tierlists-header-right">
              <div className="tierlists-stats">
                <span className="tierlists-stat">{rankedCount} ranked</span>
                <span className="tierlists-stat-divider" />
                <span className="tierlists-stat">{allItemsCount} total</span>
              </div>
              <button
                className={`tierlists-visibility ${isPublic ? 'public' : 'private'}`}
                onClick={() => setIsPublic((p) => !p)}
                title={isPublic ? 'Public' : 'Private'}
              >
                {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                <span>{isPublic ? 'Public' : 'Private'}</span>
              </button>
              <button className="tierlists-save-btn" onClick={handleSave} disabled={saving}>
                <Save size={15} />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
              <button className="tierlists-reset-btn" onClick={handleReset} title="Reset">
                Reset
              </button>
            </div>
          </motion.div>

          {!isLoggedIn && (
            <motion.div className="tierlists-login-banner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <LogIn size={16} />
              <span>Log in to save and share your tier lists</span>
              <button onClick={() => navigate('/')}>Log in</button>
            </motion.div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="tierlists-board">
              {TIER_CONFIG.map((tier, idx) => (
                <DroppableTier
                  key={tier.id}
                  id={tier.id}
                  label={tier.label}
                  color={tier.color}
                  items={tiers[tier.id]}
                  delay={idx * 0.05}
                />
              ))}

              <div className="tierlists-unranked-section">
                <div className="tierlists-unranked-header">
                  <span>Unranked</span>
                  <span className="tierlists-unranked-count">{tiers.unranked.length} items</span>
                </div>
                <DroppableTier id="unranked" label="" color="" items={tiers.unranked} isUnranked />
              </div>
            </div>

            <DragOverlay>
              {activeItem ? <TierCard item={activeItem} isDragOverlay /> : null}
            </DragOverlay>
          </DndContext>
        </main>
      </div>
    </AnimatedPage>
  );
}
