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

  return new Promise((resolve) => {
    const pref = https.request(opts, (pres) => {
      let body = '';
      pres.on('data', c => body += c);
      pres.on('end', () => {
        res.status(pres.statusCode).send(body);
        resolve();
      });
    });
    pref.on('error', () => {
      res.status(502).json({ success: false, message: 'Backend unreachable' });
      resolve();
    });
    pref.on('timeout', () => {
      pref.destroy();
      res.status(504).json({ success: false, message: 'Backend timeout' });
      resolve();
    });

    if (req.body != null) {
      const s = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      pref.setHeader('Content-Length', Buffer.byteLength(s));
      pref.write(s);
      pref.end();
      return;
    }

    if (req.headers['content-length'] && req.headers['content-length'] !== '0') {
      let raw = '';
      req.on('data', c => raw += c);
      req.on('end', () => {
        if (raw) {
          pref.setHeader('Content-Length', Buffer.byteLength(raw));
          pref.write(raw);
        }
        pref.end();
      });
      return;
    }

    pref.end();
  });
};
