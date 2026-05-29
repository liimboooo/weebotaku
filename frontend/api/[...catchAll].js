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

  // Handle POST/PUT/PATCH body
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS';
  let bodyToSend = null;

  if (hasBody) {
    if (req.body != null) {
      bodyToSend = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    opts.headers['transfer-encoding'] = 'chunked';
  }

  return new Promise((resolve) => {
    const pref = https.request(opts, (pres) => {
      const chunks = [];
      pres.on('data', c => chunks.push(c));
      pres.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        res.status(pres.statusCode).send(body);
        resolve();
      });
    });
    pref.on('error', (err) => {
      res.status(502).json({ success: false, message: 'Backend unreachable' });
      resolve();
    });

    if (bodyToSend) {
      pref.write(bodyToSend);
      pref.end();
    } else if (hasBody) {
      req.pipe(pref);
    } else {
      pref.end();
    }
  });
};
