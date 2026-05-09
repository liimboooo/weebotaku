const BASE = "https://graphql.anilist.co";

function getSeasonInfo() {
  const m = new Date().getMonth();
  const y = new Date().getFullYear();
  const seasons = ["WINTER","WINTER","SPRING","SPRING","SPRING","SUMMER","SUMMER","SUMMER","FALL","FALL","FALL","WINTER"];
  const next = m <= 1 ? "SPRING" : m <= 4 ? "SUMMER" : m <= 7 ? "FALL" : "WINTER";
  const nextYear = m <= 1 ? y : m <= 8 ? y : y + 1;
  return { current: seasons[m], year: m <= 1 ? y - 1 : y, next, nextYear };
}

const ANIME_QUERY = (nextSeason, nextYear) => `{
  trending: Page(page:1,perPage:10){media(sort:TRENDING_DESC,type:ANIME){id title{romaji english} coverImage{large} format episodes season seasonYear status meanScore trending genres description startDate{year month day} studios(isMain:true){nodes{name}} nextAiringEpisode{episode airingAt}}}
  popular: Page(page:1,perPage:8){media(sort:POPULARITY_DESC,type:ANIME){id title{romaji english} coverImage{large} format meanScore trending genres}}
  upcoming: Page(page:1,perPage:8){media(season:${nextSeason},seasonYear:${nextYear},type:ANIME,sort:POPULARITY_DESC){id title{romaji english} coverImage{large} format meanScore genres startDate{year month day}}}
  airing: Page(page:1,perPage:10){media(status:RELEASING,type:ANIME,sort:POPULARITY_DESC){id title{romaji english} coverImage{large} format episodes meanScore trending genres nextAiringEpisode{episode airingAt}}}
}`;

const MANGA_QUERY = `{
  trending: Page(page:1,perPage:8){media(sort:TRENDING_DESC,type:MANGA){id title{romaji english} coverImage{large} format chapters volumes meanScore trending genres description startDate{year month day} status}}
  popular: Page(page:1,perPage:8){media(sort:POPULARITY_DESC,type:MANGA){id title{romaji english} coverImage{large} format chapters volumes meanScore trending genres}}
  upcoming: Page(page:1,perPage:8){media(status:NOT_YET_RELEASED,type:MANGA,sort:POPULARITY_DESC){id title{romaji english} coverImage{large} format chapters volumes meanScore genres startDate{year month day}}}
  publishing: Page(page:1,perPage:10){media(status:RELEASING,type:MANGA,sort:POPULARITY_DESC){id title{romaji english} coverImage{large} format chapters volumes meanScore trending genres}}
}`;

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) { const e = cache.get(key); if (!e) return null; if (Date.now()-e.time>CACHE_TTL) { cache.delete(key); return null; } return e.data; }
function setCache(key, data) { cache.set(key, {data,time:Date.now()}); }
function pickTitle(t) { return t?.english || t?.romaji || "Unknown"; }
function stripHtml(h) { if (!h) return ""; return h.replace(/<[^>]*>/g,"").replace(/&[^;]+;/g," ").trim(); }

function mapAnime(a) {
  return {
    id: a.id, title: pickTitle(a.title), image: a.coverImage?.large || "",
    format: a.format || "TV", episodes: a.episodes,
    score: a.meanScore ? (a.meanScore/10).toFixed(1) : null, trending: a.trending || 0,
    genres: a.genres || [], synopsis: stripHtml(a.description).slice(0,250),
    studio: a.studios?.nodes?.[0]?.name || null, season: a.season ? `${a.season} ${a.seasonYear}` : null,
    status: a.status, mediaType: "anime",
    nextEpisode: a.nextAiringEpisode ? {ep:a.nextAiringEpisode.episode,at:a.nextAiringEpisode.airingAt} : null,
  };
}

function mapManga(m) {
  return {
    id: m.id, title: pickTitle(m.title), image: m.coverImage?.large || "",
    format: m.format || "Manga", chapters: m.chapters, volumes: m.volumes,
    score: m.meanScore ? (m.meanScore/10).toFixed(1) : null, trending: m.trending || 0,
    genres: m.genres || [], synopsis: stripHtml(m.description).slice(0,250),
    status: m.status, mediaType: "manga",
  };
}

async function anilistFetch(query) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({query}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AniList ${res.status}: ${text.slice(0,200)}`);
  }
  const json = await res.json();
  if (json.errors) throw new Error(`AniList error: ${json.errors[0]?.message}`);
  return json.data;
}

export async function fetchAnimeNews() {
  const cached = getCached("anime-news");
  if (cached) return cached;

  const {next:nextSeason,nextYear} = getSeasonInfo();

  const [animeData, mangaData] = await Promise.all([
    anilistFetch(ANIME_QUERY(nextSeason, nextYear)),
    anilistFetch(MANGA_QUERY),
  ]);

  const result = {
    animeTrending: animeData.trending.media.map(mapAnime),
    animePopular: animeData.popular.media.map(mapAnime),
    animeUpcoming: animeData.upcoming.media.map(mapAnime),
    animeAiring: animeData.airing.media.map(mapAnime),
    mangaTrending: mangaData.trending.media.map(mapManga),
    mangaPopular: mangaData.popular.media.map(mapManga),
    mangaUpcoming: mangaData.upcoming.media.map(mapManga),
    mangaPublishing: mangaData.publishing.media.map(mapManga),
    allNews: buildNewsFeed(animeData, mangaData),
  };

  setCache("anime-news", result);
  return result;
}

function buildNewsFeed(anime, manga) {
  const items = [];

  for (const m of anime.airing.media) {
    const a = mapAnime(m);
    const ep = m.nextAiringEpisode;
    items.push({id:`airing-${m.id}`,type:"new_episode",mediaType:"anime",title:`${a.title} — New Episode`,description:ep ? `Episode ${ep.episode} airing ${fmtTime(ep.airingAt)}` : "Currently airing",image:a.image,animeId:m.id,animeTitle:a.title,date:ep ? new Date(ep.airingAt*1000).toISOString() : new Date().toISOString(),score:a.score,genres:a.genres});
  }

  for (const m of anime.trending.media) {
    const a = mapAnime(m);
    items.push({id:`trending-${m.id}`,type:"trending",mediaType:"anime",title:`${a.title} is Trending`,description: `Trending #${a.trending} \u2022 ${a.genres.slice(0,3).join(", ")}`,image:a.image,animeId:m.id,animeTitle:a.title,date:new Date().toISOString(),score:a.score,genres:a.genres});
  }

  for (const m of anime.upcoming.media) {
    const a = mapAnime(m);
    const d = a.startDate || (m.startDate ? `${m.startDate.year}-${String(m.startDate.month).padStart(2,"0")}-${String(m.startDate.day).padStart(2,"0")}` : "TBA");
    items.push({id:`upcoming-${m.id}`,type:"announcement",mediaType:"anime",title:`Coming Soon: ${a.title}`,description:`${d} \u2022 ${a.format} \u2022 ${a.genres.slice(0,3).join(", ")}`,image:a.image,animeId:m.id,animeTitle:a.title,date:d,score:a.score,genres:a.genres});
  }

  for (const m of anime.popular.media) {
    const a = mapAnime(m);
    items.push({id:`popular-${m.id}`,type:"popular",mediaType:"anime",title:`Popular Pick: ${a.title}`,description:`Rating: ${a.score}/10 \u2022 ${a.genres.slice(0,3).join(", ")}`,image:a.image,animeId:m.id,animeTitle:a.title,date:new Date().toISOString(),score:a.score,genres:a.genres});
  }

  for (const m of manga.publishing.media) {
    const b = mapManga(m);
    items.push({id:`manga-pub-${m.id}`,type:"new_chapter",mediaType:"manga",title:`${b.title} — New Chapter`,description:b.chapters ? `${b.chapters} chapters \u2022 ${b.genres.slice(0,3).join(", ")}` : "Currently publishing",image:b.image,animeId:m.id,animeTitle:b.title,date:new Date().toISOString(),score:b.score,genres:b.genres});
  }

  for (const m of manga.trending.media) {
    const b = mapManga(m);
    items.push({id:`manga-trend-${m.id}`,type:"manga_trending",mediaType:"manga",title:`${b.title} Manga is Trending`,description:`Trending #${b.trending} \u2022 ${b.genres.slice(0,3).join(", ")}`,image:b.image,animeId:m.id,animeTitle:b.title,date:new Date().toISOString(),score:b.score,genres:b.genres});
  }

  for (const m of manga.upcoming.media) {
    const b = mapManga(m);
    const d = m.startDate ? `${m.startDate.year}-${String(m.startDate.month).padStart(2,"0")}-${String(m.startDate.day).padStart(2,"0")}` : "TBA";
    items.push({id:`manga-upcoming-${m.id}`,type:"manga_announcement",mediaType:"manga",title:`New Manga: ${b.title}`,description:`${d} \u2022 ${b.format} \u2022 ${b.genres.slice(0,3).join(", ")}`,image:b.image,animeId:m.id,animeTitle:b.title,date:d,score:b.score,genres:b.genres});
  }

  for (const m of manga.popular.media) {
    const b = mapManga(m);
    items.push({id:`manga-pop-${m.id}`,type:"manga_popular",mediaType:"manga",title:`Popular Manga: ${b.title}`,description:`Rating: ${b.score}/10 \u2022 ${b.genres.slice(0,3).join(", ")}`,image:b.image,animeId:m.id,animeTitle:b.title,date:new Date().toISOString(),score:b.score,genres:b.genres});
  }

  return items.sort((a,b) => new Date(b.date)-new Date(a.date));
}

function fmtTime(ts) {
  const d = new Date(ts*1000);
  const diff = d - Date.now();
  if (diff < 0) return "Now";
  const h = Math.floor(diff/3600000);
  if (h < 1) return "Soon";
  if (h < 24) return `~${h}h`;
  return `${Math.floor(h/24)}d`;
}

export async function fetchMediaById(id) {
  const query = `{Media(id:${Number(id)}){id title{romaji english} coverImage{large} format episodes chapters volumes season seasonYear status meanScore trending genres description startDate{year month day} studios(isMain:true){nodes{name}} nextAiringEpisode{episode airingAt}}}`;
  const data = await anilistFetch(query);
  const m = data.Media;
  if (!m) throw new Error("Not found");
  return m.type === "MANGA" ? mapManga(m) : mapAnime(m);
}

export function clearNewsCache() { cache.clear(); }
