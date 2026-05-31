const zlib = require('zlib');
const fetch = require('node-fetch');

const MIRURO_PIPE = 'https://www.miruro.tv/api/secure/pipe';
const ANILIST_URL = 'https://graphql.anilist.co';
const PIPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.miruro.tv/',
};

const PROVIDER_PRIORITY = ['ally', 'bee', 'ANIMEKAI', 'kiwi', 'dune', 'hop'];
const BLOCKED_CDN_HOSTS = ['uwucdn.top', 'owocdn.top'];
const CORS_CDN_HOSTS = ['wixmp.com', 'wixstatic.com'];

const EZVIDAPI_BASE = 'https://api.ezvidapi.com';
const EZVIDAPI_PROVIDERS = ['vidsrc', 'vidrock', 'vidnest', 'vixsrc'];
const ARM_API = 'https://arm.haglund.dev/api/v2/ids';
const tmdbCache = new Map();
const episodesCache = new Map();
const EP_CACHE_TTL = 5 * 60 * 1000;

async function anilistToTmdb(anilistId) {
  if (tmdbCache.has(anilistId)) return tmdbCache.get(anilistId);
  const res = await fetch(`${ARM_API}?source=anilist&id=${anilistId}`, { timeout: 3000 });
  if (!res.ok) return null;
  const data = await res.json();
  const result = data.themoviedb ? { id: data.themoviedb, season: data['themoviedb-season'] || 1 } : null;
  if (result) tmdbCache.set(anilistId, result);
  return result;
}

async function ezvidapiResolve(tmdbId, season, episode) {
  try {
    return await Promise.any(
      EZVIDAPI_PROVIDERS.map(async (provider) => {
        const url = `${EZVIDAPI_BASE}/tv/${provider}/${tmdbId}?season=${season}&episode=${episode}`;
        const res = await fetch(url, {
          headers: { 'Referer': 'https://ezvidapi.com/', 'Accept': 'application/json' },
          timeout: 7000,
        });
        if (!res.ok) throw new Error('not ok');
        const data = await res.json();
        if (!data.stream_url) throw new Error('no stream');
        return { ...data, provider };
      })
    );
  } catch { return null; }
}

function encodePipeRequest(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url').replace(/=+$/, '');
}

function decodePipeResponse(encoded) {
  const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
  const compressed = Buffer.from(padded, 'base64url');
  return JSON.parse(zlib.gunzipSync(compressed).toString('utf-8'));
}

function decodeEpId(b64) {
  try {
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return Buffer.from(padded, 'base64url').toString('utf-8');
  } catch { return b64; }
}

function deepTranslateIds(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(item => { if (typeof item === 'object' && item) deepTranslateIds(item); });
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'id' && typeof value === 'string') obj[key] = decodeEpId(value);
      else if (typeof value === 'object' && value) deepTranslateIds(value);
    }
  }
}

async function pipeFetch(payload) {
  const encoded = encodePipeRequest(payload);
  const url = `${MIRURO_PIPE}?e=${encoded}`;
  const res = await fetch(url, { headers: PIPE_HEADERS, timeout: 15000 });
  if (!res.ok) throw new Error(`Pipe returned ${res.status}`);
  const body = (await res.text()).trim();
  return decodePipeResponse(body);
}

async function getEpisodesData(anilistId) {
  const cached = episodesCache.get(anilistId);
  if (cached && Date.now() - cached.time < EP_CACHE_TTL) return cached.data;
  const data = await pipeFetch({
    path: 'episodes', method: 'GET',
    query: { anilistId }, body: null, version: '0.1.0',
  });
  deepTranslateIds(data);
  episodesCache.set(anilistId, { data, time: Date.now() });
  if (episodesCache.size > 200) {
    const oldest = episodesCache.keys().next().value;
    episodesCache.delete(oldest);
  }
  return data;
}

async function anilistSearch(query) {
  const gql = `query ($search: String) {
    Page(page: 1, perPage: 10) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id title { romaji english native }
        coverImage { large }
        format episodes status seasonYear
      }
    }
  }`;
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: gql, variables: { search: query } }),
    timeout: 10000,
  });
  if (!res.ok) throw new Error('AniList query failed');
  const data = await res.json();
  return data.data?.Page?.media || [];
}

exports.searchAnime = async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false, message: 'q parameter required' });
    const results = await anilistSearch(q);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getEpisodes = async (req, res) => {
  try {
    const anilistId = parseInt(req.params.anilistId, 10);
    if (!anilistId) return res.status(400).json({ success: false, message: 'anilistId required' });

    const data = await getEpisodesData(anilistId);

    const providers = data.providers || {};
    const simplified = {};
    for (const [pname, pdata] of Object.entries(providers)) {
      const episodes = pdata.episodes || {};
      simplified[pname] = {};
      const cats = typeof episodes === 'object' && !Array.isArray(episodes) ? episodes : { sub: episodes };
      for (const [cat, epList] of Object.entries(cats)) {
        if (!Array.isArray(epList)) continue;
        simplified[pname][cat] = epList.map(ep => ({
          number: ep.number,
          title: ep.title || `Episode ${ep.number}`,
          id: ep.id,
          image: ep.image || null,
        }));
      }
    }

    res.json({ success: true, data: { mappings: data.mappings, providers: simplified } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSources = async (req, res) => {
  try {
    const { anilistId, provider, category, episodeNum } = req.params;
    const aid = parseInt(anilistId, 10);
    const epNum = parseInt(episodeNum, 10);
    if (!aid || !provider || !epNum) {
      return res.status(400).json({ success: false, message: 'Missing params' });
    }

    const epData = await getEpisodesData(aid);

    const provData = epData.providers?.[provider];
    if (!provData) return res.status(404).json({ success: false, message: `Provider ${provider} not found` });

    const epsList = provData.episodes?.[category || 'sub'] || [];
    const ep = epsList.find(e => e.number === epNum);
    if (!ep) return res.status(404).json({ success: false, message: `Episode ${epNum} not found` });

    const encId = Buffer.from(ep.id).toString('base64url').replace(/=+$/, '');
    const sources = await pipeFetch({
      path: 'sources', method: 'GET',
      query: { episodeId: encId, provider, category: category || 'sub', anilistId: aid },
      body: null, version: '0.1.0',
    });

    const hlsStreams = (sources.streams || []).filter(s => s.type === 'hls' && s.url && !BLOCKED_CDN_HOSTS.some(h => s.url.includes(h)));
    if (!hlsStreams.length) {
      return res.status(404).json({ success: false, message: 'No HLS streams found for this provider' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const proxied = hlsStreams.map(s => {
      const hasCors = CORS_CDN_HOSTS.some(h => s.url.includes(h));
      return {
        url: hasCors ? s.url : `${baseUrl}/api/stream/proxy?url=${encodeURIComponent(s.url)}&ref=${encodeURIComponent(s.referer || '')}`,
        quality: s.quality,
        isActive: s.isActive,
      };
    });

    res.json({
      success: true,
      data: {
        streams: proxied,
        subtitles: (sources.subtitles || []).map(s => ({ url: s.file || s.url, label: s.label || s.language })),
        intro: sources.intro || null,
        outro: sources.outro || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.autoSources = async (req, res) => {
  try {
    const { anilistId, episodeNum } = req.params;
    const category = req.query.cat || 'sub';
    const aid = parseInt(anilistId, 10);
    const epNum = parseInt(episodeNum, 10);
    if (!aid || !epNum) return res.status(400).json({ success: false, message: 'Missing params' });

    const epData = await getEpisodesData(aid);

    const providers = epData.providers || {};
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    for (const pname of PROVIDER_PRIORITY) {
      const provData = providers[pname];
      if (!provData) continue;
      const epsList = provData.episodes?.[category] || [];
      const ep = epsList.find(e => e.number === epNum);
      if (!ep) continue;

      try {
        const encId = Buffer.from(ep.id).toString('base64url').replace(/=+$/, '');
        const sources = await pipeFetch({
          path: 'sources', method: 'GET',
          query: { episodeId: encId, provider: pname, category, anilistId: aid },
          body: null, version: '0.1.0',
        });

        const isBlocked = (url) => BLOCKED_CDN_HOSTS.some(h => url.includes(h));

        const active = (sources.streams || []).find(s => s.type === 'hls' && s.url && s.isActive && !isBlocked(s.url));
        const fallback = (sources.streams || []).find(s => s.type === 'hls' && s.url && !isBlocked(s.url));
        const stream = active || fallback;

        if (stream) {
          const hasCors = CORS_CDN_HOSTS.some(h => stream.url.includes(h));
          const streamUrl = hasCors
            ? stream.url
            : `${baseUrl}/api/stream/proxy?url=${encodeURIComponent(stream.url)}&ref=${encodeURIComponent(stream.referer || '')}`;

          return res.json({
            success: true,
            data: {
              provider: pname,
              stream: { url: streamUrl, quality: stream.quality },
              subtitles: (sources.subtitles || []).map(s => ({ url: s.file || s.url, label: s.label || s.language })),
              intro: sources.intro || null,
              outro: sources.outro || null,
            },
          });
        }

      } catch { continue; }
    }

    // Fallback: try ezvidapi (TMDB-based) only for sub category
    if (category === 'sub') {
      try {
        const tmdb = await anilistToTmdb(aid);
        if (tmdb) {
          const ezvid = await ezvidapiResolve(tmdb.id, tmdb.season, epNum);
          if (ezvid) {
            return res.json({
              success: true,
              data: {
                provider: `ezvidapi:${ezvid.provider}`,
                stream: { url: ezvid.stream_url, quality: 'auto' },
                subtitles: (ezvid.subtitles || []).filter(s => !s.label || /english/i.test(s.label || s.language || '')).map(s => ({ url: s.url, label: s.label || s.language })),
                intro: null,
                outro: null,
              },
            });
          }
        }
      } catch {}
    }

    res.status(404).json({ success: false, message: 'No working stream found across all providers' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function isBlockedHost(hostname) {
  if (!hostname) return true;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return true;
  const parts = hostname.split('.');
  if (parts[0] === '10') return true;
  if (parts[0] === '172' && +parts[1] >= 16 && +parts[1] <= 31) return true;
  if (parts[0] === '192' && parts[1] === '168') return true;
  if (parts[0] === '0') return true;
  return false;
}

exports.streamProxy = async (req, res) => {
  try {
    const targetUrl = req.query.url;
    const referer = req.query.ref || '';
    if (!targetUrl) return res.status(400).send('url parameter required');

    let targetParsed;
    try { targetParsed = new URL(targetUrl); } catch { return res.status(400).send('Invalid URL'); }
    if (targetParsed.protocol !== 'https:' && targetParsed.protocol !== 'http:') return res.status(400).send('Invalid protocol');
    if (isBlockedHost(targetParsed.hostname)) return res.status(403).send('Forbidden');

    const parsed = new URL(referer || targetUrl);
    const origin = `${parsed.protocol}//${parsed.host}`;
    const headers = {
      'User-Agent': PIPE_HEADERS['User-Agent'],
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': origin,
    };
    if (referer) headers['Referer'] = referer;

    const proxyRes = await fetch(targetUrl, { headers, timeout: 9000, redirect: 'follow' });
    if (!proxyRes.ok) return res.status(proxyRes.status).send('Upstream error');

    const contentType = proxyRes.headers.get('content-type') || '';
    const isM3U8 = targetUrl.endsWith('.m3u8') || contentType.includes('mpegurl');

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');

    if (isM3U8) {
      let body = await proxyRes.text();
      const baseUrl = `${req.protocol}://${req.get('host')}/api/stream/proxy`;
      const urlDir = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

      body = body.replace(/(^(?!#).*$)/gm, (match) => {
        const line = match.trim();
        if (!line || line.startsWith('#')) return match;
        const abs = line.startsWith('http') ? line : urlDir + line;
        return `${baseUrl}?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(referer)}`;
      });

      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(body);
    }

    res.set('Content-Type', contentType || 'application/octet-stream');
    proxyRes.body.pipe(res);
  } catch (err) {
    res.status(500).send('Proxy error');
  }
};

const REANIME_BASE = process.env.REANIME_BASE_URL || 'https://reanime.to';
const reanimeCache = new Map();
const REANIME_CACHE_TTL = 5 * 60 * 1000;

function cleanTitle(title) {
  return title.replace(/\s*\([^)]*\)/g, '').replace(/[^\w\s-]/g, '').trim();
}

function stripSeasonSuffixes(title) {
  return title
    .replace(/\s+\d+(?:st|nd|rd|th)?\s+Season\b.*$/i, '')
    .replace(/\s+Season\s+\d+.*$/i, '')
    .replace(/\s+Part\s+\d+.*$/i, '')
    .replace(/\s+Cour\s+\d+.*$/i, '')
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
    uniqueWords.length >= 2 ? uniqueWords.slice(0, 2).join(' ') : null,
  ].filter((s, i, a) => s && s.length > 2 && a.indexOf(s) === i);
};

function extractAnilistId(coverUrl) {
  const m = (coverUrl || '').match(/[bn]x(\d+)-/);
  return m ? parseInt(m[1], 10) : null;
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

async function reanimeFetch(url) {
  const cached = reanimeCache.get(url);
  if (cached && Date.now() - cached.time < REANIME_CACHE_TTL) return cached.data;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });
    if (!res.ok) return null;
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { return null; }
    reanimeCache.set(url, { data: parsed, time: Date.now() });
    if (reanimeCache.size > 100) {
      const oldest = reanimeCache.keys().next().value;
      reanimeCache.delete(oldest);
    }
    return parsed;
  } catch { return null; }
}

exports.searchReanime = async (req, res) => {
  try {
    const { q, anilistId } = req.query;
    if (!q) return res.status(400).json({ success: false, message: 'q parameter required' });

    const idNum = anilistId ? parseInt(anilistId) : null;
    const allVariants = titleVariants(q);

    const mapResults = (results, query) => {
      let idMatch = null;
      const scored = results.map(item => {
        const coverUrl = item.cover_image?.extra_large || item.cover_image?.large || item.cover_image?.medium || '';
        const extractedId = extractAnilistId(coverUrl);
        const title = item.title?.english || item.title?.romaji || item.title?.user_preferred || '';
        const score = scoreRelevance(title, query);
        const entry = {
          slug: item.anime_id,
          title: title || q,
          anilistId: extractedId || idNum || null,
          _score: score,
          source: 'reanime',
          sourceBase: REANIME_BASE,
        };
        if (idNum && extractedId === idNum) idMatch = { ...entry, _score: 999 };
        return entry;
      });
      if (idMatch) return [idMatch];
      return scored.sort((a, b) => b._score - a._score);
    };

    for (const variant of allVariants) {
      const url = `${REANIME_BASE}/api/search?q=${encodeURIComponent(variant)}`;
      const data = await reanimeFetch(url);
      if (!data) continue;
      const items = data.results || data.data || (Array.isArray(data) ? data : null);
      if (!Array.isArray(items) || items.length === 0) continue;
      const matched = mapResults(items, variant);
      if (matched.length > 0) {
        return res.json({ success: true, data: matched });
      }
    }

    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getReanimeEpisodes = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ success: false, message: 'slug parameter required' });

    const url = `${REANIME_BASE}/api/episodes/${slug}`;
    const data = await reanimeFetch(url);
    if (!data) return res.json({ success: true, data: [] });

    const eps = data.data || data.episodes || data.results || (Array.isArray(data) ? data : null);
    if (!Array.isArray(eps)) return res.json({ success: true, data: [] });

    const episodes = eps.map(ep => ({
      episode: ep.episode_number || ep.number || ep.episode || 0,
      title: ep.title || `Episode ${ep.episode_number || ep.number || ep.episode || '?'}`,
      url: String(ep.episode_number || ep.number || ep.episode || 1),
      thumbnail: ep.thumbnail || ep.image || null,
      duration: ep.duration || null,
      aired: ep.aired || ep.airDate || null,
      airDate: ep.air_date || ep.aired || ep.airDate || null,
    })).filter(ep => ep.episode > 0).sort((a, b) => a.episode - b.episode);

    res.json({ success: true, data: episodes, total: episodes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getReanimeStreamUrls = async (req, res) => {
  try {
    const { anilistId, episodeNum, fallbackId, slug } = req.query;
    const rawIds = [anilistId, fallbackId, slug].filter(Boolean);
    const tryIds = [];
    for (const id of rawIds) {
      tryIds.push(String(id));
      const n = Number(id);
      if (Number.isInteger(n) && n > 0) tryIds.push(String(n));
    }
    if (tryIds.length === 0) return res.json({ success: true, data: [] });

    for (const id of [...new Set(tryIds)]) {
      const url = `${REANIME_BASE}/api/flix/${id}/${episodeNum}`;
      const data = await reanimeFetch(url);
      if (!data) continue;

      const servers = (() => {
        if (!data) return null;
        if (Array.isArray(data.servers) && data.servers.length > 0) return data.servers;
        if (data.data && Array.isArray(data.data.servers) && data.data.servers.length > 0) return data.data.servers;
        if (data.result && Array.isArray(data.result)) return data.result;
        if (Array.isArray(data)) return data;
        return null;
      })();

      if (servers) {
        const mapped = servers.map(s => ({
          label: `${s.serverName || s.name || ''} (${s.dataType || s.type || 'sub'})`,
          url: s.dataLink || s.url || s.file || '',
          type: s.dataType || s.type || 'sub',
          referer: s.referer || s.referrer || s.source || null,
          embed: s.embed || null,
        })).filter(s => s.url);

        return res.json({ success: true, data: mapped });
      }
    }

    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.testProviders = async (req, res) => {
  const results = {};
  try {
    const anilist = await anilistSearch('Death Note');
    results.anilist = { count: anilist.length, first: anilist[0]?.title || null };
  } catch (e) { results.anilist = { error: e.message }; }

  try {
    const data = await pipeFetch({
      path: 'episodes', method: 'GET',
      query: { anilistId: 1535 }, body: null, version: '0.1.0',
    });
    results.miruro = { providers: Object.keys(data.providers || {}) };
  } catch (e) { results.miruro = { error: e.message }; }

  res.json({ success: true, data: results });
};
