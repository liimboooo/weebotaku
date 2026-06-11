const WAIFU_BASE = process.env.REACT_APP_WAIFU_API_URL || "https://api.waifu.pics/sfw";
const API_BASE = process.env.REACT_APP_API_URL;

const FALLBACK_QUOTES = [
  { quote: "Hard work is worthless for those that don't believe in themselves.", character: "Naruto Uzumaki", anime: "Naruto" },
  { quote: "Whatever you lose, you'll find it again. But what you throw away you'll never get back.", character: "Kawaki", anime: "Boruto" },
  { quote: "The world isn't perfect. But we can make it better.", character: "Tanjiro Kamado", anime: "Demon Slayer" },
  { quote: "If you don't take risks, you can't create a future.", character: "Monkey D. Luffy", anime: "One Piece" },
  { quote: "The difference between the novice and the master is that the master has failed more times than the novice has tried.", character: "Koro-sensei", anime: "Assassination Classroom" },
  { quote: "A person grows up when they're able to overcome hardships.", character: "Satoru Gojo", anime: "Jujutsu Kaisen" },
];

let fallbackIndex = 0;

export async function fetchRandomQuote() {
  const url = `${API_BASE}/scrape/animechan-proxy?path=${encodeURIComponent('/random')}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        const data = typeof json.data === "string" ? JSON.parse(json.data) : json.data;
        if (data?.quote && data?.character) return data;
      }
    }
  } catch {}
  const quote = FALLBACK_QUOTES[fallbackIndex % FALLBACK_QUOTES.length];
  fallbackIndex++;
  return quote;
}

export async function fetchWaifuImage(category = "waifu") {
  const res = await fetch(`${WAIFU_BASE}/${category}`);
  if (!res.ok) throw new Error(`Waifu error: ${res.status}`);
  return res.json();
}
