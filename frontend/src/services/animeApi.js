function cleanTitle(title) {
  return title.replace(/\s*\([^)]*\)/g, "").replace(/[^\w\s-]/g, "").trim();
}

function stripSeasonSuffixes(title) {
  return title
    .replace(/\s+\d+(?:st|nd|rd|th)?\s+Season\b.*$/i, "")
    .replace(/\s+Season\s+\d+.*$/i, "")
    .replace(/\s+Part\s+\d+.*$/i, "")
    .replace(/\s+Cour\s+\d+.*$/i, "")
    .replace(/[:\-–—]+\s*[^:\-–—]*$/, "")
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
const PROXIES = [
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

// ─── RistoAnime (WordPress-based, Arabic subtitles) ───
const RISTOANIME = "https://ristoanime.co";

async function searchRistoAnime(query) {
  // Strategy 1: HTML search page
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

  // Strategy 2: WP REST API search with full name variants
  const foundViaApi = await searchRistoApi(query);
  if (foundViaApi) return foundViaApi;

  // Strategy 3: Keyword-only search — extract unique words, search ristoanime directly
  const keywords = query.split(/[\s\-–—]+/).filter(w => w.length > 3 && !/^(the|and|or|for|of|in|on|at|to|a|an|is|it|its|be|by|with|from|as)$/i.test(w));
  if (keywords.length >= 2) {
    const kwResults = await searchRistoApi(keywords.slice(0, 4).join(" "));
    if (kwResults) return kwResults;
  }

  return [];

  async function searchRistoApi(searchTerm) {
    for (const q of titleVariants(searchTerm)) {
      try {
        const apiUrl = `${RISTOANIME}/wp-json/wp/v2/posts?search=${encodeURIComponent(q)}&per_page=5`;
        const jsonStr = await fetchHtmlViaProxy(apiUrl);
        if (!jsonStr) continue;
        const posts = JSON.parse(jsonStr);
        if (posts.length === 0) continue;
        const seriesSlugs = new Set();
        for (const post of posts) {
          try {
            const path = new URL(post.link).pathname.replace(/\/+$/, "");
            const segs = path.split("/").filter(Boolean);
            const seriesIdx = segs.indexOf("series");
            if (seriesIdx !== -1 && segs[seriesIdx + 1]) seriesSlugs.add(segs[seriesIdx + 1]);
          } catch {}
        }
        const slug = seriesSlugs.size > 0 ? [...seriesSlugs][0] : searchTerm.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().replace(/-+/g, "-").replace(/^-|-$/g, "");
        return [{ slug, title: searchTerm, _score: 100 }];
      } catch {}
    }
    return null;
  }
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
    const searchTerms = [];
    const addTerm = (t) => { if (t && !searchTerms.includes(t)) searchTerms.push(t); };

    addTerm(animeName.replace(/\s*\([^)]*\)/g, "").replace(/[^\w\s-]/g, "").trim());

    const englishWords = animeName.split(/[\s-]+/).filter(w => /[a-zA-Z]/.test(w)).join(" ");
    if (englishWords) addTerm(englishWords);
    const noArabic = animeName.replace(/[\u0600-\u06FF\u0750-\u077F]/g, "").replace(/\s+/g, " ").trim();
    if (noArabic && noArabic !== englishWords) addTerm(noArabic);

    for (const v of titleVariants(animeName)) {
      addTerm(v);
    }

    // Keyword fallback: extract meaningful keywords
    const keywords = animeName.split(/[\s\-–—]+/).filter(w => w.length > 2 && !/^(the|and|or|for|of|in|on|at|to|a|an|is|it|its|be|by|with|from|as)$/i.test(w));
    if (keywords.length >= 2) addTerm(keywords.slice(0, 4).join(" "));

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

async function fetchJapaneseTitle(englishName) {
  // Generate search variants: add a stripped base name without season suffixes
  const variants = [...new Set([
    ...titleVariants(englishName),
    stripSeasonSuffixes(englishName),
    englishName.replace(/[\d]+$/, "").trim(),
  ].filter(Boolean))];

  // Try AniList GraphQL first
  const q = `query ($s: String) { Media(search: $s, type: ANIME) { title { romaji english } } }`;
  for (const v of variants) {
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, variables: { s: v } }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.data?.Media?.title) {
        const t = data.data.Media.title;
        return t.romaji || t.english || englishName;
      }
    } catch {}
  }

  // Fallback: Jikan API for Japanese title (with delay for rate limit)
  for (const v of variants) {
    try {
      await new Promise(r => setTimeout(r, 700));
      const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(v)}&limit=1`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.data?.[0]) {
        return data.data[0].title || englishName;
      }
    } catch {}
  }

  return null;
}

export async function findStreamingSource(animeName) {
  const jpName = await fetchJapaneseTitle(animeName);
  const searchName = jpName || animeName;

  const results = await searchRistoAnime(searchName);
  if (results.length > 0) {
    return { source: "ristoanime", slug: results[0].slug, id: results[0].slug, title: searchName };
  }

  return null;
}
