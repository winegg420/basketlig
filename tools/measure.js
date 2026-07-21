#!/usr/bin/env node
/**
 * Charazay 2.0 — CANLI MAÇ GERÇEKÇİLİK ölçüm harness'i (Playwright + sistem Chrome).
 *
 * Görevi: prompt'taki DINAMIK + STATİK ölçüm scriptlerini gerçek Chrome'da,
 * tohumlanmış (deterministik) bir maç üzerinde çalıştırıp konsola metrik basar
 * ve DEĞİŞMEZLİK testi için sonuç imzası (skor/kazanan/kutu skor hash) üretir.
 *
 * Kullanım:
 *   node tools/measure.js            → dinamik + statik + değişmezlik ölçer, baz ile karşılaştırır
 *   node tools/measure.js --save     → sonuç imzasını baz olarak kaydeder (FAZ 0)
 *   node tools/measure.js --secs=30  → dinamik örnekleme süresi
 *
 * Çıkış kodu: 0 = ölçüm tamam. Değişmezlik bozulduysa uyarı basar (kod 3).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(__dirname, '.measure-baseline.json');
const args = process.argv.slice(2);
const SEED = (() => { const a = args.find(x => x.startsWith('--seed=')); return a ? parseInt(a.slice(7), 10) : 987654321; })();
const SAVE = args.includes('--save');
const SECS = (() => { const a = args.find(x => x.startsWith('--secs=')); return a ? parseInt(a.slice(7), 10) : 30; })();

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent(req.url.split('?')[0]);
        if (urlPath === '/') urlPath = '/charazay2.0.html';
        const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
        if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404); res.end('404'); return;
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } catch (e) { res.writeHead(500); res.end('500'); }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* Sayfaya enjekte edilen deterministik PRNG kurucu (mulberry32). Math.random'ı
   sabitler → aynı tohumda maç sonucu ve sunum birebir tekrarlanır. */
const SEED_FN = (seed) => {
  let a = seed >>> 0;
  Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

async function main() {
  const server = await startServer();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  // Tohumu SAYFA YÜKLENMEDEN ÖNCE kur → kariyer kurulumu (kadro/fikstür/rakip) da
  // deterministik olur; aynı tohumda maç sonucu birebir tekrarlanır.
  await page.addInitScript('(' + SEED_FN.toString() + ')(' + SEED + ');');

  await page.goto(base + '/charazay2.0.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Olcum FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await sleep(400);

  // ── Maçı başlat (tek üretim); sonucu mState.events'ten oku (DEĞİŞMEZLİK imzası) ──
  const result = await page.evaluate(() => {
    try {
      startMatch();
      const evs = mState.events || [];
      const last = evs[evs.length - 1] || {};
      const K = ['twoMade', 'twoAtt', 'thrMade', 'thrAtt', 'ftMade', 'ftAtt', 'reb', 'ast', 'to', 'stl', 'blk', 'foul'];
      const norm = (b) => K.map(k => (b && b[k]) | 0);
      return {
        ok: true, score: [last.home | 0, last.away | 0], winner: last.winner || '',
        nEvents: evs.length,
        box: { h: norm(last.box && last.box.h), a: norm(last.box && last.box.a) }
      };
    } catch (e) { return { ok: false, err: String(e && e.stack || e) }; }
  });

  if (!result.ok) { console.error('Maç başlatma başarısız:', result.err); await browser.close(); server.close(); process.exit(2); }
  const sig = JSON.stringify({ score: result.score, winner: result.winner, box: result.box });
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(sig).digest('hex').slice(0, 16);

  // ── DİNAMİK + STATİK: örnekleyiciyi kur (maç zaten akıyor) ──
  await page.evaluate(() => {
    try {
      window.__q = [];
      window.__qt = setInterval(function () {
        try {
          var S = mState._sim; if (!S || !mState.running) return;
          var P = S.players, b = S.ball;
          var xs = P.map(function (p) { return p.x; });
          var nn = P.map(function (p) { var m = 1e9; P.forEach(function (q) { if (q !== p) { var d = Math.hypot(p.x - q.x, p.y - q.y); if (d < m) m = d; } }); return m; });
          // hücum yarı sahasındaki 5 oyuncunun spread'i (savunma karışmadan) + tüm saha
          window.__q.push({
            m: b.mode,
            moving: P.filter(function (p) { return Math.hypot(p.vx, p.vy) > 15; }).length,
            mid: P.filter(function (p) { return p.x > 380 && p.x < 560; }).length,
            xSpread: Math.max.apply(0, xs) - Math.min.apply(0, xs),
            avgNN: nn.reduce(function (a, b) { return a + b; }, 0) / nn.length,
            overlap: nn.filter(function (d) { return d < 26; }).length
          });
        } catch (e) {}
      }, 200);
    } catch (e) {}
  });

  await sleep(SECS * 1000);

  const dyn = await page.evaluate(() => {
    clearInterval(window.__qt);
    var q = window.__q || [], n = q.length || 1, md = {};
    q.forEach(function (x) { md[x.m] = (md[x.m] || 0) + 1; });
    var avg = function (f) { return Math.round(10 * q.reduce(function (a, c) { return a + f(c); }, 0) / n) / 10; };
    return {
      n: q.length,
      pass: Math.round(100 * (md.pass || 0) / n),
      held: Math.round(100 * (md.held || 0) / n),
      shot: Math.round(100 * (md.shot || 0) / n),
      loose: Math.round(100 * (md.loose || 0) / n),
      rim: Math.round(100 * (md.rim || 0) / n),
      idle: Math.round(100 * (md.idle || 0) / n),
      avgMoving: avg(function (c) { return c.moving; }),
      avgMid: avg(function (c) { return c.mid; }),
      // konumsal metrikler zaman-ortalamalı (tek-kare gürültüsünden bağımsız)
      xSpread: Math.round(q.reduce(function (a, c) { return a + c.xSpread; }, 0) / n),
      avgNN: Math.round(q.reduce(function (a, c) { return a + c.avgNN; }, 0) / n),
      overlap: avg(function (c) { return c.overlap; })
    };
  });

  const stat = await page.evaluate(() => {
    try {
      var ev = mState.events, sh = ev.filter(e => ['score2', 'score3', 'miss2', 'miss3'].includes(e.type)), sc = {};
      sh.forEach(e => { var s = e.shot && e.shot.scheme; if (s) sc[s] = (sc[s] || 0) + 1; });
      var mv = sh.filter(e => e.shot && e.shot.move).length;
      var norm = t => String(t || '').replace(/<[^>]+>/g, '').replace(/\([^)]*\)/g, '').replace(/[A-ZÇĞİÖŞÜ][a-zçğıöşü]+/g, 'X');
      var c = {}; ev.forEach(e => { var k = norm(e.text); c[k] = (c[k] || 0) + 1; });
      return {
        schemes: sc, moveFilled: mv + '/' + sh.length,
        iso: sc.iso || 0, spotup: sc.spotup || 0, nShots: sh.length,
        reuse: +(1 - Object.keys(c).length / ev.length).toFixed(2)
      };
    } catch (e) { return { err: String(e) }; }
  });

  await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
  await browser.close();
  server.close();

  // ── Rapor ──
  console.log('\n==== ÖLÇÜM (seed=' + SEED + ', ' + SECS + 'sn) ====');
  console.log('DİNAMİK:', JSON.stringify(dyn));
  console.log('STATİK :', JSON.stringify(stat));
  console.log('SONUÇ  : skor', result.score.join('-'), '| kazanan', result.winner, '| olay', result.nEvents, '| hash', hash);
  console.log('KONSOL HATASI:', errors.length);
  if (errors.length) errors.slice(0, 8).forEach(e => console.log('  !', e));

  if (SAVE) {
    fs.writeFileSync(BASELINE, JSON.stringify({ hash, score: result.score, winner: result.winner, nEvents: result.nEvents }, null, 2));
    console.log('\n>>> BAZ KAYDEDİLDİ:', hash);
  } else if (SEED !== 987654321) {
    console.log('\n(seed kanonik değil — değişmezlik kontrolü atlandı)');
  } else if (fs.existsSync(BASELINE)) {
    const b = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    if (b.hash === hash) {
      console.log('\n>>> DEĞİŞMEZLİK: ✅ GEÇTİ (hash eşleşti:', hash + ')');
    } else {
      console.log('\n>>> DEĞİŞMEZLİK: ❌ BOZULDU! baz=' + b.hash + ' şimdi=' + hash);
      console.log('    baz skor', b.score.join('-'), '→ şimdi', result.score.join('-'));
      process.exitCode = 3;
    }
  } else {
    console.log('\n(baz yok — --save ile kaydet)');
  }
}
main().catch(e => { console.error(e); process.exit(1); });
