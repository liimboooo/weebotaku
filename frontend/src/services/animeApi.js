const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const EP_PAGE_SIZE = 50;

export async function getEpisodes(animeName, tagSlug, sourceName, sourceBase, anilistId) {
  if (sourceName === "reanime") {
    try {
      const res = await fetch(`${API_BASE}/stream/reanime/episodes/${tagSlug}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch { return []; }
  }
  return [];
}

export async function getStreamUrls(episodeUrl, sourceName, anilistId, fallbackId, slug) {
  if (sourceName === "reanime") {
    try {
      const params = new URLSearchParams({ episodeNum: episodeUrl });
      if (anilistId) params.set("anilistId", anilistId);
      if (fallbackId) params.set("fallbackId", fallbackId);
      if (slug) params.set("slug", slug);
      const res = await fetch(`${API_BASE}/stream/reanime/stream?${params.toString()}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch { return []; }
  }
  return [];
}

export async function getEpisodePage(animeName, tagSlug, sourceName, sourceBase, anilistId, page = 0) {
  if (sourceName !== "reanime") return { episodes: [], total: 0 };
  const all = await getEpisodes(animeName, tagSlug, sourceName, sourceBase, anilistId);
  const start = page * EP_PAGE_SIZE;
  return {
    episodes: all.slice(start, start + EP_PAGE_SIZE),
    total: all.length,
    hasMore: start + EP_PAGE_SIZE < all.length,
  };
}

export async function getDirectStream(anilistId, episodeNum) {
  try {
    const res = await fetch(`${API_BASE}/stream/auto/${anilistId}/${episodeNum}?cat=sub`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    const d = json.data;
    return {
      provider: d.provider || 'miruro',
      stream: d.stream || null,
      subtitles: (d.subtitles || []).map(s => ({ url: s.url, label: s.label || s.language || '' })),
      intro: d.intro || null,
      outro: d.outro || null,
    };
  } catch { return null; }
}

export async function getMiruroEpisodes(anilistId) {
  try {
    const res = await fetch(`${API_BASE}/stream/episodes/${anilistId}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return json.data;
  } catch { return null; }
}

export async function getMiruroStream(anilistId, episodeNum, category = 'sub') {
  try {
    const res = await fetch(`${API_BASE}/stream/auto/${anilistId}/${episodeNum}?cat=${category}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return json.data;
  } catch { return null; }
}

export async function findStreamingSource(animeName, anilistId) {
  try {
    const params = new URLSearchParams({ q: animeName });
    if (anilistId) params.set("anilistId", anilistId);
    const res = await fetch(`${API_BASE}/stream/reanime/search?${params.toString()}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data || json.data.length === 0) return null;
    const best = json.data[0];
    return {
      source: best.source,
      sourceBase: best.sourceBase,
      slug: best.slug,
      id: best.slug,
      title: best.title,
      tagSlug: best.slug,
      anilistId: best.anilistId || anilistId,
    };
  } catch { return null; }
}
