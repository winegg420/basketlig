#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 10 KABUL KRİTERİ DENETÇİSİ
 *
 * Sınananlar:
 *   A1  Fikstür saati kapısı (F10-2)  — ?test=1 olmadan saati gelmemiş maç başlamaz,
 *                                        ?test=1 ile kapı açılır (araçlar bozulmaz).
 *   A2  Analitik katmanı (F10-4)      — olaylar üretiliyor, varsayılan olarak DIŞ İSTEK YOK.
 *   A3  Paylaşım etiketleri (F10-5)   — og/twitter/description + og-image 1200×630.
 *   A4  PWA (F10-7)                   — manifest geçerli, ikonlar var, sw.js sürümü ?v= ile aynı,
 *                                        service worker YEREL sunucuda kaydedilmiyor.
 *   A5  Öğretici dili (F10-6)         — EN oturumunda 7 adımın tamamı + butonlar İngilizce.
 *   A6  Paylaşım akışı (F10-5)        — ayarlarda davet butonu, maç bitince "Sonucu Paylaş".
 *
 * Çalıştırma:  node tools/faz10-check.js
 * Çıkış kodu:  0 = hepsi geçti, 1 = en az bir kriter düştü.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon',
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

const sonuc = [];
function ok(ad, gecti, not) {
  sonuc.push({ ad, gecti: !!gecti, not: not || '' });
  console.log(`  ${gecti ? '✓' : '✗'} ${ad}${not ? ' — ' + not : ''}`);
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** PNG boyutunu başlıktan okur (bağımlılıksız). */
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/** Yeni kariyer aç (öğreticiyi kapatır). */
async function yeniKariyer(page, base, qs) {
  await page.goto(base + '/charazay2.0.html' + (qs || ''), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Faz10 Kartalları');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await sleep(400);
}

// ══ A3 / A4: dosya tabanlı denetimler (tarayıcı gerekmez) ═══════════════════════════════
function dosyaDenetimleri() {
  console.log('\n[A3] Paylaşım / arama görünürlüğü etiketleri');
  const html = fs.readFileSync(path.join(ROOT, 'charazay2.0.html'), 'utf8');
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const gerekli = ['name="description"', 'property="og:title"', 'property="og:description"',
    'property="og:image"', 'property="og:url"', 'name="twitter:card"', 'name="twitter:image"'];
  const eksikH = gerekli.filter(g => html.indexOf(g) < 0);
  const eksikI = gerekli.filter(g => index.indexOf(g) < 0);
  ok('charazay2.0.html og/twitter etiketleri', eksikH.length === 0, eksikH.join(', ') || `${gerekli.length}/${gerekli.length} etiket`);
  ok('index.html og/twitter etiketleri', eksikI.length === 0, eksikI.join(', ') || `${gerekli.length}/${gerekli.length} etiket`);
  const ogAbs = /property="og:image" content="(https:\/\/[^"]+)"/.exec(html);
  ok('og:image mutlak URL', !!ogAbs, ogAbs ? ogAbs[1] : 'göreli veya eksik');
  const ogFile = path.join(ROOT, 'assets', 'og-image.png');
  const boy = fs.existsSync(ogFile) ? pngSize(ogFile) : null;
  ok('og-image.png 1200×630', !!boy && boy.w === 1200 && boy.h === 630,
    boy ? `${boy.w}×${boy.h}` : 'dosya yok');

  console.log('\n[A4] PWA — manifest + service worker');
  let man = null, manHata = '';
  try { man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')); }
  catch (e) { manHata = e.message; }
  const manAlan = man ? ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color', 'icons']
    .filter(k => !man[k]) : ['dosya'];
  ok('manifest.json geçerli ve eksiksiz', man && manAlan.length === 0, manAlan.join(', ') || manHata || 'tamam');
  const ikonlar = (man && man.icons || []).map(i => i.src);
  const eksikIkon = ikonlar.filter(s => !fs.existsSync(path.join(ROOT, s)));
  ok('manifest ikonları mevcut', ikonlar.length >= 2 && eksikIkon.length === 0, eksikIkon.join(', ') || `${new Set(ikonlar).size} dosya`);
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const swV = (/SCRIPT_V\s*=\s*'(\d+)'/.exec(sw) || [])[1];
  const htmlV = Array.from(html.matchAll(/js\/[a-z0-9-]+\.js\?v=(\d+)/g)).map(m => m[1]);
  const tekV = Array.from(new Set(htmlV));
  ok('sw.js sürümü script ?v= ile aynı', tekV.length === 1 && swV === tekV[0],
    `sw=${swV} · html=${tekV.join('/')}`);
  const swShell = /SHELL\s*=/.test(sw) && /addEventListener\('fetch'/.test(sw);
  ok('sw.js kabuk önbelleği + fetch işleyicisi', swShell);
}

(async () => {
  console.log('FAZ 10 KABUL KRİTERİ DENETİMİ\n' + '='.repeat(60));
  dosyaDenetimleri();

  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const konsolHatalari = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') konsolHatalari.push(m.text()); });
    page.on('pageerror', e => konsolHatalari.push(e.message));

    // ── A1: fikstür saati kapısı ────────────────────────────────────────────────────────
    console.log('\n[A1] Fikstür saati kapısı (F10-2)');
    await yeniKariyer(page, base);
    const kapi = await page.evaluate(() => {
      const ileri = { scheduledAt: Date.now() + 3600000 };
      const gecmis = { scheduledAt: Date.now() - 3600000 };
      return {
        testModu: TEST_MODU,
        ileriKapali: matchTimeGateOk(ileri) === false,
        gecmisAcik: matchTimeGateOk(gecmis) === true,
        alanYokAcik: matchTimeGateOk({}) === true,
        mesaj: matchTimeGateMsg(ileri),
      };
    });
    ok('normal modda test bayrağı kapalı', kapi.testModu === false);
    ok('saati gelmemiş maç engelleniyor', kapi.ileriKapali);
    ok('saati gelmiş / saatsiz maç serbest', kapi.gecmisAcik && kapi.alanYokAcik);
    ok('kapı mesajı maç saatini içeriyor', /\d/.test(kapi.mesaj), kapi.mesaj);

    // startMatch gerçekten durduruyor mu? (sezon başlatıp fikstüre saat basarak)
    const gercekKapi = await page.evaluate(async () => {
      try {
        if (!G.season || !G.season.active) startLeagueSeason();
        const m = findNextUserSeasonMatch();
        if (!m) return { hata: 'fikstürde maç yok' };
        m.scheduledAt = Date.now() + 3600000;
        startMatch();
        await new Promise(r => setTimeout(r, 300));
        const durum = { basladi: !!(mState && mState.running) };
        delete m.scheduledAt;
        return durum;
      } catch (e) { return { hata: e.message }; }
    });
    ok('startMatch kapıya uyuyor', gercekKapi.basladi === false, gercekKapi.hata || '');

    const testModuAcik = await (async () => {
      const p2 = await ctx.newPage();
      await p2.goto(base + '/charazay2.0.html?test=1', { waitUntil: 'domcontentloaded' });
      await p2.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
      const v = await p2.evaluate(() => ({
        testModu: TEST_MODU,
        acik: matchTimeGateOk({ scheduledAt: Date.now() + 3600000 }) === true,
      }));
      await p2.close();
      return v;
    })();
    ok('?test=1 kapıyı açıyor (araçlar çalışmaya devam eder)', testModuAcik.testModu === true && testModuAcik.acik);

    // ── A2: analitik ────────────────────────────────────────────────────────────────────
    console.log('\n[A2] Analitik katmanı (F10-4)');
    const olaylar = await page.evaluate(() => (window.__charazayAnalytics || []).map(x => x.ad));
    ok('oyun_acildi olayı üretildi', olaylar.indexOf('oyun_acildi') >= 0, olaylar.join(', '));
    ok('takim_kuruldu olayı üretildi', olaylar.indexOf('takim_kuruldu') >= 0);
    const disIstek = await page.evaluate(() => ({
      src: ANALYTICS_SRC, prod: isProdHost(),
      betik: Array.from(document.scripts).filter(s => s.src && s.src.indexOf(location.origin) !== 0).length,
    }));
    ok('varsayılan yapılandırma dış istek yapmıyor', disIstek.src === '' && disIstek.betik === 0,
      `ANALYTICS_SRC="${disIstek.src}" · dış betik ${disIstek.betik}`);
    ok('yerel sunucu üretim sayılmıyor (isProdHost)', disIstek.prod === false);

    // ── A4 (tarayıcı tarafı): SW yerelde kaydedilmiyor ──────────────────────────────────
    const swKayit = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { yok: true };
      const rs = await navigator.serviceWorker.getRegistrations();
      return { sayi: rs.length };
    });
    ok('service worker yerelde kaydedilmiyor', swKayit.yok || swKayit.sayi === 0,
      swKayit.yok ? 'tarayıcı desteklemiyor' : `${swKayit.sayi} kayıt`);

    // ── A6: paylaşım akışı ──────────────────────────────────────────────────────────────
    console.log('\n[A6] Paylaşım akışı (F10-5)');
    const paylas = await page.evaluate(async () => {
      const cikti = { davetVar: false, kopyalanan: '', sonucButonu: false };
      openSettingsModal();
      cikti.davetVar = /shareGameInvite\(\)/.test(document.getElementById('appModalBody').innerHTML);
      closeAppModal();
      /* Paylaşım yolunu taklit et (navigator.share) — metin + bağlantı doğru mu? */
      const eskiShare = Object.getOwnPropertyDescriptor(Navigator.prototype, 'share');
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (d) => { cikti.kopyalanan = (d.text || '') + '\n' + (d.url || ''); return Promise.resolve(); },
      });
      shareGameInvite();
      await new Promise(r => setTimeout(r, 60));
      cikti.davetMetni = cikti.kopyalanan;
      /* Maç sonu paylaş butonu */
      showShareResultButton({ home: 88, away: 80 });
      const b = document.getElementById('shareResultBtn');
      cikti.sonucButonu = !!b && b.style.display !== 'none';
      shareMatchResult();
      await new Promise(r => setTimeout(r, 60));
      cikti.sonucMetni = cikti.kopyalanan;
      cikti.olaylar = (window.__charazayAnalytics || []).map(x => x.ad);
      try { delete navigator.share; } catch (e) {}
      if (eskiShare) Object.defineProperty(Navigator.prototype, 'share', eskiShare);
      return cikti;
    });
    ok('ayarlarda davet butonu var', paylas.davetVar);
    ok('davet metni takımı + bağlantıyı içeriyor',
      /http/.test(paylas.davetMetni || '') && /Faz10/.test(paylas.davetMetni || ''),
      (paylas.davetMetni || '').replace('\n', ' → '));
    ok('sonuç metni skoru + bağlantıyı içeriyor',
      /http/.test(paylas.sonucMetni || '') && /88-80/.test(paylas.sonucMetni || ''),
      (paylas.sonucMetni || '').replace('\n', ' → '));
    ok('maç bitince "Sonucu Paylaş" görünüyor', paylas.sonucButonu);
    ok('paylaşım analitik olayları düşüyor',
      (paylas.olaylar || []).indexOf('davet_paylasildi') >= 0 && (paylas.olaylar || []).indexOf('sonuc_paylasildi') >= 0,
      (paylas.olaylar || []).join(', '));

    // ── A5: öğretici dili (EN) ──────────────────────────────────────────────────────────
    console.log('\n[A5] Öğretici dili — EN oturumu (F10-6)');
    const enCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await enCtx.addInitScript(() => { try { localStorage.setItem('charazay_lang', 'en'); } catch (e) {} });
    const en = await enCtx.newPage();
    en.on('pageerror', e => konsolHatalari.push('[EN] ' + e.message));
    await en.goto(base + '/charazay2.0.html', { waitUntil: 'domcontentloaded' });
    await en.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
    await en.click('#loginPage button.btn-p');
    await en.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
    await en.fill('#teamName', 'Faz10 Eagles');
    await en.click('#setupPage button.btn-p');
    await en.waitForSelector('#app', { state: 'visible', timeout: 8000 });
    await en.waitForSelector('#appModalRoot', { state: 'visible', timeout: 8000 });
    await sleep(300);
    /* TR'ye özgü harf/sözcük kalıntısı arıyoruz (özel isim yok: öğretici metinlerinde isim geçmez). */
    const trIz = /[çğşıöü]|\b(ve|için|ile|sonra|sayfas[ıi]|kadro|ma[çc])\b/i;
    const adimlar = [];
    for (let i = 0; i < 7; i++) {
      const metin = await en.evaluate(() => {
        const b = document.getElementById('appModalBody');
        return b ? b.innerText.replace(/\s+/g, ' ').trim() : '';
      });
      adimlar.push(metin);
      const ileri = await en.$('#appModalBody button.btn-p');
      if (!ileri) break;
      const et = (await ileri.innerText()).trim();
      if (/Start!/.test(et)) { adimlar.push('__SON:' + et); break; }
      await ileri.click();
      await sleep(120);
    }
    const kirli = adimlar.filter(a => trIz.test(a));
    ok('öğreticinin 7 adımı da İngilizce', adimlar.length >= 7 && kirli.length === 0,
      kirli.length ? kirli[0].slice(0, 90) : `${adimlar.length} adım tarandı`);
    const butonlar = await en.evaluate(() => {
      const b = document.getElementById('appModalBody');
      return b ? Array.from(b.querySelectorAll('button')).map(x => x.innerText.trim()) : [];
    });
    ok('öğretici butonları İngilizce', butonlar.length > 0 && !butonlar.some(x => /Sonraki|Atla|Geri|Başla/.test(x)),
      butonlar.join(' | '));
    await enCtx.close();

    ok('konsol hatası yok', konsolHatalari.length === 0, konsolHatalari.slice(0, 2).join(' | '));
  } finally {
    await browser.close();
    server.close();
  }

  const dusen = sonuc.filter(s => !s.gecti);
  console.log('\n' + '='.repeat(60));
  console.log(`SONUÇ: ${sonuc.length - dusen.length}/${sonuc.length} kriter geçti`);
  if (dusen.length) { dusen.forEach(d => console.log('  ✗ ' + d.ad + (d.not ? ' — ' + d.not : ''))); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('HATA:', e); process.exit(1); });
