const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX = 50;
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { data, time: Date.now() });
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

async function jikanFetch(endpoint) {
  const cached = getCached(endpoint);
  if (cached) return cached;

  // Try backend proxy first (handles CORS, longer timeout)
  try {
    const proxyUrl = `${API_BASE}/scrape/jikan-proxy?path=${encodeURIComponent(endpoint)}`;
    const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(25000) });
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json.success) {
        const data = json.data;
        setCache(endpoint, data);
        return data;
      }
    }
  } catch {}

  // Fallback to direct Jikan API with rate limiting
  const BASE_URL = "https://api.jikan.moe/v4";
  const MIN_INTERVAL = 1100;
  const RETRY_DELAY = 2000;
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
    await new Promise(r => setTimeout(r, MIN_INTERVAL));
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`);
      if (res.ok) {
        const json = await res.json();
        setCache(endpoint, json);
        return json;
      }
      if (res.status !== 429) throw new Error(`Jikan error: ${res.status}`);
    } catch {}
  }
  throw new Error('Jikan unavailable');
}

function mapAnime(a) {
  return {
    id: a.mal_id,
    name: a.title_english || a.title,
    img: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || "",
    rating: a.score || 0,
    votes: a.scored_by || 0,
    year: a.year || (a.aired?.from ? new Date(a.aired.from).getFullYear() : 0),
    episodes: a.episodes || 0,
    status: a.status === "Currently Airing" ? "Ongoing" : a.status === "Finished Airing" ? "Completed" : a.status || "Unknown",
    genres: a.genres?.map(g => g.name) || [],
    synopsis: a.synopsis || "",
    studio: a.studios?.[0]?.name || "Unknown",
    season: a.season ? `${a.season.charAt(0).toUpperCase() + a.season.slice(1)} ${a.year || ""}` : "Unknown",
    type: a.type || "TV",
    trailerUrl: a.trailer?.embed_url || null,
    airingDay: null,
    currentEp: a.episodes || 0,
    nextEpDate: a.status === "Currently Airing" ? "TBD" : "Ended",
    readProgress: 0,
  };
}

function mapManga(m) {
  return {
    id: m.mal_id,
    title: m.title,
    author: m.authors?.[0]?.name || "Unknown",
    cover: m.images?.jpg?.large_image_url || m.images?.jpg?.image_url || "",
    demo: m.demographics?.[0]?.name || "Unknown",
    status: m.status === "Publishing" ? "Ongoing" : m.status === "Finished" ? "Completed" : m.status || "Unknown",
    ch: m.chapters || 0,
    volumes: m.volumes || 0,
    last: (m.chapters || 0) > 0 ? Math.floor((m.chapters || 0) * 0.8) : 0,
    rating: m.score || 0,
    genres: m.genres?.map(g => g.name) || [],
    desc: m.synopsis || "",
    progress: 0,
  };
}

export async function fetchSearchAnime(query, page = 1) {
  try {
    const json = await jikanFetch(`/anime?q=${encodeURIComponent(query)}&page=${page}&order_by=score&sort=desc`);
    return { data: json.data.map(mapAnime), pagination: json.pagination };
  } catch {
    return anilistSearchAnime(query);
  }
}

export async function fetchTopAnime(page = 1, filter = "") {
  try {
    const json = await jikanFetch(`/top/anime?page=${page}${filter ? `&filter=${filter}` : ""}`);
    return { data: json.data.map(mapAnime), pagination: json.pagination };
  } catch {
    return anilistTopAnime();
  }
}

export async function fetchSeasonalAnime(year, season) {
  try {
    const y = year || new Date().getFullYear();
    const s = season || getCurrentSeason();
    const json = await jikanFetch(`/seasons/${y}/${s}`);
    return { data: json.data.map(mapAnime), pagination: json.pagination };
  } catch {
    return anilistSeasonalAnime(year, season);
  }
}

export async function fetchAnimeGenres() {
  try {
    const json = await jikanFetch("/genres/anime");
    return json.data.map(g => g.name);
  } catch {
    return ["Action","Adventure","Comedy","Drama","Fantasy","Horror","Mystery","Romance","Sci-Fi","Slice of Life","Sports","Thriller"];
  }
}

export async function fetchAnimeById(id) {
  const json = await jikanFetch(`/anime/${id}`);
  return mapAnime(json.data);
}

export async function fetchAnimeCharacters(id) {
  const json = await jikanFetch(`/anime/${id}/characters`);
  return json.data.slice(0, 10).map(c => ({
    id: c.character.mal_id,
    name: c.character.name,
    image: c.character.images?.jpg?.image_url || "",
    role: c.role,
    voiceActor: c.voice_actors?.[0] ? {
      name: c.voice_actors[0].person.name,
      image: c.voice_actors[0].person.images?.jpg?.image_url || "",
      lang: c.voice_actors[0].language,
    } : null,
  }));
}

export async function fetchAnimeRecommendations(id) {
  const json = await jikanFetch(`/anime/${id}/recommendations`);
  return json.data.slice(0, 8).map(r => ({
    id: r.entry.mal_id,
    name: r.entry.title,
    image: r.entry.images?.jpg?.image_url || "",
    url: r.url,
    votes: r.votes || 0,
  }));
}

export async function fetchTopManga(page = 1) {
  try {
    const json = await jikanFetch(`/top/manga?page=${page}`);
    return { data: json.data.map(mapManga), pagination: json.pagination };
  } catch {
    return anilistTopManga();
  }
}

export async function fetchSearchManga(query, page = 1) {
  try {
    const json = await jikanFetch(`/manga?q=${encodeURIComponent(query)}&page=${page}&order_by=score&sort=desc`);
    return { data: json.data.map(mapManga), pagination: json.pagination };
  } catch {
    return anilistSearchManga(query);
  }
}

const ANILIST = "https://graphql.anilist.co";
async function anilistGraphQL(query) {
  const r = await fetch(ANILIST, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query})});
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0]?.message);
  return j.data;
}

function anilistMapAnime(a) {
  return {
    id: a.id, name: a.title?.english||a.title?.romaji||"", img: a.coverImage?.large||"",
    rating: (a.averageScore||0)/10, votes: 0, year: a.seasonYear||0,
    episodes: a.episodes||0, status: a.status==="RELEASING"?"Ongoing":a.status==="FINISHED"?"Completed":a.status||"Unknown",
    genres: a.genres||[], synopsis: a.description||"", studio: a.studios?.nodes?.[0]?.name||"Unknown",
    season: a.season?a.season.charAt(0)+a.season.slice(1).toLowerCase()+" "+(a.seasonYear||""):"Unknown",
    type: "TV", trailerUrl: null, airingDay: null, currentEp: a.episodes||0, nextEpDate: "TBD", readProgress: 0,
  };
}

function anilistMapManga(m) {
  return {
    id: m.id, title: m.title?.english||m.title?.romaji||"", author: m.author?.[0]?.name||"Unknown",
    cover: m.coverImage?.large||"", demo: "Unknown",
    status: m.status==="RELEASING"?"Ongoing":m.status==="FINISHED"?"Completed":m.status||"Unknown",
    ch: m.chapters||0, volumes: m.volumes||0, last: Math.floor((m.chapters||0)*0.8)||0,
    rating: (m.averageScore||0)/10, genres: m.genres||[], desc: m.description||"", progress: 0,
  };
}

async function anilistSearchAnime(query) {
  const q = `{Page(page:1,perPage:25){media(search:"${query.replace(/"/g,'')}",type:ANIME,sort:SEARCH_MATCH){id title{romaji english}coverImage{large}averageScore episodes genres description status season seasonYear studios(isMain:true){nodes{name}}}}}`;
  const d = await anilistGraphQL(q);
  return {data: (d?.Page?.media||[]).map(anilistMapAnime), pagination: {hasNextPage:false, currentPage:1}};
}

async function anilistTopAnime() {
  const q = `{Page(page:1,perPage:25){media(sort:TRENDING_DESC,type:ANIME){id title{romaji english}coverImage{large}averageScore episodes genres description status season seasonYear studios(isMain:true){nodes{name}}}}}`;
  const d = await anilistGraphQL(q);
  return {data: (d?.Page?.media||[]).map(anilistMapAnime), pagination: {hasNextPage:false, currentPage:1}};
}

async function anilistSeasonalAnime(year, season) {
  const seas = (season||getCurrentSeason()).toUpperCase();
  const yr = year||new Date().getFullYear();
  const q = `{Page(page:1,perPage:25){media(season:${seas},seasonYear:${yr},type:ANIME,sort:POPULARITY_DESC){id title{romaji english}coverImage{large}averageScore episodes genres description status season seasonYear studios(isMain:true){nodes{name}}}}}`;
  const d = await anilistGraphQL(q);
  return {data: (d?.Page?.media||[]).map(anilistMapAnime), pagination: {hasNextPage:false, currentPage:1}};
}

async function anilistSearchManga(query) {
  const q = `{Page(page:1,perPage:25){media(search:"${query.replace(/"/g,'')}",type:MANGA,sort:SEARCH_MATCH){id title{romaji english}coverImage{large}averageScore chapters volumes genres description status authors{name}}}}`;
  const d = await anilistGraphQL(q);
  return {data: (d?.Page?.media||[]).map(anilistMapManga), pagination: {hasNextPage:false, currentPage:1}};
}

async function anilistTopManga() {
  const q = `{Page(page:1,perPage:25){media(sort:TRENDING_DESC,type:MANGA){id title{romaji english}coverImage{large}averageScore chapters volumes genres description status authors{name}}}}`;
  const d = await anilistGraphQL(q);
  return {data: (d?.Page?.media||[]).map(anilistMapManga), pagination: {hasNextPage:false, currentPage:1}};
}

function getCurrentSeason() {
  const m = new Date().getMonth();
  if (m >= 0 && m <= 2) return "winter";
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  return "fall";
}

export function clearCache() { cache.clear(); }
