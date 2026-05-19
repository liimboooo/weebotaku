# AnimeWch — Arabic Anime Streaming Integration Report

## Goal
Provide Arabic-subtitled anime streaming on [animewch](https://animewch.vercel.app) (a Jikan/AniList-based anime tracking website).

## The Problem
There is **no public REST API** for Arabic-subtitled anime streaming. All Arabic anime sources are WordPress-based sites that require scraping. The existing code tried to:

1. **Name matching**: Convert English anime names → Japanese names (via AniList/Jikan) → search Arabic sites
2. **Proxy bypass**: Use multiple CORS proxies to access blocked Arabic sites
3. **Episode extraction**: Parse WordPress REST API results to find episode URLs

But it was fundamentally broken due to:
- Wrong slug extraction (guessing from URLs instead of using actual site taxonomy)
- Keyword-based post search returning episodes from wrong anime
- Cloudflare protection blocking most proxies
- Season/number suffixes in names breaking API lookups

---

## Architecture

```
User clicks anime
  → findStreamingSource(englishName)
    → fetchJapaneseTitle(name)       # AniList GraphQL → Jikan fallback
    → searchRistoAnime(jpName)        # Search ristoanime.co for the series
      → WP REST API search
      → Extract series tag slug from class_list
      → Return { slug, tagSlug }
    → Return { source, slug, tagSlug }

AnimeWatch (player)
  → getRistoAnimeEpisodes(title, tagSlug)
    → getTagIdBySlug(tagSlug)         # Get numeric tag ID
    → getPostsByTagId(tagId)          # Posts filtered BY SERIES TAG
    → Parse episode numbers from Arabic titles
    → Return sorted episodes

  → getRistoAnimeStreamUrls(episodeUrl)
    → Fetch episode page → extract data-watch attributes
    → Return array of video server URLs
```

---

## Files Changed

### `frontend/src/services/animeApi.js`
All source-finding logic.

| Function | What it does |
|----------|-------------|
| `stripSeasonSuffixes` | Removes "Season 4", "Part 2", "4th Season" from names before API lookups |
| `titleVariants` | Generates search variants (original, stripped, split by colon, keyword combos) |
| `fetchJapaneseTitle` | Looks up Japanese name via AniList GraphQL, falls back to Jikan API (700ms delay) |
| `fetchHtmlViaProxy` | Tries multiple proxies in order: CF Worker → backend → codetabs → corsproxy → allorigins |
| `searchRistoAnime` | Searches ristoanime.co for the anime series (3 strategies) |
| `searchRistoApi` | **(fixed)** WP REST API search — now extracts series tag slug from `class_list` |
| `getTagIdBySlug` | **(new)** Looks up numeric tag ID from tag slug |
| `getPostsByTagId` | **(new)** Fetches all posts filtered by tag ID (paginated, up to 5 pages × 100) |
| `getRistoAnimeEpisodes` | **(rewritten)** Uses tag-based filtering for precise results; falls back to keyword search |
| `getRistoAnimeStreamUrls` | Fetches episode page, extracts video server URLs from `data-watch` attributes |
| `findStreamingSource` | Orchestrates the full chain, passes `tagSlug` through |

### `frontend/src/pages/Feeds/AnimeWatch.jsx`
Player component — now passes `anime.tagSlug` to episode fetching.

### `cf-worker/worker.js`
Cloudflare Worker deployed at `anime-proxy.mohamedlimam80000.workers.dev`. Whitelisted domains:
- `ristoanime.co`
- `witanime.one`
- `anime3rb.com`

---

## The Key Fix: WordPress Tags

Every episode post on ristoanime has a `class_list` in the WP REST API response containing tags like:

```
series----tongari-boushi-no-atelier---
original-name-tongari-boushi-no-atelier-
```

**Old code**: Tried to extract slug from post URLs by looking for `/series/` in the path. But ristoanime episode posts use Arabic URL slugs like `/انمي-tongari-boushi-no-atelier-الحلقة-8-مترجمة-اون-لاين/` — no `/series/` path segment. So slug extraction always failed, falling back to slugifying the search term → wrong slug → wrong episodes.

**New code**: Regex extracts `tongari-boushi-no-atelier` from `series----tongari-boushi-no-atelier---` in `class_list`. Then looks up the tag ID and filters posts by that tag. This guarantees only episodes from the correct anime series are returned.

---

## Proxies & Cloudflare

The CF Worker is the primary proxy. It runs on Cloudflare's network, so Cloudflare-to-Cloudflare requests are NOT challenged (only external visitors get the "under attack" page).

**Status**: The CF Worker `/health` endpoint responds `{"ok":true}`. From PowerShell/webfetch tools, workers.dev returns 403 (Cloudflare blocks non-browser traffic to workers.dev). **From a real browser it should work.**

Fallback proxies (less reliable):
- Backend Express server (`/api/scrape/fetch`)
- codetabs.com CORS proxy
- corsproxy.io
- allorigins.win

---

## Arabic Sites Investigated

| Site | Type | Has WP REST API? | Accessible? |
|------|------|-----------------|------------|
| ristoanime.co | WordPress | ✅ `/wp-json/wp/v2/posts` | Via CF Worker (browser) |
| witanime.one | WordPress | ✅ | Via CF Worker |
| anime3rb.com | WordPress | ✅ | Via CF Worker |
| anime4up.com | Custom | ❌ (no public API) | Scraper-only (Python) |

All three WordPress sites have the same tag structure (`series----{slug}---`). The CF Worker already has all three whitelisted.

---

## Known Limitations

1. **No Arabic anime API exists** — every solution involves scraping WordPress sites
2. **Catalog is limited** — if the anime isn't on ristoanime/witanime/anime3rb, we can't provide it
3. **Cloudflare dependency** — proxies break intermittently; CF Worker requires browser context
4. **Name matching is fragile** — season numbers, special characters in names can still fail AniList/Jikan lookups
5. **Episode number parsing** — relies on Arabic "الحلقة" or English "episode" patterns in post titles

---

## Open Source Alternatives Found

None serve Arabic content directly, but could provide English-subbed fallback:

| Project | Language | Source | Notes |
|---------|----------|--------|-------|
| [Kuhi API v2.0](https://github.com/aryaniiil/anime-api) | Python | Miruro | Self-host, English subs |
| [Miruro API Wrapper](https://github.com/n1yshi/Miruro-API) | Node.js | Miruro | Self-host, English subs |
| [RapidAPI Anime Streaming](https://rapidapi.com/adarsh.chouhan11/api/anime-streaming) | Hosted | Gogoanime/HiAnime | Free 300 req/min, English subs |
| [witanime-api](https://github.com/Abderridr/witanime-api) | Python | Witanime | Arabic, but Python (needs separate server) |

---

## Recent Commits

```
f302f18 fix: extract series slug from WP REST API class_list tags
6eb2562 add witanime.co and anime3rb.com to CF Worker whitelist
1c37869 add keyword search strategy, Jikan fallback, multiple proxies
dce8246 strip season suffixes, CF Worker proxy, slug extraction
```
