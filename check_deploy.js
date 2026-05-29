const https = require('https');
const u = new URL('https://frontend-beryl-theta-14.vercel.app/static/js/main.436fa0f9.js');
const req = https.request(u, { method: 'GET', timeout: 30000 }, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const patterns = [
      /REACT_APP_API_URL\s*[=:]\s*['"]([^'"]+)['"]/,
      /API_BASE_URL\s*[=:]\s*['"]([^'"]+)['"]/,
      /backend-delta-eight[^'"]*/,
      /vercel\.app\/api/,
    ];
    for (const p of patterns) {
      const m = body.match(p);
      console.log(p.source, ':', m ? m[0] : 'not found');
    }
    console.log('JS bundle size:', body.length);
    
    // Also look for the raw API URL string
    const urls = body.match(/https?:\\\/\\\/[^'"\s]+vercel\.app[^'"\s]*/g);
    if (urls) {
      console.log('\nAll Vercel URLs found:');
      urls.forEach(u => console.log(' ', u));
    }
  });
});
req.on('error', e => console.log('Error:', e.message));
req.end();
