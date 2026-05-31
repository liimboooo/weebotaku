import api from '../services/api';

const CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX = 100;
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.time > CACHE_TTL) return null;
  return entry.data;
}

function setCache(key, data) {
  if (cache.size >= CACHE_MAX) { const oldest = cache.keys().next().value; cache.delete(oldest); }
  cache.set(key, { data, time: Date.now() });
}

export async function getAllAnime() {
  const cached = getCached('allAnime');
  if (cached) return cached;
  try {
    const res = await api.get('/catalog/trending?perPage=50');
    const data = res.data || [];
    setCache('allAnime', data);
    return data;
  } catch { return []; }
}

export async function getAnimeById(id) {
  const k = `animeById:${id}`;
  const cached = getCached(k);
  if (cached) return cached;
  try {
    const res = await api.get(`/catalog/anime/${id}`);
    if (res.data) {
      setCache(k, res.data);
      return res.data;
    }
  } catch {}
  return null;
}

export async function searchAnime(query) {
  const k = `search:${query}`;
  const cached = getCached(k);
  if (cached) return cached;
  try {
    const res = await api.get(`/catalog/search?q=${encodeURIComponent(query)}&perPage=25`);
    const data = res.data || [];
    setCache(k, data);
    return data;
  } catch { return []; }
}

export async function getTrendingAnime() {
  const cached = getCached('trending');
  if (cached) return cached;
  try {
    const res = await api.get('/catalog/trending?perPage=10');
    const data = res.data || [];
    setCache('trending', data);
    return data;
  } catch { return []; }
}

export async function getFeaturedAnime() {
  const cached = getCached('featured');
  if (cached) return cached;
  try {
    const res = await api.get('/catalog/trending?perPage=4');
    const data = res.data || [];
    setCache('featured', data);
    return data;
  } catch { return []; }
}

export async function getNewEpisodes() {
  const cached = getCached('newEpisodes');
  if (cached) return cached;
  try {
    const res = await api.get('/catalog/airing?perPage=4');
    const data = res.data || [];
    setCache('newEpisodes', data);
    return data;
  } catch { return []; }
}

export async function getSeasonPicks() {
  const cached = getCached('seasonPicks');
  if (cached) return cached;
  try {
    const res = await api.get('/catalog/seasonal?perPage=6');
    const data = res.data || [];
    setCache('seasonPicks', data);
    return data;
  } catch { return []; }
}

export async function getLatestAnime() {
  const cached = getCached('latest');
  if (cached) return cached;
  try {
    const res = await api.get('/catalog/trending?perPage=6');
    const data = res.data || [];
    setCache('latest', data);
    return data;
  } catch { return []; }
}

export async function getAiringTodayAnime() {
  const cached = getCached('airingToday');
  if (cached) return cached;
  try {
    const res = await api.get('/catalog/airing?perPage=10');
    const data = res.data || [];
    setCache('airingToday', data);
    return data;
  } catch { return []; }
}

export async function getAllGenres() {
  const cached = getCached('genres');
  if (cached) return cached;
  try {
    const res = await api.get('/catalog/genres');
    const data = res.data || [];
    setCache('genres', data);
    return data;
  } catch {
    return ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Thriller'];
  }
}

export async function getSchedule() {
  const cached = getCached('schedule');
  if (cached) return cached;
  try {
    const res = await api.get('/catalog/schedule');
    const data = res.data || [];
    const grouped = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] };
    for (const item of data) {
      const date = new Date(item.airingAt * 1000);
      const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
      if (grouped[day]) grouped[day].push(item);
    }
    setCache('schedule', grouped);
    return grouped;
  } catch {
    return { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] };
  }
}
