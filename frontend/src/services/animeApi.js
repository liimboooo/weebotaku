const REANIME_BASE = process.env.REACT_APP_REANIME_BASE_URL || "https://reanime.to";
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const FETCH_TIMEOUT = 5000;

function cleanTitle(title) {
  return title.replace(/\s*\([^)]*\)/g, "").replace(/[^\w\s-]/g, "").trim();
}

function stripSeasonSuffixes(title) {
  return title
    .replace(/\s+\d+(?:st|nd|rd|th)?\s+Season\b.*$/i, "")
    .replace(/\s+Season\s+\d+.*$/i, "")
    .replace(/\s+Part\s+\d+.*$/i, "")
    .replace(/\s+Cour\s+\d+.*$/i, "")
    .trim();
}

const titleVariants = (title) => {
  const base = stripSeasonSuffixes(title);
  const clean = cleanTitle(base || title);
  const words = title.split(/[\s\-\u2013\u2014]+/).filter(w => w.length > 3);
  const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];

  return [
    title,
    base !== title ? base : null,
    clean,
    uniqueWords.length >= 2 ? uniqueWords.slice(0, 2).join(" ") : null,
  ].filter((s, i, a) => s && s.length > 2 && a.indexOf(s) === i);
};

const CF_WORKER = "https://anime-proxy.mohamedlimam80000.workers.dev/?url=";
const FALLBACK_PROXIES = (process.env.REACT_APP_FALLBACK_PROXIES || "").split(",").filter(Boolean);


const ssCache = new Map();
const failCache = new Map();

async function raceToFirst(promises) {
  let settled = false;
  return new Promise((resolve) => {
    for (const p of promises) {
      // eslint-disable-next-line no-loop-func
      p.then(val => { if (!settled && val) { settled = true; resolve(val); } }).catch(err => console.error('[AnimeWch] raceToFirst: a search promise rejected:', err));
    }
    Promise.allSettled(promises).then(() => { if (!settled) resolve(null); });
  });
}

async function fetchWithTimeout(url, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, mode: "cors" });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function extractServers(data) {
  if (!data) return null;
  if (Array.isArray(data.servers) && data.servers.length > 0) return data.servers;
  if (data.data && Array.isArray(data.data.servers) && data.data.servers.length > 0) return data.data.servers;
  if (data.result && Array.isArray(data.result)) return data.result;
  if (Array.isArray(data)) return data;
  return null;
}

function combineAbortSignals(s1, s2) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  s1.addEventListener('abort', onAbort);
  s2.addEventListener('abort', onAbort);
  if (s1.aborted || s2.aborted) controller.abort();
  return controller.signal;
}

async function tryFetch(url, signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  const mergedSignal = signal
    ? combineAbortSignals(signal, controller.signal)
    : controller.signal;
  try {
    const res = await fetch(url, { signal: mergedSignal, mode: "cors" });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { return null; }
    if (parsed && parsed.success && typeof parsed.data === "string") {
      try { return JSON.parse(parsed.data); } catch { return null; }
    }
    if (parsed && parsed.success === false) return null;
    return parsed;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function fetchJsonViaProxy(url) {
  const cached = ssCache.get(url);
  if (cached && Date.now() - cached.time < 300000) return cached.data;

  const failed = failCache.get(url);
  if (failed && Date.now() - failed.time < 30000) return null;

  const proxyUrls = [
    url,
    `${CF_WORKER}${encodeURIComponent(url)}`,
    ...FALLBACK_PROXIES.map(p => `${p}${encodeURIComponent(url)}`),
  ];

  const fetched = await Promise.allSettled(
    proxyUrls.map(target => tryFetch(target))
  );

  for (const r of fetched) {
    const data = r.status === 'fulfilled' ? r.value : null;
    if (data && data.success !== false) {
      ssCache.set(url, { data, time: Date.now() });
      if (ssCache.size > 50) {
        const oldest = ssCache.keys().next().value;
        ssCache.delete(oldest);
      }
      return data;
    }
  }

  failCache.set(url, { time: Date.now() });
  if (failCache.size > 100) {
    const oldest = failCache.keys().next().value;
    failCache.delete(oldest);
  }
  return null;
}

function scoreRelevance(title, searchQuery) {
  const t = title.toLowerCase();
  const q = searchQuery.toLowerCase();
  if (t === q) return 999;
  const tWords = [...new Set(t.split(/\W+/).filter(Boolean))];
  const qWords = [...new Set(q.split(/\W+/).filter(Boolean))];
  const overlap = qWords.filter((w) => tWords.includes(w)).length;
  let score = overlap * 20;
  if (overlap === qWords.length) score += 100;
  for (const w of qWords) if (w.length > 3 && tWords.includes(w)) score += 10;
  if (t.includes(q)) score += 80;
  else if (q.includes(t)) score += 40;
  return score;
}

function extractAnilistId(coverUrl) {
  const m = (coverUrl || "").match(/[bn]x(\d+)-/);
  return m ? parseInt(m[1], 10) : null;
}

let parsedSources = null;
try {
  if (process.env.REACT_APP_STREAM_SOURCES) {
    parsedSources = JSON.parse(process.env.REACT_APP_STREAM_SOURCES);
  }
} catch {}
const SOURCES = parsedSources || {
  reanime: {
    name: "reanime",
    base: REANIME_BASE,
  },
};

const searchCache = new Map();

async function searchReanimeSource(source, searchName, anilistId) {
  const cacheKey = `${searchName}::${anilistId}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < 300000) return cached.data;

  const { base, name } = source;
  const idNum = anilistId ? parseInt(anilistId) : null;

  const mapResults = (results, query) => {
    let idMatch = null;
    const scored = results.map(item => {
      const coverUrl = item.cover_image?.extra_large || item.cover_image?.large || item.cover_image?.medium || "";
      const extractedId = extractAnilistId(coverUrl);
      const title = item.title?.english || item.title?.romaji || item.title?.user_preferred || "";
      const score = scoreRelevance(title, query);
      const entry = {
        slug: item.anime_id,
        title: title || searchName,
        anilistId: extractedId || idNum || null,
        _score: score,
        source: name,
        sourceBase: base,
      };
      if (idNum && extractedId === idNum) idMatch = { ...entry, _score: 999 };
      return entry;
    });
    if (idMatch) return [idMatch];
    return scored.sort((a, b) => b._score - a._score);
  };

  const allVariants = titleVariants(searchName);
  const variantUrls = allVariants.map(q => `${base}/api/search?q=${encodeURIComponent(q)}`);

  const match = await raceToFirst(allVariants.map((q, i) =>
    fetchJsonViaProxy(variantUrls[i]).then(data => {
      if (!data) return null;
      const items = data.results || data.data || (Array.isArray(data) ? data : null);
      if (!Array.isArray(items) || items.length === 0) return null;
      const matched = mapResults(items, q);
      return matched.length > 0 ? matched : null;
    })
  ));

  if (match) {
    searchCache.set(cacheKey, { data: match, time: Date.now() });
    if (searchCache.size > 50) {
      const oldest = searchCache.keys().next().value;
      searchCache.delete(oldest);
    }
    return match;
  }
  return [];
}

async function getEpisodesReanime(slug) {
  try {
    const url = `${REANIME_BASE}/api/episodes/${slug}`;
    const data = await fetchJsonViaProxy(url);
    if (!data) return [];

    const eps = data.data || data.episodes || data.results || (Array.isArray(data) ? data : null);
    if (!Array.isArray(eps) || eps.length === 0) return [];

    return eps.map(ep => ({
      episode: ep.episode_number || ep.number || ep.episode || 0,
      title: ep.title || `Episode ${ep.episode_number || ep.number || ep.episode || '?'}`,
      url: String(ep.episode_number || ep.number || ep.episode || 1),
      thumbnail: ep.thumbnail || ep.image || null,
      duration: ep.duration || null,
      aired: ep.aired || ep.airDate || null,
      airDate: ep.air_date || ep.aired || ep.airDate || null,
    })).filter(ep => ep.episode > 0).sort((a, b) => a.episode - b.episode);
  } catch {
    return [];
  }
}

async function getStreamUrlsReanime(epNum, anilistId, fallbackId, slug) {
  const rawIds = [anilistId, fallbackId, slug].filter(Boolean);
  const tryIds = [];
  for (const id of rawIds) {
    tryIds.push(String(id));
    const n = Number(id);
    if (Number.isInteger(n) && n > 0) tryIds.push(String(n));
  }
  if (tryIds.length === 0) return [];
  for (const id of [...new Set(tryIds)]) {
    try {
      const url = `${REANIME_BASE}/api/flix/${id}/${epNum}`;
      const data = await fetchJsonViaProxy(url);
      const servers = extractServers(data);
      if (servers) {
        return servers.map(s => ({
          label: `${s.serverName || s.name || ''} (${s.dataType || s.type || 'sub'})`,
          url: s.dataLink || s.url || s.file || '',
          type: s.dataType || s.type || 'sub',
          referer: s.referer || s.referrer || s.source || null,
          embed: s.embed || null,
        })).filter(s => s.url);
      }
    } catch {}
  }
  return [];
}

export async function getEpisodes(animeName, tagSlug, sourceName, sourceBase, anilistId) {
  if (sourceName === "reanime") {
    return getEpisodesReanime(tagSlug);
  }
  return [];
}

export async function getStreamUrls(episodeUrl, sourceName, anilistId, fallbackId, slug) {
  if (sourceName === "reanime") {
    return getStreamUrlsReanime(episodeUrl, anilistId, fallbackId, slug);
  }
  return [];
}

const EP_PAGE_SIZE = 50;

export async function getEpisodePage(animeName, tagSlug, sourceName, sourceBase, anilistId, page = 0) {
  if (sourceName !== "reanime") return { episodes: [], total: 0 };
  const all = await getEpisodesReanime(tagSlug);
  const start = page * EP_PAGE_SIZE;
  return {
    episodes: all.slice(start, start + EP_PAGE_SIZE),
    total: all.length,
    hasMore: start + EP_PAGE_SIZE < all.length,
  };
}

const ARM_API = 'https://arm.haglund.dev/api/v2/ids';
const EZVIDAPI_BASE = 'https://api.ezvidapi.com';
const EZVIDAPI_PROVIDERS = ['vidsrc', 'vidrock', 'vidnest', 'vixsrc'];
const tmdbClientCache = new Map();

async function anilistToTmdbClient(anilistId) {
  if (tmdbClientCache.has(anilistId)) return tmdbClientCache.get(anilistId);
  const url = `${ARM_API}?source=anilist&id=${anilistId}`;
  let data = null;
  try {
    const res = await fetchWithTimeout(url, 3000);
    if (res.ok) data = await res.json();
  } catch {
    try {
      const res = await fetchWithTimeout(`${CF_WORKER}${encodeURIComponent(url)}`, 4000);
      if (res.ok) {
        const raw = await res.json();
        data = raw?.success && typeof raw.data === 'string' ? JSON.parse(raw.data) : raw;
      }
    } catch {}
  }
  if (!data?.themoviedb) return null;
  const result = { id: data.themoviedb, season: data['themoviedb-season'] || 1 };
  tmdbClientCache.set(anilistId, result);
  return result;
}

async function ezvidapiResolveClient(tmdbId, season, episode) {
  try {
    return await Promise.any(
      EZVIDAPI_PROVIDERS.map(async (provider) => {
        const url = `${EZVIDAPI_BASE}/tv/${provider}/${tmdbId}?season=${season}&episode=${episode}`;
        const res = await fetchWithTimeout(url, 7000);
        if (!res.ok) throw new Error('not ok');
        const d = await res.json();
        if (!d.stream_url) throw new Error('no stream');
        return { ...d, provider };
      })
    );
  } catch { return null; }
}

export async function getDirectStream(anilistId, episodeNum) {
  try {
    const tmdb = await anilistToTmdbClient(anilistId);
    if (!tmdb) return null;
    const ezvid = await ezvidapiResolveClient(tmdb.id, tmdb.season, episodeNum);
    if (!ezvid) return null;
    const allSubs = (ezvid.subtitles || []).map(s => ({ url: s.url, label: s.label || s.language || '' }));
    const engSubs = allSubs.filter(s => /english/i.test(s.label));
    return {
      provider: `ezvidapi:${ezvid.provider}`,
      stream: { url: ezvid.stream_url, quality: 'auto' },
      subtitles: engSubs.length > 0 ? engSubs : allSubs.slice(0, 3),
      intro: null,
      outro: null,
    };
  } catch { return null; }
}

export async function getMiruroEpisodes(anilistId) {
  try {
    const res = await fetch(`${API_BASE}/stream/episodes/${anilistId}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return json.data;
  } catch { return null; }
}

export async function getMiruroStream(anilistId, episodeNum, category = 'sub') {
  try {
    const res = await fetch(`${API_BASE}/stream/auto/${anilistId}/${episodeNum}?cat=${category}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return json.data;
  } catch { return null; }
}

export async function findStreamingSource(animeName, anilistId) {
  const source = SOURCES.reanime;
  try {
    const results = await searchReanimeSource(source, animeName, anilistId);
    if (results.length > 0) {
      const best = results[0];
      const id = best.anilistId || anilistId;
      return {
        source: best.source,
        sourceBase: best.sourceBase,
        slug: best.slug,
        id: best.slug,
        title: best.title,
        tagSlug: best.slug,
        anilistId: id,
      };
    }
  } catch {
  }
  return null;
}

