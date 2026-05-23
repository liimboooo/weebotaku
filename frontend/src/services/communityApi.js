const WAIFU_BASE = process.env.REACT_APP_WAIFU_API_URL || "https://api.waifu.pics/sfw";
const API_BASE = process.env.REACT_APP_API_URL;

export async function fetchRandomQuote() {
  const url = `${API_BASE}/scrape/animechan-proxy?path=${encodeURIComponent('/random')}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.success) return JSON.parse(json.data);
    }
  } catch {}
  throw new Error("Quote unavailable");
}

export async function fetchWaifuImage(category = "waifu") {
  const res = await fetch(`${WAIFU_BASE}/${category}`);
  if (!res.ok) throw new Error(`Waifu error: ${res.status}`);
  return res.json();
}
