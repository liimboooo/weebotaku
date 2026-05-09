const QUOTES_BASE = "https://animechan.xyz/api";
const WAIFU_BASE = "https://api.waifu.pics/sfw";

export async function fetchRandomQuote() {
  const res = await fetch(`${QUOTES_BASE}/random`);
  if (!res.ok) throw new Error(`Quote error: ${res.status}`);
  return res.json();
}

export async function fetchWaifuImage(category = "waifu") {
  const res = await fetch(`${WAIFU_BASE}/${category}`);
  if (!res.ok) throw new Error(`Waifu error: ${res.status}`);
  return res.json();
}
