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

    const allowed = ["anime3rb.com", "witanime.you", "witanime.one"];
    let hostname;
    try { hostname = new URL(targetUrl).hostname; } catch { return json({ success: false, error: "Invalid URL" }, 400); }
    if (!allowed.some(d => hostname === d || hostname.endsWith("." + d))) {
      return json({ success: false, error: "Domain not allowed" }, 403);
    }

    try {
      const resp = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
        },
        redirect: "follow",
      });

      const html = await resp.text();
      if (html.includes("Just a moment") && html.includes("cf_chl")) {
        return json({ success: false, error: "Cloudflare challenge detected" }, 503);
      }

      return json({ success: true, data: html }, 200);
    } catch (e) {
      return json({ success: false, error: e.message }, 502);
    }
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
