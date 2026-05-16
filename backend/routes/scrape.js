const express = require('express');
const router = express.Router();

const SCRAPE_TIMEOUT = 20000;

async function fetchWithNative(url) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (response.ok) {
      return await response.text();
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function fetchWithWreq(url) {
  try {
    const wreq = require('wreq-js');
    const response = await wreq.fetch(url, { timeout: SCRAPE_TIMEOUT });
    if (response.status === 200) {
      const text = await response.text();
      return text || null;
    }
    return null;
  } catch {
    return null;
  }
}

router.get('/fetch', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, message: 'Missing url query param' });
  }

  let html = await fetchWithNative(url);

  if (!html) {
    html = await fetchWithWreq(url);
  }

  if (html) {
    res.json({ success: true, data: html });
  } else {
    res.status(502).json({ success: false, message: 'Failed to fetch URL' });
  }
});

async function tryFetchImage(url) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, {
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
    const res = await fetch(`https://api.mangadex.org/at-home/server/${chapterId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

router.get('/manga-image', async (req, res) => {
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

  res.status(502).json({ success: false, message: 'Failed to load manga image' });
});

module.exports = router;
