const https = require('https');

module.exports = (req, res) => {
  const urlParts = req.url.split('?');
  const pathname = urlParts[0].replace(/^\/api\//, '');
  const params = new URLSearchParams(urlParts[1] || '');
  params.delete('...catchAll');
  params.delete('catchAll');
  const qs = params.toString();
  const path = `/api/${pathname}${qs ? '?' + qs : ''}`;

  const opts = {
    hostname: 'backend-delta-eight-70.vercel.app',
    port: 443,
    path: path,
    method: req.method,
    headers: {},
  };

  for (const h of ['authorization', 'content-type', 'user-agent']) {
    if (req.headers[h]) opts.headers[h] = req.headers[h];
  }

  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  let bodySent = false;

  return new Promise((resolve) => {
    const pref = https.request(opts, (pres) => {
      const chunks = [];
      pres.on('data', c => chunks.push(c));
      pres.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        res.setHeader('Clear-Site-Data', '"cookies"');
        res.setHeader('Set-Cookie', '__vercel_live_token=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax');
        res.status(pres.statusCode).send(body);
        resolve();
      });
    });
    pref.on('error', () => {
      res.status(502).json({ success: false, message: 'Backend unreachable' });
      resolve();
    });

    if (!hasBody) {
      pref.end();
      return;
    }

    if (req.body != null) {
      const s = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      pref.setHeader('Content-Length', Buffer.byteLength(s));
      pref.write(s);
      pref.end();
      return;
    }

    let raw = '';
    const onData = c => { raw += c; };
    const onEnd = () => {
      req.removeListener('data', onData);
      if (raw) {
        pref.setHeader('Content-Length', Buffer.byteLength(raw));
        pref.write(raw);
      }
      pref.end();
    };
    req.on('data', onData);
    req.on('end', onEnd);
  });
};
