const fetch = require('node-fetch');

const SEARCH_API = 'https://search.htv.services/search/v1';
const VIDEO_API = 'https://hanime.tv/api/v8/video';

async function searchHentai(title) {
  try {
    const res = await fetch(SEARCH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      },
      body: JSON.stringify({
        search_text: title,
        tags: [],
        brands: [],
        blacklist: [],
        order_by: 'created_at_unix',
        ordering: 'desc',
        page: 0,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || []).map(h => ({
      slug: h.slug,
      name: h.name,
    }));
  } catch {
    return [];
  }
}

async function getVideoInfo(slug) {
  try {
    const res = await fetch(`${VIDEO_API}/${slug}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Referer': 'https://hanime.tv/',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function extractStreamUrl(videoData) {
  try {
    const manifest = videoData.videos_manifest;
    if (!manifest) return null;
    const servers = manifest.servers || [];
    for (const srv of servers) {
      if (srv.url && srv.url.includes('.m3u8')) return srv.url;
    }
    return servers[0]?.url || null;
  } catch {
    return null;
  }
}

exports.hentaiStream = async (animeTitle, episodeNum) => {
  const title = (animeTitle || '').trim();
  if (!title) return null;

  const hits = await searchHentai(title);
  if (!hits.length) return null;

  const slug = hits[0].slug;
  const videoData = await getVideoInfo(slug);
  if (!videoData) return null;

  const episodes = videoData.hentai_video?.episodes || videoData.episodes || [];
  const targetEp = episodes.find(e => e.number === episodeNum || e.episode_number === episodeNum);
  if (targetEp) {
    const streamUrl = targetEp.url || targetEp.stream_url || null;
    if (streamUrl) {
      return {
        provider: 'hentai:hanime',
        stream: { url: streamUrl, quality: 'auto' },
        subtitles: [],
        intro: null,
        outro: null,
      };
    }
  }

  const streamUrl = extractStreamUrl(videoData);
  if (streamUrl) {
    return {
      provider: 'hentai:hanime',
      stream: { url: streamUrl, quality: 'auto' },
      subtitles: [],
      intro: null,
      outro: null,
    };
  }

  return null;
};
