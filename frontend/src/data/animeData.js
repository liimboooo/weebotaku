const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.time > CACHE_TTL) return null;
  return entry.data;
}

function setCache(key, data) {
  if (cache.size >= 50) { const oldest = cache.keys().next().value; cache.delete(oldest); }
  cache.set(key, { data, time: Date.now() });
}

const JIKAN = "https://api.jikan.moe/v4";
const ANILIST = "https://graphql.anilist.co";

async function jikanFetch(endpoint) {
  const cached = getCached(endpoint);
  if (cached) return cached;
  await new Promise(r => setTimeout(r, 1100));
  const res = await fetch(`${JIKAN}${endpoint}`);
  if (!res.ok) throw new Error(`Jikan error: ${res.status}`);
  const json = await res.json();
  setCache(endpoint, json);
  return json;
}

async function anilistQuery(query) {
  const cached = getCached(query);
  if (cached) return cached;
  const r = await fetch(ANILIST, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0]?.message);
  setCache(query, j.data);
  return j.data;
}

function mapFromJikan(a) {
  return {
    id: a.mal_id,
    name: a.title_english || a.title,
    malId: a.mal_id,
    type: a.type || "TV",
    img: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || "",
    rating: a.score || 0,
    votes: a.scored_by || 0,
    year: a.year || (a.aired?.from ? new Date(a.aired.from).getFullYear() : 0),
    episodes: a.episodes || 0,
    status: a.status === "Currently Airing" ? "Ongoing" : a.status === "Finished Airing" ? "Completed" : a.status || "Unknown",
    genres: a.genres?.map(g => g.name) || [],
    synopsis: a.synopsis || "",
    studio: a.studios?.[0]?.name || "",
    season: a.season ? `${a.season.charAt(0).toUpperCase() + a.season.slice(1)} ${a.year || ""}` : "",
    director: "",
    trend: "",
    description: (a.synopsis || "").slice(0, 100),
    currentEp: a.episodes || 0,
    nextEpDate: a.status === "Currently Airing" ? "TBD" : "Ended",
    imdbId: "",
    trailerUrl: a.trailer?.embed_url || null,
    airingDay: null,
    seasons: [],
  };
}

function mapFromAnilist(a) {
  return {
    id: a.id,
    name: a.title?.english || a.title?.romaji || "",
    malId: a.idMal || a.id,
    type: a.format || "TV",
    img: a.coverImage?.large || "",
    rating: (a.averageScore || 0) / 10,
    votes: 0,
    year: a.seasonYear || 0,
    episodes: a.episodes || 0,
    status: a.status === "RELEASING" ? "Ongoing" : a.status === "FINISHED" ? "Completed" : a.status || "Unknown",
    genres: a.genres || [],
    synopsis: a.description || "",
    studio: a.studios?.nodes?.[0]?.name || "",
    season: a.season ? `${a.season.charAt(0) + a.season.slice(1).toLowerCase()} ${a.seasonYear || ""}` : "",
    director: "",
    trend: "",
    description: (a.description || "").slice(0, 100),
    currentEp: a.episodes || 0,
    nextEpDate: a.status === "RELEASING" ? "TBD" : "Ended",
    imdbId: "",
    trailerUrl: a.trailer?.site === "youtube" ? `https://www.youtube.com/embed/${a.trailer.id}` : null,
    airingDay: null,
    seasons: [],
  };
}

let topCache = null;
let topCacheTime = 0;

async function ensureTopLoaded() {
  if (topCache && Date.now() - topCacheTime < CACHE_TTL) return topCache;
  try {
    const json = await jikanFetch("/top/anime?page=1");
    topCache = json.data.map(mapFromJikan);
    topCacheTime = Date.now();
    return topCache;
  } catch {
    if (topCache) return topCache;
    return [];
  }
}

export async function getAllAnime() { return ensureTopLoaded(); }

export async function getAnimeById(id) {
  const cached = getCached(`animeById:${id}`);
  if (cached) return cached;
  const numId = Number(id);
  const fromTop = (await ensureTopLoaded()).find(a => a.id === numId || a.malId === numId);
  if (fromTop) return fromTop;
  try {
    const json = await jikanFetch(`/anime/${numId}`);
    const mapped = mapFromJikan(json.data);
    setCache(`animeById:${id}`, mapped);
    return mapped;
  } catch {}
  try {
    const q = `{Media(id:${numId},type:ANIME){id idMal title{romaji english}coverImage{large}bannerImage averageScore episodes genres description status season seasonYear studios(isMain:true){nodes{name}}trailer{site id}format}}`;
    const d = await anilistQuery(q);
    if (d?.Media) {
      const mapped = mapFromAnilist(d.Media);
      setCache(`animeById:${id}`, mapped);
      return mapped;
    }
  } catch {}
  try {
    const q = `{Media(idMal:${numId},type:ANIME){id idMal title{romaji english}coverImage{large}bannerImage averageScore episodes genres description status season seasonYear studios(isMain:true){nodes{name}}trailer{site id}format}}`;
    const d = await anilistQuery(q);
    if (d?.Media) {
      const mapped = mapFromAnilist(d.Media);
      setCache(`animeById:${id}`, mapped);
      return mapped;
    }
  } catch {}
  return null;
}

export async function getAnimeType(anime) { return anime?.type || "TV"; }

export async function searchAnime(query) {
  const cached = getCached(`search:${query}`);
  if (cached) return cached;
  const results = [];
  try {
    const json = await jikanFetch(`/anime?q=${encodeURIComponent(query)}&page=1&order_by=score&sort=desc&limit=25`);
    results.push(...json.data.map(mapFromJikan));
  } catch {}
  if (results.length < 25) {
    try {
      const q = `{Page(page:1,perPage:25){media(search:"${query.replace(/"/g, "")}",type:ANIME,sort:SEARCH_MATCH){id idMal title{romaji english}coverImage{large}averageScore episodes genres description status season seasonYear studios(isMain:true){nodes{name}}trailer{site id}format}}}`;
      const d = await anilistQuery(q);
      for (const m of d?.Page?.media || []) {
        if (!results.some(r => r.id === m.id || r.malId === m.idMal)) {
          results.push(mapFromAnilist(m));
        }
      }
    } catch {}
  }
  setCache(`search:${query}`, results);
  return results;
}

export async function getTrendingAnime() {
  const cached = getCached("trending");
  if (cached) return cached;
  try {
    const q = `{Page(page:1,perPage:10){media(sort:TRENDING_DESC,type:ANIME){id idMal title{romaji english}coverImage{large}averageScore episodes genres description status season seasonYear studios(isMain:true){nodes{name}}trailer{site id}format}}}`;
    const d = await anilistQuery(q);
    const results = (d?.Page?.media || []).map(mapFromAnilist);
    setCache("trending", results);
    return results;
  } catch {
    const top = await ensureTopLoaded();
    return top.slice(0, 6);
  }
}

export async function getFeaturedAnime() {
  const cached = getCached("featured");
  if (cached) return cached;
  try {
    const json = await jikanFetch("/top/anime?page=1&filter=bypopularity");
    const results = json.data.slice(0, 4).map(mapFromJikan);
    setCache("featured", results);
    return results;
  } catch {
    const top = await ensureTopLoaded();
    return top.slice(0, 4);
  }
}

export async function getNewEpisodes() {
  const cached = getCached("newEpisodes");
  if (cached) return cached;
  try {
    const json = await jikanFetch("/top/anime?page=1&filter=airing");
    const results = json.data.slice(0, 4).map(mapFromJikan);
    setCache("newEpisodes", results);
    return results;
  } catch {
    const top = await ensureTopLoaded();
    return top.filter(a => a.status === "Ongoing").slice(0, 4);
  }
}

export async function getSeasonPicks() {
  const cached = getCached("seasonPicks");
  if (cached) return cached;
  try {
    const now = new Date();
    const season = ["winter", "spring", "summer", "fall"][Math.floor(now.getMonth() / 3)];
    const json = await jikanFetch(`/seasons/${now.getFullYear()}/${season}`);
    const results = json.data.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 6).map(mapFromJikan);
    setCache("seasonPicks", results);
    return results;
  } catch {
    const top = await ensureTopLoaded();
    return top.slice(0, 6);
  }
}

export async function getLatestAnime() {
  const cached = getCached("latest");
  if (cached) return cached;
  try {
    const json = await jikanFetch("/top/anime?page=1");
    const all = json.data.map(mapFromJikan);
    const results = all.sort((a, b) => b.year - a.year).slice(0, 6);
    setCache("latest", results);
    return results;
  } catch {
    const top = await ensureTopLoaded();
    return top.slice(-6).reverse();
  }
}

export async function getAiringTodayAnime() {
  const cached = getCached("airingToday");
  if (cached) return cached;
  try {
    const now = new Date();
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = days[now.getDay()];
    const json = await jikanFetch(`/schedules?filter=${dayName}&limit=10`);
    const results = json.data.map(mapFromJikan);
    setCache("airingToday", results);
    return results;
  } catch { return []; }
}

export async function getAllGenres() {
  const cached = getCached("genres");
  if (cached) return cached;
  try {
    const json = await jikanFetch("/genres/anime");
    const results = json.data.map(g => g.name);
    setCache("genres", results);
    return results;
  } catch {
    return ["Action","Adventure","Comedy","Drama","Fantasy","Horror","Mystery","Romance","Sci-Fi","Slice of Life","Sports","Thriller"];
  }
}

export async function getSchedule() {
  const cached = getCached("schedule");
  if (cached) return cached;
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const result = {};
  for (const day of days) {
    try {
      const json = await jikanFetch(`/schedules?filter=${day}&limit=10`);
      result[day.charAt(0).toUpperCase() + day.slice(1)] = json.data.map(mapFromJikan);
    } catch {
      result[day.charAt(0).toUpperCase() + day.slice(1)] = [];
    }
  }
  setCache("schedule", result);
  return result;
}
