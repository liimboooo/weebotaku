import { statusLabel } from "../utils/constants";
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

const ANILIST = process.env.REACT_APP_ANILIST_API_URL || "https://graphql.anilist.co";

async function gql(query, variables = {}, retries = 2) {
  const key = `gql:${query.replace(/\s+/g, " ").slice(0, 80)}:${JSON.stringify(variables)}`;
  const cached = getCached(key);
  if (cached) return cached;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(ANILIST, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }) });
      if (r.status === 429) {
        const wait = Math.min((attempt + 1) * 1500, 5000);
        await new Promise(res => setTimeout(res, wait));
        continue;
      }
      if (!r.ok) {
        if (attempt < retries) { await new Promise(res => setTimeout(res, 1000)); continue; }
        throw new Error(`AniList HTTP ${r.status}`);
      }
      const j = await r.json();
      if (j.errors) throw new Error(j.errors[0]?.message);
      setCache(key, j.data);
      return j.data;
    } catch (e) {
      if (attempt < retries) { await new Promise(res => setTimeout(res, 1000)); continue; }
      throw e;
    }
  }
}

const FIELDS = `id idMal title { romaji english } coverImage { large extraLarge } bannerImage averageScore episodes genres description status season seasonYear studios(isMain:true) { nodes { name } } trailer { site id } format startDate { year month day } nextAiringEpisode { episode airingAt timeUntilAiring }`;

function mapAnime(a) {
  return {
    id: a.id,
    name: a.title?.english || a.title?.romaji || "",
    malId: a.idMal || a.id,
    type: a.format || "TV",
    img: a.coverImage?.extraLarge || a.coverImage?.large || "",
    rating: (a.averageScore || 0) / 10,
    votes: a.popularity || 0,
    year: a.seasonYear || 0,
    episodes: a.episodes || 0,
    status: statusLabel(a.status),
    genres: a.genres || [],
    synopsis: a.description || "",
    studio: a.studios?.nodes?.[0]?.name || "",
    season: a.season ? `${a.season.charAt(0).toUpperCase() + a.season.slice(1).toLowerCase()} ${a.seasonYear || ""}` : "",
    director: "",
    trend: "",
    description: (a.description || "").slice(0, 100),
    currentEp: a.episodes || 0,
    nextEpDate: a.nextAiringEpisode?.airingAt ? new Date(a.nextAiringEpisode.airingAt * 1000).toLocaleDateString() : a.status === "RELEASING" ? "TBD" : "Ended",
    imdbId: "",
    trailerUrl: a.trailer?.site === "youtube" ? `${process.env.REACT_APP_YOUTUBE_EMBED_BASE || "https://www.youtube.com/embed/"}${a.trailer.id}` : null,
    airingDay: null,
    seasons: [],
  };
}

export async function getAllAnime() {
  const cached = getCached("allAnime");
  if (cached) return cached;
  try {
    const q = `query{Page(page:1,perPage:50){media(sort:TRENDING_DESC,type:ANIME){${FIELDS}}}}`;
    const data = await gql(q);
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache("allAnime", results);
    return results;
  } catch { return []; }
}

export async function getAnimeById(id) {
  const k = `animeById:${id}`;
  const cached = getCached(k);
  if (cached) return cached;
  const numId = Number(id);
  try {
    const q = `query($id:Int){Media(id:$id,type:ANIME){${FIELDS} popularity}}`;
    const data = await gql(q, { id: numId });
    if (data?.Media) {
      const mapped = mapAnime(data.Media);
      setCache(k, mapped);
      return mapped;
    }
  } catch {}
  try {
    const q = `query($id:Int){Media(idMal:$id,type:ANIME){${FIELDS} popularity}}`;
    const data = await gql(q, { id: numId });
    if (data?.Media) {
      const mapped = mapAnime(data.Media);
      setCache(k, mapped);
      return mapped;
    }
  } catch {}
  return null;
}

export async function getAnimeType(anime) { return anime?.type || "TV"; }

export async function searchAnime(query) {
  const k = `search:${query}`;
  const cached = getCached(k);
  if (cached) return cached;
  try {
    const q = `query($search:String){Page(page:1,perPage:25){media(search:$search,type:ANIME,sort:SEARCH_MATCH){${FIELDS}}}}`;
    const data = await gql(q, { search: query });
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache(k, results);
    return results;
  } catch { return []; }
}

export async function getTrendingAnime() {
  const cached = getCached("trending");
  if (cached) return cached;
  try {
    const q = `query{Page(page:1,perPage:10){media(sort:TRENDING_DESC,type:ANIME){${FIELDS}}}}`;
    const data = await gql(q);
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache("trending", results);
    return results;
  } catch { return []; }
}

export async function getFeaturedAnime() {
  const cached = getCached("featured");
  if (cached) return cached;
  try {
    const q = `query{Page(page:1,perPage:4){media(sort:TRENDING_DESC,type:ANIME){${FIELDS}}}}`;
    const data = await gql(q);
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache("featured", results);
    return results;
  } catch { return []; }
}

export async function getNewEpisodes() {
  const cached = getCached("newEpisodes");
  if (cached) return cached;
  try {
    const q = `query{Page(page:1,perPage:4){media(status:RELEASING,sort:POPULARITY_DESC,type:ANIME){${FIELDS}}}}`;
    const data = await gql(q);
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache("newEpisodes", results);
    return results;
  } catch { return []; }
}

export async function getSeasonPicks() {
  const cached = getCached("seasonPicks");
  if (cached) return cached;
  try {
    const now = new Date();
    const season = ["WINTER", "SPRING", "SUMMER", "FALL"][Math.floor(now.getMonth() / 3)];
    const year = now.getFullYear();
    const q = `query($yr:Int,$seas:MediaSeason){Page(page:1,perPage:6){media(season:$seas,seasonYear:$yr,type:ANIME,sort:POPULARITY_DESC){${FIELDS}}}}`;
    const data = await gql(q, { yr: year, seas: season });
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache("seasonPicks", results);
    return results;
  } catch { return []; }
}

export async function getLatestAnime() {
  const cached = getCached("latest");
  if (cached) return cached;
  try {
    const q = `query{Page(page:1,perPage:6){media(sort:TRENDING_DESC,type:ANIME){${FIELDS}}}}`;
    const data = await gql(q);
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache("latest", results);
    return results;
  } catch { return []; }
}

export async function getAiringTodayAnime() {
  const cached = getCached("airingToday");
  if (cached) return cached;
  try {
    const q = `query{Page(page:1,perPage:10){media(status:RELEASING,sort:TRENDING_DESC,type:ANIME){${FIELDS}}}}`;
    const data = await gql(q);
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache("airingToday", results);
    return results;
  } catch { return []; }
}

export async function getAllGenres() {
  const cached = getCached("genres");
  if (cached) return cached;
  try {
    const data = await gql("query{GenreCollection}");
    const results = data?.GenreCollection || [];
    setCache("genres", results);
    return results;
  } catch {
    return ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Thriller"];
  }
}

export async function getSchedule() {
  const cached = getCached("schedule");
  if (cached) return cached;
  try {
    const q = `query{Page(page:1,perPage:50){media(status:RELEASING,sort:POPULARITY_DESC,type:ANIME){${FIELDS}}}}`;
    const data = await gql(q);
    const results = { "Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [], "Friday": [], "Saturday": [], "Sunday": [] };
    // AniList doesn't have airing day directly on media, return empty schedule
    setCache("schedule", results);
    return results;
  } catch {
    const results = { "Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [], "Friday": [], "Saturday": [], "Sunday": [] };
    return results;
  }
}

