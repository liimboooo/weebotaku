import api from './api';
import { statusLabel } from "../utils/constants";

function mapAnime(a) {
  return {
    id: a.id,
    malId: a.malId || a.id,
    name: a.name || '',
    romaji: a.romaji || '',
    img: a.img || '',
    bannerImage: a.bannerImage || '',
    rating: a.rating || 0,
    votes: a.votes || 0,
    year: a.year || 0,
    episodes: a.episodes || 0,
    status: a.status ? statusLabel(a.status) : 'Unknown',
    genres: a.genres || [],
    synopsis: a.synopsis || '',
    studio: a.studio || '',
    season: a.season || '',
    type: a.type || 'TV',
    trailerUrl: a.trailerUrl || null,
    airingDay: null,
    currentEp: a.currentEp || a.episodes || 0,
    nextEpDate: a.nextEpDate || 'Ended',
    readProgress: 0,
  };
}

export async function gql() {
  throw new Error('Direct GraphQL calls are disabled. Use the backend API instead.');
}

export async function fetchDailySchedule(startUnix, endUnix) {
  try {
    const res = await api.get(`/catalog/schedule?start=${startUnix - 1}&end=${endUnix}`);
    return res.data || [];
  } catch {
    return [];
  }
}

export async function fetchSearchAnime(query, page = 1, options = {}) {
  try {
    const params = new URLSearchParams({ q: query, page });
    if (options.type && options.type !== 'All') params.set('type', options.type);
    if (options.status && options.status !== 'All') params.set('status', options.status);
    const res = await api.get(`/catalog/search?${params.toString()}`);
    return {
      data: (res.data || []).map(mapAnime),
      pagination: res.pagination || { hasNextPage: false, currentPage: page },
    };
  } catch {
    return { data: [], pagination: { hasNextPage: false, currentPage: page } };
  }
}

export async function fetchTopAnime(page = 1, filter = '') {
  try {
    const res = await api.get(`/catalog/top-rated?page=${page}&perPage=25&filter=${filter}`);
    return {
      data: (res.data || []).map(mapAnime),
      pagination: { hasNextPage: res.hasMore || false, currentPage: page },
    };
  } catch {
    return { data: [], pagination: { hasNextPage: false, currentPage: page } };
  }
}

export async function fetchSeasonalAnime(year, season) {
  try {
    const params = new URLSearchParams({ page: '1', perPage: '25' });
    if (year) params.set('year', year);
    if (season) params.set('season', season);
    const res = await api.get(`/catalog/seasonal?${params.toString()}`);
    return {
      data: (res.data || []).map(mapAnime),
      pagination: { hasNextPage: res.hasMore || false, currentPage: 1 },
    };
  } catch {
    return { data: [], pagination: { hasNextPage: false, currentPage: 1 } };
  }
}

export async function fetchAnimeTags() {
  try {
    const res = await api.get('/catalog/tags');
    return res.data || [];
  } catch {
    return ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Thriller'];
  }
}

export async function fetchAnimeGenres() {
  try {
    const res = await api.get('/catalog/genres');
    return res.data || [];
  } catch {
    return ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Thriller'];
  }
}

export async function fetchAnimeById(id) {
  try {
    const res = await api.get(`/catalog/anime/${id}`);
    if (res.data) return mapAnime(res.data);
    throw new Error('not found');
  } catch {
    throw new Error('Anime not found');
  }
}

export async function fetchAnimeCharacters(id) {
  try {
    const res = await api.get(`/catalog/anime/${id}/characters`);
    return res.data || [];
  } catch {
    return [];
  }
}

export async function fetchAnimeRecommendations(id) {
  try {
    const res = await api.get(`/catalog/anime/${id}/recommendations`);
    return res.data || [];
  } catch {
    return [];
  }
}

export async function fetchAiringSchedule({ anilistId, malId } = {}) {
  const id = anilistId || malId;
  if (!id) return { episodes: [], cours: null, nextAiring: null };
  try {
    const res = await api.get(`/catalog/anime/${id}/details`);
    if (!res.data) return { episodes: [], cours: null, nextAiring: null };
    return { episodes: [], cours: null, nextAiring: res.data.nextAiringEpisode || null };
  } catch {
    return { episodes: [], cours: null, nextAiring: null };
  }
}

export function clearCache() {}
