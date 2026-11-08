// Servidor multiplayer do KAOT: entrega o jogo e repassa a "presença" de cada jogador para os outros da mesma sala.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_PER_ROOM = 8;
const MAX_MSG = 16 * 1024;      // bytes por mensagem
const MAX_PRES = 8 * 1024;      // tamanho máximo da presença de um jogador
const MAX_RATE = 60;            // mensagens por segundo por jogador

const page = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(page);
  }
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('não encontrado');
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MSG });
const rooms = new Map(); // nome -> Set de clientes

const send = (ws, obj) => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); };
const others = (c, obj) => { const r = rooms.get(c.room); if (!r) return; const s = JSON.stringify(obj); for (const o of r) if (o !== c && o.readyState === 1) o.send(s); };

function leave(c) {
  const r = rooms.get(c.room); if (!r) return;
  r.delete(c); others(c, { t: 'left', id: c.id });
  if (!r.size) rooms.delete(c.room);
  c.room = null;
}

wss.on('connection', (ws) => {
  ws.id = crypto.randomBytes(5).toString('hex');
  ws.room = null; ws.pres = {}; ws.alive = true; ws.count = 0; ws.win = Date.now();
  ws.on('pong', () => { ws.alive = true; });

  ws.on('message', (buf) => {
    const now = Date.now();
    if (now - ws.win > 1000) { ws.win = now; ws.count = 0; }
    if (++ws.count > MAX_RATE) return;
    let m; try { m = JSON.parse(buf); } catch { return; }
    if (!m || typeof m !== 'object') return;

    if (m.t === 'join' && typeof m.room === 'string' && /^[a-z0-9][a-z0-9_.-]{0,47}$/.test(m.room)) {
      if (ws.room) leave(ws);
      let r = rooms.get(m.room);
      if (!r) { r = new Set(); rooms.set(m.room, r); }
      if (r.size >= MAX_PER_ROOM) return send(ws, { t: 'full' });
      ws.room = m.room; ws.pres = {};
      send(ws, { t: 'welcome', id: ws.id, peers: [...r].map(o => ({ id: o.id, p: o.pres })) });
      r.add(ws);
      others(ws, { t: 'patch', id: ws.id, patch: {} });
      return;
    }

    if (m.t === 'pres' && ws.room && m.patch && typeof m.patch === 'object' && !Array.isArray(m.patch)) {
      const next = { ...ws.pres };
      for (const k of Object.keys(m.patch)) { if (m.patch[k] === null) delete next[k]; else next[k] = m.patch[k]; }
      if (JSON.stringify(next).length > MAX_PRES) return;
      ws.pres = next;
      others(ws, { t: 'patch', id: ws.id, patch: m.patch });
      return;
    }

    if (m.t === 'leave') leave(ws);
  });

  ws.on('close', () => leave(ws));
  ws.on('error', () => {});
});

// derruba conexões mortas
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false; ws.ping();
  }
}, 30000);

server.listen(PORT, () => console.log('KAOT rodando na porta ' + PORT));
