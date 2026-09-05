// SamiFX server — pure Node.js (no npm install required)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function safeUser(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function userFile(user) {
  return path.join(DATA_DIR, `${user}.json`);
}

function readTrades(user) {
  const file = userFile(user);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeTrades(user, trades) {
  fs.writeFileSync(userFile(user), JSON.stringify(trades, null, 2));
}

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function collectBody(req, callback) {
  const chunks = [];
  let size = 0;
  const MAX = 15 * 1024 * 1024; // 15MB cap (screenshots as base64)
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => {
    if (chunks.length === 0) return callback(null, {});
    try {
      const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      callback(null, parsed);
    } catch (e) {
      callback(e);
    }
  });
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  // prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // ---- API routes ----
  if (pathname === '/api/trades' && req.method === 'GET') {
    const user = safeUser(url.searchParams.get('user'));
    if (!user) return sendJSON(res, 400, { error: 'Missing user' });
    const trades = readTrades(user).sort((a, b) => new Date(b.date) - new Date(a.date));
    return sendJSON(res, 200, { trades });
  }

  if (pathname === '/api/trades' && req.method === 'POST') {
    return collectBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { error: 'Invalid JSON' });
      const user = safeUser(body.user);
      if (!user) return sendJSON(res, 400, { error: 'Missing user' });
      const trades = readTrades(user);
      const trade = body.trade || {};
      trade.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      trades.push(trade);
      writeTrades(user, trades);
      return sendJSON(res, 200, { ok: true, trade });
    });
  }

  if (pathname === '/api/trades' && req.method === 'DELETE') {
    const user = safeUser(url.searchParams.get('user'));
    const id = url.searchParams.get('id');
    if (!user || !id) return sendJSON(res, 400, { error: 'Missing user or id' });
    const trades = readTrades(user).filter((t) => t.id !== id);
    writeTrades(user, trades);
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === '/api/trades' && req.method === 'PUT') {
    return collectBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { error: 'Invalid JSON' });
      const user = safeUser(body.user);
      const id = body.id;
      if (!user || !id) return sendJSON(res, 400, { error: 'Missing user or id' });
      const trades = readTrades(user);
      const idx = trades.findIndex((t) => t.id === id);
      if (idx === -1) return sendJSON(res, 404, { error: 'Trade not found' });
      trades[idx] = { ...trades[idx], ...body.trade, id };
      writeTrades(user, trades);
      return sendJSON(res, 200, { ok: true, trade: trades[idx] });
    });
  }

  // ---- static files ----
  if (req.method === 'GET') {
    return serveStatic(req, res, pathname);
  }

  sendJSON(res, 405, { error: 'Method not allowed' });
});

server.listen(PORT, () => {
  console.log(`SamiFX running at http://localhost:${PORT}`);
});
