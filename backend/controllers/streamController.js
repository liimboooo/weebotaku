const zlib = require('zlib');
const fetch = require('node-fetch');
const { consumetStream, consumetDirectSource } = require('../services/consumetService');

const MIRURO_PIPE = 'https://www.miruro.tv/api/secure/pipe';
const ANILIST_URL = 'https://graphql.anilist.co';
const PIPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.miruro.tv/',
};

const PROVIDER_PRIORITY = ['kiwi', 'bee', 'bonk', 'ally', 'moo', 'hop', 'ANIMEDUNYA', 'zoro', 'arc', 'telli', 'yugen', 'jet', 'neo'];
const BLOCKED_CDN_HOSTS = ['uwucdn.top', 'owocdn.top'];
const CORS_CDN_HOSTS = ['wixmp.com', 'wixstatic.com'];

const EZVIDAPI_BASE = 'https://api.ezvidapi.com';
const EZVIDAPI_PROVIDERS = ['vidsrc', 'vidrock', 'vidnest', 'vixsrc'];
const ARM_API = 'https://arm.haglund.dev/api/v2/ids';
const tmdbCache = new Map();
const episodesCache = new Map();
const EP_CACHE_TTL = 5 * 60 * 1000;
const MIRURO_JWKS = 'https://www.miruro.tv/.well-known/jwks.json';

let protocolVersion = '0.1.0';
let protoVersionPromise = null;

async function getProtocolVersion() {
  if (protoVersionPromise) return protoVersionPromise;
  protoVersionPromise = (async () => {
    try {
      const res = await fetch(MIRURO_JWKS, {
        headers: { 'User-Agent': PIPE_HEADERS['User-Agent'] },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const ver = res.headers.get('x-protocol-version');
        if (ver) protocolVersion = ver;
      }
    } catch { /* keep default 0.1.0 */ }
    return protocolVersion;
  })();
  return protoVersionPromise;
}

async function anilistToTmdb(anilistId) {
  if (tmdbCache.has(anilistId)) return tmdbCache.get(anilistId);
  const res = await fetch(`${ARM_API}?source=anilist&id=${anilistId}`, { signal: AbortSignal.timeout(3000) });
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
          signal: AbortSignal.timeout(7000),
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

const PIPE_OBF_KEY = process.env.VITE_PIPE_OBF_KEY || '';

function decodePipeResponse(encoded, obfuscationVersion) {
  const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
  let bytes = Buffer.from(padded, 'base64url');

  if (obfuscationVersion === '2' && PIPE_OBF_KEY) {
    const keyBytes = Buffer.from(PIPE_OBF_KEY, 'utf-8');
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    }
  }

  if (obfuscationVersion) {
    return JSON.parse(zlib.gunzipSync(bytes).toString('utf-8'));
  }

  return JSON.parse(bytes.toString('utf-8'));
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
  const res = await fetch(url, { headers: PIPE_HEADERS, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Pipe returned ${res.status}`);
  const obfuscationVersion = res.headers.get('x-obfuscated') || '';
  const body = (await res.text()).trim();
  return decodePipeResponse(body, obfuscationVersion);
}

async function getEpisodesData(anilistId) {
  const cached = episodesCache.get(anilistId);
  if (cached && Date.now() - cached.time < EP_CACHE_TTL) return cached.data;
  const data = await pipeFetch({
    path: 'episodes', method: 'GET',
    query: { anilistId }, body: null, version: await getProtocolVersion(),
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
    signal: AbortSignal.timeout(10000),
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
          description: ep.description || ep.overview || null,
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
      body: null, version: await getProtocolVersion(),
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

    const availableProviders = Object.keys(providers);
    const providerOrder = [...new Set([...PROVIDER_PRIORITY, ...availableProviders])];

    for (const pname of providerOrder) {
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
          body: null, version: await getProtocolVersion(),
        });

        const stream = (sources.streams || []).find(s => s.type === 'hls' && s.url && !BLOCKED_CDN_HOSTS.some(h => s.url.includes(h)));

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

    const proxyRes = await fetch(targetUrl, { headers, signal: AbortSignal.timeout(9000), redirect: 'follow' });
    if (!proxyRes.ok) return res.status(proxyRes.status).send('Upstream error');

    const contentType = proxyRes.headers.get('content-type') || '';
    const isM3U8 = targetUrl.endsWith('.m3u8') || contentType.includes('mpegurl');

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');

    if (isM3U8) {
      let body = await proxyRes.text();
      const baseUrl = `${req.protocol}://${req.get('host')}/api/stream/proxy`;
      const urlDir = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

      body = body.replace(/(^(?!#).*$)|URI="([^"]+)"/gm, (match, line, uri) => {
        if (uri) {
          const abs = uri.startsWith('http') ? uri : urlDir + uri;
          return match.replace(uri, `${baseUrl}?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(referer)}`);
        }
        const trimmed = match.trim();
        if (!trimmed) return match;
        const abs = trimmed.startsWith('http') ? trimmed : urlDir + trimmed;
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

exports.testProviders = async (req, res) => {
  const results = {};
  try {
    const anilist = await anilistSearch('Death Note');
    results.anilist = { count: anilist.length, first: anilist[0]?.title || null };
  } catch (e) { results.anilist = { error: e.message }; }

  try {
    const data = await pipeFetch({
      path: 'episodes', method: 'GET',
      query: { anilistId: 1535 }, body: null, version: await getProtocolVersion(),
    });
    results.miruro = { providers: Object.keys(data.providers || {}) };
  } catch (e) { results.miruro = { error: e.message }; }

  res.json({ success: true, data: results });
};

exports.consumetSources = async (req, res) => {
  try {
    const { anilistId, episodeNum } = req.params;
    const aid = parseInt(anilistId, 10);
    const epNum = parseInt(episodeNum, 10);
    const title = req.query.title || '';
    if (!aid || !epNum) return res.status(400).json({ success: false, message: 'Missing params' });

    const result = await consumetStream(aid, epNum, req.query.cat || 'sub', title);
    if (!result) return res.status(404).json({ success: false, message: 'No Consumet stream found' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resolveEmbed = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: 'url parameter required' });

    const embedRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!embedRes.ok) throw new Error(`Embed returned ${embedRes.status}`);
    const html = await embedRes.text();

    const patterns = [
      /(?:https?:)?\/\/[^"'\s]+\.m3u8[^"'\s]*/gi,
      /file\s*:\s*["']([^"']+)["']/i,
      /src\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
      /data-hls\s*=\s*["']([^"']+)["']/i,
      /sources\s*:\s*\[\s*\{[^}]*src\s*:\s*["']([^"']+)["']/i,
      /<source\s+[^>]*src\s*=\s*["']([^"']+\.m3u8[^"']*)["']/i,
      /<video[^>]*>\s*<source\s+src\s*=\s*["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        let videoUrl = match[1] || match[0];
        if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;
        try { new URL(videoUrl); } catch { continue; }
        return res.json({ success: true, data: { url: videoUrl, type: videoUrl.includes('.m3u8') ? 'hls' : 'mp4' } });
      }
    }

    const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch) {
      let nestedUrl = iframeMatch[1];
      if (nestedUrl.startsWith('//')) nestedUrl = 'https:' + nestedUrl;
      if (nestedUrl.startsWith('/')) nestedUrl = new URL(url).origin + nestedUrl;
      const nestedRes = await fetch(nestedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': url,
        },
        signal: AbortSignal.timeout(10000),
      });
      if (nestedRes.ok) {
        const nestedHtml = await nestedRes.text();
        for (const pattern of patterns) {
          const match = nestedHtml.match(pattern);
          if (match) {
            let videoUrl = match[1] || match[0];
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;
            try { new URL(videoUrl); } catch { continue; }
            return res.json({ success: true, data: { url: videoUrl, type: videoUrl.includes('.m3u8') ? 'hls' : 'mp4' } });
          }
        }
      }
    }

    res.json({ success: false, message: 'No video URL found in embed page' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
