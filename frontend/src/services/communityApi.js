const QUOTES_BASE = "https://animechan.xyz/api";
const WAIFU_BASE = "https://api.waifu.pics/sfw";
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export async function fetchRandomQuote() {
  const url = `${API_BASE}/scrape/fetch?url=${encodeURIComponent(`${QUOTES_BASE}/random`)}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.success) return JSON.parse(json.data);
    }
  } catch {}
  const res = await fetch(`${QUOTES_BASE}/random`);
  if (!res.ok) throw new Error(`Quote error: ${res.status}`);
  return res.json();
}

export async function fetchWaifuImage(category = "waifu") {
  const res = await fetch(`${WAIFU_BASE}/${category}`);
  if (!res.ok) throw new Error(`Waifu error: ${res.status}`);
  return res.json();
}
