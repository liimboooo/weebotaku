const CACHE_TTL = 10 * 60 * 1000;
const DETAIL_CACHE_TTL = 30 * 60 * 1000;
const CACHE_MAX = 100;
const cache = new Map();
const LS_PREFIX = "al_";

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

const ANILIST = "https://graphql.anilist.co";

const ANIME_FIELDS = `id idMal title { romaji english } coverImage { large extraLarge } bannerImage averageScore episodes genres description status season seasonYear studios(isMain:true) { nodes { name } } trailer { site id } format nextAiringEpisode { episode airingAt timeUntilAiring }`;

async function gql(query, variables = {}) {
  const key = `gql:${query.replace(/\s+/g, " ").slice(0, 80)}:${JSON.stringify(variables)}`;
  const cached = getCached(key);
  if (cached) return cached;
  const r = await fetch(ANILIST, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0]?.message || "AniList error");
  setCache(key, j.data, DETAIL_CACHE_TTL);
  return j.data;
}

function statusLabel(s) {
  if (s === "RELEASING") return "Ongoing";
  if (s === "FINISHED") return "Completed";
  if (s === "NOT_YET_RELEASED") return "Upcoming";
  return s || "Unknown";
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
    trailerUrl: a.trailer?.site === "youtube" ? `https://www.youtube.com/embed/${a.trailer.id}` : null,
    airingDay: null,
    currentEp: a.episodes || 0,
    nextEpDate: a.nextAiringEpisode?.airingAt ? new Date(a.nextAiringEpisode.airingAt * 1000).toLocaleDateString() : a.status === "RELEASING" ? "TBD" : "Ended",
    readProgress: 0,
  };
}

function mapManga(m) {
  const author = m.staff?.edges?.find(e => e.role === "Story & Art" || e.role === "Story")?.node?.name?.full || m.staff?.edges?.[0]?.node?.name?.full || "Unknown";
  return {
    id: m.id,
    title: m.title?.english || m.title?.romaji || "",
    author,
    cover: m.coverImage?.extraLarge || m.coverImage?.large || "",
    demo: "Unknown",
    status: statusLabel(m.status),
    ch: m.chapters || 0,
    volumes: m.volumes || 0,
    last: Math.floor((m.chapters || 0) * 0.8) || 0,
    rating: (m.averageScore || 0) / 10,
    genres: m.genres || [],
    desc: m.description || "",
    progress: 0,
  };
}

function getCurrentSeason() {
  const m = new Date().getMonth();
  if (m >= 0 && m <= 2) return "winter";
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  return "fall";
}

const FORMAT_MAP = { TV: "TV", MOVIE: "Movie", OVA: "OVA", ONA: "ONA", SPECIAL: "Special" };
const STATUS_MAP = { Ongoing: "RELEASING", Completed: "FINISHED", Upcoming: "NOT_YET_RELEASED" };

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
  const sort = filter === "bypopularity" ? "POPULARITY_DESC" : "TRENDING_DESC";
  const q = `query($page:Int){Page(page:$page,perPage:25){pageInfo{hasNextPage currentPage}media(sort:${sort},type:ANIME){${ANIME_FIELDS}}}}`;
  const data = await gql(q, { page: Math.min(page, 50) });
  return { data: (data?.Page?.media || []).map(mapAnime), pagination: { hasNextPage: data?.Page?.pageInfo?.hasNextPage || false, currentPage: page } };
}

export async function fetchSeasonalAnime(year, season) {
  const y = year || new Date().getFullYear();
  const s = (season || getCurrentSeason()).toUpperCase();
  const q = `query($yr:Int,$seas:MediaSeason){Page(page:1,perPage:25){pageInfo{hasNextPage}media(season:$seas,seasonYear:$yr,type:ANIME,sort:POPULARITY_DESC){${ANIME_FIELDS}}}}`;
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
  const q = `query($id:Int){Media(id:$id,type:ANIME){recommendations(page:1,perPage:8){edges{node{mediaRecommendation{id title{romaji english}coverImage{large}}}}}}}`;
  try {
    const data = await gql(q, { id: Number(id) });
    return (data?.Media?.recommendations?.edges || []).map(e => ({
      id: e.node.mediaRecommendation.id,
      name: e.node.mediaRecommendation.title?.english || e.node.mediaRecommendation.title?.romaji || "",
      image: e.node.mediaRecommendation.coverImage?.large || "",
      votes: 0,
    }));
  } catch { return []; }
}

const MANGA_FIELDS = `id title { romaji english } coverImage { large extraLarge } averageScore chapters volumes genres description status staff(perPage:3) { edges { node { name { full } } role } }`;

export async function fetchTopManga(page = 1) {
  const q = `query($page:Int){Page(page:$page,perPage:25){pageInfo{hasNextPage}media(sort:TRENDING_DESC,type:MANGA){${MANGA_FIELDS}}}}`;
  const data = await gql(q, { page: Math.min(page, 50) });
  return { data: (data?.Page?.media || []).map(mapManga), pagination: { hasNextPage: data?.Page?.pageInfo?.hasNextPage || false, currentPage: page } };
}

export async function fetchSearchManga(query, page = 1) {
  const q = `query($page:Int,$search:String){Page(page:$page,perPage:25){pageInfo{hasNextPage}media(search:$search,type:MANGA,sort:SEARCH_MATCH){${MANGA_FIELDS}}}}`;
  const data = await gql(q, { page: Math.min(page, 50), search: query });
  return { data: (data?.Page?.media || []).map(mapManga), pagination: { hasNextPage: data?.Page?.pageInfo?.hasNextPage || false, currentPage: page } };
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
    const episodes = nodes.filter(n => n.episode).sort((a, b) => a.episode - b.episode).map(n => ({ episode: n.episode, airingAt: n.airingAt, aired: n.airingAt <= now }));

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
