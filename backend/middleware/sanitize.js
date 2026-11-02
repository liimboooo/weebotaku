const xss = require('xss');

const xssOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

function clean(val) {
  if (typeof val === 'string') return xss(val, xssOptions);
  if (Array.isArray(val)) return val.map(clean);
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = clean(v);
    }
    return out;
  }
  return val;
}

module.exports = function sanitize(req, res, next) {
  // Stream proxy / embed resolution pass URLs through query params; xss() mangles
  // them (breaks new URL() and upstream fetch). Skip those routes.
  const p = req.path || '';
  if (p.startsWith('/stream/proxy') || p.startsWith('/stream/resolve-embed')) {
    return next();
  }
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  next();
};
