#!/usr/bin/env node
/**
 * Charazay 2.0 — GÖZ: CANLI SAHNE ÇİZİM DENETÇİSİ (FAZ 68)
 *
 * Maçın her karesini HEM geometri (mState._sim) HEM ÇİZİM (SVG/DOM) katmanında tarar ve
 * her ihlali maç saatiyle damgalar. Diğer denetçilerden farkı: ölçüt jetonun SİMÜLASYON
 * konumu değil, kullanıcının EKRANDA GÖRDÜĞÜ noktadır (`_cizDx/_cizDy` uygulanmış) ve
 * etiketler gerçek `getBBox()` kutularıyla ölçülür.
 *
 * ⚠ KLİP JETONLARI ÇAKIŞMA KAPISINDA SAYILMAZ (FAZ 68 brif notu): klip, gerçek SportVU
 *   kaydını birebir oynar; gerçek kayıtta en yakın çift karelerin %10,4'ünde 40 cm'nin
 *   altındadır (FAZ 56 ölçümü). O kareleri "çakışma" saymak gerçek basketbolu kusur ilan
 *   etmektir. Bilgi olarak ayrıca basılır.
 *
 * ⚠ HAKEM ÇİZGİNİN DIŞINDA DURUR — KUSUR DEĞİLDİR (FAZ 68 brif geri çekmesi). Saha dışı
 *   kapısı yalnız TRİBÜN sınırını (çizgi + 45 px) ölçer; boyalı alanın içi ise ihlaldir.
 *
 * Kullanım:
 *   node tools/goz.js [--sn=180] [--seed=987654321] [--exec=/yol/chromium]
 * Ham döküm: tools/goz-rapor.json
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? parseFloat(a.split('=')[1]) : d; };
const str = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const SEED = num('seed', 987654321);
const SN = num('sn', 180);
const EXEC = str('exec', null);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function sunucu() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      try {
        let u = decodeURIComponent(req.url.split('?')[0]);
        if (u === '/') u = '/charazay2.0.html';
        const fp = path.join(ROOT, path.normalize(u).replace(/^(\.\.[/\\])+/, ''));
        if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('404'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(fp).pipe(res);
      } catch (e) { res.writeHead(500); res.end('500'); }
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
const bekle = (ms) => new Promise(r => setTimeout(r, ms));
const TOHUM = (seed) => {
  let a = seed >>> 0;
  Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* Sayfa içinde koşan kaydedici (string olarak enjekte edilir). */
function kaydedici() {
  window.__GOZ = {
    n: 0, olay: [], sayac: {}, top: 0, cak: 0, cakKlip: 0, nKlip: 0, don: 0, etCak: 0,
    xTop: 0, etDag: {}, tutTop: 0, tutN: 0, tekYari: 0, kosanTop: 0, kosanN: 0
  };
  var G = window.__GOZ;
  var son = {};   /* aynı tip 2,5 sn içinde tekrar sayılmaz */
  var kay = function (tip, saat, bilgi) {
    if (son[tip] != null && Math.abs(saat - son[tip]) < 2.5) return;
    son[tip] = saat; G.sayac[tip] = (G.sayac[tip] || 0) + 1;
    if (G.olay.length < 400) G.olay.push({ tip: tip, saat: +saat.toFixed(1), bilgi: bilgi });
  };
  var X0 = 56.4, X1 = 883.6, Y0 = 28.43, Y1 = 471.57;
  var tick = function () {
    try {
      var S = mState && mState._sim;
      var P = S && S.players;
      if (S && S.ball && P && P.length >= 10 && (mState._clkNow || 0) > 0) {
        var saat = (mState.quarter || 1) * 1000 - (mState._clkNow || 0);
        G.n++;
        var b = S.ball;
        var cx = function (p) { return p.x + (p._cizDx || 0); };
        var cy = function (p) { return p.y + (p._cizDy || 0); };
        var i, j, p;
        /* ── 1) JETON ÇAKIŞMASI (ÇİZİLEN konum, görünür çap 26,2 px) ── */
        var en = 1e9, enKlip = 1e9, klipVar = false;
        for (i = 0; i < P.length; i++) for (j = i + 1; j < P.length; j++) {
          var a = P[i], c = P[j];
          if (a._klip || c._klip) klipVar = true;
          if (a._oob && c._oob) continue;
          var d = Math.hypot(cx(c) - cx(a), cy(c) - cy(a));
          if (a._klip || c._klip) { if (d < enKlip) enKlip = d; continue; }
          if (d < en) en = d;
          if (d < 12) kay('JETON_TAM_UST_USTE', saat, ((a.pl && a.pl.poz) || '?') + '/' + ((c.pl && c.pl.poz) || '?') + ' d=' + d.toFixed(0));
        }
        if (klipVar) G.nKlip++;
        if (en < 26.2) G.cak++;
        if (enKlip < 26.2) G.cakKlip++;
        /* ── 2) TOP TAŞIYICIDAN KOPUK ── */
        if (b.mode === 'held' && b.carrier && isFinite(b.carrier.x)) {
          var dt2 = Math.hypot(b.x - b.carrier.x, b.y - b.carrier.y);
          G.tutTop += dt2; G.tutN++;
          if (dt2 > 30) { G.top++; kay('TOP_KOPUK', saat, ((b.carrier.pl && b.carrier.pl.poz) || '?') + ' d=' + dt2.toFixed(0)); }
        }
        /* ── 3) SAHNE DONDU (≥8/10 hareketsiz, 250 ms pencere) ── */
        if (!G._ge || performance.now() - G._geT > 250) {
          if (G._ge) {
            var hs = 0, kosan = 0, sn2 = (performance.now() - G._geT) / 1000;
            for (i = 0; i < P.length; i++) {
              var o = G._ge[i]; if (!o) continue;
              var v = Math.hypot(P[i].x - o[0], P[i].y - o[1]) / sn2;
              if (v < 15) hs++; else kosan++;
            }
            if (hs >= 8) { G.don++; kay('SAHNE_DONDU', saat, hs + '/10'); }
            G.kosanTop += kosan; G.kosanN++;
          }
          G._ge = P.map(function (q) { return [q.x, q.y]; }); G._geT = performance.now();
        }
        /* ── 4) X YAYILIMI ── */
        var x0 = 1e9, x1 = -1e9;
        for (i = 0; i < P.length; i++) { if (P[i].x < x0) x0 = P[i].x; if (P[i].x > x1) x1 = P[i].x; }
        G.xTop += (x1 - x0);
        /* ── 5) ETİKET KUTULARI (gerçek DOM getBBox) ── */
        var kut = [], gor = 0;
        for (i = 0; i < P.length; i++) {
          p = P[i];
          var el = p._nmEl || (p.g && p.g.querySelector('.tok-name'));
          if (!el) continue;
          if (el.style.display === 'none') continue;
          var bb = null; try { bb = el.getBBox(); } catch (e) {}
          if (!bb || !bb.width) continue;
          gor++;
          kut.push([cx(p) + bb.x, cy(p) + bb.y, cx(p) + bb.x + bb.width, cy(p) + bb.y + bb.height, (p.pl && p.pl.poz) || '?']);
        }
        G.etDag[gor] = (G.etDag[gor] || 0) + 1;
        var cak = false;
        for (i = 0; i < kut.length && !cak; i++) for (j = i + 1; j < kut.length; j++) {
          var k1 = kut[i], k2 = kut[j];
          if (k1[0] < k2[2] && k1[2] > k2[0] && k1[1] < k2[3] && k1[3] > k2[1]) { cak = true; kay('ETIKET_CAKISMA', saat, k1[4] + '-' + k2[4]); break; }
        }
        if (cak) G.etCak++;
        /* ── 6) HAKEMLER ── */
        if (S.hakem) {
          for (i = 0; i < S.hakem.length; i++) {
            var h = S.hakem[i]; if (!isFinite(h.x)) continue;
            /* boyalı alan: dip çizgiden 5,8 m (171 px) içeri, kulvar yarı genişliği 2,45 m (72 px) */
            /* çizgi ÜSTÜNDE durmak parkeye basmak değildir — 20 px'lik pay (FAZ 68) */
            var bs = (h.x > X0 + 20 && h.x < X0 + 171), bg = (h.x < X1 - 20 && h.x > X1 - 171);
            if ((bs || bg) && Math.abs(h.y - 250) < 72) kay('HAKEM_BOYALI_ALANDA', saat, h.ad + ' ' + h.x.toFixed(0) + ',' + h.y.toFixed(0));
            /* tribün: çizgi + 45 px dışı (çizgi dışında durmak KUSUR DEĞİL) */
            if (h.x < X0 - 45 || h.x > X1 + 45 || h.y < Y0 - 45 || h.y > Y1 + 45) kay('HAKEM_SAHA_DISI', saat, h.ad + ' ' + h.x.toFixed(0) + ',' + h.y.toFixed(0));
          }
        }
        /* ── 7) OYUNCU SAHA DIŞI (izni olmayan) ── */
        for (i = 0; i < P.length; i++) {
          p = P[i]; if (p._oob || p._oobDonus) continue;
          if (p.x < X0 - 6 || p.x > X1 + 6 || p.y < Y0 - 6 || p.y > Y1 + 6) kay('OYUNCU_SAHA_DISI', saat, ((p.pl && p.pl.poz) || '?') + ' ' + p.x.toFixed(0) + ',' + p.y.toFixed(0));
        }
        /* ── 8) TÜM OYUNCULAR TEK YARIDA (bilgi — gerçek SportVU tabanı %68,1) ── */
        var sol = 0; for (i = 0; i < P.length; i++) if (P[i].x < 470) sol++;
        if (sol === 10 || sol === 0) G.tekYari++;
      }
    } catch (e) { window.__GOZ.err = String(e); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function main() {
  const srv = await sunucu();
  const port = srv.address().port;
  const lo = EXEC ? { executablePath: EXEC, headless: true } : { channel: 'chrome', headless: true };
  const browser = await chromium.launch(lo);
  const hatalar = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });
  page.on('pageerror', e => hatalar.push(e.message));
  await page.addInitScript('(' + TOHUM.toString() + ')(' + SEED + ');');
  await page.addInitScript("try{localStorage.setItem('charazay_lang','tr');}catch(e){}");
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Goz FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await page.evaluate(() => { try { showPage('mac'); } catch (e) {} });
  await bekle(300);
  await page.evaluate('(' + kaydedici.toString() + ')()');
  await page.evaluate(() => { try { startMatch(); setMatchRate(1); } catch (e) { window.__gozErr = String(e); } });
  await bekle(SN * 1000);
  const R = await page.evaluate(() => window.__GOZ);
  const startErr = await page.evaluate(() => window.__gozErr || null);
  await browser.close(); srv.close();

  fs.writeFileSync(path.join(__dirname, 'goz-rapor.json'), JSON.stringify(Object.assign({ meta: { sn: SN, seed: SEED } }, R), null, 2));

  const n = R.n || 1;
  const pc = x => (100 * x / n).toFixed(1) + '%';
  let dusen = 0;
  const kapi = (ad, deger, gecti, hedef) => { if (!gecti) dusen++; console.log('  ' + (gecti ? '✓' : '✗') + ' ' + ad.padEnd(34) + String(deger).padStart(10) + '   ' + hedef); };
  console.log('\nGÖZ — canlı sahne çizim denetçisi · ' + n + ' kare / ' + SN + ' sn · tohum ' + SEED);
  if (startErr) console.log('  ⚠ startMatch: ' + startErr);
  if (R.err) console.log('  ⚠ kaydedici: ' + R.err);
  console.log('  ── KAPILAR ──                             ölçülen   hedef');
  kapi('jeton çakışması (<26,2 px)', pc(R.cak), (100 * R.cak / n) <= 5, '≤ %5   (klip hariç)');
  kapi('top taşıyıcıdan kopuk (>30 px)', pc(R.top), (100 * R.top / n) <= 1, '≤ %1');
  kapi('etiket kutusu çakışması', pc(R.etCak), (100 * R.etCak / n) <= 2, '≤ %2');
  kapi('sahne dondu (≥8/10 hareketsiz)', pc(R.don), (100 * R.don / n) <= 25, '≤ %25');
  kapi('hakem boyalı alanda', (R.sayac.HAKEM_BOYALI_ALANDA || 0) + ' olay', !(R.sayac.HAKEM_BOYALI_ALANDA), '0');
  kapi('hakem tribünde', (R.sayac.HAKEM_SAHA_DISI || 0) + ' olay', !(R.sayac.HAKEM_SAHA_DISI), '0');
  kapi('oyuncu saha dışı (izinsiz)', (R.sayac.OYUNCU_SAHA_DISI || 0) + ' olay', !(R.sayac.OYUNCU_SAHA_DISI), '0');
  console.log('  ── BİLGİ ──');
  console.log('    klip karelerinde çakışma     ' + (R.nKlip ? (100 * R.cakKlip / R.nKlip).toFixed(1) + '%' : '-') + '   (gerçek SportVU kaydı — kusur DEĞİL)');
  console.log('    oyuncu X yayılımı            ' + (R.xTop / n).toFixed(0) + ' px');
  console.log('    tüm oyuncular tek yarıda     ' + pc(R.tekYari) + '   (gerçek %68,1)');
  console.log('    top - taşıyıcı ort. mesafe   ' + (R.tutN ? (R.tutTop / R.tutN).toFixed(1) : '-') + ' px');
  console.log('    aynı anda koşan (250 ms)     ' + (R.kosanN ? (R.kosanTop / R.kosanN).toFixed(2) : '-') + '/10');
  console.log('    görünen etiket dağılımı      ' + JSON.stringify(R.etDag));
  console.log('    konsol hatası                ' + hatalar.length);
  const ol = Object.entries(R.sayac).sort((a, b) => b[1] - a[1]);
  if (ol.length) console.log('  ── OLAYLAR (2,5 sn tekrar filtresi) ──\n    ' + ol.map(([a, b]) => a + ' ' + b).join(' · '));
  (R.olay || []).slice(0, 12).forEach(o => console.log('      ' + String(o.saat).padStart(8) + '  ' + o.tip + '  ' + o.bilgi));
  console.log(dusen ? '\n✗ ' + dusen + ' kapı düştü' : '\n✓ bütün kapılar geçti');
  process.exit(dusen ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
