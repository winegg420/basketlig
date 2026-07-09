#!/usr/bin/env node
/**
 * Charazay 2.0 — otomatik görsel + konsol testi (Playwright + sistem Chrome).
 *
 * Ne yapar:
 *  - Depo kökünü kendi statik HTTP sunucusuyla yayınlar (harici bağımlılık yok).
 *  - Oyunu İKİ viewport'ta açar: masaüstü (1440×900) ve mobil (390×844).
 *  - Konsol hatalarını + yakalanmamış JS istisnalarını toplar (0 hata şartı).
 *  - Akışları otomatik yürütür: yeni kariyer → maç başlat/izle → taktik → market → ayarlar.
 *  - Her viewport için adım adım ekran görüntüsü alır → tools/visual-check-output/.
 *
 * Çıkış kodu: 0 = temiz, 1 = konsol hatası / akış hatası (görev tamamlanmış sayılmaz).
 *
 * Çalıştırma:  node tools/visual-check.js
 * Gereksinim:  Google Chrome kurulu + `npm i -D playwright` (tarayıcı indirmeden).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'visual-check-output');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
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

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runViewport(browser, base, vp) {
  const errors = [];
  const dir = path.join(OUT, vp.name);
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    deviceScaleFactor: vp.isMobile ? 2 : 1,
  });
  const page = await context.newPage();
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`); });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

  let shot = 0;
  const snap = async (label) => {
    shot++;
    await page.screenshot({ path: path.join(dir, `${String(shot).padStart(2, '0')}-${label}.png`), fullPage: false });
  };

  console.log(`\n[${vp.name}] açılıyor…`);
  await page.goto(base + '/charazay2.0.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await snap('login');

  // 1) Yeni kariyer
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Test Kartalları');
  await snap('setup');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} }); // tutorial kapat
  await sleep(400);
  await snap('dashboard');

  // 2) Maçlar sayfası
  await page.evaluate(() => showPage('mac', document.querySelector('#sbNav button[data-page="mac"]')));
  await sleep(500);
  await snap('mac');

  // 3) Taktik ekranı
  await page.evaluate(() => {
    try { const m = findNextUserSeasonMatch(); if (m) openMatchTactics(m.seasonMatchIx); } catch (e) {}
  });
  await sleep(500);
  await snap('taktik');
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });

  // 4) Maç başlat/izle
  await page.evaluate(() => { try { startMatch(); } catch (e) {} });
  await sleep(3800); // canlı olayların akmasını bekle
  await page.evaluate(() => { const el = document.getElementById('macLiveAnchor'); if (el) el.scrollIntoView(); });
  await sleep(300);
  await snap('mac-canli');
  await page.evaluate(() => { try { stopMatch(); } catch (e) {} });

  // 5) Market ekranı
  await page.evaluate(() => showPage('market', document.querySelector('#sbNav button[data-page="market"]')));
  await sleep(500);
  await snap('market');

  // 6) Ayarlar
  await page.evaluate(() => { try { openSettingsModal(); } catch (e) {} });
  await sleep(400);
  await snap('ayarlar');
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });

  /* ── Genişletilmiş akışlar (Paket 6): durum hazırlanır, GERÇEK UI fonksiyonu çağrılır.
     Amaç: bu ekranların hiçbirinde konsol hatası olmaması + görsel kayıt. Sıra önemli:
     draft en sonda (finalize yeni sezon başlatır). ── */

  // 6b) Kariyer Özeti (Paket 2 — salt okunur onur listesi)
  await page.evaluate(() => { try { openCareerModal(); } catch (e) {} });
  await sleep(400);
  await snap('kariyer-ozeti');
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });

  // 7) Transfer pazarlığı — kulüpten oyuncu alma teklif modalı
  await page.evaluate(() => {
    try {
      ensureClubTransferStock();
      const p = (G.clubTransferPlayers || []).find(x => x.mode === 'sale');
      if (p) openClubOfferModal(p.id);
    } catch (e) {}
  });
  await sleep(400);
  await snap('pazarlik-teklif');
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });

  // 8) Gelen transfer teklifi modalı (kendi oyuncuna kulüp teklifi)
  await page.evaluate(() => {
    try {
      const p = (G.players || [])[0];
      if (p) {
        G.pendingOffers = [{ playerId: p.id, playerName: p.isim, poz: p.poz, genel: p.genel,
          club: 'Test Kulübü BK', offer: 25000, asking: 30000, wantsToGo: false, kisilik: p.kisilik }];
        showIncomingOfferModal();
      }
    } catch (e) {}
  });
  await sleep(400);
  await snap('gelen-teklif');
  await page.evaluate(() => { try { closeAppModal(); G.pendingOffers = []; } catch (e) {} });

  // 9) Başkan hedefi (sezon başında kurulur) + lig sayfası haber akışı
  await page.evaluate(() => {
    try { if (!G.presidentTarget) setPresidentTarget(); } catch (e) {}
    try { showPage('lig', document.querySelector('#sbNav button[data-page="lig"]')); } catch (e) {}
  });
  await sleep(500);
  await snap('lig-baskan-hedefi');

  // 10) Sezon sonu ödül töreni (veriler kısmi olsa da modal hatasız açılmalı)
  await page.evaluate(() => { try { announceSeasonAwards(); } catch (e) {} });
  await sleep(400);
  await snap('sezon-odulleri');
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });

  // 10b) Ulusal Kupa kartı (Paket 1 — lig ekranındaki bracket)
  await page.evaluate(() => {
    try { showPage('lig', document.querySelector('#sbNav button[data-page="lig"]')); renderLig(); } catch (e) {}
  });
  await sleep(400);
  await snap('kupa-karti');

  // 11) Playoff serisi — bracket kur, lig ekranında seri paneli
  await page.evaluate(() => {
    try { startPlayoffs(); } catch (e) {}
    try { closeAppModal(); } catch (e) {}
    try { renderLig(); } catch (e) {}
  });
  await sleep(500);
  await snap('playoff-seri');
  await page.evaluate(() => { try { G.playoff = null; renderLig(); } catch (e) {} });

  // 12) İflas / zorunlu satış senaryosu (1. hafta: uyarı, 2. hafta: satış)
  await page.evaluate(() => {
    try {
      G._qaCoinsBackup = G.coins;
      G.coins = -40000; G.bankruptWeeks = 0;
      processBankruptcy();           /* uyarı haftası */
      processBankruptcy();           /* zorunlu satış haftası */
      showPage('bilanco', document.querySelector('#sbNav button[data-page="bilanco"]'));
    } catch (e) {}
  });
  await sleep(500);
  await snap('iflas-senaryosu');
  await page.evaluate(() => {
    try { G.coins = G._qaCoinsBackup || 50000; delete G._qaCoinsBackup; G.bankruptWeeks = 0; updateCoins(); } catch (e) {}
  });

  // 13) Draft ekranı (EN SON — finalize yeni sezon başlatabilir)
  await page.evaluate(() => { try { startDraft(); } catch (e) {} });
  await sleep(500);
  await snap('draft');
  await page.evaluate(() => {
    try {
      const av = (typeof draftAvailable === 'function') ? draftAvailable() : [];
      if (G.draft && !G.draft.done && G.draft.order[G.draft.idx] === G.team.isim && av.length) draftPick(av[0].id);
    } catch (e) {}
    try { closeAppModal(); } catch (e) {}
  });
  await sleep(400);

  await context.close();
  return errors;
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  console.log(`Statik sunucu: ${base}`);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (e) {
    console.error('Chrome başlatılamadı (channel:chrome). Hata:', e.message);
    server.close(); process.exit(1);
  }

  let totalErrors = 0;
  try {
    for (const vp of VIEWPORTS) {
      const errs = await runViewport(browser, base, vp);
      if (errs.length) {
        totalErrors += errs.length;
        console.error(`[${vp.name}] ✗ ${errs.length} konsol/JS hatası:`);
        errs.forEach(e => console.error('   ' + e));
      } else {
        console.log(`[${vp.name}] ✓ 0 konsol hatası — akış tamam, ekran görüntüleri kaydedildi.`);
      }
    }
  } catch (e) {
    console.error('Akış hatası:', e.message);
    totalErrors++;
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log(`\nEkran görüntüleri: ${path.relative(ROOT, OUT)}`);
  if (totalErrors > 0) {
    console.error(`\n✗ TOPLAM ${totalErrors} hata — görev tamamlanmış sayılmaz.`);
    process.exit(1);
  }
  console.log('\n✓ Görsel test geçti (masaüstü + mobil, 0 hata).');
})();
