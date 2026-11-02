# WeebOtaku — Codebase Guide (details all code)

Repository: `git@github.com:liimboooo/weebotaku.git` (cloned at `C:\Users\moham\OneDrive\Documents\Default Project\weebotaku`).
Stack: **MERN** (MongoDB + Express + React CRA) split into `backend/` and `frontend/`, plus `cf-worker/` (Cloudflare CORS proxy). Deployed on Vercel (frontend + backend separate projects).

---

## 1. Top-level layout

```
weebotaku/
├── AGENTS.md              # session changelog / known issues
├── CHANGES.md             # Reanime removal + Miruro fixes
├── DEPLOYMENT_SUMMARY.md  # Vercel URLs, env, commands
├── REPORT.md              # old WP-scraper architecture (dead)
├── check_deploy.js        # verifies baked REACT_APP_API_URL
├── vercel.json            # experimentalServices: frontend + backend
├── package.json           # only dep: aniwatch
├── backend/               # Express API (port 5000)
├── frontend/              # React CRA (port 3000)
├── cf-worker/             # Cloudflare Worker CORS proxy
├── anime-info*.html       # standalone info previews
└── logo.png
```

---

## 2. Backend (`backend/`)

### 2.1 Entry & app wiring
- `server.js` — connects DB (`config/db.js`), requires `app`, listens on `PORT`, inits socket.io.
- `app.js` — Express setup: helmet, hpp, cors(`*`), body parsers, `sanitize` middleware, rate limit (bypass `/stream/`), mounts all routes, health check, 404/error handlers.
- `api/index.js` — Vercel serverless entry: `connectDB()` per request, returns 500 if DB fails.
- `config/db.js` — mongoose cache + mongodb-memory-server fallback (5s timeout).
- `socket.js` — socket.io init.
- `emailService.js` — nodemailer (Gmail/SendGrid).

### 2.2 Routes (`backend/routes/`) — 19 routers
`anime.js, auth.js, badges.js, catalog.js, comments.js, config.js, gifs.js, leaderboard.js, news.js, notifications.js, reactions.js, reports.js, reviews.js, rooms.js, scrape.js, stream.js, tierlists.js`.

`stream.js` endpoints:
```
GET /test-providers
GET /search?q=
GET /episodes/:anilistId
GET /sources/:anilistId/:provider/:category/:episodeNum
GET /auto/:anilistId/:episodeNum?cat=&title=
GET /proxy?url=&ref=
GET /resolve-embed?url=
GET /consumet/:anilistId/:episodeNum?cat=&title=
```

### 2.3 Controllers (`backend/controllers/`)
- `streamController.js` (509 lines) — core streaming:
  - `pipeFetch` → Miruro `https://www.miruro.tv/api/secure/pipe?e=base64(payload)`; decodes base64url → optional XOR (`VITE_PIPE_OBF_KEY`) → gunzip.
  - `getProtocolVersion` → fetches `/.well-known/jwks.json`, reads `x-protocol-version`.
  - `getEpisodesData` → pipeFetch episodes + 5min cache.
  - `getSources` → single provider sources.
  - `autoSources` → iterates `PROVIDER_PRIORITY` (kiwi, bee, bonk, ally, moo, hop, ANIMEDUNYA, zoro, arc, telli, yugen, jet, neo) + available; first HLS not in `BLOCKED_CDN_HOSTS` (uwucdn.top, owocdn.top) wins; proxy non-CORS via `/api/stream/proxy`; fallback ezvidapi (TMDB→ezvidapi, sub only); **now also Consumet fallback** (AnimeUnity).
  - `consumetSources` → calls `consumetStream`.
  - `streamProxy` → SSRF-guarded fetch + m3u8 URI rewrite to `/api/stream/proxy`.
  - `resolveEmbed` → scrapes `.m3u8`/`file:`/`src:`/`data-hls` from embed HTML + 1-level iframe recurse.
  - `testProviders` → AniList search + Miruro pipe probe.
- `animeController.js` — `updateWatchHistory`, `getWatchHistory`; validates `animeId` Number, `episodeWatched`.
- Other controllers: auth, badges, catalog, comments, config, gifs, leaderboard, news, notifications, reactions, reports, reviews, rooms, scrape, tierlists.

### 2.4 Services (`backend/services/`)
- `consumetService.js` — `@consumet/extensions` Hianime/AnimePahe/AnimeUnity:
  - `consumetStream(anilistId, epNum, category, title)` → `findBestMatch` (scoreMatch threshold 30) → fetchAnimeInfo → fetchEpisodeSources → filter m3u8. Falls through Hianime → AnimePahe → AnimeUnity → `hentaiStream`.
  - `tryProviderStream`, `findBestMatch`, `searchByTitle`, `getAnimeInfo`, `getEpisodeSources`, `consumetSearch`, `consumetDirectSource`.
- `hentaiService.js` — `hentaiStream(title, ep)` fallback via search.htv-services.com + hanime.tv.
- `anilistService.js`, `malService.js` — OAuth sync.

### 2.5 Models (`backend/models/`)
`User.js` — `watchHistory: [{ animeId: Number required, episode: Number required, position, animeName, animeImg, timestamp }]`, plus auth fields, badges, etc.

### 2.6 Middleware (`backend/middleware/`)
- `auth.js` — `protect`: `jwt.verify(JWT_SECRET)` + `User.findById().lean()`.
- `sanitize.js` — `xss()` on body/query/params (can mangle URLs).

---

## 3. Frontend (`frontend/`)

### 3.1 Entry
- `src/index.js` → `App.js` (router).
- `src/services/api.js` — `ApiClient`, `API_BASE_URL = REACT_APP_API_URL` (default `http://localhost:5000/api`), 30s timeout, 401 logout sweep.

### 3.2 Pages (`src/pages/`)
- `AnimeDetail.jsx` (~1934 lines) — main watch page: HLS + iframe, episode list, stream orchestration, comments/reviews sidebar, characters, recommendations, trailer modal.
- `Feeds/AnimeWatch.jsx` — legacy overlay player (modal via createPortal).
- `AnimeInfo.jsx` — info page (also calls `getMiruroEpisodes` + `findStreamingSource`).
- `Browse.jsx`, `Home.jsx`, `AuthPage.jsx`, `ProfilePage.jsx`, `HistoryPage.jsx`, `WatchlistPage.jsx`, `SettingsPage.jsx`, `SchedulePage.jsx`, `NotFound.jsx`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`, `VerifyEmailPage.jsx`, `SyncCallbackAniList.jsx`, `SyncCallbackMAL.jsx`, `AnimeWatchTailwind.jsx` (mockup).

### 3.3 Components (`src/components/`) — 40+
`VideoPlayer.jsx` (presentational controls: timeline, settings, quality, PiP, shortcuts, receives `streamMode, servers, hlsLevels` props), `Comments.jsx`, `Reviews.jsx`, `Header.jsx`, `Sidebar.jsx`, `AuthModal.jsx`, `PosterCard.jsx`, `Slider.jsx`, `GifPicker.jsx`, `FastSearch.jsx`, `SpotlightSearch.jsx`, `TopTrending.jsx`, `TopUpcoming.jsx`, `Schedule.jsx`, `Categories.jsx`, etc.

### 3.4 Services (`src/services/`)
- `animeApi.js` — **all stream fetching**:
  - `getMiruroEpisodes`, `getMiruroStream`, `getConsumetStream`, `getDirectStream`, `getEpisodePage`, `getStreamUrls`, `findStreamingSource` (stubbed null), `anilistToTmdbClient`, `ezvidapiResolveClient`.
- `storage.js` — `addToWatchHistory` POSTs `/anime/:id/history`; `loadWatchHistory`, `syncFromBackend`.
- `animeService.js` — `updateWatchHistory(animeId, episodeWatched)` (incomplete body).
- `anilistApi.js`, `animeNewsApi.js`, `newsAggregator.js`, `authService.js`, `commentService.js`, `reviewService.js`, `reactionService.js`, `roomService.js`, `tierlistService.js`, `badgeService.js`, `configService.js`, `leaderboardService.js`, `notificationService.js`, `reportService.js`, `settingsService.js`, `socket.js`.

### 3.5 Other
- `contexts/` — `AuthModalContext`, `LanguageContext`.
- `hooks/` — `useAPI`, `useDocumentTitle`, `usePrefetchAnime`.
- `locales/` — `ar.js`, `en.js`.
- `data/animeData.js` — `getAnimeById`.
- `utils/` — constants, helpers.
- `styles/theme.js`.

---

## 4. Stream cascade (AnimeDetail.jsx:610-713)

```
episode selected
  │
  ├─ getMiruroStream(aniId, epNum, primaryCat, title)   [primary language first]
  │    └─ if url → play immediately; fetch other language in background
  │
  ├─ if primary missing → try other language
  │
  ├─ if none → getConsumetStream(aniId, epNum, title, 'sub')
  │
  ├─ if none → getDirectStream(aniId, epNum)   (ezvidapi client-side, ARM→TMDB→ezvid)
  │
  └─ if none → iframe fallback: getStreamUrls(episode.url, source, ...)  [dead when source='direct']
       └─ else setError("No video servers found.")
```

HLS: `Hls.js` attaches; fatal error → next server in `serversRef`, else retry (max 3 via `streamRetriesRef`), else `setError("Stream unavailable...")`.

Language effect (line 715): if no server matches `language`, increments `streamRetryCount` → re-runs stream load.

---

## 5. Backend stream flow (streamController.js)

```
GET /api/stream/auto/:anilistId/:episodeNum?cat=&title=
  │
  ├─ getEpisodesData(anilistId) via pipeFetch (Miruro)  [guarded → {} on 403]
  │
  ├─ for each provider in PROVIDER_PRIORITY ∪ available:
  │     pipeFetch sources → first HLS not blocked → return (proxied if non-CORS CDN)
  │
  ├─ Fallback 1: consumetStream(aid, epNum, cat, title)
  │     Hianime → AnimePahe → AnimeUnity → hentaiStream
  │
  └─ Fallback 2: ezvidapi (sub only) — ARM anilist→TMDB → ezvidapi 4 providers
```

`/proxy` rewrites `.m3u8` segment URIs to `/api/stream/proxy?url=...&ref=...`.

---

## 6. Config & env

**Frontend** (`frontend/.env` / `.env.production`):
- `REACT_APP_API_URL` (`http://localhost:5000/api` dev / `/api` prod)
- `REACT_APP_REANIME_BASE_URL`, `REACT_APP_CF_PROXY_URL`, `REACT_APP_FALLBACK_PROXIES`, `REACT_APP_STREAM_SOURCES`

**Backend** (`backend/.env` / `.env.example`):
- `PORT=5000`, `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRE`, `CORS_ORIGIN`, `CLIENT_URL`, email, VAPID, LiveKit, OAuth, etc.
- Undocumented: `VITE_PIPE_OBF_KEY` (should be `PIPE_OBF_KEY`).

**CF Worker** (`cf-worker/worker.js`): allowlist `[reanime.to, flixcloud.cc, animeslayer.to, kuudere.to]`.

---

## 7. Auth & data

- `protect` middleware: `jwt.verify(JWT_SECRET)` + DB lookup (no JWT-only fast path).
- `User` model: auth, profile, `watchHistory`, badges, etc.
- Routes: `/api/auth`, `/api/anime` (history), `/api/reviews`, `/api/comments`, `/api/reactions`, `/api/notifications`, `/api/rooms` (socket), `/api/tierlists`, `/api/badges`, `/api/leaderboard`, `/api/news`, `/api/reports`, `/api/catalog`, `/api/gifs`, `/api/config`, `/api/scrape`.

---

## 8. Known issues (AGENTS.md)
- `backend/.env` tracked in git (secrets).
- History sync 500 (watch history endpoint).
- Consumet stream 500 (scraper breakage).
- AnimatePresence `mode="wait"` warnings.
- `findStreamingSource` always returns null.

---

## 9. Deploy (DEPLOYMENT_SUMMARY.md)
- Backend project `backend` (non-GitHub): `cd backend; vercel deploy --prod`.
- Frontend project `frontend` (prebuilt): `npm run build` → copy `build/*` to `.vercel/output/static/` → `vercel deploy --prod --prebuilt`.
- Frontend `vercel.json` rewrites `/api/*` → `backend-delta-eight-70.vercel.app/_/backend/api/*`.
- URLs: frontend `frontend-beryl-theta-14.vercel.app`, backend `backend-delta-eight-70.vercel.app/api`.

---

## 10. Recent changes
Commit `ef26e49` (pushed to `origin/main`):
- Miruro pipe 403 no longer 500s (`autoSources` guarded).
- Consumet fallback added (Hianime → AnimePahe → AnimeUnity).
- `consumetStream` wrapped so Hianime throw doesn't abort AnimePahe/AnimeUnity.
- `getMiruroStream` forwards `title` to `/auto`; AnimeDetail/AnimeWatch pass title.

---

Want me to drill into any specific file/flow (e.g., VideoPlayer controls, Comments/Reviews, auth, socket rooms)?