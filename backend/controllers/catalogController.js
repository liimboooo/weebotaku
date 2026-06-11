const fetch = require('node-fetch');
const {
  DEFAULT_RETRIES,
  SYNC_RETRY_DELAY_MS,
  SYNC_RATE_LIMIT_WAIT_MS,
  SYNC_RATE_LIMIT_MAX_WAIT_MS,
  GRAPHQL_TIMEOUT_MS,
  ANILIST_PER_PAGE,
} = require('../config/constants');

const ANILIST = process.env.ANILIST_API_URL || 'https://graphql.anilist.co';
const ANIME_FIELDS = `id idMal title { romaji english } coverImage { large extraLarge } bannerImage averageScore popularity episodes genres description status season seasonYear studios(isMain:true) { nodes { name } } trailer { site id } format startDate { year month day } nextAiringEpisode { episode airingAt timeUntilAiring }`;

const STATUS_LABELS = {
  RELEASING: 'Ongoing',
  FINISHED: 'Completed',
  NOT_YET_RELEASED: 'Upcoming',
  CANCELLED: 'Cancelled',
  HIATUS: 'Hiatus',
};

function statusLabel(s) {
  return STATUS_LABELS[s] || s || 'Unknown';
}

function getCurrentSeason() {
  const m = new Date().getMonth();
  if (m >= 0 && m <= 2) return 'WINTER';
  if (m >= 3 && m <= 5) return 'SPRING';
  if (m >= 6 && m <= 8) return 'SUMMER';
  return 'FALL';
}

function getNextSeason() {
  const m = new Date().getMonth();
  if (m >= 0 && m <= 2) return 'SPRING';
  if (m >= 3 && m <= 5) return 'SUMMER';
  if (m >= 6 && m <= 8) return 'FALL';
  return 'WINTER';
}

function getNextSeasonYear() {
  const m = new Date().getMonth();
  const y = new Date().getFullYear();
  if (m >= 9) return y + 1;
  return y;
}

async function gql(query, variables = {}, retries = DEFAULT_RETRIES) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(ANILIST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        timeout: GRAPHQL_TIMEOUT_MS,
      });
      if (r.status === 429) {
        const wait = Math.min((attempt + 1) * SYNC_RATE_LIMIT_WAIT_MS, SYNC_RATE_LIMIT_MAX_WAIT_MS);
        await new Promise(res => setTimeout(res, wait));
        continue;
      }
      if (!r.ok) {
        if (attempt < retries) { await new Promise(res => setTimeout(res, SYNC_RETRY_DELAY_MS)); continue; }
        throw new Error(`AniList HTTP ${r.status}`);
      }
      const j = await r.json();
      if (j.errors) throw new Error(j.errors[0]?.message || 'AniList error');
      return j.data;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) { await new Promise(res => setTimeout(res, SYNC_RETRY_DELAY_MS)); continue; }
      throw lastErr;
    }
  }
  throw lastErr || new Error('AniList request failed');
}

function mapAnime(a) {
  return {
    id: a.id,
    malId: a.idMal,
    name: a.title?.english || a.title?.romaji || '',
    romaji: a.title?.romaji || '',
    native: a.title?.native || '',
    img: a.coverImage?.extraLarge || a.coverImage?.large || '',
    bannerImage: a.bannerImage || '',
    rating: (a.averageScore || 0) / 10,
    votes: a.popularity || 0,
    year: a.seasonYear || 0,
    episodes: a.episodes || 0,
    status: statusLabel(a.status),
    genres: a.genres || [],
    synopsis: a.description || '',
    studio: a.studios?.nodes?.[0]?.name || '',
    season: a.season ? `${a.season.charAt(0).toUpperCase() + a.season.slice(1).toLowerCase()} ${a.seasonYear || ''}` : '',
    type: a.format || 'TV',
    trailerUrl: a.trailer?.site === 'youtube' ? `https://www.youtube.com/embed/${a.trailer.id}` : null,
    currentEp: a.episodes || 0,
    nextEpDate: a.nextAiringEpisode?.airingAt ? new Date(a.nextAiringEpisode.airingAt * 1000).toLocaleDateString() : a.status === 'RELEASING' ? 'TBD' : 'Ended',
  };
}

const CACHE = new Map();
const { CACHE_TTL_MS, CACHE_MAX_ENTRIES } = require('../config/constants');
const CACHE_TTL = CACHE_TTL_MS;
const CACHE_MAX = CACHE_MAX_ENTRIES;

function getCached(key) {
  const entry = CACHE.get(key);
  if (!entry || Date.now() - entry.time > CACHE_TTL) return null;
  return entry.data;
}

function setCache(key, data) {
  if (CACHE.size >= CACHE_MAX) {
    const oldest = CACHE.keys().next().value;
    CACHE.delete(oldest);
  }
  CACHE.set(key, { data, time: Date.now() });
}

function paginateResponse(data, page, perPage) {
  const start = (page - 1) * perPage;
  return {
    success: true,
    data: data.slice(start, start + perPage),
    page,
    perPage,
    total: data.length,
    hasMore: start + perPage < data.length,
  };
}

exports.getTrending = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 20;
    const cached = getCached('trending');
    if (cached) return res.json(paginateResponse(cached, page, perPage));

    const q = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(sort:TRENDING_DESC,type:ANIME){${ANIME_FIELDS}}}}`;
    const data = await gql(q, { page: 1, perPage: ANILIST_PER_PAGE });
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache('trending', results);
    res.json(paginateResponse(results, page, perPage));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPopular = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 20;
    const cached = getCached('popular');
    if (cached) return res.json(paginateResponse(cached, page, perPage));

    const q = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(sort:POPULARITY_DESC,type:ANIME){${ANIME_FIELDS}}}}`;
    const data = await gql(q, { page: 1, perPage: 50 });
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache('popular', results);
    res.json(paginateResponse(results, page, perPage));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSeasonal = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const season = (req.query.season || getCurrentSeason()).toUpperCase();
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 20;
    const cacheKey = `seasonal:${year}:${season}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(paginateResponse(cached, page, perPage));

    const q = `query($yr:Int,$seas:MediaSeason,$page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(season:$seas,seasonYear:$yr,type:ANIME,sort:POPULARITY_DESC){${ANIME_FIELDS}}}}`;
    const data = await gql(q, { yr: year, seas: season, page: 1, perPage: 50 });
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache(cacheKey, results);
    res.json(paginateResponse(results, page, perPage));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUpcoming = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 20;
    const cached = getCached('upcoming');
    if (cached) return res.json(paginateResponse(cached, page, perPage));

    const q = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(status:NOT_YET_RELEASED,type:ANIME,sort:POPULARITY_DESC){${ANIME_FIELDS}}}}`;
    const data = await gql(q, { page: 1, perPage: 50 });
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache('upcoming', results);
    res.json(paginateResponse(results, page, perPage));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTopRated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 20;
    const filter = req.query.filter || '';
    const cacheKey = `top:${filter}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(paginateResponse(cached, page, perPage));

    const sort = filter === 'bypopularity' ? 'POPULARITY_DESC'
      : filter === 'airing' ? 'TRENDING_DESC'
      : filter === 'upcoming' ? 'TRENDING_DESC'
      : 'SCORE_DESC';
    const statusFilter = filter === 'upcoming' ? ',status:NOT_YET_RELEASED' : '';
    const q = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(sort:${sort},type:ANIME${statusFilter}){${ANIME_FIELDS}}}}`;
    const data = await gql(q, { page: 1, perPage: 50 });
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache(cacheKey, results);
    res.json(paginateResponse(results, page, perPage));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAiring = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 20;
    const cached = getCached('airing');
    if (cached) return res.json(paginateResponse(cached, page, perPage));

    const q = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(status:RELEASING,type:ANIME,sort:POPULARITY_DESC){${ANIME_FIELDS}}}}`;
    const data = await gql(q, { page: 1, perPage: 50 });
    const results = (data?.Page?.media || []).map(mapAnime);
    setCache('airing', results);
    res.json(paginateResponse(results, page, perPage));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBrowse = async (req, res) => {
  try {
    const {
      search, genre, tag, format, year, season, status, country, source,
      sort = 'POPULARITY_DESC', page: p = 1,
    } = req.query;
    const page = Math.max(1, Math.min(parseInt(p) || 1, 5000));
    const hasSearch = !!(search && search.trim());

    const vars = {
      page,
      sort: [hasSearch ? 'SEARCH_MATCH' : sort],
    };
    const paramDefs = ['$page:Int', '$sort:[MediaSort]'];
    const mediaArgs = ['type:ANIME', 'sort:$sort'];
    const add = (def, arg, key, value) => {
      paramDefs.push(def);
      mediaArgs.push(arg);
      vars[key] = value;
    };

    if (hasSearch) add('$search:String', 'search:$search', 'search', search.trim());
    if (genre) add('$genres:[String]', 'genre_in:$genres', 'genres', [genre]);
    if (tag) add('$tags:[String]', 'tag_in:$tags', 'tags', [tag]);
    if (format) add('$format:MediaFormat', 'format:$format', 'format', format);
    if (year) add('$year:Int', 'seasonYear:$year', 'year', Number(year));
    if (season) add('$season:MediaSeason', 'season:$season', 'season', season);
    if (status) add('$status:MediaStatus', 'status:$status', 'status', status);
    if (country) add('$country:CountryCode', 'countryOfOrigin:$country', 'country', country);
    if (source) add('$source:MediaSource', 'source:$source', 'source', source);

    const q = `query(${paramDefs.join(',')}){Page(page:$page,perPage:30){pageInfo{total currentPage lastPage hasNextPage} media(${mediaArgs.join(',')}){${ANIME_FIELDS}}}}`;
    const data = await gql(q, vars);
    res.json({
      success: true,
      data: (data?.Page?.media || []).map(mapAnime),
      pageInfo: data?.Page?.pageInfo || { total: 0, currentPage: page, lastPage: 1, hasNextPage: false },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.search = async (req, res) => {
  try {
    const { q, page: p, type, status } = req.query;
    if (!q) return res.status(400).json({ success: false, message: 'Query parameter q is required' });

    const page = parseInt(p) || 1;
    const variables = { page: Math.min(page, 50), search: q };
    if (type && type !== 'All') variables.format = type.toUpperCase();
    if (status && status !== 'All') variables.status = status === 'Ongoing' ? 'RELEASING' : 'FINISHED';

    const qStr = `query($page:Int,$search:String,$format:MediaFormat,$status:MediaStatus){
      Page(page:$page,perPage:25){pageInfo{hasNextPage currentPage}
      media(search:$search,type:ANIME,sort:SEARCH_MATCH,format:$format,status:$status){${ANIME_FIELDS}}}}`;
    const data = await gql(qStr, variables);
    const results = (data?.Page?.media || []).map(mapAnime);

    res.json({
      success: true,
      data: results,
      pagination: {
        hasNextPage: data?.Page?.pageInfo?.hasNextPage || false,
        currentPage: page,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getHomeBundle = async (req, res) => {
  try {
    const cached = getCached('homeBundle');
    if (cached) return res.json({ success: true, data: cached });

    const [trending, popular, topRated, seasonal, upcoming, airing] = await Promise.all([
      gql(`query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(sort:TRENDING_DESC,type:ANIME){${ANIME_FIELDS}}}}`, { p: 1, pp: 25 }).then(d => (d?.Page?.media || []).map(mapAnime)),
      gql(`query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(sort:POPULARITY_DESC,type:ANIME){${ANIME_FIELDS}}}}`, { p: 1, pp: 25 }).then(d => (d?.Page?.media || []).map(mapAnime)),
      gql(`query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(sort:SCORE_DESC,type:ANIME){${ANIME_FIELDS}}}}`, { p: 1, pp: 25 }).then(d => (d?.Page?.media || []).map(mapAnime)),
      gql(`query($yr:Int,$seas:MediaSeason,$p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(season:$seas,seasonYear:$yr,type:ANIME,sort:POPULARITY_DESC){${ANIME_FIELDS}}}}`, { yr: new Date().getFullYear(), seas: getCurrentSeason(), p: 1, pp: 25 }).then(d => (d?.Page?.media || []).map(mapAnime)),
      gql(`query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(status:NOT_YET_RELEASED,type:ANIME,sort:POPULARITY_DESC){${ANIME_FIELDS}}}}`, { p: 1, pp: 25 }).then(d => (d?.Page?.media || []).map(mapAnime)),
      gql(`query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(status:RELEASING,type:ANIME,sort:POPULARITY_DESC){${ANIME_FIELDS}}}}`, { p: 1, pp: 25 }).then(d => (d?.Page?.media || []).map(mapAnime)),
    ]);

    let genres = getCached('genres');
    if (!genres) {
      try { const d = await gql(`query{GenreCollection}`); genres = d?.GenreCollection || []; setCache('genres', genres); } catch { genres = []; }
    }

    const result = { trending, popular, highRated: topRated, seasonal, upcoming, airing, genres };
    setCache('homeBundle', result);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const cacheKey = `byId:${numId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const q = `query($id:Int){Media(id:$id,type:ANIME){${ANIME_FIELDS} popularity}}`;
    try {
      const data = await gql(q, { id: numId });
      if (data?.Media) { const result = mapAnime(data.Media); setCache(cacheKey, result); return res.json({ success: true, data: result }); }
    } catch {}

    const q2 = `query($id:Int){Media(idMal:$id,type:ANIME){${ANIME_FIELDS} popularity}}`;
    const data = await gql(q2, { id: numId });
    if (!data?.Media) return res.status(404).json({ success: false, message: 'Anime not found' });
    const result = mapAnime(data.Media);
    setCache(cacheKey, result);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFullAnime = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const cacheKey = `full:${numId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const animeQ = `query($id:Int){Media(id:$id,type:ANIME){${ANIME_FIELDS} popularity}}`;
    const recQ = `query($id:Int){Media(id:$id){recommendations(perPage:10,sort:RATING_DESC){nodes{mediaRecommendation{id title{romaji english} coverImage{large} episodes format}}}}}`;

    const [animeData, recData] = await Promise.all([
      gql(animeQ, { id: numId }).then(d => d?.Media ? mapAnime(d.Media) : null),
      gql(recQ, { id: numId }).then(d => (d?.Media?.recommendations?.nodes || []).map(n => n.mediaRecommendation).filter(Boolean).map(r => ({ id: r.id, name: r.title?.english || r.title?.romaji || '', img: r.coverImage?.large || '', episodes: r.episodes || 0, format: r.format || 'TV' }))),
    ]);

    if (!animeData) return res.status(404).json({ success: false, message: 'Anime not found' });

    const result = { anime: animeData, recommendations: recData || [] };
    setCache(cacheKey, result);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const q = `query($id:Int){Media(id:$id,type:ANIME){${ANIME_FIELDS} popularity studios(isMain:true){nodes{name}} trailer{site id}}}`;
    const data = await gql(q, { id: Number(id) });
    if (!data?.Media) return res.status(404).json({ success: false, message: 'Anime not found' });

    const a = data.Media;
    const detail = {
      id: a.id,
      malId: a.idMal,
      name: a.title?.english || a.title?.romaji || '',
      romaji: a.title?.romaji || '',
      native: a.title?.native || '',
      img: a.coverImage?.extraLarge || a.coverImage?.large || '',
      bannerImage: a.bannerImage || '',
      rating: (a.averageScore || 0) / 10,
      popularity: a.popularity || 0,
      year: a.seasonYear || 0,
      episodes: a.episodes || 0,
      duration: a.duration || 0,
      status: statusLabel(a.status),
      genres: a.genres || [],
      synopsis: a.description || '',
      studios: a.studios?.nodes?.map(n => n.name) || [],
      season: a.season ? `${a.season.charAt(0).toUpperCase() + a.season.slice(1).toLowerCase()} ${a.seasonYear || ''}` : '',
      type: a.format || 'TV',
      startDate: a.startDate ? { year: a.startDate.year, month: a.startDate.month, day: a.startDate.day } : null,
      trailerUrl: a.trailer?.site === 'youtube' ? `https://www.youtube.com/embed/${a.trailer.id}` : null,
      nextAiringEpisode: a.nextAiringEpisode || null,
    };

    res.json({ success: true, data: detail });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCharacters = async (req, res) => {
  try {
    const { id } = req.params;
    const q = `query($id:Int){Media(id:$id,type:ANIME){characters(page:1,perPage:10){edges{role node{id name{full}image{large}}voiceActors(language:JAPANESE){id name{full}image{large}language}}}}}`;
    const data = await gql(q, { id: Number(id) });
    const characters = (data?.Media?.characters?.edges || []).map(e => ({
      id: e.node.id,
      name: e.node.name?.full || '',
      image: e.node.image?.large || '',
      role: e.role,
      voiceActor: e.voiceActors?.[0] ? {
        name: e.voiceActors[0].name?.full || '',
        image: e.voiceActors[0].image?.large || '',
        lang: e.voiceActors[0].language,
      } : null,
    }));
    res.json({ success: true, data: characters });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const { id } = req.params;
    const q = `query($id:Int){Media(id:$id,type:ANIME){recommendations(page:1,perPage:12){edges{node{rating mediaRecommendation{id title{romaji english}coverImage{large extraLarge}averageScore format episodes genres status season seasonYear}}}}}}`;
    const data = await gql(q, { id: Number(id) });
    const recs = (data?.Media?.recommendations?.edges || [])
      .filter(e => e.node.mediaRecommendation)
      .map(e => {
        const m = e.node.mediaRecommendation;
        return {
          id: m.id,
          name: m.title?.english || m.title?.romaji || '',
          image: m.coverImage?.extraLarge || m.coverImage?.large || '',
          rating: (m.averageScore || 0) / 10,
          format: m.format || 'TV',
          episodes: m.episodes || 0,
          genres: m.genres || [],
          status: m.status,
          season: m.season,
          seasonYear: m.seasonYear,
        };
      });
    res.json({ success: true, data: recs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSchedule = async (req, res) => {
  try {
    const start = parseInt(req.query.start) || Math.floor(Date.now() / 1000);
    const end = parseInt(req.query.end) || start + 86400;
    const cacheKey = `schedule_${Math.floor(start / 86400)}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const q = `query($start:Int,$end:Int){Page(page:1,perPage:50){airingSchedules(airingAt_greater:$start,airingAt_lesser:$end,sort:TIME){id airingAt episode media{id title{romaji english} format coverImage{large} description(asHtml:false) genres averageScore episodes status}}}}`;
    const data = await gql(q, { start: start - 1, end });
    const schedule = (data?.Page?.airingSchedules || [])
      .filter(s => s.media)
      .map(s => ({
        id: s.id,
        airingAt: s.airingAt,
        episode: s.episode,
        animeId: s.media.id,
        name: s.media.title?.english || s.media.title?.romaji || '',
        format: s.media.format || 'TV',
        img: s.media.coverImage?.large || '',
        synopsis: (s.media.description || '').replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').slice(0, 500),
        genres: s.media.genres || [],
        rating: (s.media.averageScore || 0) / 10,
        totalEpisodes: s.media.episodes || 0,
        status: s.media.status || '',
      }));
    setCache(cacheKey, schedule);
    res.json({ success: true, data: schedule });
  } catch (err) {
    console.error('getSchedule error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getGenres = async (req, res) => {
  try {
    const cached = getCached('genres');
    if (cached) return res.json({ success: true, data: cached });

    const data = await gql('query{GenreCollection}');
    const genres = data?.GenreCollection || [
      'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
      'Horror', 'Mystery', 'Romance', 'Sci-Fi',
      'Slice of Life', 'Sports', 'Thriller',
    ];
    setCache('genres', genres);
    res.json({ success: true, data: genres });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTags = async (req, res) => {
  try {
    const cached = getCached('tags');
    if (cached) return res.json({ success: true, data: cached });

    const q = 'query { TagCollection { name } }';
    const data = await gql(q);
    const tags = (data?.TagCollection || []).map(t => t.name).filter(Boolean).sort();
    setCache('tags', tags);
    res.json({ success: true, data: tags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getNewsFeed = async (req, res) => {
  try {
    const cached = getCached('newsFeed');
    if (cached) return res.json({ success: true, data: cached });

    const season = getNextSeason();
    const year = getNextSeasonYear();

    const animeQuery = `{
      trending: Page(page:1,perPage:10){media(sort:TRENDING_DESC,type:ANIME){id title{romaji english} coverImage{large extraLarge} bannerImage format episodes season seasonYear status meanScore trending genres description startDate{year month day} studios(isMain:true){nodes{name}} nextAiringEpisode{episode airingAt} trailer{id site}}}
      popular: Page(page:1,perPage:8){media(sort:POPULARITY_DESC,type:ANIME){id title{romaji english} coverImage{large extraLarge} bannerImage format meanScore trending genres trailer{id site}}}
      upcoming: Page(page:1,perPage:8){media(season:${season},seasonYear:${year},type:ANIME,sort:POPULARITY_DESC){id title{romaji english} coverImage{large extraLarge} bannerImage format meanScore genres startDate{year month day}}}
      airing: Page(page:1,perPage:10){media(status:RELEASING,type:ANIME,sort:POPULARITY_DESC){id title{romaji english} coverImage{large extraLarge} bannerImage format episodes meanScore trending genres nextAiringEpisode{episode airingAt} trailer{id site}}}
    }`;

    const mangaQuery = `{
      trending: Page(page:1,perPage:8){media(sort:TRENDING_DESC,type:MANGA){id title{romaji english} coverImage{large} format chapters volumes meanScore trending genres description startDate{year month day} status}}
      popular: Page(page:1,perPage:8){media(sort:POPULARITY_DESC,type:MANGA){id title{romaji english} coverImage{large} format chapters volumes meanScore trending genres}}
      upcoming: Page(page:1,perPage:8){media(status:NOT_YET_RELEASED,type:MANGA,sort:POPULARITY_DESC){id title{romaji english} coverImage{large} format chapters volumes meanScore genres startDate{year month day}}}
      publishing: Page(page:1,perPage:10){media(status:RELEASING,type:MANGA,sort:POPULARITY_DESC){id title{romaji english} coverImage{large} format chapters volumes meanScore trending genres}}
    }`;

    const [animeData, mangaData] = await Promise.all([
      gql(animeQuery),
      gql(mangaQuery),
    ]);

    function pickTitle(t) { return t?.english || t?.romaji || 'Unknown'; }
    function stripHtml(h) { if (!h) return ''; return h.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim(); }

    function mapNewsAnime(a) {
      return {
        id: a.id,
        title: pickTitle(a.title),
        image: a.coverImage?.large || '',
        bannerImage: a.bannerImage || a.coverImage?.extraLarge || a.coverImage?.large || '',
        format: a.format || 'TV',
        episodes: a.episodes,
        score: a.meanScore ? (a.meanScore / 10).toFixed(1) : null,
        trending: a.trending || 0,
        genres: a.genres || [],
        synopsis: stripHtml(a.description).slice(0, 250),
        studio: a.studios?.nodes?.[0]?.name || null,
        season: a.season ? `${a.season} ${a.seasonYear}` : null,
        status: a.status,
        mediaType: 'anime',
        nextEpisode: a.nextAiringEpisode ? { ep: a.nextAiringEpisode.episode, at: a.nextAiringEpisode.airingAt } : null,
        trailer: a.trailer?.site === 'youtube' ? a.trailer.id : null,
      };
    }

    function mapNewsManga(m) {
      return {
        id: m.id,
        title: pickTitle(m.title),
        image: m.coverImage?.large || '',
        format: m.format || 'Manga',
        chapters: m.chapters,
        volumes: m.volumes,
        score: m.meanScore ? (m.meanScore / 10).toFixed(1) : null,
        trending: m.trending || 0,
        genres: m.genres || [],
        synopsis: stripHtml(m.description).slice(0, 250),
        status: m.status,
        mediaType: 'manga',
      };
    }

    const result = {
      animeTrending: (animeData.trending?.media || []).map(mapNewsAnime),
      animePopular: (animeData.popular?.media || []).map(mapNewsAnime),
      animeUpcoming: (animeData.upcoming?.media || []).map(mapNewsAnime),
      animeAiring: (animeData.airing?.media || []).map(mapNewsAnime),
      mangaTrending: (mangaData.trending?.media || []).map(mapNewsManga),
      mangaPopular: (mangaData.popular?.media || []).map(mapNewsManga),
      mangaUpcoming: (mangaData.upcoming?.media || []).map(mapNewsManga),
      mangaPublishing: (mangaData.publishing?.media || []).map(mapNewsManga),
    };

    setCache('newsFeed', result);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
