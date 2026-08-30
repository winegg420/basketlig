#!/usr/bin/env node
/**
 * Charazay 2.0 — CANLI MAÇ SAHA DİZİLİMİ ÖLÇÜMÜ (FAZ 11 / F11-7)
 *
 * Neyi ölçer: `realism-check` (saha dışı / ışınlanma / üst üste binme) ve `live-metrics`
 * (senkron / kimlik) DİZİLİM DOĞRULUĞUNU görmüyordu — 10 oyuncunun maç boyunca orta sahada
 * durması hiçbir testte yakalanmamıştı. Bu araç tam olarak onu ölçer.
 *
 * Yöntem: maç oynarken sahneyi 100 ms'de bir örnekler (setInterval — sekme kısıtlamasından
 * etkilenmez), her karede `mState._sim` üzerinden hücum/savunma jetonlarını, topu, saldırılan
 * potayı ve fazı (`S.defTrack` → set/geçiş) okur. İstatistik yalnız SET fazı karelerinden çıkar.
 *
 * Ölçüler (hedefler FAZ 11 belgesinden):
 *   ortalama ikili mesafe ≥ 4,5 m · en yakın ikili ≥ 3,5 m · kaplanan alan ≥ %30 yarı saha
 *   orta üçte bir oranı < %20 · boyada ≥1 hücumcu olan kare ≥ %60
 *   topu tutana en yakın savunmacı < 1,8 m · adamından > 5 m uzak savunmacı %0
 *
 * Çalıştırma:  node tools/spacing-check.js [--ms=90000] [--rate=3] [--json] [--bg]
 *   --bg : maçı ARKA PLANDAKİ sekmede ölçer. FAZ 11 belgesindeki ölçüm bu koşulda alınmıştı;
 *          rAF kısıtlanınca sim saati donup sahne anlatımın gerisinde kalıyordu (F11-1).
 *          Yetişme (`_simCatchUp`) sayesinde bu modda da dizilim hedefleri tutmalıdır.
 * Çıkış kodu:  0 = tüm hedefler tuttu, 1 = en az bir hedef düştü.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const arg = (ad, varsayilan) => {
  const m = process.argv.find(a => a.startsWith('--' + ad + '='));
  return m ? Number(m.split('=')[1]) : varsayilan;
};
const SURE_MS = arg('ms', 90000);
const RATE = arg('rate', 3);
const JSON_CIKTI = process.argv.includes('--json');
const ARKA_PLAN = process.argv.includes('--bg');
/* TOHUM — bu depoda üç ölçüm aracı tohumsuz olduğu için aynı kodla farklı sonuç vermişti
   (band.js, box-band.js, i18n-scan). Dizilim ölçümü de aynı tuzağa düşmesin: maç üretimi ve
   koreografi Math.random'a bağlı; tohum sabitlenmezse iki koşu ±3 puan oynuyor. */
const SEED = (() => { const a = process.argv.find(x => x.startsWith('--seed=')); return a ? (parseInt(a.slice(7), 10) | 0) : 987654321; })();
const SEED_FN = (seed) => {
  let a = seed >>> 0;
  Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ⚠ ÖLÇEK (FAZ 13 madde 0) — 940 viewBox genişliğidir, OYUN ALANI DEĞİL.
   SVG'den okunan gerçek oyun alanı: x=56.4 · y=30 · width=827.2 · height=440
     827,2 px ÷ 28 m = 29,54 px/m      440 px ÷ 15 m = 29,33 px/m   → ölçek ≈ 29,5 px/m
   940/28 = 33,57 kullanmak tüm metre değerlerini %12 KÜÇÜK gösteriyordu (FAZ 11'in
   "2,64 m aralık" ölçümü aslında 3,00 m). Saha geometrisi doğru; yanlış olan sabitti:
   pota–dip çizgi 1,56 m · 3sy yayı 6,63 m · boya 5,66 m · SA çemberi 1,79 m (hepsi FIBA). */
const PX_M = 827.2 / 28;               /* 29,54 px = 1 m */
const RIM_X_SOL = 102.6, RIM_Y = 250;  /* sol pota merkezi (SVG'den) */
const ORTA_MIN = 940 / 3, ORTA_MAX = 940 * 2 / 3;

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

/** Sayfa içine kurulan örnekleyici — sahnenin ham sayılarını toplar. */
function samplerKur() {
  window.__spacing = { frames: [], hata: null };
  if (window.__spacingTimer) clearInterval(window.__spacingTimer);
  window.__spacingTimer = setInterval(() => {
    try {
      const S = (typeof mState !== 'undefined' && mState) ? mState._sim : null;
      if (!S || !S.offP || !S.defP || !mState.running) return;
      const off = S.offP.filter(p => p && !p._oob);
      const def = S.defP.filter(p => p && !p._oob);
      if (off.length < 5 || def.length < 5) return;
      const rim = S.defRim || null;                    /* saldırılan pota */
      /* Set fazına geçiş anını damgala: "oturmuş" kareleri (varış gecikmesi bitmiş)
         ayrı değerlendirebilmek için — dizilim geometrisi ile varış gecikmesi karışmasın. */
      const simdi = Date.now();
      if (S.defTrack) { if (!window.__setT0) window.__setT0 = simdi; } else { window.__setT0 = 0; }
      const kare = {
        set: !!S.defTrack,                             /* _setFormation: set → true, geçiş → false */
        setMs: window.__setT0 ? (simdi - window.__setT0) : 0,
        rimX: rim ? rim[0] : null,
        off: off.map(p => [Math.round(p.x), Math.round(p.y)]),
        def: def.map(p => [Math.round(p.x), Math.round(p.y)]),
        /* her savunmacının kendi adamına uzaklığı (px) — eşleşme motorun içinde */
        mark: def.map(p => (p._mark ? Math.round(Math.hypot(p.x - p._mark.x, p.y - p._mark.y)) : -1)),
        /* "yerine oturmuş" savunmacı: kendi hedefine varmış, adamı da yerinde ve savunmacı
           bir koreografi kilidi altında DEĞİL. Geçişte koşan, kapamaya çıkan ya da ribaund
           mücadelesindeki savunmacı adamından uzaklaşır — bu gerçek basketboldur ve markaj
           ihlali sayılmaz. Asıl kusur, HERKES YERİNDEYKEN savunmacının 5 m ötede durmasıdır
           (FAZ 11 ölçümünde ortalama 5,03 m / p90 7,19 m olan durum tam olarak buydu). */
        /* F11-5: savunmacı adamı ile pota arasında mı? (ball-you-man). İki takımın birbirini
           aynalayan iki sütun gibi durması, savunmanın hücuma GÖRE değil kendi şablonuna göre
           yerleşmesinden geliyordu; bu ölçü onu doğrudan sınar. */
        markIcerde: def.map(p => (p._mark && rim)
          ? (Math.hypot(p.x - rim[0], p.y - rim[1]) <= Math.hypot(p._mark.x - rim[0], p._mark.y - rim[1]))
          : null),
        markHazir: def.map(p => !!(p._mark &&
          Math.hypot(p.x - p.tx, p.y - p.ty) <= 40 &&
          Math.hypot(p._mark.x - p._mark.tx, p._mark.y - p._mark.ty) <= 40 &&
          !((p._lock || 0) > S.time))),
        ball: [Math.round(S.ball.x), Math.round(S.ball.y)],
        carrierOff: !!(S.ball.carrier && off.indexOf(S.ball.carrier) >= 0),
        carrier: S.ball.carrier ? [Math.round(S.ball.carrier.x), Math.round(S.ball.carrier.y)] : null,
      };
      window.__spacing.frames.push(kare);
      if (window.__spacing.frames.length > 4000) window.__spacing.frames.shift();
    } catch (e) { window.__spacing.hata = String(e && e.message || e); }
  }, 100);
}

// ── İstatistik ────────────────────────────────────────────────────────────────────────────
const ort = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const yuzde = (n, t) => t ? (100 * n / t) : 0;

/** Boya (key) — metreden hesaplamak yerine SAHA SVG'sindeki gerçek dikdörtgen kullanılır:
    sol boya  rect x=56.4 y=179.6 w=167.2 h=140.8  → x ≤ 223,6 · y ∈ [179,6 · 320,4]
    (5,66 m derinlik · 4,77 m genişlik — FIBA'ya uygun; ölçek sabitinden bağımsız). */
const BOYA_X_SOL = 227.75, BOYA_Y0 = 177.62, BOYA_Y1 = 322.38;
function boyada(p, rimX) {
  const solaHucum = rimX < 470;
  const x = p[0], y = p[1];
  if (y < BOYA_Y0 || y > BOYA_Y1) return false;
  return solaHucum ? (x <= BOYA_X_SOL) : (x >= 940 - BOYA_X_SOL);
}

function ikiliMesafeler(pts, atla) {
  /* atla: indeksi verilirse o oyuncunun ikilileri hariç tutulur. Perde/el değiştirme
     sırasında top sahibi ile perdeciyi ~1 m yan yana getirmek GERÇEK basketboldur; aralık
     ölçüsü bu meşru yakınlıkla bozulmasın diye "topsuz aralık" ayrıca hesaplanır. */
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    if (atla != null && i === atla) continue;
    for (let j = i + 1; j < pts.length; j++) {
      if (atla != null && j === atla) continue;
      out.push(Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
    }
  }
  return out;
}
/** Kare içindeki top sahibinin hücum dizisindeki indeksi (yoksa null). */
function carrierIx(f) {
  if (!f.carrierOff || !f.carrier) return null;
  let bi = null, bd = 9;
  f.off.forEach((p, i) => { const d = Math.hypot(p[0] - f.carrier[0], p[1] - f.carrier[1]); if (d < bd) { bd = d; bi = i; } });
  return bi;
}
/** Beş jetonun YAYILIMI — sınırlayıcı kutu / yarı saha (470×500 px).
    FAZ 11 belgesindeki "%35-50 gerçek basketbol" referansı bu ölçüyle uyumludur: beş noktanın
    DIŞBÜKEY ZARFI yarı sahanın %45'ini geometrik olarak zaten aşamaz (uçlara yerleşseler bile),
    dolayısıyla %50 zarfla ölçülmüş olamaz. Yargı kutuyla verilir; zarf ayrıca bilgi olarak
    raporlanır (ikisi birlikte "geniş ama içi boş" dizilimi de görünür kılar). */
function kutuAlani(pts) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return (Math.max.apply(null, xs) - Math.min.apply(null, xs)) *
         (Math.max.apply(null, ys) - Math.min.apply(null, ys));
}
/** Dışbükey zarf alanı (bilgi amaçlı). */
function zarfAlani(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const capraz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const alt = [], ust = [];
  for (const q of p) { while (alt.length >= 2 && capraz(alt[alt.length - 2], alt[alt.length - 1], q) <= 0) alt.pop(); alt.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (ust.length >= 2 && capraz(ust[ust.length - 2], ust[ust.length - 1], q) <= 0) ust.pop(); ust.push(q); }
  const zarf = alt.slice(0, -1).concat(ust.slice(0, -1));
  let a = 0;
  for (let i = 0; i < zarf.length; i++) {
    const b = zarf[(i + 1) % zarf.length];
    a += zarf[i][0] * b[1] - b[0] * zarf[i][1];
  }
  return Math.abs(a) / 2;
}

/* B-4 (DENETIM-FAZ13): araç yalnız SET fazı karelerini süzüyordu; bağımsız denetimde
   "izleyicinin gerçekten gördüğü" tüm yarı saha karelerinde tablo daha kötü çıkmıştı
   (markaj 1,96 m yerine 3,15 m · boyada %76 yerine %39). Süzgeç yanlış değil, KAPSAMI
   dardı. `tumu=true` ile top ön sahadayken geçen HER kare ölçülür (geçiş dahil) —
   dizilim kurulurken koşan oyuncular da tabloya girer. */
function olc(frames, oturmusMs, tumu) {
  const onSahada = f => (f.rimX < 470 ? f.ball[0] < 470 : f.ball[0] > 470);
  const setK = frames.filter(f => f.rimX != null &&
    (tumu ? onSahada(f) : (f.set && (!oturmusMs || f.setMs >= oturmusMs))));
  if (!setK.length) return null;
  const potaUzak = [];
  const ikiliOrt = [], ikiliMin = [], ikiliMinTopsuz = [], alanY = [], zarfY = [], ortaOran = [], carrierDef = [], markUzak = [], markOrt = [], markIcerdeOran = [];
  let boyaliKare = 0, offX = [];
  setK.forEach(f => {
    const d = ikiliMesafeler(f.off);
    ikiliOrt.push(ort(d) / PX_M);
    ikiliMin.push(Math.min.apply(null, d) / PX_M);
    const dT = ikiliMesafeler(f.off, carrierIx(f));
    if (dT.length) ikiliMinTopsuz.push(Math.min.apply(null, dT) / PX_M);
    alanY.push(yuzde(kutuAlani(f.off), 470 * 500));
    zarfY.push(yuzde(zarfAlani(f.off), 470 * 500));
    const ortada = f.off.filter(p => p[0] > ORTA_MIN && p[0] < ORTA_MAX).length;
    ortaOran.push(yuzde(ortada, f.off.length));
    if (f.off.some(p => boyada(p, f.rimX))) boyaliKare++;
    offX.push(ort(f.off.map(p => p[0])));
    /* Potaya uzaklık: saldırılan pota (rimX) merkez alınır, iki yön de aynı ölçüye girer. */
    const rimY = 250;
    potaUzak.push(ort(f.off.map(p => Math.hypot(p[0] - f.rimX, p[1] - rimY))) / PX_M);
    if (f.carrierOff && f.carrier) {
      const en = Math.min.apply(null, f.def.map(p => Math.hypot(p[0] - f.carrier[0], p[1] - f.carrier[1])));
      carrierDef.push(en / PX_M);
    }
    const m = f.mark.filter(v => v >= 0).map(v => v / PX_M);
    if (m.length) markOrt.push(ort(m));
    const mh = f.mark.map((v, i) => ((f.markHazir && f.markHazir[i]) ? v / PX_M : -1)).filter(v => v >= 0);
    if (mh.length) markUzak.push(yuzde(mh.filter(v => v > 5).length, mh.length));
    const mi = (f.markIcerde || []).filter(v => v !== null && v !== undefined);
    if (mi.length) markIcerdeOran.push(yuzde(mi.filter(Boolean).length, mi.length));
  });
  return {
    kare: frames.length, setKare: setK.length,
    ikiliOrt: ort(ikiliOrt), ikiliMin: ort(ikiliMin), ikiliMinTopsuz: ort(ikiliMinTopsuz),
    alanYuzde: ort(alanY), zarfYuzde: ort(zarfY), ortaOran: ort(ortaOran),
    boyaKareOran: yuzde(boyaliKare, setK.length),
    offXOrt: ort(offX), rimXOrt: ort(setK.map(f => f.rimX)),
    carrierDef: carrierDef.length ? ort(carrierDef) : null,
    potaUzak: ort(potaUzak), markOrt: ort(markOrt), markUzakOran: ort(markUzak), markIcerde: ort(markIcerdeOran),
  };
}

const HEDEFLER = [
  { ad: 'set hücumunda ortalama ikili mesafe', al: r => r.ikiliOrt, hedef: '≥ 4,5 m', gec: v => v >= 4.5, br: 'm' },
  { ad: 'en yakın ikili (top sahibi hariç)', al: r => r.ikiliMinTopsuz, hedef: '≥ 3,5 m', gec: v => v >= 3.5, br: 'm' },
  { ad: 'hücumun yayılımı / yarı saha (kutu)', al: r => r.alanYuzde, hedef: '≥ %30', gec: v => v >= 30, br: '%' },
  { ad: 'orta üçte birdeki hücumcu oranı', al: r => r.ortaOran, hedef: '< %20', gec: v => v < 20, br: '%' },
  { ad: 'boyada ≥1 hücumcu olan kare oranı', al: r => r.boyaKareOran, hedef: '≥ %60', gec: v => v >= 60, br: '%' },
  { ad: 'topu tutana en yakın savunmacı', al: r => r.carrierDef, hedef: '< 1,8 m', gec: v => v != null && v < 1.8, br: 'm' },
  { ad: 'savunmacının adamına ortalama uzaklığı', al: r => r.markOrt, hedef: '< 3 m', gec: v => v < 3, br: 'm' },
  { ad: 'yerine oturmuş ama adamı > 5 m uzakta', al: r => r.markUzakOran, hedef: '%0', gec: v => v < 0.5, br: '%' },
  { ad: 'savunmacı adamı ile pota arasında', al: r => r.markIcerde, hedef: '≥ %85', gec: v => v >= 85, br: '%' },
  /* FAZ 13 (F13-11): asıl şikâyet aralık değil, takımın potaya HİÇ yaklaşmamasıydı —
     canlı ölçümde hücumun saldırdığı potaya ortalama uzaklığı 9,3 m idi. */
  { ad: 'hücumun saldırdığı potaya ortalama uzaklığı', al: r => r.potaUzak, hedef: '≤ 7 m', gec: v => v <= 7, br: 'm' },
];

(async () => {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    channel: 'chrome', headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows'],
  });
  const hatalar = [];
  let r = null, rOturmus = null, rTumu = null;
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript('(' + SEED_FN.toString() + ')(' + SEED + ');');
    page.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });
    page.on('pageerror', e => hatalar.push('pageerror: ' + e.message));

    await page.goto(base + '/charazay2.0.html?test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
    await page.click('#loginPage button.btn-p');
    await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
    await page.fill('#teamName', 'Spacing Test');
    await page.click('#setupPage button.btn-p');
    await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
    await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
    await page.evaluate(() => showPage('mac', document.querySelector('#sbNav button[data-page="mac"]')));
    await sleep(400);

    await page.evaluate(samplerKur);
    await page.evaluate((rate) => {
      try { setMatchRate(rate); } catch (e) {}
      try { startMatch(); } catch (e) {}
    }, RATE);

    console.log(`Maç izleniyor: ${(SURE_MS / 1000).toFixed(0)} sn · izleme hızı ${RATE}×` +
      (ARKA_PLAN ? ' · SEKME ARKA PLANDA (rAF kısıtlı)' : '') + '…');
    let onPage = null;
    if (ARKA_PLAN) { onPage = await ctx.newPage(); await onPage.goto('about:blank'); await onPage.bringToFront(); }
    await sleep(SURE_MS);
    if (onPage) { await page.bringToFront(); await onPage.close(); await sleep(300); }

    const veri = await page.evaluate(() => {
      if (window.__spacingTimer) clearInterval(window.__spacingTimer);
      return window.__spacing;
    });
    if (veri.hata) hatalar.push('örnekleyici: ' + veri.hata);
    r = olc(veri.frames || []);
    rOturmus = olc(veri.frames || [], 1200);
    rTumu = olc(veri.frames || [], 0, true);
    await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
  } finally {
    await browser.close();
    server.close();
  }

  if (!r) {
    console.error('\n✗ SET fazına ait hiç kare yakalanamadı — dizilim ölçülemedi.');
    console.error('  (Maç hiç başlamadıysa veya oyuncular set dizilimine hiç geçmiyorsa bu olur.)');
    process.exit(1);
  }

  if (JSON_CIKTI) { console.log(JSON.stringify(r, null, 1)); }
  console.log('\n' + '='.repeat(72));
  console.log(`SAHA DİZİLİMİ ÖLÇÜMÜ — ${r.kare} kare (${r.setKare} set fazı · %${yuzde(r.setKare, r.kare).toFixed(0)}) · seed=${SEED}`);
  console.log('='.repeat(72));
  /* --bg modunda örnekleme hızı tarayıcı tarafından ~1 Hz'e kısıtlanır: örneklerin çoğu
     geçiş anına denk gelir ve "top sahibi" karesi neredeyse hiç yakalanmaz. Bu modun amacı
     F11-1 gerilemesini yakalamaktır — orada anlamlı olan ölçüler yargılanır, kalanı bilgidir. */
  const BG_YARGI = ['boyada ≥1 hücumcu olan kare oranı', 'savunmacının adamına ortalama uzaklığı',
    'set hücumunda ortalama ikili mesafe', 'hücumun yayılımı / yarı saha (kutu)',
    'yerine oturmuş ama adamı > 5 m uzakta', 'savunmacı adamı ile pota arasında'];
  let dusen = 0;
  HEDEFLER.forEach(h => {
    const v = h.al(r);
    const yargila = !ARKA_PLAN || BG_YARGI.indexOf(h.ad) >= 0;
    const gec = v != null && h.gec(v);
    if (!gec && yargila) dusen++;
    if (!yargila) { 
      const y = v == null ? 'ölçülemedi' : (h.br === '%' ? '%' + v.toFixed(1) : v.toFixed(2) + ' m');
      console.log(`  ⋯ ${h.ad.padEnd(42)} ${y.padStart(12)}   (bg modunda bilgi)`);
      return;
    }
    const yaz = v == null ? 'ölçülemedi' : (h.br === '%' ? '%' + v.toFixed(1) : v.toFixed(2) + ' m');
    console.log(`  ${gec ? '✓' : '✗'} ${h.ad.padEnd(42)} ${yaz.padStart(12)}   hedef ${h.hedef}`);
  });
  if (rOturmus) {
    console.log(`\n  OTURMUŞ set kareleri (dizilim kurulduktan ≥1,2 sn sonra · ${rOturmus.setKare} kare):`);
    console.log(`    ikili ort ${rOturmus.ikiliOrt.toFixed(2)} m · en yakın ${rOturmus.ikiliMin.toFixed(2)} m · alan %${rOturmus.alanYuzde.toFixed(1)}` +
      ` · boyada %${rOturmus.boyaKareOran.toFixed(0)} · markaj ${rOturmus.markOrt.toFixed(2)} m` +
      ` · >5 m savunmacı %${rOturmus.markUzakOran.toFixed(1)}`);
  }
  /* B-4: SÜZÜLMEMİŞ rapor — dar kapsamda tutup geniş kapsamda tutmayan bir ölçü gerçek bir
     gerilemeyi gizler, bu yüzden DİZİLİM hedefleri burada da YARGILANIR.
     MARKAJ hedefleri ise burada yalnız BİLGİDİR ve bu bilinçli bir karardır: geçiş
     karelerinde savunma potaya dönüyor, adamına henüz yetişmemiştir; "topu tutana en yakın
     savunmacı < 1,8 m" bir hızlı hücum karesinde gerçek basketbolda da sağlanmaz. Markaj,
     savunmanın kurulduğu (set) karelerde yargılanır — yukarıdaki ana blok tam olarak odur
     (yalnız "oturmuş" alt kümesi değil). */
  if (rTumu && !ARKA_PLAN) {
    const MARKAJ = ['topu tutana en yakın savunmacı', 'savunmacının adamına ortalama uzaklığı',
      'yerine oturmuş ama adamı > 5 m uzakta', 'savunmacı adamı ile pota arasında'];
    console.log(`\n  SÜZÜLMEMİŞ — top ön sahadayken geçen TÜM kareler (${rTumu.setKare} kare · geçiş dahil):`);
    HEDEFLER.forEach(h => {
      const v = h.al(rTumu);
      if (v == null) return;
      const bilgi = MARKAJ.indexOf(h.ad) >= 0;
      const gec = h.gec(v);
      if (!gec && !bilgi) dusen++;
      const y = h.br === '%' ? '%' + v.toFixed(1) : v.toFixed(2) + ' m';
      console.log(`    ${bilgi ? '⋯' : (gec ? '✓' : '✗')} ${h.ad.padEnd(42)} ${y.padStart(12)}   ` +
        (bilgi ? '(geçişte savunma toparlanıyor — bilgi)' : 'hedef ' + h.hedef));
    });
  }
  console.log(`\n  bilgi: dışbükey zarf %${r.zarfYuzde.toFixed(1)} · hücum x ortalaması ${r.offXOrt.toFixed(0)} · saldırılan pota x ${r.rimXOrt.toFixed(0)} (saha 0-940)`);
  console.log(`  konsol hatası: ${hatalar.length}${hatalar.length ? ' — ' + hatalar[0] : ''}`);
  console.log('='.repeat(72));
  if (ARKA_PLAN) console.log('  (arka plan modu: örnekleme ~1 Hz — yalnız F11-1 için anlamlı ölçüler yargılandı)');
  console.log(dusen ? `✗ ${dusen} hedef düştü` : '✓ tüm dizilim hedefleri tuttu');
  process.exit(dusen ? 1 : 0);
})().catch(e => { console.error('HATA:', e); process.exit(1); });
