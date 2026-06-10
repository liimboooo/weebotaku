import api from './api';
import { STORAGE_KEYS } from '../utils/constants';

function isLoggedIn() {
  return !!localStorage.getItem(STORAGE_KEYS.TOKEN);
}

// â”€â”€â”€ Migration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function migrateOldWatchlist() {
  const old = localStorage.getItem(STORAGE_KEYS.ANIME_WATCHLIST);
  if (old) {
    try {
      const parsed = JSON.parse(old);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem(STORAGE_KEYS.WATCHLIST, old);
      }
    } catch {}
    localStorage.removeItem(STORAGE_KEYS.ANIME_WATCHLIST);
  }
}
migrateOldWatchlist();

// â”€â”€â”€ Watchlist (Anime) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function loadWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHLIST) || "[]");
  } catch { return []; }
}

export function saveWatchlist(list) {
  localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(STORAGE_KEYS.WATCHLIST_UPDATED));
}

export function addToWatchlist(item) {
  const current = loadWatchlist();
  const strId = String(item.id);
  if (current.some(i => String(i.id) === strId)) return current;
  const entry = { ...item, id: strId, type: "anime", listStatus: item.listStatus || "Planning" };
  const next = [...current, entry];
  saveWatchlist(next);

  if (isLoggedIn()) {
    api.post(`/anime/${item.id}/watchlist`, {
      name: item.name,
      img: item.img,
      rating: item.rating,
      episodes: item.episodes,
      year: item.year,
      status: item.status,
      genres: item.genres,
      listStatus: entry.listStatus,
    }).catch(err => console.error('[Otaku] Failed to sync watchlist to backend:', err));
  }

  return next;
}

export function removeFromWatchlist(id) {
  const current = loadWatchlist();
  const strId = String(id);
  const next = current.filter(i => String(i.id) !== strId);
  saveWatchlist(next);

  if (isLoggedIn()) {
    api.delete(`/anime/${id}/watchlist`).catch(err => console.error('[Otaku] Failed to remove watchlist item from backend:', err));
  }

  return next;
}

export function isInWatchlist(id) {
  const strId = String(id);
  return loadWatchlist().some(i => String(i.id) === strId);
}

export function updateListStatus(animeId, listStatus) {
  const current = loadWatchlist();
  const strId = String(animeId);
  const item = current.find(i => String(i.id) === strId);
  if (item) {
    item.listStatus = listStatus;
    saveWatchlist(current);
  }

  if (isLoggedIn()) {
    api.put('/auth/list-status', { animeId, listStatus }).catch(err => console.error('[Otaku] Failed to update list status on backend:', err));
  }
}

// â”€â”€â”€ Watch History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function loadWatchHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(STORAGE_KEYS.WATCH_HISTORY);
      return [];
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEYS.WATCH_HISTORY);
    return [];
  }
}

export function saveWatchHistory(history) {
  localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(history));
}

export function clearWatchHistory() {
  localStorage.removeItem(STORAGE_KEYS.WATCH_HISTORY);
}

export function removeFromWatchHistory(timestamp) {
  const history = loadWatchHistory();
  const updated = history.filter(h => h.timestamp !== timestamp);
  saveWatchHistory(updated);
  return updated;
}

export function addToWatchHistory(animeId, episode, animeName, animeImg, position = 0, totalEpisodes = 0) {
  let history = loadWatchHistory();
  const strId = String(animeId);
  const existingIdx = history.findIndex(h => String(h.animeId) === strId && h.episode === episode);
  if (existingIdx !== -1) {
    history.splice(existingIdx, 1);
  }
  history.unshift({ animeId, episode, position, timestamp: Date.now(), animeName: animeName || "", animeImg: animeImg || "", totalEpisodes });
  if (history.length > 100) history.length = 100;
  localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(history));
  try { window.dispatchEvent(new CustomEvent("history-updated")); } catch {}

  if (isLoggedIn()) {
    api.post(`/anime/${animeId}/history`, {
      animeId,
      episodeWatched: episode,
      position,
      animeName,
      animeImg,
    }).catch(err => console.error('[Otaku] Failed to sync watch history to backend:', err));
  }

  window.dispatchEvent(new CustomEvent(STORAGE_KEYS.PROFILE_DATA_CHANGED));
}

// â”€â”€â”€ Ratings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function loadRatings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_RATINGS) || "{}");
  } catch { return {}; }
}

export function rateAnime(animeId, rating) {
  const ratings = loadRatings();
  ratings[animeId] = rating;
  localStorage.setItem(STORAGE_KEYS.USER_RATINGS, JSON.stringify(ratings));

  if (isLoggedIn()) {
    api.post(`/anime/${animeId}/rate`, { rating }).catch(err => console.error('[Otaku] Failed to sync rating to backend:', err));
  }

  window.dispatchEvent(new CustomEvent(STORAGE_KEYS.PROFILE_DATA_CHANGED));
}

// â”€â”€â”€ Likes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function loadLikedAnime() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LIKED_ANIME) || "[]");
  } catch { return []; }
}

export function toggleLikeAnime(animeId) {
  const liked = loadLikedAnime();
  const idx = liked.indexOf(animeId);
  if (idx > -1) {
    liked.splice(idx, 1);
  } else {
    liked.push(animeId);
  }
  localStorage.setItem(STORAGE_KEYS.LIKED_ANIME, JSON.stringify(liked));

  if (isLoggedIn()) {
    api.post(`/anime/${animeId}/like`).catch(err => console.error('[Otaku] Failed to sync like to backend:', err));
  }

  window.dispatchEvent(new CustomEvent(STORAGE_KEYS.PROFILE_DATA_CHANGED));

  return liked;
}

// â”€â”€â”€ Full sync from backend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function syncFromBackend() {
  if (!isLoggedIn()) return;

  try {
    const res = await api.get('/auth/me');
    if (!res.success || !res.user) return;

    const u = res.user;

    // Store full user object
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
    localStorage.setItem(STORAGE_KEYS.USERNAME, u.username);
    localStorage.setItem(STORAGE_KEYS.USER_AVATAR, u.avatar || '');
    if (u.memberSince) localStorage.setItem(STORAGE_KEYS.MEMBER_SINCE, String(u.memberSince));
    if (u.socialLinks) localStorage.setItem(STORAGE_KEYS.SOCIAL_LINKS, JSON.stringify(u.socialLinks));

    // Watchlist — merge remote into local (remote wins on conflict, but keeps local additions)
    if (u.watchlist && u.watchlist.length > 0) {
      const local = loadWatchlist();
      const remoteMap = {};
      u.watchlist.forEach(item => {
        const id = String(item.animeId);
        remoteMap[id] = {
          id,
          name: item.name,
          img: item.img,
          rating: item.rating,
          episodes: item.episodes,
          year: item.year,
          status: item.status,
          genres: item.genres || [],
          listStatus: item.listStatus || 'Planning',
          type: 'anime',
        };
      });
      // Keep local items not on remote, override with remote items
      const merged = local.filter(i => !remoteMap[String(i.id)]);
      Object.values(remoteMap).forEach(r => merged.push(r));
      saveWatchlist(merged);
    }

    // Watch history
    if (u.watchHistory && u.watchHistory.length > 0) {
      const mapped = u.watchHistory.map(item => ({
        animeId: item.animeId,
        episode: item.episode,
        position: item.position || 0,
        timestamp: new Date(item.timestamp).getTime(),
        animeName: item.animeName || "",
        animeImg: item.animeImg || "",
      }));
      localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(mapped));
    }

    // Ratings
    if (u.ratings && Object.keys(u.ratings).length > 0) {
      localStorage.setItem(STORAGE_KEYS.USER_RATINGS, JSON.stringify(u.ratings));
    }

    // Liked
    if (u.likedAnime) {
      localStorage.setItem(STORAGE_KEYS.LIKED_ANIME, JSON.stringify(u.likedAnime));
    }

    window.dispatchEvent(new CustomEvent(STORAGE_KEYS.PROFILE_DATA_CHANGED));
    window.dispatchEvent(new CustomEvent(STORAGE_KEYS.WATCHLIST_UPDATED));
    window.dispatchEvent(new CustomEvent(STORAGE_KEYS.PROFILE_AVATAR_UPDATED));
  } catch (err) {
    console.warn('Backend sync failed, using local data:', err);
  }
}





