#!/usr/bin/env node
/**
 * Charazay 2.0 — skor bandı harness'i (200 maç). Kırmızı çizgi: canlı maç gerçekçilik
 * revizyonu SONUÇ matematiğini değiştirmemeli — skor bandı (~85-95) korunmalı.
 * generateMatchEvents'i (canlı animasyon olmadan) N kez çağırır, home/away skor dağılımını
 * ve bant dışı (istisna) sayısını basar.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const N = (() => { const a = process.argv.find(x => x.startsWith('--n=')); return a ? parseInt(a.slice(4), 10) : 200; })();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function srv() { return new Promise(r => { const s = http.createServer((q, e) => { try { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/charazay2.0.html'; const f = path.join(ROOT, path.normalize(u).replace(/^(\.\.[/\\])+/, '')); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { e.writeHead(404); e.end(); return; } e.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(f).pipe(e); } catch (x) { e.writeHead(500); e.end(); } }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const sleep = m => new Promise(r => setTimeout(r, m));
const SEED = (() => { const a = process.argv.find(x => x.startsWith('--seed=')); return a ? parseInt(a.slice(7), 10) : 0; })();
const SEED_FN = (seed) => { let a = seed >>> 0; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
(async () => {
  const s = await srv(); const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  if (SEED) await p.addInitScript('(' + SEED_FN.toString() + ')(' + SEED + ');');
  await p.goto(`http://127.0.0.1:${s.address().port}/charazay2.0.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loginPage', { state: 'visible' }); await p.click('#loginPage button.btn-p');
  await p.waitForSelector('#setupPage', { state: 'visible' }); await p.fill('#teamName', 'Band FK'); await p.click('#setupPage button.btn-p');
  await p.waitForSelector('#app', { state: 'visible' }); await p.evaluate(() => { try { closeAppModal(); } catch (e) {} }); await sleep(300);
  const r = await p.evaluate((N) => {
    const fx = (G.season && G.season.fixtures) || [];
    const opps = [];
    fx.forEach(m => { if (m && (m.home === G.team.isim || m.away === G.team.isim)) opps.push({ opp: m.home === G.team.isim ? m.away : m.home, userIsHome: m.home === G.team.isim }); });
    if (!opps.length) opps.push({ opp: 'Rakip', userIsHome: true });
    let hs = [], as = [], exc = 0, minS = 999, maxS = 0;
    for (let i = 0; i < N; i++) {
      const o = opps[i % opps.length];
      let evs;
      try { evs = generateMatchEvents({ isim: o.opp }, { userIsHome: o.userIsHome }); } catch (e) { exc++; continue; }
      const last = evs[evs.length - 1] || {};
      const u = o.userIsHome ? (last.home | 0) : (last.away | 0);
      const v = o.userIsHome ? (last.away | 0) : (last.home | 0);
      hs.push(u); as.push(v);
      [u, v].forEach(x => { if (x < minS) minS = x; if (x > maxS) maxS = x; if (x < 60 || x > 120) exc++; });
    }
    const avg = a => Math.round(10 * a.reduce((x, y) => x + y, 0) / a.length) / 10;
    return { n: hs.length, userAvg: avg(hs), oppAvg: avg(as), min: minS, max: maxS, outOfBand: exc, scores: hs.map((h, i) => h + '-' + as[i]).join(',') };
  }, N);
  await b.close(); s.close();
  const hash = require('crypto').createHash('sha256').update(r.scores).digest('hex').slice(0, 16);
  console.log('\n==== SKOR BANDI (' + r.n + ' maç, seed=' + SEED + ') ====');
  console.log('kullanıcı ort:', r.userAvg, '| rakip ort:', r.oppAvg, '| min:', r.min, '| max:', r.max);
  console.log('bant dışı (skor <60 veya >120):', r.outOfBand);
  console.log('skor dizisi hash:', hash);
  console.log('pageerror:', errs.length);
  if (errs.length) errs.slice(0, 5).forEach(e => console.log('  !', e));
})();
