#!/usr/bin/env node
/* ── ANOMALİ GÖRÜNTÜLEYİCİ ────────────────────────────────────────────────────────────
   Canlı maçı sürer ve `tools/anomali.js`in bulduğu DURUM sınıflarına girildiği anda
   sahanın ekran görüntüsünü alır. Kontak sayfasından farkı: sabit aralıkla değil,
   OLAY OLDUĞUNDA çeker — bir serbest atış epizodunu ya da beş kişilik yığılmayı
   yakalamak için 300 kare taramak gerekmez.

   Yakalanan durumlar:
     ft      serbest atış dizilimi (atıştan hemen önce)
     yigin   3+ oyuncu 1,5 m yarıçapta, 1,5 sn
     donuk   bir oyuncu canlı oyunda 3 sn kıpırdamadı
     uzuntut bir oyuncu topu 6 sn'den uzun tuttu

   Kullanım: node tools/an-goruntu.js <etiket> [--secs=300] [--max=24]
   Çıktı:    olcum/goruntu/<etiket>-<durum>-<t>.png  (+ kısa metin günlüğü)
   ──────────────────────────────────────────────────────────────────────────────────── */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const ET = process.argv[2] || 'an';
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? +a.split('=')[1] : d; };
const SECS = arg('secs', 300), MAX = arg('max', 24);
const OUT = path.join(ROOT, 'olcum', 'goruntu');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'charazay2.0.html' : u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); } });
});

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => console.log('  ! ' + e.message));
  await page.addInitScript(() => { try { localStorage.setItem('charazay_lang', 'tr'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'An FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await page.evaluate(() => { try { showPage('mac'); } catch (e) {} });
  await new Promise(r => setTimeout(r, 400));

  /* Sahnede durum izleyici: yakalanacak an gelince window.__CEK doldurulur. */
  await page.evaluate(() => {
    window.__CEK = [];
    window.__SON = {};
    const st = { yigin: null, donuk: {}, tut: null, ftGorulen: {} };
    const PX_M = 29.5429;
    const tick = () => {
      try {
        const S = mState && mState._sim; const b = S && S.ball;
        if (S && b && (S.players || []).length >= 10) {
          const t = S.time;
          const P = S.players;
          const ekle = (durum, not) => {
            if (window.__SON[durum] && t - window.__SON[durum] < 4) return;
            window.__SON[durum] = t;
            window.__CEK.push({ durum, t: +t.toFixed(1), not });
          };
          /* 1) serbest atış: dizilim oturduktan sonra, atıştan hemen önce */
          if (S._ftAktif) {
            const anahtar = Math.floor(t / 8);
            if (!st.ftGorulen[anahtar]) {
              st.ftGorulen[anahtar] = 1;
              const sh = (S.ball && S.ball.carrier) || null;
              ekle('ft', 'ftAktif · taşıyıcı ' + (sh && sh.pl ? (sh.team + '/' + sh.pl.poz) : '-') + ' · tip ' + (S.curType || '-'));
            }
          }
          /* 2) yığılma */
          let grup = null;
          for (let i = 0; i < 10 && !grup; i++) {
            const g = [i];
            for (let j = 0; j < 10; j++) if (j !== i && Math.hypot(P[j].x - P[i].x, P[j].y - P[i].y) < 1.5 * PX_M) g.push(j);
            if (g.length >= 3) grup = g;
          }
          if (grup) { if (!st.yigin) st.yigin = t; else if (t - st.yigin > 1.5) { ekle('yigin', grup.length + ' oyuncu 1,5 m yarıçapta'); st.yigin = null; } }
          else st.yigin = null;
          /* 3) donuk oyuncu */
          for (let i = 0; i < 10; i++) {
            const p = P[i], k = 'p' + i;
            if (!st.donuk[k]) st.donuk[k] = { t, x: p.x, y: p.y };
            const d = Math.hypot(p.x - st.donuk[k].x, p.y - st.donuk[k].y);
            if (d > 0.6 * PX_M) st.donuk[k] = { t, x: p.x, y: p.y };
            else if (t - st.donuk[k].t > 3 && !S._ftAktif && b.mode !== 'dead') {
              ekle('donuk', (p.pl ? p.team + '/' + p.pl.poz : 'p' + i) + ' 3 sn kıpırdamadı');
              st.donuk[k] = { t, x: p.x, y: p.y };
            }
          }
          /* 4) topu uzun tutan */
          if (b.mode === 'held' && b.carrier) {
            if (!st.tut || st.tut.c !== b.carrier) st.tut = { c: b.carrier, t };
            else if (t - st.tut.t > 6) { ekle('uzuntut', (b.carrier.pl ? b.carrier.team + '/' + b.carrier.pl.poz : '?') + ' ' + (t - st.tut.t).toFixed(1) + ' sn topu tuttu'); st.tut.t = t; }
          } else st.tut = null;
        }
      } catch (e) {}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.evaluate(() => { try { startMatch(); } catch (e) {} });

  const saha = await page.$('#courtSvg') || await page.$('#liveCourt') || await page.$('#macSaha');
  const hedef = saha || page;
  const gunluk = [];
  const t0 = Date.now();
  let alinan = 0, sonIx = 0;
  while ((Date.now() - t0) / 1000 < SECS && alinan < MAX) {
    const yeni = await page.evaluate((ix) => window.__CEK.slice(ix), sonIx);
    if (yeni.length) {
      sonIx += yeni.length;
      const it = yeni[yeni.length - 1];                       /* en son olay: şimdi ekranda */
      const ad = `${ET}-${it.durum}-${it.t.toFixed(0)}.png`;
      try { await hedef.screenshot({ path: path.join(OUT, ad) }); alinan++; gunluk.push(`${ad}  t=${it.t}  ${it.durum}  ${it.not}`); }
      catch (e) {}
    }
    await new Promise(r => setTimeout(r, 250));
  }
  await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
  await browser.close(); srv.close();
  fs.writeFileSync(path.join(OUT, ET + '-gunluk.txt'), gunluk.join('\n'));
  console.log(gunluk.join('\n'));
  console.log('\n' + alinan + ' görüntü: ' + OUT);
})();
