#!/usr/bin/env node
/**
 * Charazay 2.0 — CANLI MAÇ GERÇEKÇİLİK DENETİMİ (Playwright + sistem Chrome).
 *
 * measure.js "top modu/hareket/spacing" ölçerken bu script GERÇEK BASKETBOL
 * KURALLARINA aykırı görüntüleri sayar:
 *   • oob      : oyuncu saha çizgilerinin DIŞINDA (topu sokan hariç) kare sayısı
 *   • ballOob  : top çizgi dışında (sokma anı hariç)
 *   • tp       : ışınlanma — bir karede >30px sıçrayan jeton
 *   • orphan   : top 'held' ama taşıyıcıdan >30px uzakta
 *   • lost     : top serbest/boşta ve en yakın oyuncudan >150px (kimse ilgilenmiyor)
 *   • fast     : oyuncu hızı >430px/sn (~13 m/sn — insanüstü)
 *   • overlap  : iki jeton <26px (üst üste binme)
 *   • ghost    : top hiçbir modda değilken (idle) uzun süre ortada durması
 * ANLATIM SENKRONU: addComment çağrıları ile sahadaki olay beat'leri arasındaki gecikme.
 *
 * Kullanım:
 *   node tools/realism-check.js [--secs=40] [--seed=987654321] [--shots] [--video]
 *   --shots  : court ekran görüntülerini tools/realism-shots/ altına kaydeder
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? parseInt(a.split('=')[1], 10) : d; };
const SEED = num('seed', 987654321);
const SECS = num('secs', 40);
const SHOTS = args.includes('--shots');
const FIRE = args.includes('--fire');
const FULL = args.includes('--full');
const INB = args.includes('--inb');
const RATE = (() => { const a = args.find(x => x.startsWith('--rate=')); return a ? parseFloat(a.split('=')[1]) : 0; })();
const SHOTDIR = path.join(__dirname, 'realism-shots');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let u = decodeURIComponent(req.url.split('?')[0]);
        if (u === '/') u = '/charazay2.0.html';
        const fp = path.join(ROOT, path.normalize(u).replace(/^(\.\.[/\\])+/, ''));
        if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('404'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(fp).pipe(res);
      } catch (e) { res.writeHead(500); res.end('500'); }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
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
  await page.addInitScript('(' + SEED_FN.toString() + ')(' + SEED + ');');
  await page.goto(base + '/charazay2.0.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Olcum FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await sleep(300);
  // Maç sayfası görünür olmalı — gizli SVG'de ekran görüntüsü alınamaz.
  await page.evaluate(() => { try { showPage('mac'); } catch (e) {} });
  await sleep(300);

  // ── enstrümantasyon: anlatım + saha beat'leri ──
  await page.evaluate(() => {
    window.__ev = [];
    const t0 = () => performance.now();
    const oc = window.addComment;
    window.addComment = function (txt, ty) { window.__ev.push({ t: t0(), k: 'comment', ty: ty || '', s: String(txt).replace(/<[^>]+>/g, '').slice(0, 90) }); return oc.apply(this, arguments); };
    const os = window.animateShotPossession;
    window.__fire = 0; window.__snap = [];
    /* şut anındaki TAM saha durumu (rol/konum/hedef) — dizilim gerçekten kuruluyor mu? */
    window.__grab = function (tag) {
      try {
        const S = mState._sim; if (!S) return;
        const f = (p) => ({ t: p.team, r: p.role, x: Math.round(p.x), y: Math.round(p.y), tx: Math.round(p.tx), ty: Math.round(p.ty), v: Math.round(Math.hypot(p.vx, p.vy)), o: p._oob ? 1 : 0, rt: p._retTx != null ? 1 : 0 });
        window.__snap.push({
          tag, offLeft: S.offSide, offIsUser: S.offIsUser, setIx: S.setIx, flip: S.flip ? 1 : 0,
          off: (S.offP || []).map(f), def: (S.defP || []).map(f),
          ball: { x: Math.round(S.ball.x), y: Math.round(S.ball.y), m: S.ball.mode }
        });
      } catch (e) {}
    };
    window.animateShotPossession = function (sh, onShoot, onResult) {
      return os.call(this, sh, function () { window.__ev.push({ t: t0(), k: 'release', made: !!sh.made }); window.__fire++; window.__grab('fire'); if (onShoot) onShoot(); },
        function () { window.__ev.push({ t: t0(), k: 'rim', made: !!sh.made }); if (onResult) onResult(); });
    };
    const om = window.movePlayersForEvent;
    window.movePlayersForEvent = function (ev) { window.__ev.push({ t: t0(), k: 'evt', ty: (ev && ev.type) || '' }); return om.apply(this, arguments); };
  });

  await page.evaluate(() => { try { startMatch(); } catch (e) { window.__startErr = String(e); } });

  // ── kare örnekleyici (rAF) ──
  await page.evaluate(() => {
    window.__f = [];
    window.__prev = null;
    window.__stop = false;
    const LX0 = 56.4, LX1 = 883.6, LY0 = 30, LY1 = 470;   // saha çizgileri
    const tick = () => {
      if (window.__stop) return;
      requestAnimationFrame(tick);
      try {
        const S = mState._sim; if (!S || !mState.running) return;
        const P = S.players, b = S.ball;
        const now = performance.now();
        const prev = window.__prev;
        const rate = Math.max(0.5, mState.rate || 1);   /* izleme hızı hariç tutulur */
        let tp = 0, fast = 0;
        if (prev && now - prev.t < 120) {
          for (let i = 0; i < P.length; i++) {
            const d = Math.hypot(P[i].x - prev.p[i][0], P[i].y - prev.p[i][1]);
            if (d > 30 * rate) tp++;
            const v = d / ((now - prev.t) / 1000) / rate;
            if (v > 430) fast++;
          }
        }
        window.__prev = { t: now, p: P.map(p => [p.x, p.y]) };
        // topu sokan oyuncu (out-of-bounds izni olan)
        const inbId = P.findIndex(p => p._oob);
        let oob = 0, maxOut = 0;
        P.forEach((p, i) => {
          if (i === inbId) return;
          const dx = Math.max(LX0 - p.x, p.x - LX1, 0), dy = Math.max(LY0 - p.y, p.y - LY1, 0);
          const o = Math.max(dx, dy);
          if (o > 4) { oob++; if (o > maxOut) maxOut = o; }
        });
        /* Top çizgi dışında olabilir SADECE kenardan sokma anında (elinde tutan oyuncu OOB'de). */
        const bOut = inbId >= 0 ? 0 : Math.max(LX0 - b.x, b.x - LX1, LY0 - b.y, b.y - LY1, 0);
        let nn = 1e9, over = 0;
        for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
          const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
          if (d < nn) nn = d; if (d < 26) over++;
        }
        let near = 1e9; P.forEach(p => { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < near) near = d; });
        const carrierD = (b.mode === 'held' && b.carrier) ? Math.hypot(b.x - b.carrier.x, b.y - b.carrier.y) : 0;
        /* topu sokan oyuncu çizginin NE KADAR dışına çıkıyor? (gerçek kural: tamamen dışarı) */
        let inbOut = 0;
        if (inbId >= 0) {
          const p = P[inbId];
          inbOut = Math.max(LX0 - p.x, p.x - LX1, LY0 - p.y, p.y - LY1, 0);
        }
        window.__f.push({
          m: b.mode, oob, maxOut, bOut, tp, fast, over, inbOut, nn: Math.round(nn), near: Math.round(near),
          cd: Math.round(carrierD), inb: inbId >= 0 ? 1 : 0,
          bx: Math.round(b.x), by: Math.round(b.y), bh: Math.round(b.h)
        });
      } catch (e) {}
    };
    requestAnimationFrame(tick);
  });

  if (SHOTS) { fs.mkdirSync(SHOTDIR, { recursive: true }); }
  if (RATE) await page.evaluate((r) => { try { setMatchRate(r); } catch (e) {} }, RATE);
  const clipBox = async () => page.evaluate(() => { const e = document.getElementById('courtSvg'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  if (FULL) {
    /* TAM MAÇ: maç bitene kadar bekler (uçtan uca akış + ihlal taraması). */
    const t0 = Date.now();
    let done = false;
    while (Date.now() - t0 < 15 * 60 * 1000) {
      const st = await page.evaluate(() => ({ run: !!(mState && mState.running), idx: (mState && mState.idx) | 0, n: (mState && mState.events || []).length }));
      if (!st.run && st.idx >= st.n && st.n > 0) { done = true; break; }
      await sleep(1000);
    }
    console.log('\nTAM MAÇ: ' + (done ? 'bitti' : 'ZAMAN AŞIMI') + ' — süre ' + Math.round((Date.now() - t0) / 1000) + ' sn (hız ' + (RATE || 1.5) + '×)');
  } else if (!SHOTS) {
    await sleep(SECS * 1000);
  } else if (INB) {
    /* KENARDAN SOKMA anını yakala: bir oyuncu çizgi dışına çıktığı kare. */
    const box = await clipBox();
    let taken = 0, wasOut = false;
    const t0 = Date.now();
    while (Date.now() - t0 < SECS * 1000 && taken < 16) {
      const out = await page.evaluate(() => { try { return (mState._sim.players || []).some(p => p._oob); } catch (e) { return false; } });
      if (out && !wasOut) {
        /* çizgi dışına yürüyüp pası atacağı ana kadar bekle */
        await sleep(900);
        try { if (box && box.width > 10) await page.screenshot({ path: path.join(SHOTDIR, 'inb-' + String(taken).padStart(2, '0') + '.png'), clip: box }); } catch (e) {}
        taken++;
      }
      wasOut = out;
      await sleep(120);
    }
  } else if (FIRE) {
    /* ŞUT ANI modu: top şutörün elinden çıktığı kareyi yakalar — "set oyunu" görüntüsünün
       gerçek basketbol gibi durup durmadığını gösteren en kritik kare budur. */
    const box = await clipBox();
    let seen = 0, taken = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < SECS * 1000 && taken < 24) {
      const f = await page.evaluate(() => window.__fire || 0);
      if (f > seen) {
        seen = f;
        try { if (box && box.width > 10) await page.screenshot({ path: path.join(SHOTDIR, 'fire-' + String(taken).padStart(2, '0') + '.png'), clip: box }); } catch (e) {}
        taken++;
      }
      await sleep(90);
    }
    if (Date.now() - t0 < SECS * 1000) await sleep(SECS * 1000 - (Date.now() - t0));
  } else {
    const n = Math.min(24, Math.floor(SECS / 1.4));
    for (let i = 0; i < n; i++) {
      await sleep(1400);
      try {
        const box = await clipBox();
        if (box && box.width > 10) await page.screenshot({ path: path.join(SHOTDIR, 'court-' + String(i).padStart(2, '0') + '.png'), clip: box });
      } catch (e) {}
    }
  }

  const out = await page.evaluate(() => {
    window.__stop = true;
    const f = window.__f || [], n = f.length || 1;
    const sum = (k) => f.reduce((a, c) => a + (c[k] || 0), 0);
    const md = {}; f.forEach(x => { md[x.m] = (md[x.m] || 0) + 1; });
    const looseF = f.filter(x => x.m === 'loose');
    return {
      frames: f.length,
      modes: Object.fromEntries(Object.entries(md).map(([k, v]) => [k, Math.round(100 * v / n)])),
      oobFrames: f.filter(x => x.oob > 0).length,
      oobPct: Math.round(100 * f.filter(x => x.oob > 0).length / n),
      oobMaxPx: Math.round(Math.max(0, ...f.map(x => x.maxOut))),
      ballOobFrames: f.filter(x => x.bOut > 6).length,
      ballOobMaxPx: Math.round(Math.max(0, ...f.map(x => x.bOut))),
      teleports: sum('tp'), superFast: sum('fast'),
      overlapFrames: f.filter(x => x.over > 0).length,
      minNN: Math.min(...f.map(x => x.nn)),
      inbFrames: f.filter(x => x.inb).length,
      inbOutMax: Math.round(Math.max(0, ...f.map(x => x.inbOut || 0))),
      inbOutOkFrames: f.filter(x => (x.inbOut || 0) > 15).length,
      orphanFrames: f.filter(x => x.cd > 30).length,
      lostBallFrames: looseF.filter(x => x.near > 150).length,
      looseFrames: looseF.length,
      snap: (window.__snap || []).slice(0, 6),
      ev: window.__ev || []
    };
  });

  await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
  await browser.close(); server.close();

  // ── anlatım senkronu: yorum ile sahadaki karşılık arasındaki gecikme ──
  const ev = out.ev || [];
  const syncRows = [];
  for (let i = 0; i < ev.length; i++) {
    if (ev[i].k !== 'evt') continue;
    const ty = ev[i].ty;
    // bu olayın yorumu ve sahadaki "gerçekleşme" beat'i
    let cm = null, beat = null;
    for (let j = i + 1; j < ev.length && ev[j].k !== 'evt'; j++) {
      if (!cm && ev[j].k === 'comment') cm = ev[j];
      if (!beat && ev[j].k === 'rim') beat = ev[j];
    }
    if (cm) syncRows.push({ ty, lag: beat ? Math.round(cm.t - beat.t) : null, dly: Math.round(cm.t - ev[i].t), txt: cm.s });
  }
  const byType = {}, byStart = {};
  syncRows.forEach(r => { (byType[r.ty] = byType[r.ty] || []).push(r.lag); (byStart[r.ty] = byStart[r.ty] || []).push(r.dly); });

  console.log('\n==== GERÇEKÇİLİK DENETİMİ (seed=' + SEED + ', ' + SECS + 'sn) ====');
  console.log('kare:', out.frames, '| top modları %:', JSON.stringify(out.modes));
  console.log('İHLALLER:');
  console.log('  oyuncu saha DIŞI     :', out.oobFrames, 'kare (%' + out.oobPct + '), maks', out.oobMaxPx, 'px');
  console.log('  TOP saha DIŞI        :', out.ballOobFrames, 'kare, maks', out.ballOobMaxPx, 'px');
  console.log('  ışınlanma (>30px/kare):', out.teleports);
  console.log('  insanüstü hız (>430)  :', out.superFast);
  console.log('  üst üste binme (<26px):', out.overlapFrames, 'kare | minNN', out.minNN);
  console.log('  top taşıyıcıdan kopuk :', out.orphanFrames, 'kare');
  console.log('KENARDAN SOKMA        :', out.inbFrames, 'kare | oyuncu çizgi dışına maks', out.inbOutMax, 'px | tam dışarıda', out.inbOutOkFrames, 'kare');
  console.log('  sahipsiz serbest top  :', out.lostBallFrames, '/', out.looseFrames, 'kare');
  console.log('SENKRON (yorum − sahadaki beat, ms; + = yorum GEÇ, − = yorum ERKEN/spoiler):');
  Object.keys(byType).forEach(k => {
    const a = byType[k].filter(x => x != null);
    const d = (byStart[k] || []).filter(x => x != null);
    const dTxt = d.length ? ' | olay başından gecikme ort ' + Math.round(d.reduce((x, y) => x + y, 0) / d.length) + 'ms' : '';
    if (a.length) console.log('  ' + k.padEnd(14), 'n=' + a.length, 'çember farkı ort', Math.round(a.reduce((x, y) => x + y, 0) / a.length), 'maks', Math.max(...a), dTxt);
    else console.log('  ' + k.padEnd(14), 'n=' + byType[k].length, dTxt);
  });
  if (args.includes('--snap')) {
    console.log('ŞUT ANI SAHA DURUMU (rol: 0=PG 1=SG 2=SF 3=PF 4=C; x,y = konum, →tx,ty = hedef):');
    (out.snap || []).forEach((s, i) => {
      console.log(' #' + i, 'hücum ' + (s.offLeft ? 'SOLA' : 'SAĞA'), '| set', s.setIx, 'flip', s.flip, '| top', s.ball.x + ',' + s.ball.y, s.ball.m);
      const fmt = (a) => a.slice().sort((p, q) => p.r - q.r).map(p => `r${p.r}:${p.x},${p.y}→${p.tx},${p.ty}(v${p.v}${p.o ? ' OOB' : ''}${p.rt ? ' RET' : ''})`).join('  ');
      console.log('    HÜC:', fmt(s.off));
      console.log('    SAV:', fmt(s.def));
    });
  }
  console.log('KONSOL HATASI:', errors.length);
  errors.slice(0, 6).forEach(e => console.log('  !', e));
  if (SHOTS) console.log('Ekran görüntüleri:', SHOTDIR);
}
main().catch(e => { console.error(e); process.exit(1); });
