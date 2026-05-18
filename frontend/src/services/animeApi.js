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

  strategies.push(async () => {
    const res = await Promise.race([
      fetch(`${FALLBACK_PROXY}${encodeURIComponent(url)}`, { mode: "cors" }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000)),
    ]);
    if (res.ok) return await res.text();
    return null;
  });

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

  // Strategy 2: WP REST API fallback — finds episodes even when HTML search misses the series
  for (const q of titleVariants(query)) {
    try {
      const apiUrl = `${RISTOANIME}/wp-json/wp/v2/posts?search=${encodeURIComponent(q)}&per_page=5`;
      const jsonStr = await fetchHtmlViaProxy(apiUrl);
      if (!jsonStr) continue;
      const posts = JSON.parse(jsonStr);
      if (posts.length > 0) {
        return [{ slug: "r-" + q.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().replace(/-+/g, "-").replace(/^-|-$/g, ""), title: query, _score: 100 }];
      }
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

export async function findStreamingSource(animeName) {
  const results = await searchRistoAnime(animeName);
  if (results.length > 0) {
    return { source: "ristoanime", slug: results[0].slug, id: results[0].slug, title: results[0].title };
  }
  return null;
}
