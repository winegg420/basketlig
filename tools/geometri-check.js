#!/usr/bin/env node
/**
 * Charazay 2.0 — SAHA ÇİZGİSİ GEOMETRİSİ DENETİMİ (FAZ 14 / D)
 *
 * NEDEN VAR: FAZ 13'te saha geometrisi "doğru, FIBA'ya uygun" ilan edilmişti. Yanlıştı.
 * O yargı `<path>`'in `r="196"` NİTELİĞİNİ okuyarak verilmişti; tarayıcının FİİLEN çizdiği
 * eğri ölçülmemişti. SVG kuralı gereği yarıçap iki uç arasındaki kirişi kapsamıyorsa tarayıcı
 * yarıçapı sessizce büyütür — çizilen yay 196 değil 201,5 px, merkezi de pota değil dip
 * çizgiydi. Sonuç: aynı "3 sayı çizgisi" üzerinde potaya uzaklık 5,26 m ile 7,61 m arasında.
 *
 * BU YÜZDEN: bu araçta NİTELİK OKUMAK YASAKTIR. Ölçüm yalnız `getPointAtLength` (çizilen
 * eğrinin gerçek noktaları) ve `getBBox` (çizilen sınırlayıcı kutu) ile yapılır.
 *
 * Ölçek de nitelikten değil, çizilen saha dikdörtgeninden türetilir: FIBA sahası 28 × 15 m.
 *
 * Çalıştırma:  node tools/geometri-check.js [--json] [--shot=dosya.png]
 * Çıkış kodu:  0 = tüm denetimler geçti · 1 = en az biri düştü
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const JSON_CIKTI = process.argv.includes('--json');
const SHOT = (() => { const a = process.argv.find(x => x.startsWith('--shot=')); return a ? a.slice(7) : null; })();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let u = decodeURIComponent(req.url.split('?')[0]);
        if (u === '/') u = '/charazay2.0.html';
        const f = path.join(ROOT, path.normalize(u).replace(/^(\.\.[/\\])+/, ''));
        if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(f).pipe(res);
      } catch (e) { res.writeHead(500); res.end('500'); }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ── Sayfa içinde çalışan ölçüm ─────────────────────────────────────────────────────────
   Buradaki hiçbir satır bir SVG niteliğini okumaz. */
function olcSayfada() {
  const R = { hata: null };
  try {
    const kok = document.getElementById('courtSvg');
    if (!kok) throw new Error('#courtSvg yok');
    const ic = kok.querySelector('svg') || kok;
    const el = (id) => document.getElementById(id);
    const N = 720;
    /* Çizilen eğriyi örnekle — tek meşru geometri kaynağı. */
    const samp = (e, n) => {
      const L = e.getTotalLength();
      const a = [];
      const k = n || N;
      for (let i = 0; i <= k; i++) { const p = e.getPointAtLength(L * i / k); a.push([p.x, p.y]); }
      return a;
    };
    const kutu = (e) => { const b = e.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 }; };

    /* Ölçek: çizilen saha dikdörtgeni = 28 × 15 m (FIBA). */
    const bounds = kutu(el('cLine-bounds'));
    const sx = bounds.w / 28, sy = bounds.h / 15;
    const m = (dx, dy) => Math.hypot(dx / sx, dy / sy);          /* px farkı → metre */

    const rimL = kutu(el('cLine-rimL')), rimR = kutu(el('cLine-rimR'));
    const rim = [rimL.cx, rimL.cy];

    /* 3 sayı çizgisi: köşe düzlükleri ile yay ayrı ayrı değerlendirilir. Ayrım, çizilen
       eğrinin uç noktalarının y'sine göre yapılır (düzlükler dip çizgiden yatay gider). */
    const three = samp(el('cLine-threeL'));
    const uc0 = three[0], ucN = three[three.length - 1];
    const kosayY = [uc0[1], ucN[1]];
    const duz = three.filter(p => Math.abs(p[1] - kosayY[0]) < 0.3 || Math.abs(p[1] - kosayY[1]) < 0.3);
    const yay = three.filter(p => duz.indexOf(p) < 0);
    const yayD = yay.map(p => m(p[0] - rim[0], p[1] - rim[1]));
    const duzD = duz.map(p => m(p[0] - rim[0], p[1] - rim[1]));

    /* Köşe çizgisinin kenar çizgisine uzaklığı (çizilen sınır kutusundan). */
    const kosayKenar = Math.min(
      Math.abs(kosayY[0] - bounds.y) / sy,
      Math.abs(bounds.y + bounds.h - kosayY[1]) / sy);
    const duzUzun = duz.length ? (Math.max.apply(null, duz.map(p => p[0])) - Math.min.apply(null, duz.map(p => p[0]))) / sx : 0;

    /* Serbest atış çemberinin (dış yarı) potaya en uzak noktası — yayın içinde kalmalı. */
    const ftDis = samp(el('cLine-ftArcOutL'));
    /* İç yarı (F14-5) bulunmayabilir — o zaman kendi denetimi düşer, ölçüm çökmez. */
    const ftIcEl = el('cLine-ftArcInL');
    const ftIc = ftIcEl ? samp(ftIcEl) : [];
    let ftEnUzak = 0;
    ftDis.forEach(p => { const d = m(p[0] - rim[0], p[1] - rim[1]); if (d > ftEnUzak) ftEnUzak = d; });

    /* Beklenmedik kesişme: sahanın ana çizgileri ikişerli taranır. */
    const parcalar = {};
    ['cLine-threeL', 'cLine-ftArcOutL', 'cLine-ftArcInL', 'cLine-laneL', 'cLine-restrL',
      'cLine-center', 'cLine-mid', 'cLine-bounds', 'cLine-ftLineL', 'cLine-boardL', 'cLine-rimL']
      .forEach(id => { const e = el(id); if (e) parcalar[id] = samp(e, 400); });
    const IZINLI = [                                    /* gerçek sahada da temas eden çiftler */
      'cLine-threeL|cLine-bounds', 'cLine-laneL|cLine-bounds', 'cLine-laneL|cLine-ftLineL',
      'cLine-ftArcOutL|cLine-ftLineL', 'cLine-ftArcInL|cLine-ftLineL', 'cLine-ftArcInL|cLine-laneL',
      /* çemberin uçları serbest atış çizgisinin uçlarıdır; o uçlar da boyanın köşeleridir */
      'cLine-ftArcOutL|cLine-laneL',
      'cLine-restrL|cLine-laneL', 'cLine-center|cLine-mid', 'cLine-mid|cLine-bounds',
      'cLine-boardL|cLine-laneL', 'cLine-restrL|cLine-boardL', 'cLine-rimL|cLine-restrL',
      'cLine-ftArcOutL|cLine-ftArcInL', 'cLine-boardL|cLine-bounds', 'cLine-rimL|cLine-boardL',
    ];
    const kesisen = [];
    const adlar = Object.keys(parcalar);
    for (let i = 0; i < adlar.length; i++) for (let j = i + 1; j < adlar.length; j++) {
      const A = parcalar[adlar[i]], B = parcalar[adlar[j]];
      let en = 1e9, nokta = null;
      for (let a = 0; a < A.length; a++) for (let b = 0; b < B.length; b++) {
        const d = Math.hypot(A[a][0] - B[b][0], A[a][1] - B[b][1]);
        if (d < en) { en = d; nokta = A[a]; }
      }
      if (en < 1.2) {
        const anahtar = adlar[i] + '|' + adlar[j];
        if (IZINLI.indexOf(anahtar) < 0 && IZINLI.indexOf(adlar[j] + '|' + adlar[i]) < 0)
          kesisen.push({ cift: anahtar, x: +nokta[0].toFixed(1), y: +nokta[1].toFixed(1) });
      }
    }

    /* Sahada karşılığı olmayan çizim: çizgili (stroke) her öğe beyaz listede olmalı. */
    const DINAMIK = ['liveBall', 'courtBrand', 'shotsLayer', 'playersLayer', 'courtLogoFb'];
    const yabanci = [];
    ic.querySelectorAll('path,circle,rect,line,ellipse,polyline,polygon').forEach(e => {
      if (e.closest('defs')) return;
      if (DINAMIK.some(d => e.closest('#' + d))) return;
      const cs = getComputedStyle(e);
      const sw = parseFloat(cs.strokeWidth || '0');
      if (!cs.stroke || cs.stroke === 'none' || !(sw > 0)) return;
      if (cs.stroke === 'rgba(0, 0, 0, 0)') return;
      if (e.closest('[id^="cLine-"]')) return;
      const b = e.getBBox();
      yabanci.push({ etiket: e.tagName + (e.id ? '#' + e.id : ''), x: +b.x.toFixed(1), y: +b.y.toFixed(1),
        w: +b.width.toFixed(1), h: +b.height.toFixed(1), renk: cs.stroke });
    });

    const restr = samp(el('cLine-restrL'));
    const restrD = restr.map(p => m(p[0] - rim[0], p[1] - rim[1]));
    const lane = kutu(el('cLine-laneL'));
    const orta = kutu(el('cLine-center'));
    const board = kutu(el('cLine-boardL'));

    /* Serbest atış çemberinin yarıçapı: merkez, çizilen yayın iki ucunun orta noktasıdır
       (nitelikten değil eğriden gelir); yarıçap o merkeze en uzak noktadır. */
    const ftM = [(ftDis[0][0] + ftDis[ftDis.length - 1][0]) / 2, (ftDis[0][1] + ftDis[ftDis.length - 1][1]) / 2];
    let ftR = 0;
    ftDis.forEach(p => { const d = m(p[0] - ftM[0], p[1] - ftM[1]); if (d > ftR) ftR = d; });

    /* Sağ taraf aynası: sol tarafın 2·x0+w − x karşılığı mı? */
    const threeR = samp(el('cLine-threeR'), 180);
    const threeL180 = samp(el('cLine-threeL'), 180);
    const ayna = bounds.x * 2 + bounds.w;
    let aynaMax = 0;
    for (let i = 0; i < threeL180.length; i++) {
      const bl = threeL180[i], br = threeR[i];
      aynaMax = Math.max(aynaMax, Math.hypot(ayna - bl[0] - br[0], bl[1] - br[1]));
    }

    const st = (a) => ({ min: Math.min.apply(null, a), max: Math.max.apply(null, a), ort: a.reduce((x, y) => x + y, 0) / a.length });

    R.olcek = { sx, sy, fark: Math.abs(sx - sy) / Math.max(sx, sy) * 100, bounds };
    R.yay = st(yayD);
    R.yayNokta = yayD.length;
    R.duz = duz.length ? st(duzD) : null;
    R.duzUzun = duzUzun;
    R.kosayKenar = kosayKenar;
    R.ftEnUzak = ftEnUzak;
    R.ftBosluk = R.yay.min - ftEnUzak;
    R.restr = st(restrD);
    R.lane = { gen: lane.h / sy, der: lane.w / sx };
    R.orta = { r: (orta.w / sx) / 2, r2: (orta.h / sy) / 2 };
    R.cember = { cap: rimL.w / sx };
    R.pano = { gen: board.h / sy, mesafe: Math.abs(rimL.cx - board.cx) / sx };
    R.ftR = ftR;
    R.ftIcVar = !!ftIcEl;
    R.kesisen = kesisen;
    R.yabanci = yabanci;
    R.aynaMax = aynaMax;
    R.rim = { sol: [rimL.cx, rimL.cy], sag: [rimR.cx, rimR.cy] };
  } catch (e) { R.hata = String((e && e.message) || e); }
  return R;
}

(async () => {
  const server = await startServer();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let R = null; const hatalar = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });
    page.on('pageerror', e => hatalar.push('pageerror: ' + e.message));
    await page.goto(base + '/charazay2.0.html?test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
    await page.click('#loginPage button.btn-p');
    await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
    await page.fill('#teamName', 'Geometri Test');
    await page.click('#setupPage button.btn-p');
    await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
    await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
    await page.evaluate(() => showPage('mac', document.querySelector('#sbNav button[data-page="mac"]')));
    await sleep(500);
    R = await page.evaluate(olcSayfada);
    if (SHOT) { const e = await page.$('#courtSvg'); if (e) await e.screenshot({ path: path.resolve(ROOT, SHOT) }); }
  } finally { await browser.close(); server.close(); }

  if (!R || R.hata) { console.error('✗ ölçüm yapılamadı: ' + (R && R.hata)); process.exit(1); }
  if (JSON_CIKTI) console.log(JSON.stringify(R, null, 1));

  const f = (v, n) => (v == null ? '—' : v.toFixed(n == null ? 3 : n));
  const D = [];
  const ek = (ad, deger, hedef, gec) => D.push({ ad, deger, hedef, gec: !!gec });

  ek('3 sayı yayının potaya uzaklığı — SAPMA', f(R.yay.max - R.yay.min) + ' m', '≤ 0,05 m', (R.yay.max - R.yay.min) <= 0.05);
  ek('3 sayı yayı yarıçapı', f(R.yay.ort) + ' m', '6,75 ± 0,05', Math.abs(R.yay.ort - 6.75) <= 0.05);
  ek('köşe çizgisinin kenar çizgisine uzaklığı', f(R.kosayKenar) + ' m', '0,90 ± 0,05', Math.abs(R.kosayKenar - 0.90) <= 0.05);
  ek('köşe düzlüğünün uzunluğu', f(R.duzUzun) + ' m', '> 0,50 m', R.duzUzun > 0.50);
  ek('serbest atış çemberi ↔ 3 sayı yayı boşluğu', f(R.ftBosluk) + ' m', '> 0 (kesişme yok)', R.ftBosluk > 0);
  ek('yay altı (restricted) yarıçapı', f(R.restr.ort) + ' m', '1,25 ± 0,05', Math.abs(R.restr.ort - 1.25) <= 0.05);
  ek('boya genişliği', f(R.lane.gen) + ' m', '4,90 ± 0,05', Math.abs(R.lane.gen - 4.90) <= 0.05);
  ek('boya derinliği', f(R.lane.der) + ' m', '5,80 ± 0,05', Math.abs(R.lane.der - 5.80) <= 0.05);
  ek('orta yuvarlak yarıçapı', f(R.orta.r) + ' m', '1,80 ± 0,05', Math.abs(R.orta.r - 1.80) <= 0.05);
  ek('serbest atış çemberi yarıçapı', f(R.ftR) + ' m', '1,80 ± 0,05', Math.abs(R.ftR - 1.80) <= 0.05);
  ek('serbest atış çemberinin iç yarısı çiziliyor', R.ftIcVar ? 'var' : 'YOK', 'var (kesikli)', R.ftIcVar);
  ek('çember çapı', f(R.cember.cap) + ' m', '0,45 ± 0,02', Math.abs(R.cember.cap - 0.45) <= 0.02);
  ek('pano genişliği', f(R.pano.gen) + ' m', '1,80 ± 0,02', Math.abs(R.pano.gen - 1.80) <= 0.02);
  ek('pano ↔ çember merkezi', f(R.pano.mesafe) + ' m', '0,375 ± 0,02', Math.abs(R.pano.mesafe - 0.375) <= 0.02);
  ek('yatay/dikey ölçek farkı', '%' + f(R.olcek.fark, 2), '≤ %0,5', R.olcek.fark <= 0.5);
  ek('sağ taraf sol tarafın aynası mı', f(R.aynaMax, 2) + ' px', '≤ 1,0 px', R.aynaMax <= 1.0);
  ek('sahada karşılığı olmayan çizim', String(R.yabanci.length), '0', R.yabanci.length === 0);
  ek('beklenmedik çizgi kesişmesi', String(R.kesisen.length), '0', R.kesisen.length === 0);
  ek('konsol hatası', String(hatalar.length), '0', hatalar.length === 0);

  console.log('\n' + '='.repeat(76));
  console.log('SAHA GEOMETRİSİ — çizilen eğriler ölçüldü (getPointAtLength · nitelik okunmadı)');
  console.log('='.repeat(76));
  console.log('ölçek: yatay ' + R.olcek.sx.toFixed(4) + ' px/m · dikey ' + R.olcek.sy.toFixed(4) +
    ' px/m · pota (' + R.rim.sol[0].toFixed(1) + ', ' + R.rim.sol[1].toFixed(1) + ')');
  console.log('3 sayı yayı: ' + R.yayNokta + ' nokta · min ' + f(R.yay.min) + ' m · max ' + f(R.yay.max) + ' m');
  if (R.duz) console.log('köşe düzlüğü: potaya ' + f(R.duz.min) + '–' + f(R.duz.max) + ' m\n');
  let dusen = 0;
  D.forEach(d => {
    if (!d.gec) dusen++;
    console.log('  ' + (d.gec ? '✓' : '✗') + ' ' + d.ad.padEnd(44) + String(d.deger).padStart(12) + '   (' + d.hedef + ')');
  });
  R.yabanci.forEach(y => console.log('      ✗ yabancı çizim: ' + y.etiket + ' ' + y.renk + ' @ (' + y.x + ',' + y.y + ') ' + y.w + '×' + y.h));
  R.kesisen.forEach(k => console.log('      ✗ kesişme: ' + k.cift + ' @ (' + k.x + ',' + k.y + ')'));
  hatalar.slice(0, 3).forEach(h => console.log('      ✗ konsol: ' + h));
  console.log('\n' + (dusen ? '✗ ' + dusen + ' denetim düştü' : '✓ tüm geometri denetimleri geçti'));
  process.exit(dusen ? 1 : 0);
})();
