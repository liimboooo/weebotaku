const REANIME_BASE = process.env.REACT_APP_REANIME_BASE_URL || "https://reanime.to";

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

const CF_WORKER = process.env.REACT_APP_CF_PROXY_URL || "";
const PROXIES = [
  CF_WORKER,
  ...(process.env.REACT_APP_FALLBACK_PROXIES || "").split(",").filter(Boolean),
];

const ssCache = new Map();
async function fetchJsonViaProxy(url) {
  const cached = ssCache.get(url);
  if (cached && Date.now() - cached.time < 300000) return cached.data;
  const proxies = PROXIES.filter(Boolean);
  if (proxies.length === 0) return null;
  for (const proxy of proxies) {
    try {
      const res = await Promise.race([
        fetch(`${proxy}${encodeURIComponent(url)}`, { mode: "cors" }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000)),
      ]);
      if (!res.ok) continue;
      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        let data;
        if (parsed && parsed.success && typeof parsed.data === "string") {
          data = JSON.parse(parsed.data);
        } else {
          data = parsed;
        }
        ssCache.set(url, { data, time: Date.now() });
        if (ssCache.size > 50) {
          const oldest = ssCache.keys().next().value;
          ssCache.delete(oldest);
        }
        return data;
      } catch {
        return null;
      }
    } catch {}
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

async function searchReanimeSource(source, searchName) {
  const { base, name } = source;
  for (const q of titleVariants(searchName)) {
    try {
      const url = `${base}/api/search?q=${encodeURIComponent(q)}`;
      const data = await fetchJsonViaProxy(url);
      if (!data || !Array.isArray(data.results) || data.results.length === 0) continue;

      const matched = data.results.map(item => {
        const coverUrl = item.cover_image?.extra_large || item.cover_image?.large || item.cover_image?.medium || "";
        const anilistId = extractAnilistId(coverUrl);
        const title = item.title?.english || item.title?.romaji || item.title?.user_preferred || "";
        const score = scoreRelevance(title, q);
        return {
          slug: item.anime_id,
          title: title || searchName,
          anilistId,
          _score: score,
          source: name,
          sourceBase: base,
        };
      });

      if (matched.length > 0) {
        return matched.sort((a, b) => b._score - a._score);
      }
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

async function getStreamUrlsReanime(epNum, anilistId) {
  try {
    if (!anilistId) return [];
    const url = `${REANIME_BASE}/api/flix/${anilistId}/${epNum}`;
    const data = await fetchJsonViaProxy(url);
    if (!data || !data.success || !Array.isArray(data.servers)) return [];

    return data.servers.map(s => ({
      label: `${s.serverName} (${s.dataType})`,
      url: s.dataLink,
      type: s.dataType,
    }));
  } catch {
    return [];
  }
}

export async function getEpisodes(animeName, tagSlug, sourceName, sourceBase, anilistId) {
  if (sourceName === "reanime") {
    return getEpisodesReanime(tagSlug);
  }
  return [];
}

export async function getStreamUrls(episodeUrl, sourceName, anilistId) {
  if (sourceName === "reanime") {
    return getStreamUrlsReanime(episodeUrl, anilistId);
  }
  return [];
}

export async function findStreamingSource(animeName) {
  const source = SOURCES.reanime;
  const results = await searchReanimeSource(source, animeName);

  if (results.length > 0) {
    const best = results[0];
    return {
      source: best.source,
      sourceBase: best.sourceBase,
      slug: best.slug,
      id: best.slug,
      title: best.title,
      tagSlug: best.slug,
      anilistId: best.anilistId,
    };
  }

  return null;
}

