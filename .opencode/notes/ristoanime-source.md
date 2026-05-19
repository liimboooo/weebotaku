# Ristoanime.co Streaming Source — Full Technical Details

## Overview

ristoanime.co is an Arabic anime streaming site (WordPress + TopAnime theme) added as the **#1 priority source** in the multi-source fallback chain (`SOURCE_PRIORITY`). It serves anime with Arabic subtitles/translations.

## The Core Problem: Cloudflare Protection

ristoanime.co uses **Cloudflare Managed Challenge** (JS challenge, not CAPTCHA) that:
- Blocks ALL server-side requests from **datacenter IPs** (Vercel, Render, AWS, etc.)
- Returns "Just a moment..." challenge page with `cf_chl_*` / `challenge-platform` HTML
- **Only browser-based requests pass** (Cloudflare executes JS in the browser, sets `cf_clearance` cookie)
- Even our CF Worker and `wreq-js` library both get challenged when running from Vercel's datacenter IPs
- Even the WordPress REST API (`wp-json/wp/v2/posts`) is blocked server-side

## The Solution: Codetabs Public CORS Proxy

The working bypass is `https://api.codetabs.com/v1/proxy?quest={url}` — a public CORS proxy service that:
- Returns `Access-Control-Allow-Origin: *` headers
- Is **not blocked by Cloudflare** (different IP range, maybe residential or not flagged as datacenter)
- Successfully fetches search pages, episode pages, watch pages, and WP REST API from ristoanime.co
- Has a 12-second timeout in our code

## Complete Proxy Chain (`fetchHtmlViaProxy`)

Defined in `frontend/src/services/animeApi.js:41`. Strategies are tried **in order**, first truthy result wins:

```
Strategy 1: CF Worker Proxy (only for CF_PROTECTED_DOMAINS)
  └─ fetchViaWorker(url) → GET ${CF_WORKER_PROXY}?url=${url}
  └─ Status: NOT currently working for ristoanime (worker not deployed with ristoanime whitelist)
  └─ CF_WORKER_PROXY = https://anime-proxy.mohamedlimam80000.workers.dev

Strategy 2: Backend Scrape Proxy (always tried)
  └─ GET ${API_BASE}/scrape/fetch?url=${url}
  └─ Backend does: node-fetch(url) → wreq-js(url) fallback
  └─ Returns { success: true, data: "html..." }
  └─ For ristoanime: returns CF challenge HTML
  └─ Frontend detects CF challenge via isCfChallenge() → returns null → skip to next

Strategy 3: Codetabs Fallback Proxy (always tried, since we removed !cfSite gate)
  └─ GET https://api.codetabs.com/v1/proxy?quest=${url} with mode: "cors"
  └─ Returns Access-Control-Allow-Origin: *
  └─ WORKS for ristoanime.co (all endpoints)
  └─ This is the currently working strategy
```

**CF Challenge Detection** (`isCfChallenge`):
```js
function isCfChallenge(html) {
  return html && typeof html === "string" && 
    (html.includes("Just a moment") || html.includes("cf_chl") || html.includes("challenge-platform"));
}
```

**Important**: `ristoanime.co` is deliberately **NOT** in `CF_PROTECTED_DOMAINS`:
```js
const CF_PROTECTED_DOMAINS = ["anime3rb.com", "witanime.you", "witanime.one"];
```
This ensures Strategy 1 (CF Worker) is skipped and the codetabs fallback is tried.

## Ristoanime Site Architecture

WordPress site with **TopAnime theme** (common Arabic anime WordPress theme). Arabic language, RTL layout.

### URL Patterns

| Pattern | Example |
|---------|---------|
| Series page | `https://ristoanime.co/series/جميع-حلقات-انمي-ون-بيس-مترجمة-اون-لاين/` |
| Episode page | `https://ristoanime.co/انمي-ون-بيس-الحلقة-1122-مترجمة-اون-لاين/` |
| Watch endpoint | `https://ristoanime.co/%D8%A7%D9%86%D9%85%D9%8A-...-%D8%A7%D9%88%D9%86-%D9%84%D8%A7%D9%8A%D9%86/watch` |
| Search | `https://ristoanime.co/?s=one+piece` |
| WP REST API | `https://ristoanime.co/wp-json/wp/v2/posts?search=one+piece&per_page=100` |

### Server Discovery

The `/watch` page returns `data-watch` attributes containing **full embed URLs** (no XOR/base64 encoding needed — our initial analysis was wrong about encoding). Supported streaming servers on ristoanime:

| Server | Embed URL Pattern |
|--------|------------------|
| VidMoly | `https://vidmoly.biz/embed-{id}.html` |
| Mega.nz | `https://mega.nz/embed/{hash}` |
| SibNet | `https://sibnet.com/embed/{id}` |
| SendVid | `https://sendvid.com/embed/{id}` |
| Mp4Upload | `https://www.mp4upload.com/embed-{id}.html` |
| Uqload | `https://uqload.com/embed-{id}.html` |
| TurboVid | `https://turbovid.net/e/{id}` |
| HGCloud | (custom) |

## Code Flow: Search → Episodes → Stream

### Step 1: Search (`searchRistoAnime`)

```js
// animeApi.js:110
async function searchRistoAnime(query) {
  for (const q of titleVariants(query)) {
    const html = await fetchHtmlViaProxy(`https://ristoanime.co/?s=${encodeURIComponent(q)}`);
    if (!html) continue;
    // Parse HTML for series links:
    //   /series/{arabic-slug}/
    // Extract slug and title from each match
    // Return [{ slug, title, url }]
  }
}
```

Uses `titleVariants` on the query to generate multiple search attempts:
```js
const titleVariants = (title) => {
  const clean = cleanTitle(title);  // removes (parens), non-alpha chars
  return [
    title,                          // original
    clean,                          // cleaned
    title.split(":")[0].trim(),     // before colon (e.g. "Re:ZERO" → "Re")
    title.split("(")[0].trim(),     // before parens
    title.split("Season")[0].trim(), // before "Season"
    title.replace(/\s+Part\s+\d+$/i, "").trim(), // remove "Part N"
    title.replace(/'/g, ""),        // remove apostrophes
  ].filter(unique, length > 2);
};
```

`cleanTitle`:
```js
function cleanTitle(title) {
  return title.replace(/\s*\([^)]*\)/g, "").replace(/[^\w\s-]/g, "").trim();
}
```

### Step 2: Get Episodes (`getRistoAnimeEpisodes`)

Fetches the **WP REST API** for the series:
```js
// animeApi.js:190
const url = `https://ristoanime.co/wp-json/wp/v2/posts?search=${encodeURIComponent(name)}&per_page=100`;
const jsonStr = await fetchHtmlViaProxy(url);
const posts = JSON.parse(jsonStr);
// Filter posts matching the series slug
// Map to [{ number: N, url: episodeUrl, title }]
// Sort by episode number ascending
```

Falls back to parsing the `/series/{slug}` HTML page if WP REST API fails.

### Step 3: Get Stream URLs (`getRistoAnimeStreamUrls`)

Fetches the `/watch` endpoint and extracts `data-watch` attributes:
```js
// animeApi.js:280
const html = await fetchHtmlViaProxy(episodeUrl);
// Parse data-watch attributes from HTML
// data-watch="{server}:{embedUrl}"
// Return [{ server, url: embedUrl }]
```

The episode URL format is like:
```
https://ristoanime.co/انمي-ون-بيس-الحلقة-1122-مترجمة-اون-لاين/
```

The `/watch` endpoint URL is the same path with `/watch` appended or via query parameter.

## AnimeWatch.jsx Handler

In `frontend/src/pages/Feeds/AnimeWatch.jsx`:

```js
if (source === "ristoanime") {
  const episodes = await getRistoAnimeEpisodes(slug);
  // Display episode list
  // On episode click:
  const streams = await getRistoAnimeStreamUrls(episodeUrl);
  // Pass stream URLs to player
}
```

The source is determined by `findStreamingSource` which checks ristoanime first.

## Consumet API Fix

**Problem**: Consumet API mirrors don't return `Access-Control-Allow-Origin` headers. Direct `fetch()` from browser fails with CORS errors. Additionally, some mirrors return 404 or 451.

**Fix**: Modified `searchConsumetGogoanime` to route all requests through the backend proxy (`API_BASE/scrape/fetch`). The backend makes the server-side request (no CORS) and returns the JSON response wrapped in `{ success: true, data: jsonString }`.

```js
// OLD (broken): direct browser fetch → CORS error
const res = await fetch(`${mirror}/anime/gogoanime/${q}`);

// NEW (working): routed through backend proxy
const res = await fetch(`${API_BASE}/scrape/fetch?url=${encodeURIComponent(url)}`);
const wrapper = await res.json();
const data = JSON.parse(wrapper.data);
```

**Consumet mirrors** (in order, all server-side routed):
1. `https://consumet-api-rouge.vercel.app` — works (200, returns empty results sometimes)
2. `https://aniwatch-api-8v55.onrender.com` — 404
3. `https://consumet-extreme.vercel.app` — 404
4. `https://consumet-api-puce.vercel.app` — 404
5. `https://api.consumet.org` — 451 (unavailable for legal reasons)
6. `https://consumet-api.vercel.app` — works (200, returns empty results sometimes)

The gogoanime search API format: `GET /anime/gogoanime/{query}` — returns `{ currentPage, hasNextPage, results: [{ id, title, image, ... }] }`

## Multi-Source Fallback Architecture

```js
const SOURCE_PRIORITY = [
  "ristoanime",  // #1 — Arabic, via codetabs proxy
  "anime3rb",    // #2 — Arabic, CF-protected (needs worker)
  "witanime",    // #3 — Arabic, CF-protected
  "anitaku",     // #4 — English, direct fetch
  "consumet",    // #5 — Gogoanime via Consumet API (routed through backend)
  "anipub",      // #6 — English, via anipub.xyz API
  "embed",       // #7 — Fallback: embed search (VidSrc, VidBinge, etc.)
];
```

All sources are searched **in parallel** via `Promise.allSettled`. After all settle, results are filtered to successes, sorted by priority, and the highest-priority result with actual data is used.

## The Backend `/scrape/fetch` Endpoint

In `backend/routes/scrape.js:50`:

```js
router.get('/fetch', async (req, res) => {
  const { url } = req.query;
  
  // Try 1: node-fetch with browser UA headers
  let html = await fetchWithNative(url);
  
  // Try 2: wreq-js (cloudflare bypass library) if node-fetch got CF challenged
  if (!html || isCloudflareChallenge(html)) {
    html = await wreq.fetch(url);
  }
  
  // Return result
  res.json({ success: true, data: html });
});
```

For ristoanime: Both `node-fetch` and `wreq-js` return CF challenge from Vercel datacenter IPs. The backend returns `{ success: true, data: "<html>Just a moment...</html>" }`.

## CF Worker (Future Deployment)

The CF Worker at `cf-worker/worker.js` has `ristoanime.co` whitelisted. It acts as a fetch proxy: receives a URL, fetches it server-side, returns the response. Since it runs on Cloudflare's network, it **might** bypass Cloudflare challenges on ristoanime (subject to IP reputation).

**Deployment** requires user's terminal:
```powershell
cd cf-worker
npx wrangler login   # Opens browser for Cloudflare OAuth
npx wrangler deploy
```

After deploy, update `CF_PROTECTED_DOMAINS` in `animeApi.js`:
```js
const CF_PROTECTED_DOMAINS = ["anime3rb.com", "witanime.you", "witanime.one", "ristoanime.co"];
```
This makes the CF Worker the first strategy for ristoanime (tried before the codetabs proxy).

Current CF Worker URL: `https://anime-proxy.mohamedlimam80000.workers.dev`

The `wrangler-account.json` contains Cloudflare account details for the domain `limam-mohamed.com`.

## Key URLs

| Resource | URL |
|----------|-----|
| Frontend (Vercel) | `https://frontend-beryl-theta-14.vercel.app` |
| Backend API (Vercel) | `https://backend-delta-eight-70.vercel.app/api` |
| CF Worker | `https://anime-proxy.mohamedlimam80000.workers.dev` |
| Ristoanime | `https://ristoanime.co` |
| Codetabs Proxy | `https://api.codetabs.com/v1/proxy?quest=` |
| GitHub | `https://github.com/liimboooo/animewch` |

## Environment Variables

| Variable | Value | Where |
|----------|-------|-------|
| `REACT_APP_API_URL` | `https://backend-delta-eight-70.vercel.app/api` | frontend `.env.production` |
| `REACT_APP_CF_PROXY_URL` | `https://anime-proxy.mohamedlimam80000.workers.dev` | frontend `.env.production` |
| `MONGODB_URI` | `mongodb+srv://animeWch:...` | Vercel backend env |
| `JWT_SECRET` | `animewch_jwt_secret_key_2026` | Vercel backend env |
| `REACT_APP_API_URL` | `http://localhost:5000/api` | frontend `.env.development` |
| `Vercel Token` | `vcp_1AoZRFPaRDolwwTfWuBl0DHjaIixTEgKV2YRa6U3ZWdkxTg5Jp2R2vlk` | Used for CLI deploys |

## Key Files

| File Path | Purpose |
|-----------|---------|
| `frontend/src/services/animeApi.js` | All ristoanime functions + proxy chain + consumet fix |
| `frontend/src/pages/Feeds/AnimeWatch.jsx` | Ristoanime handler (episode loading, stream URL extraction) |
| `cf-worker/worker.js` | CF Worker with ristoanime whitelisted (needs `wrangler deploy`) |
| `backend/routes/scrape.js` | Backend `/scrape/fetch` proxy (CF-blocked for ristoanime) |
| `frontend/.env.production` | Production env vars (API URL, CF Worker URL) |
| `.vercel/project.json` | Vercel project config (project ID: `prj_5tcFQ8RIwH6QC55wrr2hI5IFLd63`) |

## Exploration History (What We Tried)

### Phase 1: Direct Backend Proxy
- Tried fetching ristoanime.co via our backend `/scrape/fetch`
- Got CF challenge → tried `wreq-js` → still CF challenged
- Conclusion: Vercel datacenter IPs are blocked by Cloudflare

### Phase 2: CF Worker
- Added `ristoanime.co` to CF Worker domain whitelist
- Discovered CF Worker also gets challenged from Vercel's IPs
- Tried deploying CF Worker with modified wrangler config → blocked by interactive login requirement
- Conclusion: CF Worker might work from Cloudflare's network, but we couldn't deploy

### Phase 3: Browser-Based Proxy (Working Solution)
- Discovered `api.codetabs.com/v1/proxy` public CORS proxy
- Tested: works for search pages, episode pages, watch pages, and WP REST API
- Removed ristoanime from `CF_PROTECTED_DOMAINS` to enable the codetabs fallback
- Added CF challenge detection to skip backend garbage responses
- **This is the currently working solution**

### Phase 4: Fixed Wrong Encoding Assumption
- Initially thought `data-watch` used XOR/base64 encoding
- Actually stores **full direct embed URLs** (no encoding)
- Updated parser accordingly

## Common Issues & Edge Cases

1. **"Just a moment" in responses**: `isCfChallenge` detects and skips these. If you see this in the console, the strategy that got it was correctly skipped and the next strategy succeeded.

2. **CORS errors from Consumet**: No longer an issue since all Consumet requests now route through the backend proxy.

3. **Empty search results**: If ristoanime returns no results for a query, the next source in priority is tried. This is normal multi-source fallback behavior.

4. **WP REST API returns hundreds of posts**: We filter by series slug/name match. The API returns all matching posts, we narrow down.

5. **Vercel auto-deploy**: Each `git push` to `main` triggers a Vercel deployment. The frontend build takes ~1 minute.

6. **Anitaku.to → anineko.to migration**: Previously fixed in a prior session (not related to ristoanime).

## Deployment

The app auto-deploys from GitHub to Vercel:
- Push to `main` → Vercel builds and deploys
- Frontend build command: `npm run build` (in `frontend/`)
- Backend is a serverless function at `backend/api/index.js`

Manual deploy (if needed):
```powershell
# Frontend build + Vercel prebuilt deploy
cd frontend
npm run build
xcopy /E /I /Y build\* .vercel\output\static\
vercel deploy --prod --prebuilt --yes --token <token> --scope team_wY7psbnF8UpNl0qGr0odXc2o
```
