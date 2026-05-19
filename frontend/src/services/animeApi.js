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
  const words = title.split(/[\s\-–—]+/).filter(w => w.length > 3);
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

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const CF_WORKER = "https://anime-proxy.mohamedlimam80000.workers.dev/?url=";
const PROXIES = [
  CF_WORKER,
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://corsproxy.io/?url=",
  "https://api.allorigins.win/raw?url=",
];

function isCfChallenge(html) {
  return html && typeof html === "string" && (html.includes("Just a moment") || html.includes("cf_chl") || html.includes("challenge-platform"));
}

async function fetchHtmlViaProxy(url) {
  const strategies = [];

  strategies.push(async () => {
    const res = await fetch(`${API_BASE}/scrape/fetch?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || isCfChallenge(data.data)) return null;
    return data.data;
  });

  for (const proxy of PROXIES) {
    strategies.push(async () => {
      const res = await Promise.race([
        fetch(`${proxy}${encodeURIComponent(url)}`, { mode: "cors" }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000)),
      ]);
      if (!res.ok) return null;
      const text = await res.text();
      if (text.length < 50 && /error|invalid|not found/i.test(text)) return null;
      try {
        const parsed = JSON.parse(text);
        if (parsed.success && typeof parsed.data === "string") return parsed.data;
      } catch {}
      return text;
    });
  }

  for (const p of strategies) {
    try { const result = await p(); if (result) return result; } catch {}
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

// ─── Fetch ALL title variants + AniList metadata ───

async function fetchAniListInfo(englishName) {
  const allNames = new Set();
  allNames.add(englishName);
  let anilistId = null;
  let episodeCount = null;

  const stripped = stripSeasonSuffixes(englishName);
  if (stripped && stripped !== englishName) allNames.add(stripped);

  const cleaned = cleanTitle(englishName);
  if (cleaned) allNames.add(cleaned);

  const searchVariants = [...new Set([
    englishName,
    stripped,
    englishName.replace(/[\d]+$/, "").trim(),
  ].filter(Boolean))];

  const q = `query ($s: String) {
    Media(search: $s, type: ANIME) {
      id
      episodes
      title { romaji english native }
      synonyms
    }
  }`;

  for (const v of searchVariants) {
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, variables: { s: v } }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const media = data.data?.Media;
      if (media) {
        anilistId = media.id;
        episodeCount = media.episodes;
        if (media.title?.romaji) allNames.add(media.title.romaji);
        if (media.title?.english) allNames.add(media.title.english);
        if (media.title?.native) allNames.add(media.title.native);
        if (media.synonyms) {
          for (const syn of media.synonyms) {
            if (syn && syn.length > 1) allNames.add(syn);
          }
        }
        break;
      }
    } catch {}
  }

  if (allNames.size <= 3) {
    for (const v of searchVariants) {
      try {
        await new Promise(r => setTimeout(r, 700));
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(v)}&limit=1`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const data = await res.json();
        const item = data.data?.[0];
        if (item) {
          if (item.title) allNames.add(item.title);
          if (item.title_english) allNames.add(item.title_english);
          if (item.title_japanese) allNames.add(item.title_japanese);
          if (item.titles) {
            for (const t of item.titles) {
              if (t.title) allNames.add(t.title);
            }
          }
          if (!episodeCount && item.episodes) episodeCount = item.episodes;
          break;
        }
      } catch {}
    }
  }

  return {
    titles: [...allNames].filter(n => n && n.length > 1),
    anilistId,
    episodeCount,
  };
}

// ─── Embed providers (English sub fallback using AniList ID) ───

const EMBED_PROVIDERS = [
  { name: "VidNest", url: (id, ep) => `https://vidnest.fun/anime/${id}/${ep}/sub` },
  { name: "VidPlus", url: (id, ep) => `https://player.vidplus.to/embed/anime/${id}/${ep}` },
  { name: "VidLink", url: (id, ep) => `https://vidlink.pro/anime/${id}/${ep}/1` },
];

// ─── XOR decrypt helper (animeslayer uses XOR+base64) ───

function xorDecrypt(encoded, key) {
  try {
    const raw = atob(encoded);
    let r = "";
    for (let i = 0; i < raw.length; i++) {
      r += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return r;
  } catch { return null; }
}

// ─── WordPress Anime Sources (ristoanime + anime4up + witanime + animeslayer) ───

const SOURCES = {
  ristoanime: {
    name: "ristoanime",
    base: "https://ristoanime.co",
    watchSuffix: "/watch",
  },
  anime4up: {
    name: "anime4up",
    base: "https://w1.anime4up.rest",
    watchSuffix: "",
  },
  witanime: {
    name: "witanime",
    base: "https://witanime.one",
    watchSuffix: "",
  },
  animeslayer: {
    name: "animeslayer",
    base: "https://animeslayer.to",
    watchSuffix: "",
  },
};

function extractEpisodeNumberFromTitle(title) {
  const patterns = [
    /الحلقة\s*(\d+)/i,
    /episode\s*(\d+)/i,
    /(\d+)\s*الحلقة/i,
    /(\d+)\s*episode/i,
    /ep\s*(\d+)/i,
    /حلقة\s*(\d+)/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return parseInt(m[1], 10);
  }
  return 0;
}

function identifyServer(url) {
  const hosts = [
    ["vidmoly", "VidMoly"], ["mega.nz", "Mega"], ["sibnet", "Sibnet"],
    ["sendvid", "SendVid"], ["mp4upload", "MP4Upload"], ["uqload", "Uqload"],
    ["turbovid", "TurboVid"], ["hgcloud", "HGCloud"], ["yonaplay", "Yonaplay"],
    ["yourupload", "YourUpload"], ["videa", "Videa"], ["vidhide", "VidHide"],
    ["gomostream", "GomoStream"], ["dood", "Dood"], ["streamtape", "Streamtape"],
    ["ok.ru", "OK.ru"], ["myvi", "MyVi"], ["netu", "Netu"],
    ["fembed", "Fembed"], ["mixdrop", "MixDrop"], ["streamwish", "StreamWish"],
    ["filelions", "FileLions"], ["voe", "Voe"],
    ["4shared", "4Shared"], ["uptostream", "UpStream"], ["vadbam", "Vadbam"],
  ];
  for (const [pattern, label] of hosts) {
    if (url.includes(pattern)) return label;
  }
  return null;
}

// ─── WP search (ristoanime + witanime) ───

async function searchWpSource(source, allTitles) {
  const { base, name } = source;
  const domain = base.replace(/^https?:\/\//, "");

  for (const searchName of allTitles) {
    for (const q of titleVariants(searchName)) {
      try {
        const apiUrl = `${base}/wp-json/wp/v2/posts?search=${encodeURIComponent(q)}&per_page=10`;
        const jsonStr = await fetchHtmlViaProxy(apiUrl);
        if (!jsonStr) continue;
        let posts;
        try { posts = JSON.parse(jsonStr); } catch { continue; }
        if (!Array.isArray(posts) || posts.length === 0) continue;

        const matched = [];
        for (const post of posts) {
          const tags = post.class_list || [];
          let tagSlug = null;
          for (const cls of tags) {
            const m = cls.match(/^series----(.+?)---$/);
            if (m) { tagSlug = m[1]; break; }
          }
          if (tagSlug) {
            const slug = tagSlug.replace(/-+/g, "-").replace(/^-|-$/g, "");
            const score = scoreRelevance(post.title?.rendered || "", q);
            if (!matched.find(r => r.slug === slug)) {
              matched.push({ slug, title: post.title?.rendered || searchName, _score: score, tagSlug });
            }
          }
        }
        if (matched.length > 0) {
          return matched.sort((a, b) => b._score - a._score).map(r => ({
            ...r,
            source: name,
            sourceBase: base,
          }));
        }
      } catch {}
    }
  }

  for (const searchName of allTitles) {
    for (const q of titleVariants(searchName)) {
      try {
        const html = await fetchHtmlViaProxy(`${base}/?s=${encodeURIComponent(q)}`);
        if (!html) continue;
        const seriesRe = new RegExp(`<a[^>]*href="https?:\\/\\/${domain.replace(/\./g, "\\.")}\\/(?:series|anime)\\/([^"]+)"[^>]*>([\\s\\S]{0,2000}?)<\\/a>`, "gi");
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
                      : slug.split("-").slice(0, -1).join(" ");
          const score = scoreRelevance(title, q);
          results.push({ slug, title, _score: score, source: name, sourceBase: base });
        }
        if (results.length > 0) return results.sort((a, b) => b._score - a._score);
      } catch {}
    }
  }

  return [];
}

// ─── animeslayer search (uses /api/search?q=) ───

async function searchAnimeSlayerSource(source, allTitles) {
  const { base, name } = source;
  for (const searchName of allTitles) {
    for (const q of titleVariants(searchName)) {
      try {
        const apiUrl = `${base}/api/search?q=${encodeURIComponent(q)}`;
        const jsonStr = await fetchHtmlViaProxy(apiUrl);
        if (!jsonStr) continue;
        let items;
        try { items = JSON.parse(jsonStr); } catch { continue; }
        if (!Array.isArray(items) || items.length === 0) continue;

        const matched = [];
        for (const item of items) {
          const slug = item.href.replace(/^\/title\//, "");
          const score = scoreRelevance(item.title || "", q);
          matched.push({
            slug,
            title: item.title || searchName,
            _score: score,
            source: name,
            sourceBase: base,
            tagSlug: slug,
          });
        }
        if (matched.length > 0) {
          return matched.sort((a, b) => b._score - a._score);
        }
      } catch {}
    }
  }
  return [];
}

// ─── animeslayer episodes (scrape /title/{slug} for encrypted episode hrefs) ───

async function getEpisodesAnimeSlayer(slug, base) {
  try {
    const html = await fetchHtmlViaProxy(`${base}/title/${slug}`);
    if (!html) return [];

    const match = html.match(/const episodes = (\[[\s\S]*?\]);/);
    if (!match) return [];

    const cleanJson = match[1]
      .replace(/(\w+):/g, '"$1":')
      .replace(/,(\s*[\]}])/g, '$1')
      .replace(/'/g, '"');

    let parsed;
    try { parsed = JSON.parse(cleanJson); } catch { return []; }
    if (!Array.isArray(parsed)) return [];

    return parsed.map(ep => {
      const href = xorDecrypt(ep.href, "asxwqa147") || "";
      const hash = href.includes("#") ? href.split("#")[1] : "";
      const watchSlug = href.replace(/^\/e\//, "").split("#")[0];
      return {
        episode: ep.n,
        title: ep.title || `Episode ${ep.n}`,
        url: hash ? `${watchSlug}#${hash}` : watchSlug,
        thumbnail: ep.thumb || null,
      };
    }).sort((a, b) => a.episode - b.episode);
  } catch {
    return [];
  }
}

// ─── animeslayer stream URLs (embed the watch page) ───

async function getStreamUrlsAnimeSlayer(slugHash, base) {
  try {
    const [slug, hash] = slugHash.split("#");
    const pageUrl = hash ? `${base}/e/${slug}#${hash}` : `${base}/e/${slug}`;
    return [{ label: "AnimeSlayer", url: pageUrl }];
  } catch {
    return [];
  }
}

// ─── WP episode & stream fetching ───

async function getWpTagId(base, tagSlug) {
  const jsonStr = await fetchHtmlViaProxy(`${base}/wp-json/wp/v2/tags?slug=${encodeURIComponent(tagSlug)}`);
  if (!jsonStr) return null;
  try {
    const tags = JSON.parse(jsonStr);
    return tags[0]?.id || null;
  } catch { return null; }
}

async function getWpPostsByTagId(base, tagId) {
  const allPosts = [];
  for (let page = 1; page <= 5; page++) {
    const jsonStr = await fetchHtmlViaProxy(
      `${base}/wp-json/wp/v2/posts?tags=${tagId}&per_page=100&page=${page}&orderby=date&order=asc`
    );
    if (!jsonStr) break;
    try {
      const posts = JSON.parse(jsonStr);
      if (!Array.isArray(posts) || !posts.length) break;
      allPosts.push(...posts);
    } catch { break; }
  }
  return allPosts;
}

export async function getEpisodes(animeName, tagSlug, sourceName, sourceBase, anilistId, episodeCount, link) {
  if (sourceName === "embed") {
    const count = episodeCount || 24;
    return Array.from({ length: count }, (_, i) => ({
      episode: i + 1,
      url: `embed:${anilistId}:${i + 1}`,
      title: `Episode ${i + 1}`,
    }));
  }

  if (sourceName === "anime4up") {
    const base = sourceBase || SOURCES.anime4up.base;
    return getEpisodesAnime4up(animeName, base);
  }

  if (sourceName === "animeslayer") {
    const base = sourceBase || SOURCES.animeslayer.base;
    return getEpisodesAnimeSlayer(tagSlug || animeName, base);
  }

  const source = SOURCES[sourceName];
  if (!source) return [];
  const base = sourceBase || source.base;

  try {
    let posts = [];

    if (tagSlug) {
      const tagId = await getWpTagId(base, tagSlug);
      if (tagId) posts = await getWpPostsByTagId(base, tagId);
    }

    if (!posts.length) {
      const searchTerms = [];
      const addTerm = (t) => { if (t && !searchTerms.includes(t)) searchTerms.push(t); };
      addTerm(cleanTitle(animeName));
      const englishWords = animeName.split(/[\s-]+/).filter(w => /[a-zA-Z]/.test(w)).join(" ");
      if (englishWords) addTerm(englishWords);
      const noArabic = animeName.replace(/[؀-ۿݐ-ݿ]/g, "").replace(/\s+/g, " ").trim();
      if (noArabic && noArabic !== englishWords) addTerm(noArabic);
      for (const v of titleVariants(animeName)) addTerm(v);

      const seenPosts = new Set();
      for (const term of searchTerms) {
        if (posts.length > 0) break;
        try {
          for (let page = 1; page <= 3; page++) {
            const apiUrl = `${base}/wp-json/wp/v2/posts?search=${encodeURIComponent(term)}&per_page=100&page=${page}&orderby=date&order=asc`;
            const jsonStr = await fetchHtmlViaProxy(apiUrl);
            if (!jsonStr) break;
            const pagePosts = JSON.parse(jsonStr);
            if (!Array.isArray(pagePosts) || !pagePosts.length) break;
            for (const p of pagePosts) {
              const key = p.id || p.link;
              if (!seenPosts.has(key)) { seenPosts.add(key); posts.push(p); }
            }
          }
        } catch {}
      }
    }

    const episodes = [];
    const seenUrls = new Set();
    for (const post of posts) {
      const epNum = extractEpisodeNumberFromTitle(post.title?.rendered || "");
      if (epNum > 0 && !seenUrls.has(post.link)) {
        seenUrls.add(post.link);
        episodes.push({ episode: epNum, url: post.link, title: post.title.rendered });
      }
    }

    return episodes.sort((a, b) => a.episode - b.episode);
  } catch {
    return [];
  }
}

export async function getStreamUrls(episodeUrl, sourceName) {
  if (sourceName === "embed" && episodeUrl.startsWith("embed:")) {
    const [, anilistId, epNum] = episodeUrl.split(":");
    return EMBED_PROVIDERS.map(p => ({
      label: p.name,
      url: p.url(anilistId, epNum),
    }));
  }

  if (sourceName === "anime4up") {
    const base = SOURCES.anime4up.base;
    return getStreamUrlsAnime4up(episodeUrl, base);
  }

  if (sourceName === "animeslayer") {
    const base = SOURCES.animeslayer.base;
    return getStreamUrlsAnimeSlayer(episodeUrl, base);
  }

  const source = SOURCES[sourceName];
  if (!source) return [];

  try {
    const watchUrl = source.watchSuffix
      ? episodeUrl.replace(/\/?$/, source.watchSuffix)
      : episodeUrl;
    const html = await fetchHtmlViaProxy(watchUrl);
    if (!html) return [];

    const servers = [];
    const seen = new Set();

    const addServer = (url) => {
      if (seen.has(url)) return;
      seen.add(url);
      const label = identifyServer(url) || "Server " + (servers.length + 1);
      servers.push({ label, url });
    };

    // data-watch attributes (ristoanime style)
    const dataWatchRe = /data-watch=["']([^"']+)["']/g;
    let m;
    while ((m = dataWatchRe.exec(html)) !== null) addServer(m[1]);

    // iframe src with known video hosts
    const iframeSrcRe = /iframe[^>]*src=["']([^"']+)["']/gi;
    while ((m = iframeSrcRe.exec(html)) !== null) {
      const url = m[1];
      if (url.startsWith("http") && !url.includes(source.base) && identifyServer(url)) {
        addServer(url);
      }
    }

    // data-src fallback
    const dataSrcRe = /data-src=["']([^"']+)["']/g;
    while ((m = dataSrcRe.exec(html)) !== null) {
      if (m[1].startsWith("http") && identifyServer(m[1])) addServer(m[1]);
    }

    // Generic iframe extraction as last resort
    if (servers.length === 0) {
      const iframeRe = /iframe[^>]*src=["']([^"']+)["']/gi;
      while ((m = iframeRe.exec(html)) !== null) {
        const url = m[1];
        if (url.startsWith("http") && !url.includes(source.base) && !seen.has(url)) {
          addServer(url);
        }
      }
    }

    // Try the episode page without /watch suffix if nothing found
    if (servers.length === 0 && source.watchSuffix && watchUrl !== episodeUrl) {
      const html2 = await fetchHtmlViaProxy(episodeUrl);
      if (html2) {
        const re = /iframe[^>]*src=["']([^"']+)["']/gi;
        while ((m = re.exec(html2)) !== null) {
          const url = m[1];
          if (url.startsWith("http") && !url.includes(source.base) && !seen.has(url)) {
            addServer(url);
          }
        }
      }
    }

    return servers;
  } catch {
    return [];
  }
}

// ─── anime4up: search (wp/v2/anime taxonomy) ───

async function searchAnime4upSource(source, allTitles) {
  const { base, name } = source;

  for (const searchName of allTitles) {
    for (const q of titleVariants(searchName)) {
      try {
        const apiUrl = `${base}/wp-json/wp/v2/anime?search=${encodeURIComponent(q)}&per_page=5`;
        const jsonStr = await fetchHtmlViaProxy(apiUrl);
        if (!jsonStr) continue;
        let items;
        try { items = JSON.parse(jsonStr); } catch { continue; }
        if (!Array.isArray(items) || items.length === 0) continue;

        const matched = [];
        for (const item of items) {
          const score = scoreRelevance(item.name || "", q);
          matched.push({
            slug: item.slug,
            title: item.name || searchName,
            taxonomyId: item.id,
            link: item.link,
            count: item.count || 0,
            _score: score,
            source: name,
            sourceBase: base,
          });
        }
        if (matched.length > 0) {
          return matched.sort((a, b) => b._score - a._score);
        }
      } catch {}
    }
  }

  for (const searchName of allTitles) {
    for (const q of titleVariants(searchName)) {
      try {
        const html = await fetchHtmlViaProxy(`${base}/?s=${encodeURIComponent(q)}`);
        if (!html) continue;
        const seriesRe = /<a[^>]*href="(https?:\/\/w1\.anime4up\.rest\/anime\/[^"]+)"[^>]*>([\s\S]{0,500}?)<\/a>/gi;
        const results = [];
        const seen = new Set();
        let m;
        while ((m = seriesRe.exec(html)) !== null) {
          const url = m[1].replace(/\/$/, "");
          const slug = url.split("/").pop();
          if (seen.has(slug)) continue;
          seen.add(slug);
          const title = m[2].replace(/<[^>]*>/g, "").trim() || slug;
          const score = scoreRelevance(title, q);
          results.push({ slug, title, link: url, _score: score, source: name, sourceBase: base });
        }
        if (results.length > 0) return results.sort((a, b) => b._score - a._score);
      } catch {}
    }
  }

  return [];
}

// ─── anime4up: fetch episodes by paginating myapp/v1/episodes ───

async function getEpisodesAnime4up(animeName, base, maxPages = 10) {
  const episodes = [];
  const seenIds = new Set();
  const searchTerms = [animeName.toLowerCase()];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const apiUrl = `${base}/wp-json/myapp/v1/episodes?page=${page}&per_page=100`;
      const jsonStr = await fetchHtmlViaProxy(apiUrl);
      if (!jsonStr) break;
      const data = JSON.parse(jsonStr);
      if (!data.episodes || !data.episodes.length) break;

      for (const ep of data.episodes) {
        if (seenIds.has(ep.id)) continue;
        const titleLower = (ep.title || "").toLowerCase();
        const match = searchTerms.some(t => titleLower.includes(t));
        if (!match) continue;

        seenIds.add(ep.id);
        const epMatch = ep.title.match(/الحلقة\s*(\d+)/i) || ep.title.match(/Episode\s*(\d+)/i);
        const epNum = epMatch ? parseInt(epMatch[1], 10) : 0;
        if (epNum > 0) {
          episodes.push({ episode: epNum, id: String(ep.id), url: String(ep.id), title: ep.title });
        }
      }

      if (data.page >= data.total_pages) break;
    } catch { break; }
  }

  return episodes.sort((a, b) => a.episode - b.episode);
}

// ─── anime4up: get stream URLs via myapp/v1/watch/{id} ───

async function getStreamUrlsAnime4up(episodeId, base) {
  try {
    const apiUrl = `${base}/wp-json/myapp/v1/watch/${episodeId}`;
    const jsonStr = await fetchHtmlViaProxy(apiUrl);
    if (!jsonStr) return [];
    const data = JSON.parse(jsonStr);
    if (!data.ok || !data.watch_servers) return [];

    return data.watch_servers.map(s => ({
      label: `${s.name} (${s.quality || "HD"})`,
      url: s.embed_url,
    }));
  } catch {
    return [];
  }
}

// ─── Main: find streaming source across ristoanime + anime4up + witanime + embed ───

export async function findStreamingSource(animeName) {
  const anilistInfo = await fetchAniListInfo(animeName);
  const allTitles = anilistInfo.titles;

  const sourceKeys = Object.keys(SOURCES);
  const tasks = sourceKeys.map(key => {
    if (key === "anime4up") return searchAnime4upSource(SOURCES[key], allTitles);
    if (key === "animeslayer") return searchAnimeSlayerSource(SOURCES[key], allTitles);
    return searchWpSource(SOURCES[key], allTitles);
  });
  const results = await Promise.allSettled(tasks);

  const allMatches = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "fulfilled" && results[i].value.length > 0) {
      for (const match of results[i].value) {
        allMatches.push({
          source: sourceKeys[i],
          sourceBase: SOURCES[sourceKeys[i]].base,
          slug: match.slug,
          id: match.id || match.slug,
          title: match.title,
          tagSlug: match.tagSlug || null,
          link: match.link || null,
          count: match.count || 0,
          _score: match._score || 0,
        });
      }
    }
  }

  if (allMatches.length > 0) {
    allMatches.sort((a, b) => b._score - a._score);
    const best = allMatches[0];
    return {
      source: best.source,
      sourceBase: best.sourceBase,
      slug: best.slug,
      id: best.id || best.slug,
      title: best.title,
      tagSlug: best.tagSlug,
      link: best.link,
      count: best.count,
      anilistId: anilistInfo.anilistId,
      episodeCount: anilistInfo.episodeCount || best.count || undefined,
      allSources: allMatches,
    };
  }

  if (anilistInfo.anilistId) {
    return {
      source: "embed",
      sourceBase: "",
      slug: animeName,
      id: String(anilistInfo.anilistId),
      title: animeName,
      tagSlug: null,
      anilistId: anilistInfo.anilistId,
      episodeCount: anilistInfo.episodeCount,
      subType: "eng",
    };
  }

  return null;
}
