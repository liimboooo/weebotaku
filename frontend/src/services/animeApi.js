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

// ─── CORS Proxy ───
const CORS_PROXIES = [
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://corsproxy.io/?url=",
  "https://api.allorigins.win/raw?url=",
];

async function fetchHtmlViaProxy(url) {
  for (const p of CORS_PROXIES) {
    try {
      const proxyUrl = `${p}${encodeURIComponent(url)}`;
      const res = await Promise.race([
        fetch(proxyUrl, { mode: "cors" }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000)),
      ]);
      if (res.ok) return await res.text();
    } catch {}
  }
  return null;
}

// ─── AniPub ───
async function searchAnipub(query) {
  for (const q of titleVariants(query)) {
    try {
      const res = await fetch(`https://anipub.xyz/api/search/${encodeURIComponent(q)}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.length > 0) return data;
    } catch {}
  }
  return [];
}

export async function getAnimeEpisodes(id) {
  try {
    const res = await fetch(`https://anipub.xyz/v1/api/details/${id}`);
    if (!res.ok) return [];
    const data = await res.json();
    const local = data.local;
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
  const re = /<a href="\/([^"]+\-episode\-(\d+))"[^>]*?data-num="(\d+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const epNum = parseInt(m[3], 10);
    if (!episodes.find((e) => e.episode === epNum)) {
      episodes.push({ episode: epNum, url: `${ANITAKU}/${m[1]}` });
    }
  }
  if (episodes.length === 0) {
    const re2 = /<a href="\/([^"]+\-episode\-(\d+))"/g;
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

// ─── Consumet API (gogoanime, zoro) ───
const CONSUMET = "https://api.consumet.org/anime";

async function searchConsumet(provider, query) {
  for (const q of titleVariants(query)) {
    try {
      const res = await fetch(`${CONSUMET}/${provider}/${encodeURIComponent(q)}?page=1`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.results?.length > 0) return data.results;
    } catch {}
  }
  return [];
}

export async function consumetGetEpisodes(provider, id) {
  const res = await fetch(`${CONSUMET}/${provider}/info/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`${provider} info error: ${res.status}`);
  const data = await res.json();
  return (data.episodes || []).map((ep) => ({
    episode: ep.number,
    id: ep.id,
    provider,
  }));
}

export async function consumetGetStreamUrl(episodeId, provider) {
  const res = await fetch(`${CONSUMET}/${provider}/watch/${encodeURIComponent(episodeId)}`);
  if (!res.ok) throw new Error(`${provider} stream error: ${res.status}`);
  const data = await res.json();
  if (data.iframe) return data.iframe;
  if (data.url) return data.url;
  if (data.sources?.length > 0) return data.sources[0].url;
  return null;
}

// ─── Gogoanime direct API (alternative to Consumet) ───
const GOGO_API = "https://gogoanime-api.vercel.app/api";

async function searchGogoanime(query) {
  for (const q of titleVariants(query)) {
    try {
      const res = await fetch(`${GOGO_API}/search?query=${encodeURIComponent(q)}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.results?.length > 0) return data.results;
    } catch {}
  }
  return [];
}

async function tryGogoanimeSource(animeName) {
  const results = await searchGogoanime(animeName);
  if (results.length > 0) {
    const first = results[0];
    return { source: "gogoanime", id: first.animeId, slug: first.animeId, title: first.title };
  }
  return null;
}

// ─── Embed fallback sources ───
const EMBED_PROVIDERS = [
  { name: "autoembed", url: (title) => `https://anime.autoembed.cc/embed/${title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-episode-1` },
  { name: "kwik", url: (title) => `https://kwik.sbs/e/${encodeURIComponent(title.replace(/\s+/g, "-").toLowerCase())}` },
];

function makeEmbedFallback(animeName) {
  return {
    source: EMBED_PROVIDERS[0].name,
    slug: animeName,
    id: animeName,
    title: animeName,
    embedUrl: EMBED_PROVIDERS[0].url(animeName),
  };
}

// ─── Multi-source search (parallel) ───
export async function findStreamingSource(animeName) {
  const sources = [
    searchAnitaku(animeName).then(r => r.length > 0 ? { source: "anitaku", slug: r[0].slug, id: r[0].slug, title: r[0].title } : null),
    searchAnipub(animeName).then(r => r.length > 0 ? { source: "anipub", id: r[0].Id, title: r[0].Name } : null),
    searchConsumet("gogoanime", animeName).then(r => r.length > 0 ? { source: "consumet", id: r[0].id, title: r[0].title, provider: "gogoanime" } : null),
    tryGogoanimeSource(animeName),
  ];

  const results = await Promise.allSettled(sources);
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) return r.value;
  }

  return makeEmbedFallback(animeName);
}
