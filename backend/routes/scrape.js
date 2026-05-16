const express = require('express');
const router = express.Router();

const SCRAPE_TIMEOUT = 20000;

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.google.com/',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

async function fetchWithNative(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow', headers: BROWSER_HEADERS });
    clearTimeout(timeout);
    if (response.ok) return await response.text();
    if (response.status === 403 || response.status === 503) return null;
    return null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function fetchWithWreq(url) {
  try {
    const wreq = require('wreq');
    const html = await wreq(url, {
      headers: BROWSER_HEADERS,
      timeout: SCRAPE_TIMEOUT,
      followRedirect: true,
      ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513-21,29-23-24,0',
    });
    return html || null;
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
  if (!html) html = await fetchWithWreq(url);

  if (html) {
    res.json({ success: true, data: html });
  } else {
    res.status(502).json({ success: false, message: 'All fetch strategies failed' });
  }
});

module.exports = router;
