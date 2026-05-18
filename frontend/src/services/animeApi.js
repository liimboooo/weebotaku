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
const CF_WORKER_PROXY = process.env.REACT_APP_CF_PROXY_URL || '';
const FALLBACK_PROXY = "https://api.codetabs.com/v1/proxy?quest=";

const CF_PROTECTED_DOMAINS = ["anime3rb.com", "witanime.you", "witanime.one", "ristoanime.co"];

function isCfProtected(url) {
  try { const h = new URL(url).hostname; return CF_PROTECTED_DOMAINS.some(d => h === d || h.endsWith("." + d)); } catch { return false; }
}

async function fetchViaWorker(url) {
  if (!CF_WORKER_PROXY) return null;
  try {
    const res = await Promise.race([
      fetch(`${CF_WORKER_PROXY}?url=${encodeURIComponent(url)}`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000)),
    ]);
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch { return null; }
}

async function fetchHtmlViaProxy(url) {
  const cfSite = isCfProtected(url);
  const strategies = [];

  if (cfSite && CF_WORKER_PROXY) {
    strategies.push(() => fetchViaWorker(url));
  }

  strategies.push(async () => {
    const res = await fetch(`${API_BASE}/scrape/fetch?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  });

  if (!cfSite) {
    strategies.push(async () => {
      const res = await Promise.race([
        fetch(`${FALLBACK_PROXY}${encodeURIComponent(url)}`, { mode: "cors" }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000)),
      ]);
      if (res.ok) return await res.text();
      return null;
    });
  }

  for (const p of strategies) {
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
const ANITAKU = "https://anineko.to";

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
  { name: "VidSrc", url: (id, ep = 1) => `https://vidsrc.cc/v2/embed/anime/anilist-${id}/${ep}` },
  { name: "VidSrc pro", url: (id, ep = 1) => `https://vidsrc.pro/embed/anime/anilist-${id}/${ep}` },
  { name: "VidBinge", url: (id, ep = 1) => `https://vidbinge.cc/embed/anime/anilist-${id}/${ep}` },
  { name: "2Anime", url: (id, ep = 1) => `https://2anime.xyz/embed/${id}-episode-${ep}` },
  { name: "AnimeCat", url: (id, ep = 1) => `https://animecat.xyz/embed/${id}/${ep}` },
  { name: "MegaPlay", url: (id, ep = 1) => `https://megaplay.buzz/stream/ani/${id}/${ep}/sub` },
  { name: "AnimePlay", url: (id, ep = 1) => `https://animeplay.cfd/stream/ani/${id}/${ep}/sub` },
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
      const animeMatch = html.match(/href=["'](https?:\/\/witanime\.[^"']*\/anime\/([^"']+?)\/)["']/i);
      if (animeMatch) {
        return { slug: animeMatch[2], title: q };
      }
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

function extractAllWitanimeVideoUrls(html) {
  try {
    const zG = html.match(/var\s+_zG\s*=\s*["']([^"']+)["']/);
    const zH = html.match(/var\s+_zH\s*=\s*["']([^"']+)["']/);
    if (!zG || !zH) return [];

    const resources = JSON.parse(atob(zG[1]));
    const configs = JSON.parse(atob(zH[1]));
    if (!resources?.length || !configs?.length) return [];

    const urls = [];
    for (let i = 0; i < resources.length && i < configs.length; i++) {
      try {
        const reversed = resources[i].split("").reverse().join("");
        const clean = reversed.replace(/[^A-Za-z0-9+/=]/g, "");
        const decoded = atob(clean);
        const idx = parseInt(atob(configs[i].k), 10);
        const offset = configs[i].d[idx] || 0;
        const url = decoded.slice(0, decoded.length - offset);
        if (url && url.startsWith("http")) urls.push(url);
      } catch {}
    }
    return urls;
  } catch {
    return [];
  }
}

export async function getWitanimeStreamUrl(episodeUrl) {
  try {
    const html = await fetchHtmlViaProxy(episodeUrl);
    if (!html) return null;
    const urls = extractAllWitanimeVideoUrls(html);
    return urls[0] || null;
  } catch {
    return null;
  }
}

export async function getWitanimeServers(episodeUrl) {
  try {
    const html = await fetchHtmlViaProxy(episodeUrl);
    if (!html) return [];
    const urls = extractAllWitanimeVideoUrls(html);
    const labels = ["Server 1", "Server 2", "Server 3", "Server 4", "Server 5"];
    return urls.map((url, i) => {
      let label = labels[i] || `Server ${i + 1}`;
      if (url.includes("yonaplay")) label = "Yonaplay";
      else if (url.includes("yourupload")) label = "YourUpload";
      else if (url.includes("videa")) label = "Videa";
      else if (url.includes("ok.ru")) label = "OK.ru";
      else if (url.includes("mp4upload")) label = "MP4Upload";
      else if (url.includes("dood")) label = "Dood";
      else if (url.includes("streamtape")) label = "Streamtape";
      return { label, url };
    });
  } catch {
    return [];
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
      const slugRe = /<a[^>]*href="https:\/\/anime3rb\.com\/titles\/([a-z0-9-]+)"[^>]*class="[^"]*simple-title-card[^"]*"[^>]*>/gi;
      const titleRe = /<h4 class="text-lg">([^<]+)<\/h4>/gi;
      const slugs = [];
      let m;
      while ((m = slugRe.exec(html)) !== null) {
        if (m[1] !== "list" && !m[1].startsWith("list/")) slugs.push({ slug: m[1], pos: m.index });
      }
      const titles = [];
      while ((m = titleRe.exec(html)) !== null) {
        titles.push({ title: m[1].trim(), pos: m.index });
      }
      for (const s of slugs) {
        const t = titles.find(t => t.pos > s.pos && t.pos - s.pos < 2000);
        if (!t) continue;
        const score = scoreRelevance(t.title, q);
        if (score > 30 && score > bestScore) {
          bestScore = score;
          best = { slug: s.slug, title: t.title };
        }
      }
      if (!best) {
        const fallbackRe = /<a[^>]*href="https:\/\/anime3rb\.com\/titles\/([a-z0-9-]+)"[^>]*>(?:(?!<\/a>)[\s\S])*?<h4[^>]*>([^<]+)<\/h4>/gi;
        while ((m = fallbackRe.exec(html)) !== null) {
          const slug = m[1];
          if (slug === "list" || slug.startsWith("list/")) continue;
          const title = m[2].trim();
          const score = scoreRelevance(title, q);
          if (score > 30 && score > bestScore) {
            bestScore = score;
            best = { slug, title };
          }
        }
      }
    } catch {}
  }
  return best;
}

export async function getAnime3rbEpisodes(slug) {
  try {
    const html = await fetchHtmlViaProxy(`${ANIME3RB}/titles/${slug}`);
    if (!html) return [];
    const linkRe = /href="https:\/\/anime3rb\.com\/episode\/[^/]+\/(\d+)"/g;
    const epNums = new Set();
    let m;
    while ((m = linkRe.exec(html)) !== null) epNums.add(parseInt(m[1], 10));
    if (epNums.size === 0) {
      const spanRe = /<span>الحلقة (\d+)<\/span>/g;
      while ((m = spanRe.exec(html)) !== null) epNums.add(parseInt(m[1], 10));
    }
    if (epNums.size === 0) return [];
    return Array.from(epNums).sort((a, b) => a - b).map(n => ({
      episode: n,
      url: `${ANIME3RB}/episode/${slug}/${n}`,
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
      const decoded = decodeHtmlEntities(m[1]);
      try {
        const data = JSON.parse(decoded);
        if (data?.data?.video_url) return data.data.video_url;
      } catch {}
    }
    const directRe = /video_url['"]\s*:\s*['"]([^'"]+)['"]/;
    const directMatch = html.match(directRe);
    if (directMatch) return decodeHtmlEntities(directMatch[1]).replace(/\\\//g, "/");
    return null;
  } catch {
    return null;
  }
}

// ─── Consumet API (Gogoanime provider) ───
const CONSUMET_MIRRORS = [
  "https://consumet-api-rouge.vercel.app",
  "https://aniwatch-api-8v55.onrender.com",
  "https://consumet-extreme.vercel.app",
  "https://consumet-api-puce.vercel.app",
  "https://api.consumet.org",
  "https://consumet-api.vercel.app",
];
const CONSUMET_API = CONSUMET_MIRRORS[0];

async function searchConsumetGogoanime(query) {
  for (const mirror of CONSUMET_MIRRORS) {
    for (const q of titleVariants(query)) {
      try {
        const res = await fetch(`${mirror}/anime/gogoanime/${encodeURIComponent(q)}`, {
          signal: AbortSignal.timeout(6000),
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
            anilistId: best.id,
            _mirror: mirror,
          };
        }
      } catch { continue; }
    }
  }
  return null;
}

export async function getConsumetGogoanimeEpisodes(animeId, mirror) {
  for (const base of mirror ? [mirror, ...CONSUMET_MIRRORS.filter(m => m !== mirror)] : CONSUMET_MIRRORS) {
    try {
      const res = await fetch(`${base}/anime/gogoanime/info/${encodeURIComponent(animeId)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data?.episodes?.length) continue;
      return data.episodes.map((ep, i) => ({
        episode: ep.number || i + 1,
        id: ep.id,
        url: `${base}/anime/gogoanime/watch/${ep.id}`,
        title: ep.title || "",
        _mirror: base,
      }));
    } catch { continue; }
  }
  return [];
}

export async function getConsumetGogoanimeStreamUrl(episodeId, mirror) {
  for (const base of mirror ? [mirror, ...CONSUMET_MIRRORS.filter(m => m !== mirror)] : CONSUMET_MIRRORS) {
    try {
      const res = await fetch(`${base}/anime/gogoanime/watch/${encodeURIComponent(episodeId)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.sources?.length > 0) {
        const best = data.sources.sort((a, b) => {
          const aQ = parseInt(a.quality) || 0;
          const bQ = parseInt(b.quality) || 0;
          return bQ - aQ;
        })[0];
        return best.url;
      }
    } catch { continue; }
  }
  return null;
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

// ─── RistoAnime (WordPress-based, Arabic subtitles, no Cloudflare) ───
const RISTOANIME = "https://ristoanime.co";

async function searchRistoAnime(query) {
  for (const q of titleVariants(query)) {
    try {
      const html = await fetchHtmlViaProxy(`${RISTOANIME}/?s=${encodeURIComponent(q)}`);
      if (!html) continue;
      const seriesRe = /<a[^>]*href="https:\/\/ristoanime\.co\/series\/([^"]+)"[^>]*>([\s\S]{0,2000}?)<\/a>/gi;
      const results = [];
      const seen = new Set();
      let m;
      while ((m = seriesRe.exec(html)) !== null) {
        const slug = decodeURIComponent(m[1]).replace(/\/$/, "");
        if (seen.has(slug)) continue;
        seen.add(slug);
        const linkContent = m[2];
        const headingMatch = linkContent.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/);
        const altMatch = linkContent.match(/alt=["']([^"']+)["']/);
        const title = headingMatch ? headingMatch[1].trim()
                    : altMatch ? altMatch[1].trim()
                    : slug.split("-").slice(1, -1).join(" ");
        const score = scoreRelevance(title, q);
        results.push({ slug, title, _score: score });
      }
      if (results.length > 0) return results.sort((a, b) => b._score - a._score);
    } catch {}
  }
  return [];
}

function extractEpisodeNumberFromTitle(title) {
  const patterns = [
    /الحلقة\s*(\d+)/i,
    /episode\s*(\d+)/i,
    /(\d+)\s*الحلقة/i,
    /(\d+)\s*episode/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return parseInt(m[1], 10);
  }
  return 0;
}

export async function getRistoAnimeEpisodes(animeName) {
  try {
    // Generate search terms: original name, cleaned variants, and English-only extraction
    const searchTerms = [];
    const addTerm = (t) => { if (t && !searchTerms.includes(t)) searchTerms.push(t); };

    addTerm(animeName.replace(/\s*\([^)]*\)/g, "").replace(/[^\w\s-]/g, "").trim());

    // Extract English/Latin words from Arabic titles
    const englishWords = animeName.split(/[\s-]+/).filter(w => /[a-zA-Z]/.test(w)).join(" ");
    if (englishWords) addTerm(englishWords);
    // Also try removing Arabic characters completely
    const noArabic = animeName.replace(/[\u0600-\u06FF\u0750-\u077F]/g, "").replace(/\s+/g, " ").trim();
    if (noArabic && noArabic !== englishWords) addTerm(noArabic);

    for (const v of titleVariants(animeName)) {
      addTerm(v);
    }

    const allEpisodes = [];
    const seenUrls = new Set();

    for (const term of searchTerms) {
      if (allEpisodes.length > 0) break;
      try {
        const apiUrl = `${RISTOANIME}/wp-json/wp/v2/posts?search=${encodeURIComponent(term)}&per_page=100&orderby=date&order=asc`;
        const jsonStr = await fetchHtmlViaProxy(apiUrl);
        if (!jsonStr) continue;
        const posts = JSON.parse(jsonStr);
        if (!posts.length) continue;

        for (const post of posts) {
          const epNum = extractEpisodeNumberFromTitle(post.title.rendered);
          if (epNum > 0 && !seenUrls.has(post.link)) {
            seenUrls.add(post.link);
            allEpisodes.push({ episode: epNum, url: post.link, title: post.title.rendered });
          }
        }

        // Fetch up to 3 pages for long series (max 300 episodes)
        for (let page = 2; page <= 3; page++) {
          try {
            const pageUrl = `${RISTOANIME}/wp-json/wp/v2/posts?search=${encodeURIComponent(term)}&per_page=100&page=${page}&orderby=date&order=asc`;
            const pageJson = await fetchHtmlViaProxy(pageUrl);
            if (!pageJson) break;
            const pagePosts = JSON.parse(pageJson);
            if (!pagePosts.length) break;
            for (const post of pagePosts) {
              const epNum = extractEpisodeNumberFromTitle(post.title.rendered);
              if (epNum > 0 && !seenUrls.has(post.link)) {
                seenUrls.add(post.link);
                allEpisodes.push({ episode: epNum, url: post.link, title: post.title.rendered });
              }
            }
          } catch { break; }
        }
      } catch {}
    }

    return allEpisodes.sort((a, b) => a.episode - b.episode);
  } catch {
    return [];
  }
}

export async function getRistoAnimeStreamUrls(episodeUrl) {
  try {
    const watchUrl = episodeUrl.replace(/\/?$/, "/watch");
    const html = await fetchHtmlViaProxy(watchUrl);
    if (!html) return [];

    const servers = [];
    const re = /data-watch=["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const url = m[1];
      let label = "Server " + (servers.length + 1);
      if (url.includes("vidmoly")) label = "VidMoly";
      else if (url.includes("mega.nz")) label = "Mega";
      else if (url.includes("sibnet")) label = "Sibnet";
      else if (url.includes("sendvid")) label = "SendVid";
      else if (url.includes("mp4upload")) label = "MP4Upload";
      else if (url.includes("uqload")) label = "Uqload";
      else if (url.includes("turbovid")) label = "TurboVid";
      else if (url.includes("hgcloud")) label = "HGCloud";
      else if (url.includes("yonaplay")) label = "Yonaplay";
      else if (url.includes("yourupload")) label = "YourUpload";
      else if (url.includes("videa")) label = "Videa";
      else if (url.includes("vidhide")) label = "VidHide";
      else if (url.includes("gomostream")) label = "GomoStream";
      if (!servers.find((s) => s.url === url)) {
        servers.push({ label, url });
      }
    }
    return servers;
  } catch {
    return [];
  }
}

// ─── Multi-source search (parallel) ───
const SOURCE_PRIORITY = ["ristoanime", "anime3rb", "witanime", "anitaku", "consumet", "anipub", "embed"];

export async function findStreamingSource(animeName) {
  const sources = [
    searchRistoAnime(animeName).then(r => r.length > 0 ? { source: "ristoanime", slug: r[0].slug, id: r[0].slug, title: r[0].title } : null),
    searchAnime3rb(animeName).then(r => r ? { source: "anime3rb", slug: r.slug, id: r.slug, title: r.title } : null),
    searchWitanime(animeName).then(r => r ? { source: "witanime", slug: r.slug, id: r.slug, title: r.title } : null),
    searchAnitaku(animeName).then(r => r.length > 0 ? { source: "anitaku", slug: r[0].slug, id: r[0].slug, title: r[0].title } : null),
    searchConsumetGogoanime(animeName).then(r => r ? { source: "consumet", id: r.id, title: r.title, anilistId: r.anilistId, _mirror: r._mirror } : null),
    searchAnipub(animeName).then(r => r.length > 0 ? { source: "anipub", id: r[0].Id, title: r[0].Name } : null),
    searchParallelEmbeds(animeName).then(r => r),
  ];

  const results = await Promise.allSettled(sources);

  const fulfilled = results
    .filter(r => r.status === "fulfilled" && r.value)
    .map(r => r.value);

  if (fulfilled.length > 0) {
    fulfilled.sort((a, b) => SOURCE_PRIORITY.indexOf(a.source) - SOURCE_PRIORITY.indexOf(b.source));
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
