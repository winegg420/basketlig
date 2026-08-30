#!/usr/bin/env node
/**
 * Charazay 2.0 — SAHA HAREKETİ GERÇEKÇİLİK ÖLÇÜMÜ (FAZ 15 / F15-3)
 *
 * NEDEN VAR: `spacing-check` NEREDE durulduğunu ölçer, `live-metrics` ZAMAN senkronunu,
 * `realism-check` ihlalleri. Hiçbiri "oyuncular NE HIZLA hareket ediyor" sorusunu sormuyordu.
 * Ölçünce çıkan sonuç: oyunun en yavaş jetonu bile gerçek basketbolun "koşu" bölgesindeydi
 * ve herkes her pozisyonda hareket ediyordu (gerçekte zamanın yarısı durma/yürümedir).
 *
 * YÖNTEM: sahne `setInterval` ile örneklenir (rAF kısıtlamasından etkilenmez). Hız, DUVAR
 * saatinden değil SİMÜLASYON saatinden (`S.time`) türetilir — böylece izleme hızı (`--rate`)
 * ölçümü etkilemez; 1× de 4× de aynı m/sn değerini verir.
 * Ölçek: oyun alanı 827,2 px = 28 m → 29,5429 px = 1 m.
 *
 * Çalıştırma:  node tools/hareket-check.js [--ms=90000] [--rate=2] [--hz=25] [--json] [--bg]
 *   --rate : maçın izleme hızı (oyunun kendi çarpanı, 0,5-4). Ölçümü etkilemez.
 *   --hz   : örnekleme frekansı (varsayılan 25 Hz = 40 ms; hız ölçümü için ≥10 Hz şart).
 * Çıkış kodu: 0 = tüm hedefler tuttu · 1 = en az biri düştü.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const sayi = (ad, varsayilan) => {
  const m = process.argv.find(a => a.startsWith('--' + ad + '='));
  return m ? Number(m.split('=')[1]) : varsayilan;
};
const SURE_MS = sayi('ms', 90000);
const RATE = Math.max(0.5, Math.min(4, sayi('rate', 2)));
const HZ = Math.max(10, Math.min(60, sayi('hz', 25)));
const JSON_CIKTI = process.argv.includes('--json');
const ARKA_PLAN = process.argv.includes('--bg');
/* Tohum: bu depodaki üç araç tohumsuz olduğu için aynı kodla farklı sonuç vermişti. */
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

const PX_M = 827.2 / 28;             /* 29,5429 px = 1 m */
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

/** Sayfa içi örnekleyici: her jetonun konumu + simülasyon saati. */
function samplerKur(hz) {
  window.__hareket = { kareler: [], hata: null };
  if (window.__hareketTimer) clearInterval(window.__hareketTimer);
  window.__hareketTimer = setInterval(() => {
    try {
      const S = (typeof mState !== 'undefined' && mState) ? mState._sim : null;
      if (!S || !S.offP || !S.defP || !mState.running) return;
      const off = S.offP.filter(p => p && !p._oob);
      const def = S.defP.filter(p => p && !p._oob);
      if (off.length < 5 || def.length < 5) return;
      const kim = p => (p.team || '') + ':' + (p.slot != null ? p.slot : '?');
      window.__hareket.kareler.push({
        t: S.time,                                  /* SİMÜLASYON saati (sn) */
        snap: S._snapN || 0,                        /* F11-1 yetişme ışınlaması sayacı */
        mt: (mState._clkNow != null ? mState._clkNow : null),   /* AKAN MAÇ SAATİ (sn, geri sayar) */
        q: mState.quarter,
        set: !!S.defTrack,
        rimX: S.defRim ? S.defRim[0] : null,
        off: off.map(p => [p.x, p.y, kim(p), p.urg != null ? p.urg : -1]),
        def: def.map(p => [p.x, p.y, kim(p), p.urg != null ? p.urg : -1]),
      });
      if (window.__hareket.kareler.length > 12000) window.__hareket.kareler.shift();
    } catch (e) { window.__hareket.hata = String((e && e.message) || e); }
  }, Math.round(1000 / hz));
}

// ── İstatistik yardımcıları ────────────────────────────────────────────────────────────
const ort = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const medyan = a => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const yuzde = (n, t) => (t ? 100 * n / t : 0);

/** Konveks kabuk (Andrew monotone chain) — alan px². */
function kabukAlani(pts) {
  if (pts.length < 3) return 0;
  const p = pts.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const capraz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const alt = [], ust = [];
  for (const q of p) { while (alt.length >= 2 && capraz(alt[alt.length - 2], alt[alt.length - 1], q) <= 0) alt.pop(); alt.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (ust.length >= 2 && capraz(ust[ust.length - 2], ust[ust.length - 1], q) <= 0) ust.pop(); ust.push(q); }
  const zarf = alt.slice(0, -1).concat(ust.slice(0, -1));
  let a = 0;
  for (let i = 0; i < zarf.length; i++) { const b = zarf[(i + 1) % zarf.length]; a += zarf[i][0] * b[1] - b[0] * zarf[i][1]; }
  return Math.abs(a) / 2;
}
function ikiliOrt(pts) {
  let t = 0, n = 0;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    t += Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); n++;
  }
  return n ? t / n : 0;
}

function olc(kareler) {
  const hizlar = [];              /* m/sn — her jeton, her aralık */
  let sicrama = 0;                /* değişiklik/ışınlanma sayılmaz */
  let yetisme = 0;                /* _simCatchUp ışınlaması (hız değil) */
  const offIkili = [], defIkili = [], offKabuk = [], defKabuk = [];
  let macSn = 0, simSn = 0;      /* zaman tabanı oranı: kaç MAÇ saniyesi / SİM saniyesi */
  let enYuksek = 0, enYuksekBilgi = null;
  const urgSay = {};

  for (let i = 1; i < kareler.length; i++) {
    const a = kareler[i - 1], b = kareler[i];
    const dt = b.t - a.t;
    if (!(dt > 0.001) || dt > 1.5) continue;      /* duraklama/atlama */
    /* F11-1 YETİŞME (`_simCatchUp`) sahne anlatımın gerisine düşünce TÜM jetonları hedefine
       ışınlar. Bu bir HIZ değildir; o aralık hız ölçümüne girmez, ayrıca sayılır. */
    if ((b.snap || 0) !== (a.snap || 0)) { yetisme++; continue; }
    /* Sahne, maç saatini SIKIŞTIRARAK oynatır (MATCH_TIME_SCALE). Hız yalnız sahne
       saniyesinde ölçülürse gerçek basketbolla kıyaslanamaz; oran burada ölçülür. */
    if (a.mt != null && b.mt != null && a.q === b.q) {
      const dm = a.mt - b.mt;                    /* maç saati geri sayar */
      if (dm >= 0 && dm < 30) { macSn += dm; simSn += dt; }
    }
    const harita = new Map();
    a.off.concat(a.def).forEach(p => harita.set(p[2], p));
    b.off.concat(b.def).forEach(p => {
      const o = harita.get(p[2]);
      if (!o) return;                             /* oyuncu değişikliği — eşleşme yok */
      const d = Math.hypot(p[0] - o[0], p[1] - o[1]) / PX_M;
      const v = d / dt;
      if (v > 25) { sicrama++; return; }           /* ışınlanma / jeton takası */
      hizlar.push(v);
      if (v > enYuksek) { enYuksek = v; enYuksekBilgi = p[2]; }
      if (p[3] >= 0) urgSay[p[3]] = (urgSay[p[3]] || 0) + 1;
    });
  }
  /* Açılım yalnız SET fazı karelerinden — geçişte iki takım kulvarda koşar, o kareler
     "dizilim açıklığı" sorusunun cevabı değildir (spacing-check ile aynı ayrım). */
  kareler.forEach(f => {
    if (!f.set || f.rimX == null) return;
    offIkili.push(ikiliOrt(f.off) / PX_M);
    defIkili.push(ikiliOrt(f.def) / PX_M);
    offKabuk.push(kabukAlani(f.off) / (PX_M * PX_M));
    defKabuk.push(kabukAlani(f.def) / (PX_M * PX_M));
  });

  const n = hizlar.length;
  const bant = (dusuk, yuksek) => yuzde(hizlar.filter(v => v >= dusuk && v < yuksek).length, n);
  /* MAÇ saatine çevrilmiş kopya — hedefler bunun üzerinden yargılanır. */
  const k = simSn > 0 ? macSn / simSn : 1;
  const hizM = hizlar.map(v => v / k);
  const bantM = (dusuk, yuksek) => yuzde(hizM.filter(v => v >= dusuk && v < yuksek).length, n);
  return {
    ornek: n, kare: kareler.length, sicrama, yetisme,
    zamanOrani: simSn > 0 ? macSn / simSn : null,
    hizOrtM: ort(hizM), hizMedM: medyan(hizM), hizMaxM: enYuksek / k,
    durmaM: bantM(0, 1.67), jogM: bantM(1.67, 3.3), kosuM: bantM(3.3, 7), sprintM: bantM(7, 1e9),
    hizOrt: ort(hizlar), hizMed: medyan(hizlar), hizMax: enYuksek, hizMaxKim: enYuksekBilgi,
    hizP95: (() => { const b = hizlar.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length * 0.95)] : 0; })(),
    durma: bant(0, 1.67), jog: bant(1.67, 3.3), kosu: bant(3.3, 7), sprint: bant(7, 1e9),
    offIkili: ort(offIkili), defIkili: ort(defIkili),
    offKabuk: ort(offKabuk), defKabuk: ort(defKabuk),
    setKare: offIkili.length, urgSay,
  };
}

/* ── HEDEFLER ─────────────────────────────────────────────────────────────────────────
   ⚠ HIZLAR MAÇ SAATİNDE YARGILANIR. Bu, ölçümle bulunan ve FAZ 15 brifinin teşhisini
   düzelten noktadır: sahne maç saatini ~2× SIKIŞTIRARAK oynatır (ölçüldü: 1 sahne sn ≈
   2,0 maç sn). Sahne saniyesindeki px/sn'yi gerçek basketbolun m/sn'siyle kıyaslamak,
   FAZ 13'te "yay yarıçapını nitelikten okumak" ile aynı hatadır — yanlış büyüklük
   karşılaştırılır. Jetonun sahnede 6 m/sn görünmesi, maç saatinde 3 m/sn demektir.
   Sahne değerleri çıktıda ayrıca yazılır.
   İKİ ÖLÇÜT BİLGİDİR (yargılanmaz), sebebi de yazılıdır:
     • MEDYAN: sahne yalnız SENARYOLU hareketi canlandırır; yerine varmış jeton tam olarak
       durur. Gerçek oyuncu hiç durmaz, sürekli ayak oynatır — sensör verisinde medyanı
       yukarı çeken budur. Oyunda medyan, "duran jeton" oranını ölçer.
     • DURMA/YÜRÜME PAYI: aynı sebeple yüksektir; ölü top ve mola anları da canlandırılmaz. */
const HEDEFLER = [
  { ad: 'ortalama oyuncu hızı (maç saati)', al: r => r.hizOrtM, hedef: '1,3 - 2,1 m/sn', gec: v => v >= 1.3 && v <= 2.1, br: 'm/sn' },
  { ad: 'medyan oyuncu hızı (maç saati)', al: r => r.hizMedM, hedef: '1,1 - 1,8 m/sn', gec: v => true, br: 'm/sn', bilgi: 'sahne duran jetonu tam durdurur' },
  { ad: 'zaman: durma/yürüme (<1,67)', al: r => r.durmaM, hedef: '%35 - 60', gec: v => true, br: '%', bilgi: 'ölü top canlandırılmaz' },
  { ad: 'zaman: hafif koşu (1,67-3,3)', al: r => r.jogM, hedef: '%12 - 38', gec: v => v >= 12 && v <= 38, br: '%' },
  { ad: 'zaman: koşu (3,3-7)', al: r => r.kosuM, hedef: '%8 - 25', gec: v => v >= 8 && v <= 25, br: '%' },
  { ad: 'zaman: sprint (>7)', al: r => r.sprintM, hedef: '%0 - 6', gec: v => v <= 6, br: '%' },
  { ad: 'en yüksek anlık hız (maç saati)', al: r => r.hizMaxM, hedef: '< 9,5 m/sn', gec: v => v < 9.5, br: 'm/sn' },
  { ad: 'hücum ortalama ikili mesafe', al: r => r.offIkili, hedef: '6,5 - 9,0 m', gec: v => v >= 6.5 && v <= 9.0, br: 'm' },
  { ad: 'savunma ortalama ikili mesafe', al: r => r.defIkili, hedef: '5,0 - 7,0 m', gec: v => v >= 5.0 && v <= 7.0, br: 'm' },
  { ad: 'hücum konveks kabuk alanı', al: r => r.offKabuk, hedef: '40 - 65 m²', gec: v => v >= 40 && v <= 65, br: 'm²' },
  { ad: 'savunma konveks kabuk alanı', al: r => r.defKabuk, hedef: '22 - 42 m²', gec: v => v >= 22 && v <= 42, br: 'm²' },
];

(async () => {
  const server = await startServer();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({
    channel: 'chrome', headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows'],
  });
  const hatalar = [];
  let r = null;
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
    await page.fill('#teamName', 'Hareket Test');
    await page.click('#setupPage button.btn-p');
    await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
    await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
    await page.evaluate(() => showPage('mac', document.querySelector('#sbNav button[data-page="mac"]')));
    await sleep(400);

    await page.evaluate(samplerKur, HZ);
    await page.evaluate((rate) => {
      try { setMatchRate(rate); } catch (e) {}
      try { startMatch(); } catch (e) {}
    }, RATE);

    console.log(`Maç izleniyor: ${(SURE_MS / 1000).toFixed(0)} sn · izleme hızı ${RATE}× · örnekleme ${HZ} Hz` +
      (ARKA_PLAN ? ' · SEKME ARKA PLANDA' : '') + '…');
    let onPage = null;
    if (ARKA_PLAN) { onPage = await ctx.newPage(); await onPage.goto('about:blank'); await onPage.bringToFront(); }
    await sleep(SURE_MS);
    if (onPage) { await page.bringToFront(); await onPage.close(); await sleep(300); }

    const veri = await page.evaluate(() => {
      if (window.__hareketTimer) clearInterval(window.__hareketTimer);
      return window.__hareket;
    });
    if (veri.hata) hatalar.push('örnekleyici: ' + veri.hata);
    r = olc(veri.kareler || []);
    await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
  } finally {
    await browser.close();
    server.close();
  }

  if (!r || !r.ornek) {
    console.error('\n✗ hiç hız örneği toplanamadı — maç başlamadı mı?');
    process.exit(1);
  }
  if (JSON_CIKTI) console.log(JSON.stringify(r, null, 1));

  console.log('\n' + '='.repeat(72));
  console.log(`SAHA HAREKETİ — ${r.kare} kare · ${r.ornek} hız örneği · ${r.setKare} set karesi · seed=${SEED}`);
  console.log('='.repeat(72));
  let dusen = 0;
  HEDEFLER.forEach(h => {
    const v = h.al(r);
    const gec = v != null && h.gec(v);
    if (!gec && !h.bilgi) dusen++;
    const y = h.br === '%' ? '%' + v.toFixed(1) : v.toFixed(2) + ' ' + h.br;
    console.log(`  ${h.bilgi ? '⋯' : (gec ? '✓' : '✗')} ${h.ad.padEnd(34)} ${y.padStart(12)}   ` +
      (h.bilgi ? `(bilgi: ${h.bilgi} · gerçek ${h.hedef})` : 'hedef ' + h.hedef));
  });
  if (r.zamanOrani) {
    const k = r.zamanOrani;
    console.log('\n  ZAMAN TABANI: 1 sahne saniyesi = ' + k.toFixed(2) + ' MAÇ saniyesi (sahne maç saatini sıkıştırır).');
    console.log('  Yukarıdaki hız hedefleri bu tabana göre yargılandı (gerçek: ort 1,54-1,60 · sprint > 7).');
    console.log('  SAHNE saniyesindeki ham değerler (yargılanmaz, karşılaştırma için):');
    console.log('    ortalama ' + r.hizOrt.toFixed(2) + ' · medyan ' + r.hizMed.toFixed(2) +
      ' · en yüksek ' + r.hizMax.toFixed(2) + ' m/sahne-sn · bantlar %' + r.durma.toFixed(0) +
      ' / %' + r.jog.toFixed(0) + ' / %' + r.kosu.toFixed(0) + ' / %' + r.sprint.toFixed(0));
  }
  console.log(`\n  bilgi: p95 hız ${r.hizP95.toFixed(2)} m/sn · en hızlı jeton ${r.hizMaxKim || '?'} · ` +
    `ışınlanma/takas atlanan ${r.sicrama} · yetişme (F11-1) atlanan aralık ${r.yetisme}`);
  const urgAd = ['yürü', 'jog', 'koş', 'sprint'];
  const urgTop = Object.values(r.urgSay).reduce((a, b) => a + b, 0);
  if (urgTop) {
    console.log('  kademe dağılımı: ' + Object.keys(r.urgSay).sort()
      .map(k => (urgAd[k] || k) + ' %' + yuzde(r.urgSay[k], urgTop).toFixed(0)).join(' · '));
  }
  console.log(`  konsol hatası: ${hatalar.length}${hatalar.length ? ' — ' + hatalar[0] : ''}`);
  console.log('='.repeat(72));
  console.log(dusen ? `✗ ${dusen} hedef düştü` : '✓ tüm hareket hedefleri tuttu');
  process.exit(dusen ? 1 : 0);
})().catch(e => { console.error('HATA:', e); process.exit(1); });
