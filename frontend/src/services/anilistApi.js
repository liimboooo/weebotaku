import { statusLabel, STATUS_MAP, FORMAT_MAP, LS_CACHE_PREFIX } from "../utils/constants";

const CACHE_TTL = 2 * 60 * 1000;
const DETAIL_CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX = 100;
const cache = new Map();
const LS_PREFIX = LS_CACHE_PREFIX;

function getCached(key) {
  let entry = cache.get(key);
  if (entry && Date.now() - entry.time <= entry.ttl) return entry.data;
  if (entry) cache.delete(key);
  const ls = localStorage.getItem(LS_PREFIX + key);
  if (ls) {
    try {
      const parsed = JSON.parse(ls);
      if (Date.now() - parsed.time <= parsed.ttl) {
        cache.set(key, parsed);
        return parsed.data;
      }
      localStorage.removeItem(LS_PREFIX + key);
    } catch { localStorage.removeItem(LS_PREFIX + key); }
  }
  return null;
}

function setCache(key, data, ttl = CACHE_TTL) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  const entry = { data, time: Date.now(), ttl };
  cache.set(key, entry);
  if (key.length < 100) {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry)); } catch {}
  }
}

const ANILIST = process.env.REACT_APP_ANILIST_API_URL || "https://graphql.anilist.co";

const ANIME_FIELDS = `id idMal title { romaji english } coverImage { large extraLarge } bannerImage averageScore popularity episodes genres description status season seasonYear studios(isMain:true) { nodes { name } } trailer { site id } format nextAiringEpisode { episode airingAt timeUntilAiring }`;

export async function gql(query, variables = {}, retries = 2) {
  const key = `gql:${query.replace(/\s+/g, " ").slice(0, 80)}:${JSON.stringify(variables)}`;
  const cached = getCached(key);
  if (cached) return cached;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(ANILIST, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }) });
      if (r.status === 429) {
        const retryAfter = r.headers.get('Retry-After');
        const wait = retryAfter ? Math.min(Number(retryAfter) * 1000, 10000) : Math.min((attempt + 1) * 1500, 5000);
        await new Promise(res => setTimeout(res, wait));
        continue;
      }
      if (!r.ok) {
        if (attempt < retries) { await new Promise(res => setTimeout(res, 1000)); continue; }
        throw new Error(`AniList HTTP ${r.status}`);
      }
      const j = await r.json();
      if (j.errors) throw new Error(j.errors[0]?.message || "AniList error");
      setCache(key, j.data);
      return j.data;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) { await new Promise(res => setTimeout(res, 1000)); continue; }
      throw e;
    }
  }
  throw lastErr || new Error('AniList request failed');
}


function mapAnime(a) {
  return {
    id: a.id,
    name: a.title?.english || a.title?.romaji || "",
    img: a.coverImage?.extraLarge || a.coverImage?.large || "",
    bannerImage: a.bannerImage || "",
    rating: (a.averageScore || 0) / 10,
    votes: a.popularity || 0,
    year: a.seasonYear || 0,
    episodes: a.episodes || 0,
    status: statusLabel(a.status),
    genres: a.genres || [],
    synopsis: a.description || "",
    studio: a.studios?.nodes?.[0]?.name || "",
    season: a.season ? `${a.season.charAt(0).toUpperCase() + a.season.slice(1).toLowerCase()} ${a.seasonYear || ""}` : "",
    type: a.format || "TV",
    trailerUrl: a.trailer?.site === "youtube" ? `${process.env.REACT_APP_YOUTUBE_EMBED_BASE || "https://www.youtube.com/embed/"}${a.trailer.id}` : null,
    airingDay: null,
    currentEp: a.episodes || 0,
    nextEpDate: a.nextAiringEpisode?.airingAt ? new Date(a.nextAiringEpisode.airingAt * 1000).toLocaleDateString() : a.status === "RELEASING" ? "TBD" : "Ended",
    readProgress: 0,
  };
}

function getCurrentSeason() {
  const m = new Date().getMonth();
  if (m >= 0 && m <= 2) return "winter";
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  return "fall";
}



export async function fetchSearchAnime(query, page = 1, options = {}) {
  const vars = { page: Math.min(page, 50), search: query };
  if (options.type && options.type !== "All") vars.format = Object.keys(FORMAT_MAP).find(k => FORMAT_MAP[k] === options.type) || options.type.toUpperCase();
  if (options.status && options.status !== "All") vars.status = STATUS_MAP[options.status] || options.status.toUpperCase();
  const q = `query($page:Int,$search:String,$format:MediaFormat,$status:MediaStatus){
    Page(page:$page,perPage:25){pageInfo{hasNextPage currentPage}
    media(search:$search,type:ANIME,sort:SEARCH_MATCH,format:$format,status:$status){${ANIME_FIELDS}}}}`;
  const data = await gql(q, vars);
  return { data: (data?.Page?.media || []).map(mapAnime), pagination: { hasNextPage: data?.Page?.pageInfo?.hasNextPage || false, currentPage: page } };
}

export async function fetchTopAnime(page = 1, filter = "") {
  const sort = filter === "bypopularity" ? "POPULARITY_DESC"
    : filter === "airing" || filter === "upcoming" || filter === "trending" ? "TRENDING_DESC"
    : "SCORE_DESC";
  const statusFilter = filter === "upcoming" ? ",status:NOT_YET_RELEASED" : "";
  const q = `query($page:Int){Page(page:$page,perPage:25){pageInfo{hasNextPage currentPage}media(sort:${sort},type:ANIME${statusFilter}){${ANIME_FIELDS}}}}`;
  const data = await gql(q, { page: Math.min(page, 50) });
  return { data: (data?.Page?.media || []).map(mapAnime), pagination: { hasNextPage: data?.Page?.pageInfo?.hasNextPage || false, currentPage: page } };
}

export async function fetchSeasonalAnime(year, season) {
  const y = year || new Date().getFullYear();
  const s = (season || getCurrentSeason()).toUpperCase();
  const q = `query($yr:Int,$seas:MediaSeason){Page(page:1,perPage:25){pageInfo{hasNextPage}media(season:$seas,seasonYear:$yr,type:ANIME,sort:SCORE_DESC){${ANIME_FIELDS}}}}`;
  const data = await gql(q, { yr: y, seas: s });
  return { data: (data?.Page?.media || []).map(mapAnime), pagination: { hasNextPage: data?.Page?.pageInfo?.hasNextPage || false, currentPage: 1 } };
}

export async function fetchAnimeGenres() {
  try {
    const data = await gql(`query{GenreCollection}`);
    return data?.GenreCollection || ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Thriller"];
  } catch {
    return ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Thriller"];
  }
}

export async function fetchAnimeById(id) {
  const q = `query($id:Int){Media(id:$id,type:ANIME){${ANIME_FIELDS} popularity}}`;
  try {
    const data = await gql(q, { id: Number(id) });
    if (!data?.Media) throw new Error("not found");
    return mapAnime(data.Media);
  } catch {
    const q2 = `query($id:Int){Media(idMal:$id,type:ANIME){${ANIME_FIELDS} popularity}}`;
    const data = await gql(q2, { id: Number(id) });
    if (!data?.Media) throw new Error("not found");
    return mapAnime(data.Media);
  }
}

export async function fetchAnimeCharacters(id) {
  const q = `query($id:Int){Media(id:$id,type:ANIME){characters(page:1,perPage:10){edges{role node{id name{full}image{large}}voiceActors(language:JAPANESE){id name{full}image{large}language}}}}}`;
  try {
    const data = await gql(q, { id: Number(id) });
    return (data?.Media?.characters?.edges || []).map(e => ({
      id: e.node.id, name: e.node.name?.full || "", image: e.node.image?.large || "", role: e.role,
      voiceActor: e.voiceActors?.[0] ? { name: e.voiceActors[0].name?.full || "", image: e.voiceActors[0].image?.large || "", lang: e.voiceActors[0].language } : null,
    }));
  } catch { return []; }
}

export async function fetchAnimeRecommendations(id) {
  const q = `query($id:Int){Media(id:$id,type:ANIME){recommendations(page:1,perPage:12){edges{node{rating mediaRecommendation{id title{romaji english}coverImage{large extraLarge}averageScore format episodes genres status season seasonYear}}}}}}`;
  try {
    const data = await gql(q, { id: Number(id) });
    return (data?.Media?.recommendations?.edges || [])
      .filter(e => e.node.mediaRecommendation)
      .map(e => {
        const m = e.node.mediaRecommendation;
        return {
          id: m.id,
          name: m.title?.english || m.title?.romaji || "",
          image: m.coverImage?.extraLarge || m.coverImage?.large || "",
          rating: (m.averageScore || 0) / 10,
          format: m.format || "TV",
          episodes: m.episodes || 0,
          genres: m.genres || [],
          status: m.status,
          season: m.season,
          seasonYear: m.seasonYear,
        };
      });
  } catch { return []; }
}

export async function fetchAiringSchedule({ anilistId, malId } = {}) {
  const SPLIT_GAP_DAYS = 21;
  const id = anilistId || malId;
  if (!id) return { episodes: [], cours: null, nextAiring: null };
  try {
    const filter = anilistId ? `id:${Number(id)}` : `idMal:${Number(id)}`;
    const q = `query{Media(${filter},type:ANIME){id nextAiringEpisode{episode airingAt timeUntilAiring}airingSchedule(perPage:50){nodes{episode airingAt timeUntilAiring}}}}`;
    const data = await gql(q);
    const media = data?.Media;
    if (!media) return { episodes: [], cours: null, nextAiring: null };

    const now = Math.floor(Date.now() / 1000);
    const nodes = media.airingSchedule?.nodes || [];
    const episodes = nodes.filter(n => n.episode).sort((a, b) => a.episode - b.episode).map(n => ({ episode: n.episode, airingAt: n.airingAt, aired: n.airingAt <= now, airDate: new Date(n.airingAt * 1000).toISOString() }));

    let cours = null;
    if (episodes.length > 0) {
      const splits = [{ name: "", episodeStart: episodes[0].episode }];
      for (let i = 1; i < episodes.length; i++) {
        const gap = (episodes[i].airingAt - episodes[i - 1].airingAt) / 86400;
        if (gap > SPLIT_GAP_DAYS) {
          splits[splits.length - 1].episodeEnd = episodes[i - 1].episode;
          splits.push({ name: "", episodeStart: episodes[i].episode });
        }
      }
      splits[splits.length - 1].episodeEnd = episodes[episodes.length - 1].episode;
      cours = splits.map((s, i) => ({
        ...s, name: i === 0 ? "Cour 1" : `Cour ${i + 1}`,
        startDate: new Date(episodes.find(e => e.episode === s.episodeStart)?.airingAt * 1000).toISOString().split("T")[0],
        endDate: new Date(episodes.find(e => e.episode === s.episodeEnd)?.airingAt * 1000).toISOString().split("T")[0],
      }));
    }
    return { episodes, cours, nextAiring: media.nextAiringEpisode || null };
  } catch { return { episodes: [], cours: null, nextAiring: null }; }
}

export function clearCache() { cache.clear(); }


