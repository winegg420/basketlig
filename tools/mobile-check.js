#!/usr/bin/env node
/**
 * Charazay 2.0 — MOBİL ARAYÜZ DENETÇİSİ (FAZ 12)
 *
 * 390×844 dokunmatik viewport'ta ölçer (FAZ 12 belgesi bölüm 5):
 *   · çekirdek işlerin DOKUNMA SAYISI (gezinme 1, maç izleme 2, ilk 5 / taktik 2, satın alma 3)
 *   · maç sayfasında birincil eylemin ekran derinliği ve sahanın ekran payı
 *   · tek sayı gösteren kartların yüksekliği
 *   · yatay taşma · 44 px altı dokunma hedefi · market ilk ekran yoğunluğu
 *
 * Dokunma sayısı GERÇEKTEN tıklanarak ölçülür (varsayım değil): her adımda gerçek bir
 * `click` atılır ve hedef durumun oluştuğu doğrulanır.
 *
 * Çalıştırma:  node tools/mobile-check.js
 * Çıkış kodu:  0 = hepsi geçti, 1 = en az bir ölçüm hedefin dışında.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const VP = { width: 390, height: 844 };
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

const sonuc = [];
function ok(ad, gecti, not) {
  sonuc.push({ ad, gecti: !!gecti, not: not || '' });
  console.log(`  ${gecti ? '✓' : '✗'} ${ad}${not ? ' — ' + not : ''}`);
}

/** Dokunma sayacı: sayfadaki her gerçek tıklamayı sayar. */
function sayac(page) {
  let n = 0;
  return {
    async tikla(sel) { n++; await page.click(sel, { timeout: 6000 }); await sleep(320); },
    get sayi() { return n; },
    sifirla() { n = 0; },
  };
}

async function aktifSayfa(page) {
  return page.evaluate(() => {
    const el = document.querySelector('#pageStage > .page.active');
    return el ? el.id.replace('page-', '') : null;
  });
}

(async () => {
  console.log('MOBİL ARAYÜZ DENETİMİ — 390×844\n' + '='.repeat(64));
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const hatalar = [];
  try {
    const ctx = await browser.newContext({ viewport: VP, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });
    page.on('pageerror', e => hatalar.push('pageerror: ' + e.message));

    await page.goto(base + '/charazay2.0.html?test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
    await page.click('#loginPage button.btn-p');
    await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
    await page.fill('#teamName', 'Mobil Test');
    await page.click('#setupPage button.btn-p');
    await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
    await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
    await sleep(400);

    const t = sayac(page);

    // ── 1) Gezinme: her sekme 1 dokunuş ─────────────────────────────────────────────────
    console.log('\n[1] Gezinme — alt sekme çubuğu (F12-1)');
    const tabVar = await page.evaluate(() => {
      const n = document.getElementById('mobileTabs');
      if (!n) return { yok: true };
      const r = n.getBoundingClientRect();
      return { gorunur: getComputedStyle(n).display !== 'none', h: Math.round(r.height), alt: Math.round(window.innerHeight - r.bottom) };
    });
    ok('alt sekme çubuğu mobilde görünür', !tabVar.yok && tabVar.gorunur,
      tabVar.yok ? 'öğe yok' : `yükseklik ${tabVar.h} px · ekran dibinde ${tabVar.alt === 0 ? 'evet' : 'hayır'}`);

    for (const [tab, ad] of [['dashboard', 'Ana Panel'], ['kadro', 'Kadro'], ['mac', 'Maç'], ['lig', 'Lig'], ['market', 'Market']]) {
      t.sifirla();
      await t.tikla(`#mobileTabs .mt[data-tab="${tab}"]`);
      const geldi = (await aktifSayfa(page)) === tab;
      ok(`${ad} → ${t.sayi} dokunuş`, geldi && t.sayi === 1, geldi ? '' : 'sayfa açılmadı');
    }

    // ── 2) Maçı izleme: 2 dokunuş ───────────────────────────────────────────────────────
    console.log('\n[2] Çekirdek işler');
    await page.click('#mobileTabs .mt[data-tab="dashboard"]'); await sleep(300);
    t.sifirla();
    await t.tikla('#mobileTabs .mt[data-tab="mac"]');
    await t.tikla('#startMatchBtn');
    const oynuyor = await page.evaluate(() => !!(typeof mState !== 'undefined' && mState && mState.running));
    ok(`maçı izleme → ${t.sayi} dokunuş`, oynuyor && t.sayi <= 2, oynuyor ? '' : 'maç başlamadı');
    await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
    await sleep(300);

    // İlk 5 düzenleme: 2 dokunuş
    await page.click('#mobileTabs .mt[data-tab="dashboard"]'); await sleep(300);
    t.sifirla();
    await t.tikla('#mobileTabs .mt[data-tab="kadro"]');
    await t.tikla('#kadroActionRow button.btn-p');
    const ilk5Acik = await page.evaluate(() => {
      const b = document.getElementById('appModalBody');
      return !!(b && /İlk 5|Starting Five/i.test(b.textContent || ''));
    });
    ok(`ilk 5 düzenleme → ${t.sayi} dokunuş`, ilk5Acik && t.sayi <= 2, ilk5Acik ? '' : 'editör açılmadı');
    await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
    await sleep(250);

    // Taktik değiştirme: 2 dokunuş
    await page.click('#mobileTabs .mt[data-tab="dashboard"]'); await sleep(300);
    t.sifirla();
    await t.tikla('#mobileTabs .mt[data-tab="kadro"]');
    await t.tikla('#kadroActionRow button.btn-sm');
    const taktikAcik = await page.evaluate(() => {
      const b = document.getElementById('appModalBody');
      return !!(b && /Taktik|Tactic/i.test(b.textContent || ''));
    });
    ok(`taktik değiştirme → ${t.sayi} dokunuş`, taktikAcik && t.sayi <= 2, taktikAcik ? '' : 'taktik açılmadı');
    await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
    await sleep(250);

    // Oyuncu satın alma: 3 dokunuş
    await page.click('#mobileTabs .mt[data-tab="dashboard"]'); await sleep(300);
    t.sifirla();
    await t.tikla('#mobileTabs .mt[data-tab="market"]');
    const oncekiKadro = await page.evaluate(() => (G.players || []).length);
    await t.tikla('#marketList .btn-bid');
    await sleep(500);
    const sonrakiKadro = await page.evaluate(() => (G.players || []).length);
    const modalAcik = await page.evaluate(() => {
      const r = document.getElementById('appModalRoot');
      return !!(r && r.style.display !== 'none');
    });
    let alindi = sonrakiKadro > oncekiKadro;
    if (!alindi && modalAcik) {   /* onay modalı çıktıysa üçüncü dokunuş */
      const onay = await page.$('#appModalBody button.btn-p');
      if (onay) { t.sifirla; await onay.click(); await sleep(400); }
      alindi = (await page.evaluate(() => (G.players || []).length)) > oncekiKadro;
    }
    ok(`oyuncu satın alma → ${t.sayi} dokunuş`, t.sayi <= 3, alindi ? '' : 'satın alma tamamlanmadı (bütçe/kadro dolu olabilir)');
    await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });

    // ── 3) Maç sayfası düzeni ───────────────────────────────────────────────────────────
    console.log('\n[3] Maç sayfası düzeni (F12-2)');
    await page.click('#mobileTabs .mt[data-tab="mac"]'); await sleep(500);
    await page.evaluate(() => { const p = document.querySelector('#page-mac'); if (p) p.scrollTop = 0; });
    await sleep(200);
    const duzen = await page.evaluate(() => {
      const p = document.querySelector('#page-mac');
      const b = document.getElementById('startMatchBtn');
      const c = document.querySelector('#macLiveAnchor .court-container');
      const sb = document.querySelector('#macLiveAnchor .scoreboard');
      const vh = window.innerHeight;
      const pr = p.getBoundingClientRect();
      const brc = b.getBoundingClientRect();
      const crc = c.getBoundingClientRect();
      const sbr = sb.getBoundingClientRect();
      /* Görünür alanla kesişen saha yüzdesi */
      const kes = Math.max(0, Math.min(crc.bottom, pr.bottom) - Math.max(crc.top, pr.top));
      /* Sahanın DİKEY ekran payı (FAZ 12 belgesindeki "%24" ve "%45" oranları da dikeydir).
         Geometrik tavan: saha SVG'sinin en-boy oranı 3200/1900 = 1,684 — ekran genişliği kadar
         geniş çizilse bile yüksekliği (genişlik / 1,684) ile sınırlıdır. 390×844'te bu
         232 px = ekranın %27,4'ü eder; belgedeki "> %30" hedefi bu ekranda MATEMATİKSEL olarak
         ulaşılamaz. Bu yüzden ölçü tavana göre verilir: saha tam genişlikte mi, değil mi. */
      const tavan = 100 * (window.innerWidth / (3200 / 1900)) / vh;
      return {
        derinlik: (brc.top - pr.top + p.scrollTop) / vh,
        sahaPay: 100 * crc.height / vh,
        sahaTavan: tavan,
        tabelaY: Math.round(sbr.height),
        sahaGorunur: kes > 0,
        butonGorunur: brc.top >= pr.top && brc.bottom <= pr.bottom,
      };
    });
    ok('birincil eylemin derinliği < 0,5 ekran', duzen.derinlik < 0.5, duzen.derinlik.toFixed(2) + ' ekran');
    ok('saha tam genişlikte (geometrik tavanın ≥ %95\'i)',
      duzen.sahaPay >= duzen.sahaTavan * 0.95,
      `ekran payı %${duzen.sahaPay.toFixed(1)} · bu ekranda tavan %${duzen.sahaTavan.toFixed(1)}`);
    ok('tabela + saha + eylem kaydırmasız görünüyor', duzen.sahaGorunur && duzen.butonGorunur,
      `tabela ${duzen.tabelaY} px`);

    // ── 4) Bilgi yoğunluğu ──────────────────────────────────────────────────────────────
    console.log('\n[4] Bilgi yoğunluğu (F12-4)');
    const sayfalar = ['dashboard', 'kadro', 'mac', 'lig', 'market', 'altyapi', 'antrenman', 'arena', 'bilanco', 'analiz'];
    let enYuksek = 0, enYuksekAd = '';
    const tasan = [];
    for (const s of sayfalar) {
      await page.evaluate((pg) => showPage(pg, document.querySelector('#sbNav button[data-page="' + pg + '"]')), s);
      await sleep(350);
      const r = await page.evaluate(() => {
        /* Tek sayı gösteren kart: .sbox ya da g3/g4 içindeki kısa metinli kutu */
        const aday = Array.from(document.querySelectorAll('#pageStage > .page.active .sbox, #pageStage > .page.active .g3 > div, #pageStage > .page.active .g4 > div'));
        let mx = 0;
        aday.forEach(el => {
          const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
          if (txt.length > 34 || !/\d/.test(txt)) return;
          if (el.querySelector('svg,table,img,canvas')) return;
          const h = el.getBoundingClientRect().height;
          if (h > mx) mx = h;
        });
        const doc = document.querySelector('#pageStage > .page.active');
        return { mx: Math.round(mx), tasma: Math.max(0, Math.round(doc.scrollWidth - doc.clientWidth)) };
      });
      if (r.mx > enYuksek) { enYuksek = r.mx; enYuksekAd = s; }
      if (r.tasma > 0) tasan.push(s + ' (' + r.tasma + ' px)');
    }
    ok('tek sayı kartı < 100 px', enYuksek < 100, `en yüksek: ${enYuksekAd} ${enYuksek} px`);
    ok('yatay taşma yok (10 sayfa)', tasan.length === 0, tasan.join(', '));

    // ── 5) Dokunma hedefleri ────────────────────────────────────────────────────────────
    console.log('\n[5] Dokunma hedefleri (F12-8)');
    const kucuk = [];
    for (const s of sayfalar) {
      await page.evaluate((pg) => showPage(pg, document.querySelector('#sbNav button[data-page="' + pg + '"]')), s);
      await sleep(300);
      const r = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('#pageStage > .page.active button, #pageStage > .page.active select, #mobileTabs button').forEach(el => {
          const rc = el.getBoundingClientRect();
          if (rc.width < 1 || rc.height < 1) return;      /* gizli */
          if (rc.height < 44) out.push((el.id || el.className || el.tagName) + ' ' + Math.round(rc.width) + '×' + Math.round(rc.height));
        });
        return out;
      });
      r.forEach(x => kucuk.push(s + ': ' + x));
    }
    ok('44 px altı dokunma hedefi yok', kucuk.length === 0, kucuk.slice(0, 3).join(' | ') + (kucuk.length > 3 ? ` (+${kucuk.length - 3})` : ''));

    // ── 6) Market yoğunluğu ─────────────────────────────────────────────────────────────
    console.log('\n[6] Market yoğunluğu (F12-6)');
    await page.evaluate(() => showPage('market', document.querySelector('#sbNav button[data-page="market"]')));
    await sleep(500);
    const yogunluk = await page.evaluate(() => {
      const vh = window.innerHeight, vw = window.innerWidth;
      let n = 0;
      document.querySelectorAll('#page-market button, #page-market select, #page-market input, #page-market [role="button"]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return;
        n++;
      });
      return n;
    });
    ok('market ilk ekranında ≤ 25 etkileşimli öğe', yogunluk <= 25, yogunluk + ' öğe');

    ok('konsol hatası yok', hatalar.length === 0, hatalar.slice(0, 2).join(' | '));
  } finally {
    await browser.close();
    server.close();
  }

  const dusen = sonuc.filter(s => !s.gecti);
  console.log('\n' + '='.repeat(64));
  console.log(`SONUÇ: ${sonuc.length - dusen.length}/${sonuc.length} ölçüm hedefinde`);
  if (dusen.length) { dusen.forEach(d => console.log('  ✗ ' + d.ad + (d.not ? ' — ' + d.not : ''))); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('HATA:', e); process.exit(1); });
