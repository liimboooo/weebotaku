export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/health") {
      return json({ ok: true }, 200);
    }

    if (!targetUrl) {
      return json({ success: false, error: "Missing ?url= param" }, 400);
    }

    const allowed = ["anime3rb.com", "witanime.you", "witanime.one", "anineko.to", "ristoanime.co"];
    let hostname;
    try { hostname = new URL(targetUrl).hostname; } catch { return json({ success: false, error: "Invalid URL" }, 400); }
    if (!allowed.some(d => hostname === d || hostname.endsWith("." + d))) {
      return json({ success: false, error: "Domain not allowed" }, 403);
    }

    const uas = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    ];
    const ua = uas[Math.floor(Math.random() * uas.length)];

    const fetchOpts = {
      headers: {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://www.google.com/",
        "DNT": "1",
      },
      redirect: "follow",
    };

    let resp;
    for (let attempt = 0; attempt < 2; attempt++) {
      resp = await fetch(targetUrl, fetchOpts);
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text") || contentType.includes("html")) {
        const html = await resp.text();
        if (!html.includes("Just a moment") || (!html.includes("cf_chl") && !html.includes("challenge-platform"))) {
          return json({ success: true, data: html }, 200);
        }
      } else {
        const text = await resp.text();
        return json({ success: true, data: text }, 200);
      }
      fetchOpts.headers["User-Agent"] = uas[Math.floor(Math.random() * uas.length)];
    }

    return json({ success: false, error: "Cloudflare challenge detected" }, 503);
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
