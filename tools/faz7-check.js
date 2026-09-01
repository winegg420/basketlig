#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 7 KABUL KRİTERİ DENETÇİSİ
 *
 * `REVIZE-PAKETI-FAZ7.md` sonundaki 8 kabul kriterini FİİLEN çalıştırır. Kod okuyarak
 * "yaptım" demek yeterli değil — her madde gerçek tarayıcıda, gerçek senaryoyla sınanır.
 *
 *  K1  Playoff ortasında sayfa yenile → bracket ve seri skoru korunuyor
 *  K2  Kota dolduktan sonra yeniden yükle → en güncel kayıt geliyor (IndexedDB kazanır)
 *  K3  "Kaydı sil" → yeniden açılışta "Devam et" bloğu YOK (IDB kopyası da silinir)
 *  K4  Yeni oyun → arena bakımı ARENA_LVL[0].bk (ecoRound'lanmış değer değil)
 *  K5  Koçları kov + yenile → koçlar geri GELMİYOR (reroll istismarı kapalı)
 *  K6  İnternetsiz aç → yazı tipleri yerel yükleniyor, tabela taşmıyor
 *  K7  390×844'te İlk 5 ekranında yedeklerin hepsine erişilebiliyor (kart kaydırılabilir)
 *  K8  node tools/visual-check.js çıkış kodu 0   (ayrı çalıştırılır — burada kontrol edilmez)
 *  K9  a11y büyütme (zoom 1.18) açıkken sürükleme hayaleti imlecin altında kalıyor
 *
 * Çıkış kodu: 0 = tüm kriterler geçti, 1 = en az biri düştü.
 * Çalıştırma:  node tools/faz7-check.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const sonuc = [];
function kayit(kod, ad, gecti, detay) {
  sonuc.push({ kod, ad, gecti, detay });
  console.log(`  ${gecti ? '✓' : '✗'} ${kod}  ${ad}${detay ? '\n       ' + detay : ''}`);
}

/** Yeni kariyer kur; sayfa app ekranına geçmiş olarak döner. */
async function yeniKariyer(page, base, isim) {
  await page.goto(base + '/charazay2.0.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 20000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 10000 });
  await page.fill('#teamName', isim || 'Denetim Kartalları');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await sleep(400);
}

async function main() {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  console.log('Statik sunucu:', base);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const konsolHatalari = [];

  // ───────────────────────────────────────────────────────────────────────────
  // K4 — Yeni oyunda arena bakımı ham KR (150), ecoRound(45)=938 DEĞİL
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n── K4: yeni oyun arena bakımı ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => konsolHatalari.push('[K4] ' + e.message));
    await yeniKariyer(page, base, 'Arena Testi');
    const arena = await page.evaluate(() => ({ s: G.arena.s, bk: G.arena.bk, kap: G.arena.kap, lvl0: ARENA_LVL[0].bk, lvl0Kap: ARENA_LVL[0].kap }));
    /* FAZ 25 USD: eşik 150'ye ÇAKILIYDI; arena tablosu değişince (bakım $3.000) kapı
       kendi eski sayısını savunur oldu. Niyet zaten "bakım ham tablodan gelsin, ecoRound
       ile şişmesin" — ölçüt ARENA_LVL[0].bk'nin KENDİSİ. */
    kayit('K4', 'Yeni oyun → arena bakımı ARENA_LVL[0].bk',
      arena.bk === arena.lvl0 && arena.s === 1 && arena.kap === arena.lvl0Kap,
      `G.arena = {s:${arena.s}, kap:${arena.kap}, bk:${arena.bk}} · ARENA_LVL[0].bk=${arena.lvl0}`);

    // K5 aynı bağlamda: koçları kov + yeniden yükle
    console.log('\n── K5: koç reroll istismarı ──');
    const kocOnce = await page.evaluate(() => {
      G.coaches = [];                 // "hepsini kov"
      saveGameNow(false);
      return { kaydedilen: (JSON.parse(localStorage.getItem(GAME_SAVE_KEY)).coaches || []).length };
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loginPage', { state: 'visible', timeout: 20000 });
    await page.evaluate(() => { try { resumeFromSavedGame(); } catch (e) {} });
    await sleep(700);
    const kocSonra = await page.evaluate(() => (G.coaches || []).length);
    kayit('K5', 'Koçları kov + yenile → koçlar geri gelmiyor',
      kocSonra === 0,
      `kayıtta ${kocOnce.kaydedilen} koç · yeniden yüklemeden sonra ${kocSonra} koç (beklenen 0)`);
    await ctx.close();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // K1 — Playoff ortasında sayfa yenile → bracket ve seri skoru korunuyor
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n── K1: playoff ortasında yeniden yükleme ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => konsolHatalari.push('[K1] ' + e.message));
    await yeniKariyer(page, base, 'Playoff Testi');

    // Düzenli sezonu bitmiş + playoff başlamış bir duruma getir (gerçek akışın bıraktığı hâl).
    const kurulum = await page.evaluate(() => {
      // Sezon var; tüm maçları oynanmış say ve playoff'u elle kur.
      if (G.season && Array.isArray(G.season.matches)) G.season.matches.forEach(m => { m.played = true; });
      if (G.season) G.season.active = false;
      G.playoff = {
        active: true, champion: null, roundIx: 0,
        rounds: [[{ home: G.team.isim, away: 'Denetim Rakibi', hw: 2, aw: 1, seed: 1, games: [] }]]
      };
      saveGameNow(true);
      return { seri: G.playoff.rounds[0][0].hw + '-' + G.playoff.rounds[0][0].aw, yil: G.season ? G.season.year : null };
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loginPage', { state: 'visible', timeout: 20000 });
    await page.evaluate(() => { try { resumeFromSavedGame(); } catch (e) {} });
    await sleep(1200);
    const sonra = await page.evaluate(() => ({
      playoffVar: !!(G.playoff && G.playoff.rounds && G.playoff.rounds[0] && G.playoff.rounds[0][0]),
      seri: (G.playoff && G.playoff.rounds && G.playoff.rounds[0] && G.playoff.rounds[0][0])
        ? (G.playoff.rounds[0][0].hw + '-' + G.playoff.rounds[0][0].aw) : null,
      yil: G.season ? G.season.year : null,
      sampiyon: G.playoff ? G.playoff.champion : 'playoff-yok'
    }));
    kayit('K1', 'Playoff ortasında yenile → bracket + seri skoru korunuyor',
      sonra.playoffVar && sonra.seri === kurulum.seri && sonra.yil === kurulum.yil,
      `önce seri ${kurulum.seri} / sezon ${kurulum.yil} → sonra seri ${sonra.seri} / sezon ${sonra.yil}` +
      (sonra.yil !== kurulum.yil ? '  ⚠ SEZON SIFIRLANDI' : ''));
    await ctx.close();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // K2 — Kota dolduktan sonra: IndexedDB'deki DAHA YENİ kayıt kazanmalı
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n── K2: kota dolu → en güncel kayıt (IDB) geliyor ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => konsolHatalari.push('[K2] ' + e.message));
    await yeniKariyer(page, base, 'Kota Testi');

    const hazir = await page.evaluate(async () => {
      // 1) BAYAT kaydı localStorage'a yaz (eski savedAt, düşük coins)
      const bayat = serializeGameState();
      bayat.coins = 111111;
      bayat.savedAt = new Date(Date.now() - 3600e3).toISOString();   // 1 saat önce
      localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(bayat));
      // 2) GÜNCEL kaydı yalnızca IndexedDB'ye yaz (kota dolmuş senaryosu)
      const guncel = serializeGameState();
      guncel.coins = 999999;
      guncel.savedAt = new Date().toISOString();
      await idbPutString(JSON.stringify(guncel));
      /* Sayfa kapanışındaki otomatik kayıt (beforeunload → saveGameNow) hazırladığımız
         localStorage kaydını güncel durumla ezmesin: G.team=null ile o yol kapanır. */
      try{ clearTimeout(_gameSaveTimer); }catch(e){}
      G.team=null;
      return { bayatCoins: bayat.coins, guncelCoins: guncel.coins };
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loginPage', { state: 'visible', timeout: 20000 });
    await sleep(900);   // açılıştaki LS/IDB karşılaştırması async
    await page.evaluate(() => { try { resumeFromSavedGame(); } catch (e) {} });
    await sleep(800);
    const yuklenen = await page.evaluate(() => G.coins);
    kayit('K2', 'Kota dolu → açılışta en güncel kayıt (IndexedDB) kazanıyor',
      yuklenen === hazir.guncelCoins,
      `LS(bayat)=${hazir.bayatCoins} · IDB(güncel)=${hazir.guncelCoins} → yüklenen=${yuklenen}`);
    await ctx.close();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // K3 — "Kaydı sil" → IDB kopyası da silinmeli, "Devam et" bloğu görünmemeli
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n── K3: kaydı sil → devam bloğu yok ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => konsolHatalari.push('[K3] ' + e.message));
    await yeniKariyer(page, base, 'Silme Testi');

    await page.evaluate(async () => {
      saveGameNow(false);
      await idbPutString(JSON.stringify(serializeGameState()));   // IDB kopyası da olsun
    });
    await sleep(200);
    await sleep(300);
    await page.evaluate(() => { clearSavedGame(); });
    await sleep(600);   // idbDeleteString async

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loginPage', { state: 'visible', timeout: 20000 });
    await sleep(1200);  // açılış IDB sorgusu bitsin
    const durum = await page.evaluate(async () => {
      const rb = document.getElementById('resumeBlock');
      let idbVar = false;
      try { idbVar = !!(await idbGetString()); } catch (e) {}
      return {
        blokGorunur: !!(rb && rb.style.display === 'block'),
        lsVar: !!localStorage.getItem(GAME_SAVE_KEY),
        idbVar
      };
    });
    kayit('K3', 'Kaydı sil → yeniden açılışta "Devam et" bloğu yok',
      !durum.blokGorunur && !durum.lsVar && !durum.idbVar,
      `devam bloğu görünür: ${durum.blokGorunur} · localStorage kaydı: ${durum.lsVar} · IndexedDB kaydı: ${durum.idbVar}`);
    await ctx.close();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // K6 — İnternetsiz: fontlar YEREL yüklenmeli, tabela taşmamalı
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n── K6: çevrimdışı font + tabela taşması ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', e => konsolHatalari.push('[K6] ' + e.message));

    // DIŞ AĞI TAMAMEN KES — yalnız 127.0.0.1 geçer (Steam çevrimdışı senaryosu).
    const disIstekler = [];
    await ctx.route('**/*', (route) => {
      const u = route.request().url();
      if (u.startsWith(base) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      disIstekler.push(u);
      return route.abort();
    });

    await yeniKariyer(page, base, 'Cevrimdisi Testi');
    await page.evaluate(() => showPage('mac', document.querySelector('#sbNav button[data-page="mac"]')));
    await sleep(900);

    const font = await page.evaluate(async () => {
      try { await document.fonts.ready; } catch (e) {}
      const yuklu = [];
      try { document.fonts.forEach(f => { if (f.status === 'loaded') yuklu.push(f.family); }); } catch (e) {}
      const sb = document.querySelector('.scoreboard');
      const tasma = sb ? (sb.scrollWidth > sb.clientWidth + 1) : null;
      return {
        bebas: yuklu.some(f => /Bebas/i.test(f)),
        inter: yuklu.some(f => /Inter/i.test(f)),
        scoreboardVar: !!sb,
        scoreboardTasma: tasma,
        govdeYatayTasma: document.documentElement.scrollWidth > window.innerWidth + 1
      };
    });
    const disFontIstegi = disIstekler.filter(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
    kayit('K6', 'İnternetsiz → yazı tipleri yerel yükleniyor, tabela taşmıyor',
      font.bebas && font.inter && disFontIstegi.length === 0 && font.scoreboardTasma === false && !font.govdeYatayTasma,
      `Bebas yüklü: ${font.bebas} · Inter yüklü: ${font.inter} · engellenen dış font isteği: ${disFontIstegi.length}` +
      ` · scoreboard taşması: ${font.scoreboardTasma} · gövde yatay taşma: ${font.govdeYatayTasma}`);

    // ─────────────────────────────────────────────────────────────────────────
    // K7 — 390×844'te İlk 5 ekranında TÜM yedeklere erişilebilmeli
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n── K7: mobilde yedek listesi kaydırma ──');
    await page.evaluate(() => { try { openLineupEditor(); } catch (e) {} });
    await sleep(700);
    const lu = await page.evaluate(() => {
      const list = document.querySelector('.lu-bench');
      if (!list) return { hata: 'lu-bench yok' };
      const kartlar = list.querySelectorAll('.lu-card');
      const cs = kartlar.length ? getComputedStyle(kartlar[0]) : null;
      const grip = list.querySelector('.lu-grip');
      const gripCs = grip ? getComputedStyle(grip) : null;
      // en alta kaydır — son kart görünür alana girebiliyor mu?
      list.scrollTop = list.scrollHeight;
      const son = kartlar[kartlar.length - 1];
      const lr = list.getBoundingClientRect();
      const sr = son ? son.getBoundingClientRect() : null;
      return {
        kartSayisi: kartlar.length,
        kartTouchAction: cs ? cs.touchAction : null,
        gripVar: !!grip,
        gripTouchAction: gripCs ? gripCs.touchAction : null,
        kaydirilabilir: list.scrollHeight > list.clientHeight,
        scrollTop: list.scrollTop,
        sonKartGorunur: sr ? (sr.bottom <= lr.bottom + 2 && sr.top >= lr.top - 2) : false
      };
    });
    const k7 = !lu.hata && lu.kartSayisi > 0 && lu.gripVar &&
      /pan-y/.test(String(lu.kartTouchAction)) && String(lu.gripTouchAction) === 'none' &&
      lu.sonKartGorunur;
    kayit('K7', '390×844 İlk 5 → tüm yedeklere erişilebiliyor',
      k7,
      `yedek kartı: ${lu.kartSayisi} · kart touch-action: ${lu.kartTouchAction} (pan-y olmalı) · tutamak: ${lu.gripVar} (touch-action: ${lu.gripTouchAction})` +
      ` · liste kaydırılabilir: ${lu.kaydirilabilir} · en alta kaydırınca son kart görünür: ${lu.sonKartGorunur}`);
    await ctx.close();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // K9 — Erişilebilirlik büyütmesi (html.a11y-big{zoom:1.18}) açıkken sürükleme
  //      hayaleti imlecin ALTINDA kalmalı. zoom + position:fixed birlikte left/top
  //      değerlerini ölçekliyor, clientX/clientY ise ölçeklenmiyor → hayalet kayıyordu.
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n── K9: a11y büyütme açıkken sürükleme hayaleti ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => konsolHatalari.push('[K9] ' + e.message));
    await yeniKariyer(page, base, 'Zoom Testi');

    /** Verilen a11y ayarıyla İlk 5'i açar, bir yedek kartını sürükler, hayalet↔imleç sapmasını döner. */
    const olc = async (buyutmeAcik) => {
      return await page.evaluate(async (acik) => {
        const bekle = (ms) => new Promise(r => setTimeout(r, ms));
        G.settings = Object.assign({}, G.settings, { a11yBig: !!acik });
        applyA11ySettings();
        try { closeAppModal(); } catch (e) {}
        await bekle(150);
        openLineupEditor();
        await bekle(350);
        const kart = document.querySelector('.lu-bench .lu-card');
        if (!kart) return { hata: 'yedek kartı yok' };
        const grip = kart.querySelector('.lu-grip') || kart;
        const gr = grip.getBoundingClientRect();
        const bas = { x: Math.round(gr.left + gr.width / 2), y: Math.round(gr.top + gr.height / 2) };
        grip.dispatchEvent(new PointerEvent('pointerdown', { clientX: bas.x, clientY: bas.y, bubbles: true, pointerId: 1 }));
        const hedef = { x: bas.x + 160, y: bas.y - 120 };   // >5px eşiğini aşan gerçek sürükleme
        document.dispatchEvent(new PointerEvent('pointermove', { clientX: hedef.x, clientY: hedef.y, bubbles: true, pointerId: 1 }));
        await bekle(80);
        const ghost = document.querySelector('.lu-ghost');
        if (!ghost) {
          document.dispatchEvent(new PointerEvent('pointerup', { clientX: hedef.x, clientY: hedef.y, bubbles: true, pointerId: 1 }));
          return { hata: 'hayalet oluşmadı' };
        }
        const g = ghost.getBoundingClientRect();
        const sapma = Math.round(Math.hypot((g.left + g.width / 2) - hedef.x, (g.top + g.height / 2) - hedef.y));
        ghost.style.display = 'none';
        const alt = document.elementFromPoint(hedef.x, hedef.y);   // bırakma hedefi hâlâ bulunuyor mu?
        ghost.style.display = '';
        document.dispatchEvent(new PointerEvent('pointerup', { clientX: hedef.x, clientY: hedef.y, bubbles: true, pointerId: 1 }));
        await bekle(120);
        try { closeAppModal(); } catch (e) {}
        return { sapma, zoom: parseFloat(getComputedStyle(document.documentElement).zoom) || 1, hedefBulundu: !!alt };
      }, buyutmeAcik);
    };

    const kapali = await olc(false);
    const acik = await olc(true);
    const esik = 8;   // px — "imlecin altında" sayılması için tolerans
    const k9 = !kapali.hata && !acik.hata && kapali.sapma <= esik && acik.sapma <= esik && acik.hedefBulundu;
    kayit('K9', 'a11y büyütme (zoom 1.18) açıkken hayalet imlecin altında',
      k9,
      'zoom kapalı: sapma ' + (kapali.hata || kapali.sapma + ' px') + ' (zoom ' + kapali.zoom + ') · ' +
      'zoom açık: sapma ' + (acik.hata || acik.sapma + ' px') + ' (zoom ' + acik.zoom + ') · ' +
      'bırakma hedefi bulunuyor: ' + acik.hedefBulundu + ' · tolerans ' + esik + ' px');
    await ctx.close();
  }

  await browser.close();
  server.close();

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n══ FAZ 7 KABUL KRİTERLERİ ══');
  const dusen = sonuc.filter(r => !r.gecti);
  console.log(`  ${sonuc.length - dusen.length}/${sonuc.length} kriter geçti`);
  if (konsolHatalari.length) {
    console.log('\n  Sayfa hataları:');
    konsolHatalari.slice(0, 10).forEach(e => console.log('   ', e));
  }
  console.log('\n  K8 (visual-check çıkış kodu 0) ayrıca çalıştırılır: node tools/visual-check.js');

  if (dusen.length || konsolHatalari.length) {
    console.log('\n✗ DÜŞEN KRİTER(LER):');
    dusen.forEach(r => console.log(`  - ${r.kod} ${r.ad}`));
    process.exit(1);
  }
  console.log('\n✓ tüm kabul kriterleri geçti');
}

main().catch(err => { console.error('faz7-check hata:', err); process.exit(1); });
