#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 11 KABUL KRİTERİ DENETÇİSİ
 *
 * Dizilim ÖLÇÜMLERİ ayrı araçtadır: `node tools/spacing-check.js` (F11-7).
 * Bu araç, ölçümle görülemeyen davranış maddelerini sınar:
 *
 *   B1  Dizilim geometrisi (F11-2/F11-3) — SET_* sabitleri kâğıt üzerinde kurala uyuyor mu:
 *       en yakın ikili ≥ 3,5 m · yayılım ≥ %30 · dizilimlerin çoğunda boyada oyuncu var.
 *   B2  Kare kaybında yetişme (F11-1) — sekme arka planda kaldıktan sonra sahne anlatımın
 *       bulunduğu ana eşitleniyor mu (jetonlar hedeflerinde, faz doğru).
 *   B3  startMatch sessiz kilitlenmesi (F11-6) — takılı `running` bayrağı kurtarılıyor,
 *       hiçbir dal sessizce dönmüyor, kilitli sonuç butonda görünüyor.
 *   B4  Kesme/perde çakışması (F11-2) — kesici dolu köşeye gitmiyor.
 *   B5  Sonuç değişmezliği — dizilim SUNUM katmanıdır; maç sonucu değişmemeli.
 *
 * Çalıştırma:  node tools/faz11-check.js
 * Çıkış kodu:  0 = hepsi geçti, 1 = en az bir kriter düştü.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PX_M = 940 / 28;
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
const SEED_FN = (seed) => {
  let a = seed >>> 0;
  Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const sonuc = [];
function ok(ad, gecti, not) {
  sonuc.push({ ad, gecti: !!gecti, not: not || '' });
  console.log(`  ${gecti ? '✓' : '✗'} ${ad}${not ? ' — ' + not : ''}`);
}

// ── B1: dizilim geometrisi (dosyadan, tarayıcı gerekmez) ─────────────────────────────────
function kutu(pts) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return (Math.max.apply(null, xs) - Math.min.apply(null, xs)) * (Math.max.apply(null, ys) - Math.min.apply(null, ys));
}
function geometri() {
  console.log('\n[B1] Dizilim geometrisi (F11-2 / F11-3)');
  const src = fs.readFileSync(path.join(ROOT, 'js', 'match-engine.js'), 'utf8');
  const adlar = ['SET_SPREAD', 'SET_HORNS', 'SET_POST', 'SET_MOTION', 'SET_5OUT'];
  const setler = {};
  adlar.forEach(a => {
    const m = new RegExp('const ' + a + '\\s*=\\s*(\\[\\[[^;]*?\\]\\])\\s*;').exec(src);
    if (m) { try { setler[a] = JSON.parse(m[1].replace(/\s+/g, '')); } catch (e) {} }
  });
  const bulunan = Object.keys(setler);
  ok('beş set dizilimi de okunabildi', bulunan.length === adlar.length, bulunan.join(', '));
  if (bulunan.length !== adlar.length) return;

  let enKotuMin = 1e9, enKotuAd = '', alanlar = [], boyali = 0, ortaVar = 0;
  bulunan.forEach(a => {
    const F = setler[a];
    let mn = 1e9;
    for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++)
      mn = Math.min(mn, Math.hypot(F[i][0] - F[j][0], F[i][1] - F[j][1]));
    if (mn < enKotuMin) { enKotuMin = mn; enKotuAd = a; }
    alanlar.push(100 * kutu(F) / (470 * 500));
    if (F.some(p => p[0] <= 195 && Math.abs(p[1] - 250) <= 82)) boyali++;
    if (F.some(p => p[0] > 940 / 3)) ortaVar++;
  });
  const ortAlan = alanlar.reduce((a, b) => a + b, 0) / alanlar.length;
  ok('her dizilimde en yakın ikili ≥ 3,5 m', enKotuMin / PX_M >= 3.5,
    `en dar: ${enKotuAd} ${(enKotuMin / PX_M).toFixed(2)} m`);
  ok('dizilimlerin ortalama yayılımı ≥ %30', ortAlan >= 30,
    alanlar.map((a, i) => bulunan[i].replace('SET_', '') + ' %' + a.toFixed(0)).join(' · '));
  ok('dizilimlerin çoğunda boyada oyuncu var', boyali >= Math.ceil(bulunan.length * 0.6),
    `${boyali}/${bulunan.length} dizilim`);
  ok('hiçbir dizilim orta üçte bire taşmıyor', ortaVar === 0, `${ortaVar} dizilim taşıyor`);
}

/** Yeni kariyer + maç sayfası. */
async function hazirla(page, base) {
  await page.goto(base + '/charazay2.0.html?test=1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Faz11 Kartalları');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await page.evaluate(() => showPage('mac', document.querySelector('#sbNav button[data-page="mac"]')));
  await sleep(400);
}

(async () => {
  console.log('FAZ 11 KABUL KRİTERİ DENETİMİ\n' + '='.repeat(64));
  geometri();

  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    channel: 'chrome', headless: true,
    args: ['--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });
  const hatalar = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript('(' + SEED_FN.toString() + ')(987654321);');
    page.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });
    page.on('pageerror', e => hatalar.push('pageerror: ' + e.message));
    await hazirla(page, base);

    // ── B2: kare kaybında yetişme ────────────────────────────────────────────────────────
    console.log('\n[B2] Kare kaybında yetişme (F11-1)');
    await page.evaluate(() => { setMatchRate(1); startMatch(); });
    await sleep(2500);

    /* ── ÖLÇÜM: JETON SAPMASI ANLIK DEĞİL PENCEREYLE OKUNUR ──────────────────────────
       Eski kapı tek bir anda `|p − hedef|` ortalamasını alıp 60 px eşiğine vuruyordu.
       Oysa bu büyüklük SAĞLIKLI sahnede de doğal olarak salınır: yeni dizilim atandığı
       anda jetonlar hedeflerine YÜRÜR, ölçüm o ana denk gelirse sapma yüksektir.
       Ölçüldü (normal akış, 14 örnek): 237 · 105 · 45 · 32 · 13 · 12 · 21 · 17 · 13 ·
       13 · 16 · 500 px — yani kapı 60 px eşiğiyle davranışı değil ÖRNEKLEME ANINI
       yargılıyordu ve arka plandan bağımsız olarak rastgele düşüyordu (FAZ 26'daki
       F25-2 dersinin aynısı: yanlış şeyi ölçen kapı kusuru kendisi üretir).
       Arka plandan dönüşteki gerçek değer ise 14 px ölçüldü — yetişme ÇALIŞIYOR.

       Yeni ölçüt üç ayaklıdır:
         (1) yetişme gerçekten koştu mu (`_snapN` arttı),
         (2) dönüşteki sapma dağılımı NORMAL AKIŞTAKİNDEN kötü değil (aynı koşuda
             ölçülen taban ile kıyaslanır — kendini kalibre eder, eşik gömülü değil),
         (3) hiçbir jeton askıda kalmadı (sonlu koordinat + atanmış hedef). */
    const olcSapma = () => page.evaluate(() => {
      const S = mState._sim;
      const tumu = (S.offP || []).concat(S.defP || []);
      if (!tumu.length) return null;
      const askida = tumu.filter(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.tx == null || p.ty == null).length;
      const sap = tumu.filter(p => p.tx != null && p.ty != null && Number.isFinite(p.x) && Number.isFinite(p.y))
        .map(p => Math.hypot(p.x - p.tx, p.y - p.ty));
      if (!sap.length) return null;
      return {
        ort: sap.reduce((a, b) => a + b, 0) / sap.length,
        max: Math.max.apply(null, sap),
        askida,
        snapN: S._snapN || 0
      };
    });
    const medyan = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : -1; };
    /* Taban: normal akışta (ön planda) 10 örnek. */
    const taban = [];
    for (let i = 0; i < 10; i++) { await sleep(450); const m = await olcSapma(); if (m) taban.push(m); }
    const tabanMed = medyan(taban.map(x => x.ort));

    const oncesi = await page.evaluate(() => ({ ev: mState.idx, sim: mState._sim.time, snapN: (mState._sim._snapN || 0) }));
    /* Sekmeyi arka plana al: rAF kısıtlanır, olay zamanlayıcısı akmaya devam eder. */
    const bos = await ctx.newPage();
    await bos.goto('about:blank');
    await bos.bringToFront();
    await sleep(9000);
    await page.bringToFront();
    /* Dönüşten sonra da PENCEREYLE örnekle: tek an, tabanla aynı sebepten yanıltıcıdır. */
    const donus = [];
    for (let i = 0; i < 10; i++) { await sleep(220); const m = await olcSapma(); if (m) donus.push(m); }
    const donusMed = medyan(donus.map(x => x.ort));
    const sonrasi = await page.evaluate(() => ({
      ev: mState.idx,
      calisiyor: !!mState.running,
      snapN: (mState._sim._snapN || 0),
      topSahipli: !!(mState._sim.ball && mState._sim.ball.carrier)
    }));
    await bos.close();
    ok('arka planda olaylar akmaya devam etti', sonrasi.ev > oncesi.ev, `olay ${oncesi.ev} → ${sonrasi.ev}`);
    ok('arka plandan dönüşte yetişme çalıştı (_simCatchUp)',
      sonrasi.snapN > oncesi.snapN, `_snapN ${oncesi.snapN} → ${sonrasi.snapN}`);
    /* Tolerans: taban × 1,6 + 25 px. Taban ölçüde küçükse (sahne sakin) mutlak 60 px
       tabanı korunur — kapı sıfıra yakın bir tabana takılıp kılı kırk yarmasın. */
    const esik = Math.max(60, tabanMed * 1.6 + 25);
    ok('ön plana dönünce sahne anlatıma eşitlendi (jetonlar hedefinde)',
      donusMed >= 0 && donusMed <= esik,
      `dönüş medyanı ${donusMed.toFixed(0)} px ≤ eşik ${esik.toFixed(0)} px (normal akış tabanı ${tabanMed.toFixed(0)} px)`);
    const askidaTop = donus.reduce((a, b) => a + b.askida, 0);
    ok('hiçbir jeton askıda kalmadı (sonlu koordinat + atanmış hedef)',
      askidaTop === 0, askidaTop ? askidaTop + ' örnekte askıda jeton' : donus.length + ' örnek temiz');
    ok('maç arka plandan sonra da canlı', sonrasi.calisiyor);

    // ── B4: kesme noktası çakışması ──────────────────────────────────────────────────────
    console.log('\n[B4] Kesme noktası seçimi (F11-2)');
    const cut = await page.evaluate(() => {
      const S = mState._sim;
      const off = S.offP;
      const c = off[0];
      /* Diğer dördünü iki köşeye ve slotlara oturt; kesici hangi noktayı seçiyor? */
      const doluluk = [[72, 52], [72, 448], [296, 132], [296, 368]];
      off.slice(1).forEach((p, i) => { p.tx = doluluk[i][0]; p.ty = doluluk[i][1]; });
      const sp = _pickCutSpot(off, c, true);
      let mn = 1e9;
      off.slice(1).forEach(p => { mn = Math.min(mn, Math.hypot(p.tx - sp[0], p.ty - sp[1])); });
      return { sp: [Math.round(sp[0]), Math.round(sp[1])], mn: Math.round(mn) };
    });
    ok('kesici dolu köşeye gitmiyor', cut.mn / PX_M >= 3.0,
      `seçilen nokta (${cut.sp[0]},${cut.sp[1]}) · en yakın takım arkadaşı ${(cut.mn / PX_M).toFixed(2)} m`);

    await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
    await sleep(400);

    // ── B3: startMatch sessiz kilitlenmesi ───────────────────────────────────────────────
    console.log('\n[B3] startMatch sessiz kilitlenmesi (F11-6)');
    const kilit = await page.evaluate(async () => {
      const cikti = {};
      /* Durdurulan maçta kilitli sonuç butonda görünüyor mu? */
      const b = document.getElementById('startMatchBtn');
      cikti.durdurEtiket = b ? b.textContent.trim() : '';
      /* Ana panel butonu "maç devam ediyor"da takılı kalmamalı. */
      showPage('dashboard', document.querySelector('#sbNav button[data-page="dashboard"]'));
      await new Promise(r => setTimeout(r, 250));
      const card = document.getElementById('dashNextCard');
      const db = card ? card.querySelector('.dn-play') : null;
      cikti.dashEtiket = db ? db.textContent.trim() : '';
      cikti.dashPasif = db ? !!db.disabled : null;
      /* Takılı running bayrağı: maç yok ama bayrak açık → startMatch kurtarmalı. */
      showPage('mac', document.querySelector('#sbNav button[data-page="mac"]'));
      await new Promise(r => setTimeout(r, 250));
      mState.running = true;
      if (typeof matchEventTimer !== 'undefined' && matchEventTimer) { clearTimeout(matchEventTimer); matchEventTimer = null; }
      const oncekiBildirim = document.querySelectorAll('#notifWrap > *').length;
      startMatch();
      await new Promise(r => setTimeout(r, 500));
      cikti.kurtarildi = !!(mState.running && mState.events && mState.events.length);
      cikti.bildirimArtti = document.querySelectorAll('#notifWrap > *').length > oncekiBildirim;
      return cikti;
    });
    /* FAZ 42: kapının NİYETİ "durdurulan maç sessizce kilitlenmesin, buton ne yapacağını
       söylesin"dir — belirli bir SÖZCÜK değil. Durdurulan maç sürdürülebilir olduğu için
       doğru etiket "Devam et"tir; startMatch zaten canResumeMatch dalına düşüp maçı
       sürdürüyordu, yani eski etiket yaptığı işi söylemiyordu (kullanıcı raporu). Kilitli
       sonuç etiketi ise yalnız sürdürülemeyen maçta (sayfa yenilendikten sonra) doğrudur. */
    ok('durdurulan maçta buton ne yapacağını söylüyor (devam / kilitli sonuç)',
      /devam|continue|kilitli sonuc|kilitli sonuç|locked result|sonuçlandır|finish/i.test(kilit.durdurEtiket),
      kilit.durdurEtiket);
    ok('ana panel butonu "devam ediyor"da takılı kalmıyor',
      !/Devam Ediyor|in progress/i.test(kilit.dashEtiket) && kilit.dashPasif === false, kilit.dashEtiket);
    ok('takılı running bayrağı kurtarılıyor (oyun kilitlenmiyor)', kilit.kurtarildi === true);

    await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
    ok('konsol hatası yok', hatalar.length === 0, hatalar.slice(0, 2).join(' | '));
  } finally {
    await browser.close();
    server.close();
  }

  // ── B5: sonuç değişmezliği ─────────────────────────────────────────────────────────────
  console.log('\n[B5] Sonuç değişmezliği');
  console.log('  ℹ  dizilim sunum katmanıdır; ayrıca çalıştır: node tools/band.js  (hash değişmemeli)');

  const dusen = sonuc.filter(s => !s.gecti);
  console.log('\n' + '='.repeat(64));
  console.log(`SONUÇ: ${sonuc.length - dusen.length}/${sonuc.length} kriter geçti`);
  if (dusen.length) { dusen.forEach(d => console.log('  ✗ ' + d.ad + (d.not ? ' — ' + d.not : ''))); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('HATA:', e); process.exit(1); });
