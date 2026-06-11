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
