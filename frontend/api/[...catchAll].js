const https = require('https');

const PROXY_TIMEOUT = 25000;

function getBody(req) {
  return new Promise((resolve) => {
    if (req.body !== undefined && req.body !== null) {
      const b = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      return resolve(b);
    }
    if (req.readableEnded || req._readableState?.ended) {
      return resolve('');
    }
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => resolve(raw));
  });
}

module.exports = async (req, res) => {
  const urlParts = req.url.split('?');
  const pathname = urlParts[0].replace(/^\/api\//, '');
  const rawQuery = urlParts[1] || '';
  const params = new URLSearchParams(rawQuery);
  params.delete('...catchAll');
  params.delete('catchAll');
  const cleanQuery = params.toString();
  const queryString = cleanQuery ? `?${cleanQuery}` : '';

  const options = {
    hostname: 'backend-delta-eight-70.vercel.app',
    port: 443,
    path: `/api/${path}${queryString}`,
    method: req.method,
    timeout: PROXY_TIMEOUT,
    headers: {},
    rejectUnauthorized: true,
  };

  const forwardHeaders = [
    'accept', 'accept-encoding', 'accept-language',
    'authorization', 'content-type',
    'origin', 'referer', 'user-agent',
  ];
  for (const h of forwardHeaders) {
    if (req.headers[h]) {
      options.headers[h] = req.headers[h];
    }
  }

  const body = await getBody(req);

  const needBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);

  return new Promise((resolve) => {
    const proxyReq = https.request(options, (proxyRes) => {
      let resBody = '';
      proxyRes.on('data', chunk => { resBody += chunk; });
      proxyRes.on('end', () => {
        res.status(proxyRes.statusCode);
        const forwardResHeaders = [
          'content-type', 'content-length',
          'access-control-allow-origin', 'access-control-allow-credentials',
          'access-control-allow-methods', 'access-control-allow-headers',
          'cache-control', 'etag', 'vary',
        ];
        for (const h of forwardResHeaders) {
          if (proxyRes.headers[h]) {
            res.setHeader(h, proxyRes.headers[h]);
          }
        }
        res.send(resBody);
        resolve();
      });
    });

    proxyReq.on('error', err => {
      console.error('Proxy error:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ success: false, message: 'Backend unreachable' });
      }
      resolve();
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ success: false, message: 'Backend timeout' });
      }
      resolve();
    });

    if (needBody && body) {
      proxyReq.setHeader('Content-Length', Buffer.byteLength(body));
      proxyReq.write(body);
    }

    proxyReq.end();
  });
};
