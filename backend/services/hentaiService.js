const fetch = require('node-fetch');

const SEARCH_API = 'https://search.htv-services.com/';
const VIDEO_API = 'https://hanime.tv/api/v8/video';

async function searchHentai(title) {
  try {
    const res = await fetch(SEARCH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0',
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
    const hits = typeof data.hits === 'string' ? JSON.parse(data.hits) : (data.hits || []);
    return hits.map(h => ({
      slug: h.slug,
      name: h.name,
    }));
  } catch {
    return [];
  }
}

async function getVideoInfo(slug) {
  try {
    const res = await fetch(`${VIDEO_API}?id=${slug}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0',
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
      const streams = srv.streams || [];
      const hls = streams.find(s => s.url && (s.url.includes('.m3u8') || s.kind === 'hls'));
      if (hls) return hls.url;
    }
    for (const srv of servers) {
      if (srv.streams?.[0]?.url) return srv.streams[0].url;
    }
    return null;
  } catch {
    return null;
  }
}

function findEpisodeSlug(videoData, episodeNum) {
  const videos = videoData.hentai_franchise_hentai_videos || [];
  if (videos.length === 0) return null;
  if (episodeNum < 1 || episodeNum > videos.length) return null;
  return videos[episodeNum - 1].slug;
}

exports.hentaiStream = async (animeTitle, episodeNum) => {
  const title = (animeTitle || '').trim();
  const epNum = parseInt(episodeNum, 10) || 1;
  if (!title) return null;

  const hits = await searchHentai(title);
  if (!hits.length) return null;

  let targetSlug = null;

  const exactSlug = hits.find(h => {
    const parts = h.slug.split('-');
    const last = parseInt(parts[parts.length - 1], 10);
    return !isNaN(last) && last === epNum;
  });
  if (exactSlug) {
    targetSlug = exactSlug.slug;
  } else {
    const firstInfo = await getVideoInfo(hits[0].slug);
    if (firstInfo) {
      targetSlug = findEpisodeSlug(firstInfo, epNum);
    }
    if (!targetSlug) targetSlug = hits[0].slug;
  }

  const videoData = await getVideoInfo(targetSlug);
  if (!videoData) return null;

  const streamUrl = extractStreamUrl(videoData);
  if (!streamUrl) return null;

  return {
    provider: 'hentai:hanime',
    stream: { url: streamUrl, quality: 'auto' },
    subtitles: [],
    intro: null,
    outro: null,
  };
};
