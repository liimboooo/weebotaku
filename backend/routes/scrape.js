const express = require('express');
const cheerio = require('cheerio');
const nodeFetch = require('node-fetch');
const router = express.Router();

const SCRAPE_TIMEOUT = 20000;

function safeHandler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error(`[scrape] ${req.path} crashed:`, e?.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, data: [], error: e?.message || 'Internal server error' });
      }
    }
  };
}

async function fetchWithNative(url, extraHeaders = {}) {
  try {
    const response = await nodeFetch(url, {
      redirect: 'follow',
      timeout: 20000,
      headers: Object.assign({
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
      }, extraHeaders),
    });
    const text = await response.text();
    if (text) return text;
  } catch (e) {
    console.error('fetchWithNative error:', e?.message);
  }
  return null;
}

router.get('/fetch', safeHandler(async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, message: 'Missing url query param' });
  }

  let html = await fetchWithNative(url);

  if (!html) {
    try {
      const wreq = require('wreq-js');
      const wr = await wreq.fetch(url, { timeout: 20000 });
      if (wr.status === 200) html = await wr.text();
    } catch {}
  }

  if (html) {
    res.json({ success: true, data: html });
  } else {
    res.status(502).json({ success: false, data: null, error: 'Failed to fetch URL' });
  }
}));

async function tryFetchImage(url) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);
    const response = await nodeFetch(url, {
      signal: controller.signal,
      headers: {
        'Referer': 'https://mangadex.org/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(id);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      return { ok: true, data: Buffer.from(buffer), type: response.headers.get('content-type') || 'image/png' };
    }
    return { ok: false, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function fetchAtHome(chapterId) {
  try {
    const res = await nodeFetch(`https://api.mangadex.org/at-home/server/${chapterId}`, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

router.get('/manga-image', safeHandler(async (req, res) => {
  const { url, chapterId } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, message: 'Missing url' });
  }

  // Try the original URL with proper headers
  let result = await tryFetchImage(url);
  if (result.ok) {
    res.set('Content-Type', result.type);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(result.data);
  }

  // Try fallback: if we have a chapterId, re-fetch at-home server for new CDN node
  if (chapterId) {
    const atHome = await fetchAtHome(chapterId);
    if (atHome && atHome.baseUrl && atHome.chapter?.hash) {
      const baseUrl = atHome.baseUrl;
      const hash = atHome.chapter.hash;
      const qualities = ['data', 'data-saver'];
      for (const q of qualities) {
        const files = atHome.chapter[q];
        if (!files?.length) continue;
        const originalFile = url.split('/').pop();
        const file = files.find(f => f === originalFile) || files[0];
        const newUrl = `${baseUrl}/${q}/${hash}/${file}`;
        result = await tryFetchImage(newUrl);
        if (result.ok) {
          res.set('Content-Type', result.type);
          res.set('Cache-Control', 'public, max-age=86400');
          return res.send(result.data);
        }
      }
    }
  }

  res.status(502).json({ success: false, data: null, error: 'Failed to load manga image' });
}));

// ---------- MangaNato Aggregator Scraper ----------

async function fetchWithHeaders(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT);
  try {
    const response = await nodeFetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://readmanganato.com/',
      },
    });
    clearTimeout(id);
    if (response.ok) return await response.text();
  } catch { clearTimeout(id); }
  return null;
}

router.get('/manga-alt-search', safeHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'Missing q' });

  try {
    const query = q.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_');
    const html = await fetchWithHeaders(`https://readmanganato.com/search/story/${query}`);
    if (!html) return res.json({ success: true, data: [] });

    const $ = cheerio.load(html);
    const results = [];
    $('.search-story-item').each((i, el) => {
      const link = $(el).find('a.item-img').attr('href') || '';
      const id = link.split('/').pop() || '';
      const title = $(el).find('.item-title').text().trim();
      const img = $(el).find('img.img-loading').attr('src') || $(el).find('img').attr('src') || '';
      const author = $(el).find('.item-author').text().replace('Author:', '').trim();
      if (id && title) results.push({ id, title, cover: img, author, provider: 'manganato' });
      if (results.length >= 5) return false;
    });

    res.json({ success: true, data: results });
  } catch (e) {
    res.json({ success: false, data: [], error: e.message });
  }
}));

router.get('/manga-alt-chapters', safeHandler(async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, message: 'Missing id' });

  try {
    const html = await fetchWithHeaders(`https://readmanganato.com/${id}`);
    if (!html) return res.json({ success: true, data: [] });

    const $ = cheerio.load(html);
    const chapters = [];
    $('ul.row-content-chapter li a.chapter-name').each((i, el) => {
      const href = $(el).attr('href') || '';
      const parts = href.split('/').filter(Boolean);
      const chapterId = parts.slice(-2).join('/');
      const label = $(el).text().trim();
      const match = label.match(/(\d+(?:\.\d+)?)/);
      chapters.push({
        id: chapterId,
        chapter: match ? match[1] : String(chapters.length + 1),
        title: label,
        pages: 0,
        provider: 'manganato',
      });
    });

    res.json({ success: true, data: chapters.reverse() });
  } catch (e) {
    res.json({ success: false, data: [], error: e.message });
  }
}));

router.get('/manga-alt-pages', safeHandler(async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, message: 'Missing id' });

  try {
    const html = await fetchWithHeaders(`https://readmanganato.com/${id}`);
    if (!html) return res.json({ success: true, data: [] });

    const $ = cheerio.load(html);
    const pages = [];
    $('.container-chapter-reader img').each((i, el) => {
      const src = $(el).attr('src') || '';
      if (src) pages.push(src);
    });

    res.json({ success: true, data: pages });
  } catch (e) {
    res.json({ success: false, data: [], error: e.message });
  }
}));

// ---------- Toonily Aggregator Scraper ----------

router.get('/manga-toonily-search', safeHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'Missing q' });
  try {
    const query = q.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '+');
    const html = await fetchWithHeaders(`https://toonily.com/?s=${query}&post_type=wp-manga`);
    if (!html) return res.json({ success: true, data: [] });
    const $ = cheerio.load(html);
    const results = [];
    $('.c-tabs-item__content').each((i, el) => {
      const link = $(el).find('a').first().attr('href') || '';
      const id = link.split('/').filter(Boolean).pop() || '';
      const title = $(el).find('.post-title h3 a').text().trim() || $(el).find('.post-title').text().trim();
      const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
      const author = $(el).find('.mg_author a').text().trim();
      if (id && title) results.push({ id, title, cover: img, author, provider: 'toonily' });
      if (results.length >= 5) return false;
    });
    if (!results.length) {
      $('.tab-content-wrap .row .col-12').each((i, el) => {
        const link = $(el).find('a').attr('href') || '';
        const id = link.split('/').filter(Boolean).pop() || '';
        const title = $(el).find('h3').text().trim() || $(el).find('.post-title').text().trim();
        const img = $(el).find('img').attr('src') || '';
        if (id && title) results.push({ id, title, cover: img, author: '', provider: 'toonily' });
        if (results.length >= 5) return false;
      });
    }
    res.json({ success: true, data: results });
  } catch (e) {
    res.json({ success: false, data: [], error: e.message });
  }
}));

router.get('/manga-toonily-chapters', safeHandler(async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
  try {
    const html = await fetchWithHeaders(`https://toonily.com/manga/${id}/`);
    if (!html) return res.json({ success: true, data: [] });
    const $ = cheerio.load(html);
    const chapters = [];
    $('li.wp-manga-chapter a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const chapterId = href.split('/').filter(Boolean).pop() || href.split('/').slice(-2).join('/');
      const label = $(el).text().trim();
      const match = label.match(/(\d+(?:\.\d+)?)/);
      chapters.push({
        id: chapterId,
        chapter: match ? match[1] : String(chapters.length + 1),
        title: label,
        pages: 0,
        provider: 'toonily',
      });
    });
    res.json({ success: true, data: chapters.reverse() });
  } catch (e) {
    res.json({ success: false, data: [], error: e.message });
  }
}));

router.get('/manga-toonily-pages', safeHandler(async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
  try {
    const url = id.includes('toonily.com') ? id : `https://toonily.com/${id}/`;
    const html = await fetchWithHeaders(url);
    if (!html) return res.json({ success: true, data: [] });
    const $ = cheerio.load(html);
    const pages = [];
    $('.reading-content img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (src && !src.includes('data:image')) pages.push(src);
    });
    if (!pages.length) {
      $('.page-break img, .chapter-image img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || '';
        if (src && !src.includes('data:image')) pages.push(src);
      });
    }
    res.json({ success: true, data: pages });
  } catch (e) {
    res.json({ success: false, data: [], error: e.message });
  }
}));

router.get('/animechan-proxy', safeHandler(async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ success: false, message: 'Missing path' });
  try {
    const url = `https://animechan.xyz/api${path}`;
    const response = await nodeFetch(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    const text = await response.text();
    if (text && response.ok) return res.json({ success: true, data: text });
    res.status(502).json({ success: false, data: null, error: `animechan returned ${response.status}` });
  } catch (e) {
    console.error('Animechan proxy error:', e?.message);
    res.status(502).json({ success: false, data: null, error: e?.message || 'Animechan fetch failed' });
  }
}));

router.get('/fetch-health', safeHandler(async (req, res) => {
  const targets = [
    'https://api.mangadex.org/ping',
    'https://api.comick.io/search?q=test&limit=1',
    'https://animechan.xyz/api/random',
    'https://httpbin.org/get',
  ];
  const results = [];
  for (const target of targets) {
    try {
      const start = Date.now();
      const r = await nodeFetch(target, { timeout: 10000 });
      const ms = Date.now() - start;
      results.push({ target, status: r.status, ok: r.ok, ms, text: (await r.text()).slice(0, 100) });
    } catch (e) {
      results.push({ target, error: e.message });
    }
  }
  res.json({ success: true, data: results });
}));

// ---------- Bato.to Aggregator Scraper ----------

router.get('/manga-bato-search', safeHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'Missing q' });
  try {
    const word = q.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '+');
    const html = await fetchWithHeaders(`https://bato.to/search?word=${word}`);
    if (!html) return res.json({ success: true, data: [] });
    const $ = cheerio.load(html);
    const results = [];
    $('.item').each((i, el) => {
      const link = $(el).find('a').first().attr('href') || '';
      const id = link.split('/').filter(Boolean).pop() || link;
      const title = $(el).find('.item-title').text().trim() || $(el).find('a').first().text().trim();
      const img = $(el).find('img').attr('src') || '';
      if (id && title) results.push({ id, title, cover: img, author: '', provider: 'bato' });
      if (results.length >= 5) return false;
    });
    if (!results.length) {
      $('a[href*="/series/"]').each((i, el) => {
        const link = $(el).attr('href') || '';
        if (!link.includes('/series/')) return;
        const id = link.split('/').filter(Boolean).pop();
        const title = $(el).text().trim() || $(el).attr('title') || '';
        if (id && title && !results.some(r => r.id === id)) results.push({ id, title, cover: '', author: '', provider: 'bato' });
        if (results.length >= 5) return false;
      });
    }
    res.json({ success: true, data: results });
  } catch (e) {
    res.json({ success: false, data: [], error: e.message });
  }
}));

router.get('/manga-bato-chapters', safeHandler(async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
  try {
    const html = await fetchWithHeaders(`https://bato.to/series/${id}`);
    if (!html) return res.json({ success: true, data: [] });
    const $ = cheerio.load(html);
    const chapters = [];
    $('.chapter-list a[href*="/series/"], a[href*="/chapter/"]').each((i, el) => {
      const href = $(el).attr('href') || '';
      if (!href.includes(id)) return;
      const chId = href.split('/').filter(Boolean).pop();
      const label = $(el).text().trim();
      const match = label.match(/(\d+(?:\.\d+)?)/);
      if (chId) chapters.push({
        id: `${id}/${chId}`,
        chapter: match ? match[1] : String(chapters.length + 1),
        title: label,
        pages: 0,
        provider: 'bato',
      });
    });
    res.json({ success: true, data: chapters.reverse() });
  } catch (e) {
    res.json({ success: false, data: [], error: e.message });
  }
}));

router.get('/manga-bato-pages', safeHandler(async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
  try {
    const html = await fetchWithHeaders(`https://bato.to/series/${id}`);
    if (!html) return res.json({ success: true, data: [] });
    const $ = cheerio.load(html);
    const pages = [];
    $('img.page-image, .reader-container img, #reader img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (src && !src.includes('data:image')) pages.push(src);
    });
    res.json({ success: true, data: pages });
  } catch (e) {
    res.json({ success: false, data: [], error: e.message });
  }
}));

router.get('/anipub-proxy', safeHandler(async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ success: false, message: 'Missing path' });
  try {
    const url = `https://anipub.xyz${path}`;
    const response = await nodeFetch(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    const text = await response.text();
    if (text && response.ok) return res.json({ success: true, data: text });
    res.status(502).json({ success: false, data: null, error: `anipub returned ${response.status}` });
  } catch (e) {
    res.status(502).json({ success: false, data: null, error: e?.message });
  }
}));

router.get('/jikan-proxy', safeHandler(async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ success: false, message: 'Missing path' });
  try {
    const url = `https://api.jikan.moe/v4${path}`;
    const response = await nodeFetch(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    });
    if (response.status === 429) {
      return res.status(429).json({ success: false, data: null, error: 'Jikan rate limited' });
    }
    const text = await response.text();
    if (text && response.ok) {
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      return res.json({ success: true, data: parsed });
    }
    res.status(502).json({ success: false, data: null, error: `jikan returned ${response.status}` });
  } catch (e) {
    res.status(502).json({ success: false, data: null, error: e?.message });
  }
}));

module.exports = router;
