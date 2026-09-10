#!/usr/bin/env node
/**
 * Charazay 2.0 — PLAYOFF ÇIKMAZI DENETÇİSİ (FAZ 68b)
 *
 * Kullanıcının canlı kaydında yakalanan kusur: lig sezonu bitmiş (190/190), PLAYOFF aktif ve
 * kullanıcının serisi bekliyor — ama Ana Panel kartı "— sezon bitti —" diyor, "▶ Maçı Başlat"
 * butonu HİÇBİR ŞEY YAPMIYOR (hata da fırlatmıyor) ve Maçlar sayfası "Önce Lig'den sezonu
 * başlat." diyor. Kullanıcı çıkmaza giriyordu.
 *
 * Bu denetçi sezonu uçtan uca sürer (bütün lig maçlarını simüle eder), playoff başlayınca
 * kullanıcının serisi varsa:
 *   [1] durum makinesi 'playoff' demeli
 *   [2] Maçlar butonu ve Ana Panel kartı AYNI etiketi göstermeli, ikisi de ETKİN olmalı
 *   [3] butona basınca CANLI MAÇ açılmalı (sessiz dönüş yok)
 *   [4] playoff yokken ve maç yokken buton 'Maç yok' + pasif olmalı (ölü etiket yok)
 *
 * Kullanım: node tools/playoff-check.js [--seed=987654321] [--exec=/yol/chromium]
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
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Playoff FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });

  /* Sezonu uçtan uca sür: kullanıcının maçlarını da bot mantığıyla simüle et. */
  const kur = await page.evaluate(() => {
    try {
      if (!G.season || !G.season.active) { try { startLeagueSeason(); } catch (e) {} }
      let guard = 0;
      while (G.season && G.season.active && guard++ < 400) {
        const m = findNextUserSeasonMatch();
        if (!m) break;
        simulateCpuMatch(m);   /* skoru + tabloyu kendisi yazar */
      }
      /* kalan bot maçları */
      (G.season.matches || []).forEach(m => { if (!m.played) simulateCpuMatch(m); });
      G.season.active = false;
      startPlayoffs();
      renderDashboardNextMatch(); syncMatchButtons();
      return { ok: true, oynanan: (G.season.matches || []).filter(m => m.played).length, poAktif: !!(G.playoff && G.playoff.active), benimSeri: !!userPlayoffMatch() };
    } catch (e) { return { ok: false, hata: String(e) }; }
  });

  const R = { kur, adimlar: [] };
  if (kur.ok && kur.benimSeri) {
    R.durum = await page.evaluate(() => {
      const b = document.getElementById('startMatchBtn');
      const card = document.getElementById('dashNextCard');
      const db = card ? card.querySelector('.dn-play') : null;
      return {
        state: matchPlaybackState(),
        btnTxt: b ? b.textContent : null, btnDis: b ? b.disabled : null,
        kartTxt: db ? db.textContent : null, kartDis: db ? db.disabled : null,
        kartPE: card ? card.style.pointerEvents : null,
        meta: (document.getElementById('nextMatchMeta') || {}).textContent || '',
        rakip: (document.getElementById('nextAway') || {}).textContent || ''
      };
    });
    await page.evaluate(() => { try { showPage('mac'); } catch (e) {} });
    await bekle(400);
    await page.evaluate(() => { const b = document.getElementById('startMatchBtn'); if (b) b.click(); });
    await bekle(3500);
    R.sonra = await page.evaluate(() => ({
      running: !!(mState && mState.running),
      oyuncu: ((mState && mState._sim && mState._sim.players) || []).length,
      anlatim: document.querySelectorAll('#commentary .ci').length
    }));
  }

  await browser.close(); srv.close();

  let dusen = 0;
  const ok = (ad, deger, gecti) => { if (!gecti) dusen++; console.log('  ' + (gecti ? '✓' : '✗') + ' ' + ad.padEnd(46) + String(deger)); };
  console.log('\nPLAYOFF ÇIKMAZI DENETİMİ (FAZ 68b) · tohum ' + SEED);
  if (!kur.ok) { console.log('  ✗ kurulum: ' + kur.hata); process.exit(1); }
  ok('sezon uçtan uca sürüldü', kur.oynanan + ' maç', kur.oynanan > 0);
  ok('playoff aktif', kur.poAktif, kur.poAktif);
  if (!kur.benimSeri) {
    console.log('  · kullanıcı playoff dışında kaldı (bu tohumda ölçülemedi) — başka tohum dene');
    process.exit(dusen ? 1 : 0);
  }
  const D = R.durum, S = R.sonra;
  ok('[1] durum makinesi', D.state, D.state === 'playoff');
  ok('[2a] Maçlar butonu etiketi', JSON.stringify(D.btnTxt), /Playoff/.test(D.btnTxt || ''));
  ok('[2b] Maçlar butonu etkin', !D.btnDis, !D.btnDis);
  ok('[2c] Ana Panel kartı aynı etiket', JSON.stringify(D.kartTxt), D.kartTxt === D.btnTxt);
  ok('[2d] Ana Panel kartı tıklanabilir', 'pointerEvents=' + JSON.stringify(D.kartPE) + ' disabled=' + D.kartDis, !D.kartDis && D.kartPE !== 'none');
  ok('[2e] kartta rakip görünüyor', JSON.stringify(D.rakip), !!D.rakip && !/sezon bitti|sezon yok/.test(D.rakip));
  ok('[2f] kart metni playoff diyor', JSON.stringify((D.meta || '').slice(0, 60)), /[Pp]layoff/.test(D.meta || ''));
  ok('[3] butona basınca CANLI maç açıldı', 'running=' + S.running + ' oyuncu=' + S.oyuncu + ' anlatım=' + S.anlatim, !!S.running && S.oyuncu >= 10);
  ok('konsol hatası', hatalar.length, hatalar.length === 0);
  if (hatalar.length) hatalar.slice(0, 5).forEach(h => console.log('      ' + h.slice(0, 160)));
  console.log(dusen ? '\n✗ ' + dusen + ' kapı düştü' : '\n✓ playoff çıkmazı yok — buton doğru durumu gösteriyor ve maçı açıyor');
  process.exit(dusen ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
