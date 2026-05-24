const REANIME_BASE = process.env.REACT_APP_REANIME_BASE_URL || "https://reanime.to";
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const FETCH_TIMEOUT = 6000;

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
  const words = title.split(/[\s\-â€“â€”]+/).filter(w => w.length > 3);
  const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];
  const keywordSets = [];
  if (uniqueWords.length >= 2) keywordSets.push(uniqueWords.slice(0, 2).join(" "));
  if (uniqueWords.length >= 3) keywordSets.push(uniqueWords.slice(0, 3).join(" "));
  if (uniqueWords.length >= 4) keywordSets.push(uniqueWords.slice(-2).join(" "));

  return [
    title,
    base !== title ? base : null,
    clean,
    title.split(":")[0].trim(),
    title.split("(")[0].trim(),
    title.split("Season")[0].trim(),
    title.replace(/\s+Part\s+\d+$/i, "").trim(),
    title.replace(/'/g, ""),
    ...keywordSets,
  ].filter((s, i, a) => s && s.length > 2 && a.indexOf(s) === i);
};

const CF_WORKER = "https://anime-proxy.mohamedlimam80000.workers.dev/?url=";
const FALLBACK_PROXIES = (process.env.REACT_APP_FALLBACK_PROXIES || "").split(",").filter(Boolean);
const BACKEND_PROXY = `${API_BASE}/scrape/fetch?url=`;

const ssCache = new Map();
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

async function tryFetch(url) {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const text = await res.text();
    const parsed = JSON.parse(text);
    if (parsed && parsed.success && typeof parsed.data === "string") {
      return JSON.parse(parsed.data);
    }
    return parsed;
  } catch {
    return null;
  }
}

async function fetchJsonViaProxy(url) {
  const cached = ssCache.get(url);
  if (cached && Date.now() - cached.time < 300000) return cached.data;

  const attempts = [
    () => tryFetch(`${CF_WORKER}${encodeURIComponent(url)}`),
    ...FALLBACK_PROXIES.map(p => () => tryFetch(`${p}${encodeURIComponent(url)}`)),
    () => tryFetch(url),
    () => tryFetch(`${BACKEND_PROXY}${encodeURIComponent(url)}`),
  ];

  for (const attempt of attempts) {
    const data = await attempt();
    if (data) {
      ssCache.set(url, { data, time: Date.now() });
      if (ssCache.size > 50) {
        const oldest = ssCache.keys().next().value;
        ssCache.delete(oldest);
      }
      return data;
    }
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

const SOURCES = process.env.REACT_APP_STREAM_SOURCES
  ? JSON.parse(process.env.REACT_APP_STREAM_SOURCES)
  : {
      reanime: {
        name: "reanime",
        base: REANIME_BASE,
      },
    };

async function searchReanimeSource(source, searchName, anilistId) {
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
  for (const q of allVariants) {
    try {
      const url = `${base}/api/search?q=${encodeURIComponent(q)}`;
      const data = await fetchJsonViaProxy(url);
      if (!data || !Array.isArray(data.results) || data.results.length === 0) continue;
      const matched = mapResults(data.results, q);
      if (matched.length > 0) return matched;
    } catch {}
  }
  return [];
}

async function getEpisodesReanime(slug) {
  try {
    const url = `${REANIME_BASE}/api/episodes/${slug}`;
    const data = await fetchJsonViaProxy(url);
    if (!data || !Array.isArray(data.data)) return [];

    return data.data.map(ep => ({
      episode: ep.episode_number,
      title: ep.title || `Episode ${ep.episode_number}`,
      url: String(ep.episode_number),
      thumbnail: ep.thumbnail || null,
      duration: ep.duration || null,
      aired: ep.aired || null,
      airDate: ep.air_date || ep.aired || null,
    })).sort((a, b) => a.episode - b.episode);
  } catch {
    return [];
  }
}

async function getStreamUrlsReanime(epNum, anilistId, fallbackId, slug) {
  const ids = [anilistId, fallbackId].filter(Boolean);
  if (ids.length === 0 && !slug) return [];
  const tryIds = ids.length > 0 ? ids : [slug];
  for (const id of tryIds) {
    try {
      const url = `${REANIME_BASE}/api/flix/${id}/${epNum}`;
      const data = await fetchJsonViaProxy(url);
      if (data && data.success && Array.isArray(data.servers) && data.servers.length > 0) {
        return data.servers.map(s => ({
          label: `${s.serverName} (${s.dataType})`,
          url: s.dataLink,
          type: s.dataType,
        }));
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
    console.warn("[stream] No results for:", animeName, "id:", anilistId);
  } catch (e) {
    console.error("[stream] findStreamingSource error:", e);
  }
  return null;
}

