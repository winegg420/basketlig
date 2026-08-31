#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 6 DENETÇİSİ (kalan eksikler + Steam hazırlığı)
 *
 * `REVIZE-PAKETI.md` FAZ 6 tablosu ve Steam ek maddeleri.
 *
 *  F1  B4 · Sezon sonu bireysel ödülleri (MVP, en skorer/asistçi/ribaundçu, ideal beşli,
 *          yılın genci, EN GELİŞEN) üretiliyor
 *  F2  B5 · Zorluk kaldırıldı (FAZ 20) — hiçbir difficulty değeri dengeyi kaydırmıyor
 *  F3  C2 · Manuel koçlukta ilk yarı istatistikleri korunuyor
 *  F4  Steam · Kayıt bütünlüğü — soyunma odası alanları (sit/söz/moral/ilişki) kayıt turunda
 *          kaybolmuyor (belgede "sessiz veri kaybı" riski olarak işaretli)
 *  F5  D1 · Mobil (390×844) uçtan uca: 11 sayfa + modallar, yatay taşma yok, JS hatası yok
 *  F6  D3 · Masaüstü paketi (dist-desktop) eksiksiz ve dış ağ bağımlılığı yok
 *
 * Çıkış kodu: 0 = hepsi geçti, 1 = en az biri düştü.
 * Çalıştırma:  node tools/faz6-check.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
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
  sonuc.push({ kod, ad, gecti });
  console.log(`  ${gecti ? '✓' : '✗'} ${kod}  ${ad}\n       ${detay}`);
}

async function yeniKariyer(page, base, isim) {
  await page.goto(base + '/charazay2.0.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 20000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 10000 });
  await page.fill('#teamName', isim);
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
  const hatalar = [];

  // ── F6: masaüstü paketi (dosya sistemi; tarayıcı gerekmez) ───────────────
  {
    const DIST = path.join(ROOT, 'dist-desktop');
    const gerekli = ['charazay2.0.html', 'index.html', 'js', 'assets'];
    const eksik = gerekli.filter(x => !fs.existsSync(path.join(DIST, x)));
    const fontDir = path.join(DIST, 'assets', 'fonts');
    const fontlar = fs.existsSync(fontDir) ? fs.readdirSync(fontDir).filter(f => f.endsWith('.woff2')) : [];
    let disBag = [];
    try {
      const html = fs.readFileSync(path.join(DIST, 'charazay2.0.html'), 'utf8');
      // src/href içindeki gerçek dış kaynaklar (metin içindeki örnek URL'ler değil)
      disBag = (html.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi) || []);
    } catch (e) { disBag = ['okunamadı']; }
    const jsSayi = fs.existsSync(path.join(DIST, 'js')) ? fs.readdirSync(path.join(DIST, 'js')).filter(f => f.endsWith('.js')).length : 0;
    kayit('F6', 'Masaüstü paketi eksiksiz ve dış ağ bağımlılığı yok',
      eksik.length === 0 && fontlar.length >= 4 && disBag.length === 0 && jsSayi >= 13,
      `eksik dosya: ${eksik.length ? eksik.join(', ') : 'yok'} · js modülü: ${jsSayi} · yerel font: ${fontlar.length}` +
      ` · dış src/href: ${disBag.length ? disBag.slice(0, 2).join(' | ') : 'yok'}`);

    // F7 — Tauri derleme ön koşulları (PROJE tarafı). Araç zinciri ayrı raporlanır:
    // Rust/MSVC yoksa bu madde DÜŞMEZ, çünkü depo içeriğiyle ilgili değildir.
    const T = path.join(ROOT, 'src-tauri');
    const tEksik = ['Cargo.toml', 'build.rs', 'tauri.conf.json', 'src/main.rs', 'icons/icon.ico', 'icons/icon.png']
      .filter(f => !fs.existsSync(path.join(T, f)));
    let conf = null, confHata = null;
    try { conf = JSON.parse(fs.readFileSync(path.join(T, 'tauri.conf.json'), 'utf8')); }
    catch (e) { confHata = e.message; }
    const frontDist = conf && conf.build ? conf.build.frontendDist : null;
    const frontVar = frontDist ? fs.existsSync(path.resolve(T, frontDist)) : false;
    const hedefler = (conf && conf.bundle && conf.bundle.targets) || [];
    const ident = conf ? conf.identifier : null;
    kayit('F7', 'D3 · Tauri derleme ön koşulları (proje tarafı) hazır',
      tEksik.length === 0 && !confHata && frontVar && hedefler.length > 0 && !!ident,
      confHata ? ('tauri.conf.json okunamadı: ' + confHata) :
        `eksik dosya: ${tEksik.length ? tEksik.join(', ') : 'yok'} · frontendDist "${frontDist}" ${frontVar ? 'var' : 'YOK'}` +
        ` · bundle hedefleri: ${hedefler.join(', ') || 'yok'} · identifier: ${ident || 'yok'}`);

    // Araç zinciri durumu — bilgi amaçlı (kurulu değilse madde düşmez, sadece raporlanır).
    const { execSync } = require('child_process');
    const varMi = (cmd) => { try { execSync(cmd, { stdio: 'pipe' }); return true; } catch (e) { return false; } };
    const rustVar = varMi('rustc --version');
    const cargoVar = varMi('cargo --version');
    console.log(`       ↳ araç zinciri: rustc ${rustVar ? 'var' : 'YOK'} · cargo ${cargoVar ? 'var' : 'YOK'}` +
      (rustVar && cargoVar ? ' → "npm run desktop:build" çalıştırılabilir'
        : ' → derleme için Rust + MSVC Build Tools gerekli (bkz. KALDIGIM-YER.md)'));
  }

  // ── F1, F2, F3, F4: masaüstü bağlamı ────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => hatalar.push('[masaüstü] ' + e.message));
    page.on('console', m => { if (m.type() === 'error') hatalar.push('[konsol] ' + m.text()); });
    await yeniKariyer(page, base, 'FAZ6 Denetimi');

    // F1 — sezon ödülleri
    const A = await page.evaluate(async () => {
      // Sezonu oynanmış say + oyunculara sezon istatistiği ve gelişim verisi ver
      (G.players || []).forEach((p, i) => {
        p.sezon = { mac: 19, pts: 200 + i * 9, ast: 40 + i * 3, reb: 60 + i * 2 };
      });
      G.analytics = G.analytics || { teamMatches: [], playerDev: {} };
      G.analytics.playerDev = {};
      (G.players || []).forEach((p, i) => {
        // ikinci oyuncu belirgin biçimde gelişmiş olsun
        const artis = (i === 1) ? 9 : (i % 3);
        G.analytics.playerDev[p.id] = [{ genel: (p.genel || 70) - artis }, { genel: p.genel || 70 }];
      });
      const aw = computeSeasonAwards();
      if (!aw) return { yok: true };
      return {
        mvp: !!aw.mvp, skorer: !!aw.topScorer, asist: !!aw.topAst, reb: !!aw.topReb,
        idealDolu: (aw.ideal || []).filter(Boolean).length,
        genc: !!aw.young,
        gelisen: aw.mostImproved ? { isim: aw.mostImproved.isim, artis: aw.mostImproved.artis } : null
      };
    });
    kayit('F1', 'B4 · Sezon sonu bireysel ödülleri üretiliyor',
      !A.yok && A.mvp && A.skorer && A.asist && A.reb && A.idealDolu === 5 && !!A.gelisen,
      A.yok ? 'ödül havuzu boş' :
        `MVP ${A.mvp} · skorer ${A.skorer} · asistçi ${A.asist} · ribaundçu ${A.reb} · ideal beşli ${A.idealDolu}/5 · yılın genci ${A.genc}` +
        ` · en gelişen: ${A.gelisen ? A.gelisen.isim + ' (+' + A.gelisen.artis + ' OVR)' : 'YOK'}`);

    // F2 — zorluk çarpanları fiilen etkiliyor mu
    const D = await page.evaluate(() => {
      const olc = (k) => {
        G.difficulty = k;
        const c = difficultyCfg();
        // piyasa bandı ve başkan hedefi zorluğa göre değişmeli
        const band = marketQualityBand();
        return { ad: c.ad, butce: c.butce, rakip: c.rakip, sakat: c.sakat, tavan: band.tavan };
      };
      const eski = G.difficulty;
      const kolay = olc('kolay'), normal = olc('normal'), zor = olc('zor');
      G.difficulty = eski;
      // Zorluk kayıt turunu atlatıyor mu?
      G.difficulty = 'zor';
      const d = serializeGameState();
      const kayitli = d.difficulty;
      return { kolay, normal, zor, kayitli, surum: d.v };
    });
    /* FAZ 20 (kullanıcı kararı "A) Seçiciyi kaldır"): zorluk seçicisi kaldırıldı ve
       difficultyCfg() artık her zaman DIFFICULTY.normal döndürüyor. Bu kapı eskiden
       çarpanların ARTMASINI arıyordu; kaldırılmış özelliği sınadığı için kalıcı kırmızı
       yanıyordu. Yeni ölçüt kararın kendisi: hangi değer atanırsa atansın oyun nötr
       kalmalı — aksi hâlde eski kayıttaki difficulty:'zor' alanı dengeyi sessizce bozar. */
    const notr = D.kolay.rakip === 1 && D.normal.rakip === 1 && D.zor.rakip === 1
      && D.kolay.sakat === D.zor.sakat && D.kolay.butce === D.zor.butce
      && D.kolay.tavan === D.zor.tavan;
    kayit('F2', 'B5 · Zorluk kaldırıldı — hiçbir değer dengeyi kaydırmıyor',
      notr && D.surum >= 8,
      `rakip gücü ${D.kolay.rakip}/${D.normal.rakip}/${D.zor.rakip} · sakatlık ${D.kolay.sakat}/${D.normal.sakat}/${D.zor.sakat}` +
      ` · bütçe ${D.kolay.butce}/${D.normal.butce}/${D.zor.butce} · piyasa tavanı ${D.kolay.tavan}/${D.normal.tavan}/${D.zor.tavan}` +
      ` · eski kayıt alanı yok sayılıyor (v${D.surum})`);

    // F3 — manuel koçlukta ilk yarı istatistikleri korunuyor mu
    const C = await page.evaluate(() => {
      const nx = findNextUserSeasonMatch();
      if (!nx) return { yok: true };
      const rakip = (nx.home === G.team.isim) ? nx.away : nx.home;
      const evs = generateMatchEvents({ isim: rakip }, { userIsHome: nx.home === G.team.isim });
      // maçın ortasındaki bir olayı al (2. çeyrek sonu civarı)
      const ortaIx = Math.floor(evs.length * 0.45);
      const orta = evs[ortaIx] || {};
      const ps = (orta.box && orta.box.ps) ? orta.box.ps : null;
      if (!ps) return { psYok: true };
      const oncekiToplam = Object.keys(ps).reduce((a, id) => a + (ps[id].pts || 0), 0);
      // Manuel koçluğun yaptığı gibi: kalan maçı bu anlık görüntüyle yeniden üret
      const resume = {
        q: orta.q || 1, tStart: orta.t != null ? orta.t : MATCH_CLOCK_SEC, mid: true,
        homeScore: orta.home || 0, awayScore: orta.away || 0,
        hB: orta.box.h, aB: orta.box.a, qh: orta.qh || {}, qa: orta.qa || {},
        onCourtIds: [], benchIds: [], subbedIds: [], spId: null,
        pstats: ps, ostats: (orta.box && orta.box.os) ? orta.box.os : {},
        matchFouls: (orta.box && orta.box.mf) ? orta.box.mf : {},
        qFoulU: (orta.box && orta.box.fu) ? orta.box.fu : {},
        qFoulO: (orta.box && orta.box.fo) ? orta.box.fo : {}
      };
      const yeni = generateMatchEvents({ isim: rakip }, { userIsHome: nx.home === G.team.isim, resume });
      const son = yeni[yeni.length - 1] || {};
      const sonPs = son.players || {};
      const sonrakiToplam = Object.keys(sonPs).reduce((a, id) => a + (sonPs[id].pts || 0), 0);
      return { oncekiToplam, sonrakiToplam, korunan: sonrakiToplam >= oncekiToplam };
    });
    kayit('F3', 'C2 · Manuel koçlukta ilk yarı istatistikleri korunuyor',
      !C.yok && !C.psYok && C.korunan,
      C.yok ? 'maç bulunamadı' : C.psYok ? 'olay anlık görüntüsü yok' :
        `yeniden üretim öncesi biriken sayı ${C.oncekiToplam} → sonrasında ${C.sonrakiToplam} (kayıp yok: ${C.korunan})`);

    // F4 — soyunma odası alanları kayıt turunu atlatıyor mu
    const S = await page.evaluate(async () => {
      const p0 = G.players[0], p1 = G.players[1];
      p0.sit = 4; p0.mood = 38; p0.soz = { tip: 'sure', gun: 12 };
      p1.oynadi = 7; p1.mood = 91;
      const beklenen = { sit: p0.sit, mood: p0.mood, soz: JSON.stringify(p0.soz), oynadi: p1.oynadi, mood1: p1.mood };
      saveGameNow(false);
      await new Promise(r => setTimeout(r, 200));
      const ham = localStorage.getItem(GAME_SAVE_KEY);
      resumeFromSavedGame();
      await new Promise(r => setTimeout(r, 500));
      const q0 = (G.players || []).find(x => x.id === p0.id) || {};
      const q1 = (G.players || []).find(x => x.id === p1.id) || {};
      return {
        beklenen,
        bulunan: { sit: q0.sit, mood: q0.mood, soz: JSON.stringify(q0.soz || null), oynadi: q1.oynadi, mood1: q1.mood },
        boyut: ham ? ham.length : 0
      };
    });
    const esit = S.beklenen.sit === S.bulunan.sit && S.beklenen.mood === S.bulunan.mood
      && S.beklenen.soz === S.bulunan.soz && S.beklenen.oynadi === S.bulunan.oynadi
      && S.beklenen.mood1 === S.bulunan.mood1;
    kayit('F4', 'Steam · Soyunma odası alanları kayıt turunda kaybolmuyor', esit,
      `beklenen sit/mood/söz/oynadı = ${S.beklenen.sit}/${S.beklenen.mood}/${S.beklenen.soz}/${S.beklenen.oynadi}` +
      ` · bulunan = ${S.bulunan.sit}/${S.bulunan.mood}/${S.bulunan.soz}/${S.bulunan.oynadi} · kayıt ${Math.round(S.boyut / 1024)} KB`);
    await ctx.close();
  }

  // ── F5: D1 mobil uçtan uca ──────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const mobilHata = [];
    page.on('pageerror', e => mobilHata.push(e.message));
    page.on('console', m => { if (m.type() === 'error') mobilHata.push(m.text()); });
    await yeniKariyer(page, base, 'Mobil Uctan Uca');

    const M = await page.evaluate(async () => {
      const bekle = ms => new Promise(r => setTimeout(r, ms));
      const tasan = [];
      const olc = (etiket) => {
        const de = document.documentElement;
        if (de.scrollWidth > window.innerWidth + 1) tasan.push(etiket + ':' + (de.scrollWidth - window.innerWidth) + 'px');
      };
      const sayfalar = ['dashboard', 'takim', 'kadro', 'mac', 'lig', 'market', 'altyapi', 'antrenman', 'arena', 'bilanco', 'analiz'];
      for (const s of sayfalar) {
        showPage(s, document.querySelector('#sbNav button[data-page="' + s + '"]'));
        await bekle(260);
        olc('sayfa:' + s);
      }
      const modallar = [
        ['ayarlar', () => openSettingsModal()],
        ['basarim', () => openAchievementsModal()],
        ['ilk5', () => openLineupEditor()],
        ['oyuncu', () => openPlayerModal((G.players[0] || {}).id)],
        ['taktik', () => { const m = findNextUserSeasonMatch(); if (m) openMatchTactics(m.seasonMatchIx); }]
      ];
      for (const [ad, fn] of modallar) {
        try { closeAppModal(); } catch (e) {}
        await bekle(120);
        try { fn(); } catch (e) {}
        await bekle(420);
        olc('modal:' + ad);
      }
      try { closeAppModal(); } catch (e) {}
      // küçük dokunma hedefi sayımı (≥40px eşiği)
      const kucuk = [];
      document.querySelectorAll('button, .fbtn, .league-slot, [role="button"]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.height < 36) kucuk.push(Math.round(r.height));
      });
      return { tasan, sayfaSayisi: sayfalar.length + modallar.length, kucukAdet: kucuk.length };
    });
    kayit('F5', 'D1 · Mobil uçtan uca (390×844) — yatay taşma ve JS hatası yok',
      M.tasan.length === 0 && mobilHata.length === 0,
      `${M.sayfaSayisi} ekran gezildi · yatay taşma: ${M.tasan.length ? M.tasan.join(', ') : 'yok'}` +
      ` · JS hatası: ${mobilHata.length}${mobilHata.length ? ' — ' + mobilHata[0] : ''}` +
      ` · 36px altı dokunma hedefi: ${M.kucukAdet}`);
    hatalar.push(...mobilHata.map(x => '[mobil] ' + x));
    await ctx.close();
  }

  await browser.close();
  server.close();

  console.log('\n══ FAZ 6 DENETİMİ ══');
  console.log(`  ${sonuc.filter(r => r.gecti).length}/${sonuc.length} madde geçti`);
  if (hatalar.length) { console.log('\n  Sayfa hataları:'); hatalar.slice(0, 6).forEach(e => console.log('   ', e)); }
  const dusen = sonuc.filter(r => !r.gecti);
  if (dusen.length) {
    console.log('\n✗ DÜŞEN: ' + dusen.map(r => r.kod).join(', '));
    process.exit(1);
  }
  console.log('\n✓ FAZ 6 doğrulandı');
}

main().catch(e => { console.error('faz6-check hata:', e); process.exit(1); });
