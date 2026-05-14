# Deployment Summary

**Date**: 2026-05-13

## Working URLs

| Layer | URL | Status |
|-------|-----|--------|
| Frontend | https://frontend-beryl-theta-14.vercel.app | ✅ Serving React app with characters, recs, trailer |
| Backend API | https://backend-delta-eight-70.vercel.app/api | ✅ MongoDB connected |

## Projects Created (Working)

### Backend: `backend` (prj_5tcFQ8RIwH6QC55wrr2hI5IFLd63)
- **Deploy from**: `backend/` directory
- **GitHub**: Not linked
- **Env vars**: `MONGODB_URI`, `CORS_ORIGIN=*`
- **Node**: 24.x
- **Health**: `GET /api/health` → `{"success":true}`
- **Data**: `GET /api/anime` → proxies Jikan API data

### Frontend: `frontend` (created via prebuilt deploy)
- **Deploy from**: `frontend/` directory via prebuilt `.vercel/output/`
- **Build**: local `npm run build` → copied to `.vercel/output/static/`
- **No Vercel build step** (avoids timeouts / stuck builds)
- **API URL**: `REACT_APP_API_URL=https://backend-delta-eight-70.vercel.app/api`

## Stuck Projects (Do Not Use)
These have GitHub repo links and all new builds are stuck at UNKNOWN status (Vercel build system issue for this account):

| Project | Problem |
|---------|---------|
| `animewch-r92n` | All deployments UNKNOWN |
| `liimboooo-animewch` | All new deployments UNKNOWN |
| `animewch` | All new deployments UNKNOWN |
| `animewch-rm8c` | All new deployments UNKNOWN |
| `animewch-frontend3` | Build stuck on Vercel server |

Root cause for stuck builds is unclear — Vercel status shows "All Systems Operational" but GitHub-linked projects no longer process builds.

## What Was Done

1. **CORS fixes** — wildcard `*` handling, disabled `credentials: true` when origin is `*`, added `CORS_ORIGIN=*` env var
2. **MongoDB connection** — set `MONGODB_URI` with encoded `%40` for `@` in password, database name `/animewch`
3. **MongoDB Atlas IP whitelist** — added `0.0.0.0/0` (anywhere) to allow Vercel deploys
4. **New backend project** — non-GitHub `backend` project deploys from `backend/` directory with `vercel.json` routing `/*` → `api/index.js`
5. **New frontend project** — non-GitHub `frontend` project deploys prebuilt static files
6. **Environment variables** — wired via `.env.production` (baked into frontend bundle at build time) and Vercel env vars (backend picks up `MONGODB_URI` and `CORS_ORIGIN` at runtime)
7. **JWT auth fix** — added `JWT_SECRET` and `JWT_EXPIRE=30d` env vars to backend
8. **Body parsing fix** — Vercel serverless runtime conflicted with Express `json()` body parser; fixed by reading raw body in `api/index.js` before Express processes it, preventing `Invalid JSON` errors on POST/PUT/PATCH requests
9. **Trust proxy** — added `app.set('trust proxy', 1)` to fix `express-rate-limit` `X-Forwarded-For` validation warning behind Vercel proxy
10. **Anime characters & recommendations** — added Jikan proxy routes on backend (`/:id/characters`, `/:id/recommendations`), frontend service (`jikanApi.js` exports `fetchAnimeCharacters`, `fetchAnimeRecommendations`), and `AnimeDetail.jsx` sections with characters grid and recommendations grid
11. **YouTube trailer** — trailer button + iframe modal in `AnimeDetail.jsx` using Jikan-provided `trailer.embed_url`
- **CSS additions** — `.ad-characters-grid`, `.ad-character-card`, `.ad-character-img`, `.ad-character-info`, `.ad-character-name`, `.ad-character-role`, `.ad-character-va`, `.ad-recommendations-grid`, `.ad-recommendation-card`, `.ad-recommendation-name`, `.ad-trailer-overlay`, `.ad-trailer-modal`, `.ad-trailer-close`, `.ad-trailer-embed`, `.ad-section`, `.ad-section-title`
13. **Prebuilt deployment** — used Build Output API (`.vercel/output/` with `config.json` + `static/`) to deploy without Vercel build step, avoiding timeout issues
14. **Static file routing fix** — added `{ "handle": "filesystem" }` before catch-all rewrite so `.js`, `.css` etc. are served from disk instead of returning `index.html`

## Key Commands

```powershell
# Deploy backend (from backend/)
vercel deploy --prod --token <token>

# Build frontend (from frontend/)
npm run build

# Deploy frontend prebuilt (from frontend/)
vercel deploy --prod --prebuilt --yes --token <token>

# Full frontend redeploy:
#   1. npm run build
#   2. copy build\* .vercel\output\static\
#   3. vercel deploy --prod --prebuilt --yes --token <token>
```

## Notes

- Vercel CLI version: 54.0.0
- Frontend built with warnings (not errors) — React Hook dependency warnings and unused vars, all cosmetic
- Backend caches MongoDB connection across serverless invocations (`config/db.js` uses global cache)
- Rate limiting enabled in production (200 req/15min general, 20 req/15min auth)
- Jikan API rate limit: 1 req/sec public; frontend queue uses 1100ms interval
- @ in MongoDB Atlas password encoded as %40 in connection string
