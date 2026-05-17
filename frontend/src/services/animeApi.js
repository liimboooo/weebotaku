function cleanTitle(title) {
  return title.replace(/\s*\([^)]*\)/g, "").replace(/[^\w\s-]/g, "").trim();
}

const titleVariants = (title) => {
  const clean = cleanTitle(title);
  return [
    title,
    clean,
    title.split(":")[0].trim(),
    title.split("(")[0].trim(),
    title.split("Season")[0].trim(),
    title.replace(/\s+Part\s+\d+$/i, "").trim(),
    title.replace(/'/g, ""),
  ].filter((s, i, a) => s && s.length > 2 && a.indexOf(s) === i);
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const FALLBACK_PROXY = "https://api.codetabs.com/v1/proxy?quest=";

async function fetchHtmlViaProxy(url) {
  for (const p of [
    async () => {
      const res = await fetch(`${API_BASE}/scrape/fetch?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data.data : null;
    },
    async () => {
      const res = await Promise.race([
        fetch(`${FALLBACK_PROXY}${encodeURIComponent(url)}`, { mode: "cors" }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000)),
      ]);
      if (res.ok) return await res.text();
      return null;
    },
  ]) {
    try { const result = await p(); if (result) return result; } catch {}
  }
  return null;
}

// ─── AniPub ───
async function anipubFetch(path) {
  const url = `${API_BASE}/scrape/anipub-proxy?path=${encodeURIComponent(path)}`;
  try {
    const res = await fetch(url);
    if (res.ok) { const json = await res.json(); if (json.success) return JSON.parse(json.data); }
  } catch {}
  const direct = await fetch(`https://anipub.xyz${path}`);
  if (direct.ok) return await direct.json();
  throw new Error('anipub failed');
}

async function searchAnipub(query) {
  for (const q of titleVariants(query)) {
    try {
      const data = await anipubFetch(`/api/search/${encodeURIComponent(q)}`);
      if (data?.length > 0) return data;
    } catch { continue; }
  }
  return [];
}

export async function getAnimeEpisodes(id) {
  try {
    const anipubRes = await anipubFetch(`/v1/api/details/${id}`);
    if (!anipubRes) return [];
    const local = anipubRes.local;
    const episodes = [];
    if (local.link) episodes.push({ episode: 1, url: local.link.replace("src=", "") });
    if (local.ep) {
      local.ep.forEach((e, i) => {
        episodes.push({ episode: i + 2, url: e.link.replace("src=", "") });
      });
    }
    return episodes;
  } catch {
    return [];
  }
}

// ─── Anitaku.to (Gogoanime successor) ───
const ANITAKU = "https://anitaku.to";

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

async function searchAnitaku(query) {
  const seen = new Set();
  const all = [];
  for (const q of titleVariants(query)) {
    try {
      const html = await fetchHtmlViaProxy(`${ANITAKU}/search.html?keyword=${encodeURIComponent(q)}`);
      if (!html) continue;
      const itemsMatch = html.match(/<div class="items">(.*?)<\/ul>/s);
      if (itemsMatch) {
        const re = /<a href="\/category\/([^"]+)" title="([^"]+)"/g;
        let m;
        while ((m = re.exec(itemsMatch[1])) !== null) {
          if (!seen.has(m[1])) {
            seen.add(m[1]);
            all.push({ slug: m[1], title: m[2], _score: scoreRelevance(m[2], query) });
          }
        }
      }
    } catch {}
  }
  return all.sort((a, b) => b._score - a._score);
}

export async function getAnitakuEpisodes(slug) {
  const html = await fetchHtmlViaProxy(`${ANITAKU}/category/${slug}`);
  if (!html) return [];
  const episodes = [];
  const re = /<a href="\/([^"]+-episode-(\d+))"[^>]*?data-num="(\d+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const epNum = parseInt(m[3], 10);
    if (!episodes.find((e) => e.episode === epNum)) {
      episodes.push({ episode: epNum, url: `${ANITAKU}/${m[1]}` });
    }
  }
  if (episodes.length === 0) {
    const re2 = /<a href="\/([^"]+-episode-(\d+))"/g;
    while ((m = re2.exec(html)) !== null) {
      const epNum = parseInt(m[2], 10);
      if (!episodes.find((e) => e.episode === epNum)) {
        episodes.push({ episode: epNum, url: `${ANITAKU}/${m[1]}` });
      }
    }
  }
  return episodes.sort((a, b) => a.episode - b.episode);
}

export async function getAnitakuStreamUrls(episodeUrl) {
  const html = await fetchHtmlViaProxy(episodeUrl);
  if (!html) return [];
  const servers = [];
  const re = /<li class="server">\s*<a[^>]*data-video="([^"]+)"[^>]*>.*?<\/i>\s*([^<\s]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const label = m[2];
    const url = m[1];
    if (!servers.find((s) => s.url === url)) {
      servers.push({ label, url });
    }
  }
  return servers;
}

// ─── AniList search (GraphQL) ───
const ANILIST_QL = "https://graphql.anilist.co";

async function searchAnilist(query) {
  const q = `query ($search: String) { Media(search: $search, type: ANIME) { id title { romaji english } } }`;
  for (const v of titleVariants(query)) {
    try {
      const res = await fetch(ANILIST_QL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, variables: { search: v } }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.data?.Media?.id) {
        const t = data.data.Media.title;
        return { anilistId: data.data.Media.id, title: t.english || t.romaji };
      }
    } catch {}
  }
  return null;
}

// ─── Embed Providers ───
const EMBED_PROVIDERS = [
  { name: "MegaPlay", url: (id, ep = 1) => `https://megaplay.buzz/stream/ani/${id}/${ep}/sub` },
  { name: "AnimePlay", url: (id, ep = 1) => `https://animeplay.cfd/stream/ani/${id}/${ep}/sub` },
  { name: "DropFile", url: (id, ep = 1) => `https://dropfile.cc/player/tv/anilist-${id}/${ep}/1` },
  { name: "VidPlus", url: (id, ep = 1) => `https://player.vidplus.to/embed/anime/${id}/${ep}` },
  { name: "VidNest", url: (id, ep = 1) => `https://vidnest.fun/anime/${id}/${ep}/sub` },
];

async function makeEmbedFallback(animeName) {
  const result = await searchAnilist(animeName);
  if (result) {
    const anipubRetry = await searchAnipub(result.title);
    if (anipubRetry.length > 0) {
      return { source: "anipub", id: anipubRetry[0].Id, title: result.title };
    }
    return {
      source: "embed",
      slug: animeName,
      id: result.anilistId,
      anilistId: result.anilistId,
      title: result.title,
      embedProviders: EMBED_PROVIDERS.map((p) => ({ name: p.name, url: p.url(result.anilistId) })),
    };
  }
  return { source: "embed", slug: animeName, id: animeName, title: animeName, embedProviders: [] };
}

// ─── WitAnime (WordPress-based, Arabic subtitles) ───
const WITANIME = "https://witanime.you";

function witanimeBase64ToBytes(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

function decryptWitanimeEpisodeData(encoded) {
  try {
    const dot = encoded.indexOf(".");
    if (dot === -1) return null;
    const key = witanimeBase64ToBytes(encoded.slice(0, dot));
    const data = witanimeBase64ToBytes(encoded.slice(dot + 1));
    const result = new Uint8Array(key.length);
    for (let i = 0; i < key.length; i++) {
      result[i] = key[i] ^ data[i % data.length];
    }
    return JSON.parse(new TextDecoder().decode(result));
  } catch {
    return null;
  }
}

function extractWitanimeSlugFromEpisodeUrl(url) {
  const match = url.match(/\/episode\/(.+?)-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-/i);
  if (match) return match[1];
  const fallback = url.match(/\/episode\/(.+?)-\d+\/?$/);
  return fallback ? fallback[1] : null;
}

async function searchWitanime(query) {
  for (const q of titleVariants(query)) {
    try {
      const html = await fetchHtmlViaProxy(`${WITANIME}/?s=${encodeURIComponent(q)}`);
      if (!html) continue;
      const episodeMatch = html.match(/href=["']([^"']*\/episode\/([^"']+))["']/i);
      if (episodeMatch) {
        const slug = extractWitanimeSlugFromEpisodeUrl(episodeMatch[1]);
        if (slug) return { slug, title: q };
      }
    } catch {}
  }
  return null;
}

function normalizeWitanimeUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${WITANIME}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function extractWitanimeEpisodePayload(html) {
  const patterns = [
    /var\s+processedEpisodeData\s*=\s*(["'])([^"']+)\1\s*;/i,
    /window\.processedEpisodeData\s*=\s*(["'])([^"']+)\1\s*;/i,
    /let\s+processedEpisodeData\s*=\s*(["'])([^"']+)\1\s*;/i,
    /const\s+processedEpisodeData\s*=\s*(["'])([^"']+)\1\s*;/i,
    /data-processed-episode=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[2] || match[1];
  }

  return null;
}

export async function getWitanimeEpisodes(slug) {
  try {
    const html = await fetchHtmlViaProxy(`${WITANIME}/anime/${slug}/`);
    if (!html) return [];
    const payload = extractWitanimeEpisodePayload(html);
    if (payload) {
      const decrypted = decryptWitanimeEpisodeData(payload);
      if (Array.isArray(decrypted) && decrypted.length > 0) {
        const episodes = decrypted.map((ep) => {
          let epUrl = "";
          try { epUrl = atob(ep.url); } catch { epUrl = ep.url || ""; }
          epUrl = normalizeWitanimeUrl(epUrl);
          return { episode: Number(ep.number) || 0, url: epUrl, type: ep.type || "sub" };
        }).filter((ep) => ep.episode > 0 && ep.url).sort((a, b) => a.episode - b.episode);

        if (episodes.length > 0) return episodes;
      }
    }
    return [];
  } catch {
    return [];
  }
}

function extractWitanimeVideoUrl(html) {
  try {
    const zG = html.match(/var\s+_zG\s*=\s*["']([^"']+)["']/);
    const zH = html.match(/var\s+_zH\s*=\s*["']([^"']+)["']/);
    if (!zG || !zH) return null;

    const resources = JSON.parse(atob(zG[1]));
    const configs = JSON.parse(atob(zH[1]));
    if (!resources?.length || !configs?.length) return null;

    const res = resources[0];
    const cfg = configs[0];

    const reversed = res.split("").reverse().join("");
    const clean = reversed.replace(/[^A-Za-z0-9+/=]/g, "");
    const decoded = atob(clean);
    const idx = parseInt(atob(cfg.k), 10);
    const offset = cfg.d[idx] || 0;
    return decoded.slice(0, decoded.length - offset);
  } catch {
    return null;
  }
}

export async function getWitanimeStreamUrl(episodeUrl) {
  try {
    const html = await fetchHtmlViaProxy(episodeUrl);
    if (!html) return null;
    return extractWitanimeVideoUrl(html);
  } catch {
    return null;
  }
}

// ─── Anime3rb (Arabic subtitles, WordPress-based) ───
const ANIME3RB = "https://anime3rb.com";

async function searchAnime3rb(query) {
  let best = null;
  let bestScore = 0;
  for (const q of titleVariants(query)) {
    try {
      const html = await fetchHtmlViaProxy(`${ANIME3RB}/titles/list?q=${encodeURIComponent(q)}`);
      if (!html) continue;
      const aRe = /<a[^>]*href="https:\/\/anime3rb\.com\/titles\/([a-z0-9-]+)"[^>]*>(?:(?!<\/a>)[\s\S])*?<h4 class="text-lg">([^<]+)<\/h4>(?:(?!<\/a>)[\s\S])*?<\/a>/gi;
      let m;
      while ((m = aRe.exec(html)) !== null) {
        const slug = m[1];
        if (slug === "list" || slug.startsWith("list/")) continue;
        const title = m[2].trim();
        let score = scoreRelevance(title, q);
        if (score > 30) {
          if (score > bestScore) {
            bestScore = score;
            best = { slug, title };
          } else if (score === bestScore) {
            const slugParts = slug.replace(/^[^/]+\//, "").split("-");
            const bestParts = best.slug.replace(/^[^/]+\//, "").split("-");
            if (slugParts.length < bestParts.length) {
              best = { slug, title };
            }
          }
        }
      }
    } catch {}
  }
  return best;
}

function parseAnime3rbEpisodeCount(html) {
  const eps = html.match(/<span>الحلقة \d+<\/span>/g);
  return eps ? eps.length : 0;
}

export async function getAnime3rbEpisodes(slug) {
  try {
    const html = await fetchHtmlViaProxy(`${ANIME3RB}/titles/${slug}`);
    if (!html) return [];
    const total = parseAnime3rbEpisodeCount(html);
    if (!total) return [];
    return Array.from({ length: total }, (_, i) => ({
      episode: i + 1,
      url: `${ANIME3RB}/episode/${slug}/${i + 1}`,
    }));
  } catch {
    return [];
  }
}

function decodeHtmlEntities(str) {
  return str.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export async function getAnime3rbStreamUrl(episodeUrl) {
  try {
    const html = await fetchHtmlViaProxy(episodeUrl);
    if (!html) return null;
    const snapRe = /wire:snapshot="([^"]+)"/g;
    let m;
    while ((m = snapRe.exec(html)) !== null) {
      const raw = decodeURIComponent(m[1]);
      const decoded = decodeHtmlEntities(raw);
      try {
        const data = JSON.parse(decoded);
        if (data?.data?.video_url) return data.data.video_url;
      } catch {}
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Consumet API (Gogoanime provider) ───
const CONSUMET_API = "https://api.consumet.org";

async function searchConsumetGogoanime(query) {
  for (const q of titleVariants(query)) {
    try {
      const res = await fetch(`${CONSUMET_API}/anime/gogoanime/${encodeURIComponent(q)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.results?.length > 0) {
        const best = data.results.sort((a, b) => {
          const aScore = scoreRelevance(a.title, query);
          const bScore = scoreRelevance(b.title, query);
          return bScore - aScore;
        })[0];
        return {
          id: best.id,
          title: best.title,
          image: best.image,
          anilistId: best.id, // Gogoanime ID from Consumet
        };
      }
    } catch { continue; }
  }
  return null;
}

export async function getConsumetGogoanimeEpisodes(animeId) {
  try {
    const res = await fetch(`${CONSUMET_API}/anime/gogoanime/info/${encodeURIComponent(animeId)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.episodes?.length) return [];
    return data.episodes.map((ep, i) => ({
      episode: ep.number || i + 1,
      id: ep.id,
      url: `https://gogoanime.consu.me/${ep.id}`,
      title: ep.title || "",
    }));
  } catch {
    return [];
  }
}

export async function getConsumetGogoanimeStreamUrl(episodeId) {
  try {
    const res = await fetch(`${CONSUMET_API}/anime/gogoanime/watch/${encodeURIComponent(episodeId)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.sources?.length > 0) {
      const best = data.sources.sort((a, b) => {
        const aQ = parseInt(a.quality) || 0;
        const bQ = parseInt(b.quality) || 0;
        return bQ - aQ;
      })[0];
      return best.url;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Enhanced Embed Search (parallel fallback) ───
async function searchParallelEmbeds(animeName) {
  const anilistResult = await searchAnilist(animeName);
  if (anilistResult) {
    return {
      source: "embed",
      slug: animeName,
      id: anilistResult.anilistId,
      anilistId: anilistResult.anilistId,
      title: anilistResult.title,
      embedProviders: EMBED_PROVIDERS.map((p) => ({ name: p.name, url: p.url(anilistResult.anilistId) })),
    };
  }
  return null;
}

// ─── Multi-source search (parallel) ───
export async function findStreamingSource(animeName) {
  const sources = [
    searchWitanime(animeName).then(r => r ? { source: "witanime", slug: r.slug, id: r.slug, title: r.title } : null),
    searchAnime3rb(animeName).then(r => r ? { source: "anime3rb", slug: r.slug, id: r.slug, title: r.title } : null),
    searchAnipub(animeName).then(r => r.length > 0 ? { source: "anipub", id: r[0].Id, title: r[0].Name } : null),
    searchAnitaku(animeName).then(r => r.length > 0 ? { source: "anitaku", slug: r[0].slug, id: r[0].slug, title: r[0].title } : null),
    searchParallelEmbeds(animeName).then(r => r),
    searchConsumetGogoanime(animeName).then(r => r ? { source: "consumet", id: r.id, title: r.title, anilistId: r.anilistId } : null),
  ];

  const results = await Promise.allSettled(sources);

  const fulfilled = results
    .filter(r => r.status === "fulfilled" && r.value)
    .map(r => r.value);

  if (fulfilled.length > 0) {
    const best = fulfilled[0];
    const embedInfo = fulfilled.find(f => f.source === "embed");
    const consumetInfo = fulfilled.find(f => f.source === "consumet");
    if (embedInfo) {
      best.embedProviders = embedInfo.embedProviders;
      best.anilistId = embedInfo.anilistId;
    } else if (consumetInfo?.anilistId) {
      best.anilistId = consumetInfo.anilistId;
      best.embedProviders = EMBED_PROVIDERS.map((p) => ({
        name: p.name,
        url: p.url(consumetInfo.anilistId),
      }));
    }
    return best;
  }

  return await makeEmbedFallback(animeName);
}
