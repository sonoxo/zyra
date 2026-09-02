const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const UPSTREAM = new URL(process.env.XRATLAS_TARGET_URL || 'https://nukesimulation.com');

if (UPSTREAM.protocol !== 'https:') {
  throw new Error('xrAtlas localhost proxy currently requires an HTTPS upstream.');
}

const server = http.createServer((req, res) => {
  if (req.url === '/__health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, app: 'xrAtlas', upstream: UPSTREAM.origin, mode: 'localhost-proxy' }));
    return;
  }

  const headers = { ...req.headers };
  headers.host = UPSTREAM.host;
  headers.origin = UPSTREAM.origin;
  headers.referer = `${UPSTREAM.origin}/`;
  delete headers['accept-encoding'];

  const upstreamReq = https.request({
    protocol: 'https:',
    hostname: UPSTREAM.hostname,
    port: UPSTREAM.port || 443,
    method: req.method,
    path: req.url,
    headers
  }, (upstreamRes) => {
    const outHeaders = { ...upstreamRes.headers };

    if (outHeaders.location) {
      try {
        const location = new URL(outHeaders.location, UPSTREAM.origin);
        if (location.hostname === UPSTREAM.hostname) {
          outHeaders.location = `http://${HOST}:${PORT}${location.pathname}${location.search}${location.hash}`;
        }
      } catch (_) {}
    }

    delete outHeaders['content-security-policy'];
    delete outHeaders['content-security-policy-report-only'];
    delete outHeaders['strict-transport-security'];

    res.writeHead(upstreamRes.statusCode || 502, outHeaders);
    upstreamRes.pipe(res);
  });

  upstreamReq.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`xrAtlas upstream connection failed: ${err.message}`);
  });

  req.pipe(upstreamReq);
});

server.listen(PORT, HOST, () => {
  console.log(`xrAtlas localhost proxy: http://${HOST}:${PORT}`);
  console.log(`Health: http://${HOST}:${PORT}/__health`);
});
