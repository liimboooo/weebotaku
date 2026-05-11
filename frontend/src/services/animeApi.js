const BASE = "https://anipub.xyz";

export async function searchAnime(query) {
  const res = await fetch(`${BASE}/api/search/${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`AniPub search error: ${res.status}`);
  return res.json();
}

export async function getAnimeInfo(id) {
  const res = await fetch(`${BASE}/api/info/${id}`);
  if (!res.ok) throw new Error(`AniPub info error: ${res.status}`);
  const data = await res.json();
  if (data.ImagePath && !data.ImagePath.startsWith("https://")) {
    data.ImagePath = `${BASE}/${data.ImagePath}`;
  }
  if (data.Cover && !data.Cover.startsWith("https://")) {
    data.Cover = `${BASE}/${data.Cover}`;
  }
  return data;
}

export async function getAnimeEpisodes(id) {
  const res = await fetch(`${BASE}/v1/api/details/${id}`);
  if (!res.ok) throw new Error(`AniPub episodes error: ${res.status}`);
  const data = await res.json();
  const local = data.local;
  const episodes = [];
  if (local.link) {
    episodes.push({ episode: 1, url: local.link.replace("src=", "") });
  }
  if (local.ep) {
    local.ep.forEach((e, i) => {
      episodes.push({ episode: i + 2, url: e.link.replace("src=", "") });
    });
  }
  return episodes;
}
