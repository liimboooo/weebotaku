import api from './api';

// ─── Helpers ────────────────────────────────────────────

function isLoggedIn() {
  return !!localStorage.getItem('token');
}

// ─── Migration ──────────────────────────────────────────

function migrateOldWatchlist() {
  const old = localStorage.getItem("animewatchlist");
  if (old) {
    try {
      const parsed = JSON.parse(old);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem("watchlist", old);
      }
    } catch {}
    localStorage.removeItem("animewatchlist");
  }
}
migrateOldWatchlist();

// ─── Watchlist (Anime) ─────────────────────────────────

export function loadWatchlist() {
  try {
    return JSON.parse(localStorage.getItem("watchlist") || "[]");
  } catch { return []; }
}

export function saveWatchlist(list) {
  localStorage.setItem("watchlist", JSON.stringify(list));
}

export function addToWatchlist(item) {
  const current = loadWatchlist();
  if (current.some(i => i.id === item.id)) return current;
  const entry = { ...item, type: "anime" };
  const next = [...current, entry];
  saveWatchlist(next);

  // Sync to backend
  if (isLoggedIn()) {
    api.post(`/anime/${item.id}/watchlist`, {
      name: item.name,
      img: item.img,
      rating: item.rating,
      episodes: item.episodes,
      year: item.year,
      status: item.status,
      genres: item.genres,
    }).catch(() => {});
  }

  return next;
}

export function removeFromWatchlist(id) {
  const current = loadWatchlist();
  const next = current.filter(i => i.id !== id);
  saveWatchlist(next);

  // Sync to backend
  if (isLoggedIn()) {
    api.delete(`/anime/${id}/watchlist`).catch(() => {});
  }

  return next;
}

export function isInWatchlist(id) {
  return loadWatchlist().some(i => i.id === id);
}

// ─── Readlist (Manga) ──────────────────────────────────

export function loadReadlist() {
  try {
    return JSON.parse(localStorage.getItem("mangareadlist") || "[]");
  } catch { return []; }
}

export function saveReadlist(list) {
  localStorage.setItem("mangareadlist", JSON.stringify(list));
}

export function addToReadlist(item) {
  const current = loadReadlist();
  if (current.some(i => i.id === item.id)) return current;
  const entry = { ...item, type: "manga" };
  const next = [...current, entry];
  saveReadlist(next);

  // Sync to backend
  if (isLoggedIn()) {
    api.post(`/manga/${item.id}/list`, {
      title: item.title,
      cover: item.cover,
      author: item.author,
      rating: item.rating,
      ch: item.ch,
      status: item.status,
      demo: item.demo,
    }).catch(() => {});
  }

  return next;
}

export function removeFromReadlist(id) {
  const current = loadReadlist();
  const next = current.filter(i => i.id !== id);
  saveReadlist(next);

  // Sync to backend
  if (isLoggedIn()) {
    api.delete(`/manga/${id}/list`).catch(() => {});
  }

  return next;
}

export function isInReadlist(id) {
  return loadReadlist().some(i => i.id === id);
}

// ─── Watch History Sync ────────────────────────────────

export function addToWatchHistory(animeId, episode, animeName, animeImg) {
  // Local
  const history = JSON.parse(localStorage.getItem("watchHistory") || "[]");
  history.unshift({ animeId, episode, timestamp: Date.now(), animeName: animeName || "", animeImg: animeImg || "" });
  if (history.length > 100) history.length = 100;
  localStorage.setItem("watchHistory", JSON.stringify(history));

  // Backend
  if (isLoggedIn()) {
    api.post(`/anime/${animeId}/history`, {
      animeId,
      episodeWatched: episode,
      animeName,
      animeImg,
    }).catch(() => {});
  }
}

// ─── Ratings Sync ──────────────────────────────────────

export function rateAnime(animeId, rating) {
  const ratings = JSON.parse(localStorage.getItem("userRatings") || "{}");
  ratings[animeId] = rating;
  localStorage.setItem("userRatings", JSON.stringify(ratings));

  if (isLoggedIn()) {
    api.post(`/anime/${animeId}/rate`, { rating }).catch(() => {});
  }
}

// ─── Like Sync ─────────────────────────────────────────

export function toggleLikeAnime(animeId) {
  const liked = JSON.parse(localStorage.getItem("likedAnime") || "[]");
  const idx = liked.indexOf(animeId);
  if (idx > -1) {
    liked.splice(idx, 1);
  } else {
    liked.push(animeId);
  }
  localStorage.setItem("likedAnime", JSON.stringify(liked));

  if (isLoggedIn()) {
    api.post(`/anime/${animeId}/like`).catch(() => {});
  }

  return liked;
}

// ─── Sync from backend on login ────────────────────────

export async function syncFromBackend() {
  if (!isLoggedIn()) return;

  try {
    const [watchlistRes, readlistRes, historyRes, ratingsRes, likedRes] = await Promise.allSettled([
      api.get('/anime/watchlist'),
      api.get('/manga/readlist'),
      api.get('/anime/history'),
      api.get('/anime/ratings'),
      api.get('/anime/liked'),
    ]);

    if (watchlistRes.status === 'fulfilled' && watchlistRes.value?.data?.length > 0) {
      // Map backend format to local format
      const mapped = watchlistRes.value.data.map(item => ({
        id: item.animeId,
        name: item.name,
        img: item.img,
        rating: item.rating,
        episodes: item.episodes,
        year: item.year,
        status: item.status,
        genres: item.genres || [],
        type: 'anime',
      }));
      saveWatchlist(mapped);
    }

    if (readlistRes.status === 'fulfilled' && readlistRes.value?.data?.length > 0) {
      const mapped = readlistRes.value.data.map(item => ({
        id: item.mangaId,
        title: item.title,
        cover: item.cover,
        author: item.author,
        rating: item.rating,
        ch: item.ch,
        status: item.status,
        demo: item.demo,
        type: 'manga',
      }));
      saveReadlist(mapped);
    }

    if (historyRes.status === 'fulfilled' && historyRes.value?.data?.length > 0) {
      const mapped = historyRes.value.data.map(item => ({
        animeId: item.animeId,
        episode: item.episode,
        timestamp: new Date(item.timestamp).getTime(),
      }));
      localStorage.setItem("watchHistory", JSON.stringify(mapped));
    }

    if (ratingsRes.status === 'fulfilled' && ratingsRes.value?.data) {
      localStorage.setItem("userRatings", JSON.stringify(ratingsRes.value.data));
    }

    if (likedRes.status === 'fulfilled' && likedRes.value?.data) {
      localStorage.setItem("likedAnime", JSON.stringify(likedRes.value.data));
    }
  } catch (err) {
    console.warn('Backend sync failed, using local data:', err);
  }
}
