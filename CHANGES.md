# Changes

## 1. Fully removed Reanime
- `animeApi.js:findStreamingSource` — returns `null` always, no Reanime search
- `Browse.jsx:openWatch` — redirects to AnimeDetail page instead of showing "Not Available"
- Eliminated wrong hentai match ("Imaizumi" → "Gals Can't Be Kind") since Reanime search is gone

## 2. Fixed 12-episode placeholder overwrite
- Removed stale-closure 4-second timeout (`AnimeDetail.jsx`) that always overwrote correct episode count with 12 placeholders
- The main loading block already has its own 25-second timeout and 12-ep fallback

## 3. Fixed sidebar episode titles
- Removed redundant `episodeTitles` effect that populated generic "Episode N" names that overrode descriptive titles from Miruro
- Swapped priority: `ep?.title` preferred over `episodeTitles` fallback

## 4. Fixed sidebar episode thumbnails
- Added `thumbnail` field to Miruro episode mapping (`ep.image || ep.thumbnail || anime?.img || ''`)
- Added `anime?.img` fallback for non-Miruro episodes (from `anime.episodes` count and 12-mock fallback)

## 5. Performance fix for long-running anime (e.g. One Piece)
- Miruro returns all episodes at once; initial React state now capped at 60
- Full list stored in a ref; "Load More" pulls next 50 from the ref on demand
- Drastically reduces initial render cost for 1000+ episode anime

## 6. Fixed home page crash — missing `genres` field
- **Root cause**: backend genre-fetching IIFE inside `Promise.all` could silently fail, making `bundle.genres` `undefined`
- **Backend fix**: moved genre fetch outside `Promise.all` with its own try/catch; defaults to `[]`
- **Frontend fix**: `setCategories(bundle.genres || [])` defensive fallback so `categories.length` never throws

## 7. Fixed blank player when clicking high episode numbers + timeout improvements
- **Root cause**: `epIndex` (e.g. 999) was beyond 60-item visible `episodes` array → `episodes[epIndex]` = `undefined` → stream never loaded
- **Fix**: slice size now expands to `Math.max(60, idx + 1)` so the selected episode is always included
- **Removed 5-second Miruro timeout**: was unnecessarily rejecting late Miruro responses
- **Reduced overall timeout** 25s → 12s for faster failure detection
- **Adaptive error message**: "Stream not available" if episodes loaded, "Request timed out" if nothing loaded
- **Miruro can rescue after timeout**: if 12s fires but Miruro arrives later, it clears the error and updates episodes

## 8. Added sidebar auto-scroll to selected episode
- When clicking an episode, the sidebar now auto-scrolls to bring it into view
- Uses `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` — scrolls only as much as needed
- Also re-scrolls when sort order changes (selected episode may move out of view)
- Default sort order changed to **descending** (latest episode first) for a more natural watch-page experience

## 9. Fixed false "Stream not available" error during playback
- **Root cause**: 12s timer in episode-loading effect was never cleared when stream loaded from non-Miruro sources
- **Fix**: added `epTimerRef` shared ref; new `useEffect` watches `streamUrl` and clears the timer (and error) when a stream is found

## 10. Reduced player top margin
- Changed `mt-3 sm:mt-8` → `mt-2 sm:mt-5` to move player up slightly without overlapping content below
