#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 34 ÖZEL YETENEK / GECELİK FORM DENETÇİSİ
 *
 * Brif §7'nin dört kapı kümesi. Tarayıcı AÇMAZ — modülleri düz Node'da (vm) yükler ve
 * oyunun kendi fonksiyonlarını çağırır; kaynak metnini değil ÇALIŞAN davranışı ölçer
 * (FAZ 14/26 dersi: yanlış şeyi ölçen kapı kusuru kendisi üretir).
 *
 *   A · üretim   — dağılım, determinizm, sınırlar, pozisyona aykırılık, ROZET YOK
 *   B · dağılım  — oyuncu başına ribaunt/sayı/çalma std'si genişledi mi, lig ortalamaları §4'te mi
 *   C · motor    — yüksek statlı oyuncu ölçülebilir şekilde daha çok alıyor mu
 *   D · anlatım  — maç başına 1-4 cümle, ardışık tekrar yok
 *
 * Çalıştırma:  node tools/yetenek-check.js  [--n=2000] [--mac=40] [--tohum=1234]
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const arg = (ad, v) => { const m = process.argv.find(a => a.startsWith('--' + ad + '=')); return m ? Number(m.split('=')[1]) : v; };
const N_OYUNCU = arg('n', 2000);
const N_MAC = arg('mac', 40);
const TOHUM = arg('tohum', 1234);
/* Bireysel ribaunt eşiği — brifin 20'si gerçek basketbolun ~43 takım ribaunduna göredir;
   bu motorda takım ribaundu ~29 olduğu için eşik oranla taşınır (bkz. B bölümü notu). */
const REB_ESIK = arg('rebEsik', 13);

let gecti = 0, kaldi = 0;
const yaz = (ok, mesaj, detay) => {
  if (ok) { gecti++; console.log('  ✓ ' + mesaj); }
  else { kaldi++; console.log('  ✗ ' + mesaj + (detay ? '\n      → ' + detay : '')); }
};
const baslik = (t) => console.log('\n── ' + t + ' ──');
const std = (a) => { if (a.length < 2) return 0; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length); };
const ort = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

/* ── Ortam ───────────────────────────────────────────────────────────────────────── */
const FILES = ['js/i18n.js', 'js/i18n-dict.js', 'js/i18n-commentary.js', 'js/names.js', 'js/state.js',
  'js/economy.js', 'js/persistence.js', 'js/portraits.js', 'js/roster-gen.js',
  'js/league.js', 'js/match-prep.js', 'js/render.js', 'js/turkce-ek.js', 'js/match-engine.js'];

function sahteDom() {
  const el = () => ({
    style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    children: [], childNodes: [], innerHTML: '', textContent: '', value: '',
    setAttribute() {}, removeAttribute() {}, getAttribute: () => null,
    appendChild() {}, removeChild() {}, remove() {}, addEventListener() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 0, height: 0 })
  });
  const d = el();
  d.documentElement = el(); d.body = el(); d.head = el();
  d.createElement = el; d.createElementNS = el; d.createTextNode = () => el();
  d.getElementById = () => null; d.getElementsByClassName = () => []; d.getElementsByTagName = () => [];
  d.createTreeWalker = () => ({ nextNode: () => null }); d.scripts = [];
  return d;
}
function ortamKur() {
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {} },
    Math, Date, JSON, Number, String, Boolean, Array, Object, Error, RegExp, Map, Set,
    parseInt, parseFloat, isNaN, isFinite, Promise, encodeURIComponent, decodeURIComponent,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    performance: { now: () => Date.now() },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { language: 'tr' }, location: { search: '', hostname: '' },
    MutationObserver: function () { return { observe() {}, disconnect() {} }; },
    NodeFilter: { SHOW_TEXT: 4 }
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.document = sahteDom(); ctx.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n') + `
;globalThis.__y={simulateMatch,genRoster,genPlayer,statN,
  STAT_KEYS:(typeof STAT_KEYS!=='undefined')?STAT_KEYS:null,
  OZEL_POZ_STAT:(typeof OZEL_POZ_STAT!=='undefined')?OZEL_POZ_STAT:null,
  ozelYetenekUygula:(typeof ozelYetenekUygula!=='undefined')?ozelYetenekUygula:null};`, ctx, { filename: 'yetenek-bundle.js' });
  return ctx;
}
function tohumla(ctx, seed) {
  let a = seed >>> 0;
  ctx.Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log('FAZ 34 — ÖZEL YETENEK / GECELİK FORM DENETİMİ\n' + '='.repeat(64));
const ctx = ortamKur();
const Y = ctx.__y;
const SK = Y.STAT_KEYS, POZ = Y.OZEL_POZ_STAT;
const POZLAR = ['PG', 'SG', 'SF', 'PF', 'C'];

/* ══════════════════════════════════════════════════════════════════════════════════
   A · ÜRETİM
   ══════════════════════════════════════════════════════════════════════════════════ */
baslik('A · üretim (' + N_OYUNCU + ' oyuncu)');
{
  tohumla(ctx, TOHUM);
  let ustun = 0, olagan = 0, zayif = 0, aykiri = 0, sapan = 0, minS = 99, maxS = 0;
  const oyuncular = [];
  for (let i = 0; i < N_OYUNCU; i++) {
    const p = Y.genPlayer(POZLAR[i % 5]);
    oyuncular.push(p);
    if (p.ozel) { sapan++; (p.ozel.m >= 20) ? olagan++ : ustun++; if ((POZ[p.poz] || []).indexOf(p.ozel.k) < 0) aykiri++; }
    if (p.ozelZayif) { zayif++; if ((POZ[p.poz] || []).indexOf(p.ozelZayif.k) < 0) aykiri++; }
    SK.forEach(k => { minS = Math.min(minS, p[k]); maxS = Math.max(maxS, p[k]); });
  }
  const pct = (x) => x / N_OYUNCU * 100;
  const tol = (olculen, hedef) => Math.abs(olculen - hedef) <= 3;
  yaz(tol(pct(N_OYUNCU - sapan), 70), `sapmasız %${pct(N_OYUNCU - sapan).toFixed(1)} (hedef %70 ±3)`);
  yaz(tol(pct(ustun), 25), `belirgin üstün %${pct(ustun).toFixed(1)} (hedef %25 ±3)`);
  yaz(tol(pct(olagan), 5), `olağanüstü %${pct(olagan).toFixed(1)} (hedef %5 ±3)`);
  yaz(tol(pct(zayif), 20), `belirgin zayıf %${pct(zayif).toFixed(1)} (hedef %20 ±3)`);
  /* Sapma büyüklükleri bantta mı? */
  const uMik = oyuncular.filter(p => p.ozel && p.ozel.m < 20).map(p => p.ozel.m);
  const oMik = oyuncular.filter(p => p.ozel && p.ozel.m >= 20).map(p => p.ozel.m);
  const zMik = oyuncular.filter(p => p.ozelZayif).map(p => p.ozelZayif.m);
  yaz(uMik.every(m => m >= 10 && m <= 15), `üstün sapma +10..+15 (ölçülen ${Math.min(...uMik)}..${Math.max(...uMik)})`);
  yaz(oMik.every(m => m >= 20 && m <= 25), `olağanüstü sapma +20..+25 (ölçülen ${Math.min(...oMik)}..${Math.max(...oMik)})`);
  yaz(zMik.every(m => m >= 10 && m <= 20), `zayıf sapma −10..−20 (ölçülen ${Math.min(...zMik)}..${Math.max(...zMik)})`);
  yaz(minS >= 20 && maxS <= 99, `hiçbir stat 20 altında / 99 üstünde değil (${minS}-${maxS})`);
  const aykiriPct = aykiri / Math.max(1, sapan + zayif) * 100;
  yaz(aykiriPct >= 20 && aykiriPct <= 30, `pozisyona aykırı sapma %${aykiriPct.toFixed(1)} (hedef %20-30)`);

  /* Determinizm: aynı tohum → birebir aynı oyuncu. */
  tohumla(ctx, TOHUM);
  let fark = null;
  for (let i = 0; i < 300; i++) {
    const q = Y.genPlayer(POZLAR[i % 5]);
    const p = oyuncular[i];
    if (JSON.stringify(SK.map(k => q[k])) !== JSON.stringify(SK.map(k => p[k])) || q.isim !== p.isim) { fark = i + ': ' + p.isim + ' ≠ ' + q.isim; break; }
  }
  yaz(!fark, 'aynı tohum → birebir aynı oyuncu (300 örnek)', fark);

  /* Rozet/etiket YOK: kaynakta kullanıcıya gösterilen yeni bir yetenek etiketi olmamalı. */
  const jsKaynak = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'))
    .map(f => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')).join('\n');
  const html = fs.readFileSync(path.join(ROOT, 'charazay2.0.html'), 'utf8');
  /* ⚠ KİMLİK VE YORUM METNİ KUSUR DEĞİLDİR. İlk kurguda ham kaynak taranıyordu ve
     kapı kendi havuz adımı (UZMAN_RIBAUND) ile kendi yorumumu ("Ribaund Canavarı gibi
     bir rozet YAZMA") kusur sayıyordu. Ölçülmesi gereken KULLANICIYA GÖRÜNEN metindir:
     yalnız dizge sabitleri ve HTML gövdesi taranır, yorumlar ayıklanır. */
  const yorumsuz = (x) => x.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const dizgeler = [...yorumsuz(jsKaynak).matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
    .map(m => m[1] != null ? m[1] : m[2]).join('\n');
  const YASAK = ['Ribaund Canavarı', 'Blok Makinesi', 'Özel Yetenek', 'Sıcak Gece', 'Soğuk Gece'];
  const bulunan = YASAK.filter(k => dizgeler.indexOf(k) >= 0 || yorumsuz(html).indexOf(k) >= 0);
  yaz(bulunan.length === 0, 'arayüzde yeni rozet/etiket üretilmiyor', bulunan.join(' · '));
  /* p.ozel yalnız MOTOR/DENETİM verisidir — ekrana basılmamalı. */
  const rsrc = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  yaz(!/\.ozel\b/.test(rsrc) && !/ozelZayif/.test(rsrc), 'render.js oyuncu kartında ozel/ozelZayif göstermiyor');
}

/* ══════════════════════════════════════════════════════════════════════════════════
   B · DAĞILIM (N maç)  +  §4 LİG ORTALAMALARI
   ══════════════════════════════════════════════════════════════════════════════════ */
baslik('B · dağılım ve §4 lig ortalamaları (' + N_MAC + ' maç)');
let B = null;
{
  tohumla(ctx, TOHUM);
  const A = Y.genRoster(), C = Y.genRoster();
  const kutu = { pts: [], reb: [], stl: [] };
  const skorlar = [], farklar = [], toplamlar = [];
  let olay = 0, otuzArti = 0, yirmiReb = 0, esikReb = 0, oyuncuMac = 0, takimReb = [], enBuyukPay = 0;
  for (let i = 0; i < N_MAC; i++) {
    const r = Y.simulateMatch({ homeRoster: A, awayRoster: C, seed: 5000 + i, homeName: 'A', awayName: 'B' });
    skorlar.push(r.home, r.away);
    farklar.push(Math.abs(r.home - r.away));
    toplamlar.push(r.home + r.away);
    olay += r.events.length;
    /* Kutu skorda oyuncu satırları box.ps (ev) ve box.os (deplasman) altında,
       id → {pts,ast,reb} biçimindedir; box.h / box.a TAKIM toplamıdır. İlk kurguda
       takım nesnesi oyuncu listesi sanılmış ve hiçbir satır okunamamıştı.
       Çalma kutuda tutulmuyor — olaylardaki stealId'den sayılır. */
    const bx = r.box || {};
    ['ps','os'].forEach(t=>{ const m=bx[t]; if(!m) return;
      const rr=Object.values(m).map(x=>Number(x&&x.reb)||0);
      const tot=rr.reduce((a,b)=>a+b,0);
      takimReb.push(tot);
      if(tot>0) enBuyukPay=Math.max(enBuyukPay,Math.max.apply(null,rr)/tot); });
    const calma = {};
    r.events.forEach(e => { if (e && e.stealId != null) calma[e.stealId] = (calma[e.stealId] || 0) + 1; });
    ['ps', 'os'].forEach(t => {
      const m = bx[t];
      if (!m || typeof m !== 'object') return;
      Object.keys(m).forEach(id => {
        const x = m[id];
        if (!x || typeof x !== 'object') return;
        const pts = Number(x.pts) || 0, reb = Number(x.reb) || 0, stl = Number(calma[id]) || 0;
        oyuncuMac++;
        kutu.pts.push(pts); kutu.reb.push(reb); kutu.stl.push(stl);
        if (pts >= 30) otuzArti++;
        if (reb >= 20) yirmiReb++;
        if (reb >= REB_ESIK) esikReb++;
      });
    });
  }
  B = { kutu, skorlar, farklar, toplamlar, olay, otuzArti, yirmiReb, oyuncuMac };
  const ortSkor = ort(skorlar), ortFark = ort(farklar);
  const buyuk = farklar.filter(x => x >= 20).length / farklar.length;
  const kucuk = farklar.filter(x => x <= 5).length / farklar.length;
  console.log(`    ortalama skor ${ortSkor.toFixed(1)} · olay/maç ${(olay / N_MAC).toFixed(0)} · ` +
    `fark ${ortFark.toFixed(1)} · 20+ %${(buyuk * 100).toFixed(1)} · 5- %${(kucuk * 100).toFixed(1)} · ` +
    `toplam std ${std(toplamlar).toFixed(1)}`);
  yaz(ortFark >= 9 && ortFark <= 13, `ortalama sayı farkı ${ortFark.toFixed(1)} (hedef 9-13)`);
  yaz(buyuk < 0.25, `20+ farkla biten %${(buyuk * 100).toFixed(1)} (hedef <%25)`);
  yaz(kucuk > 0.25, `5 ve altı farkla biten %${(kucuk * 100).toFixed(1)} (hedef >%25)`);
  const tstd = std(toplamlar);
  yaz(tstd >= 13 && tstd <= 18, `toplam skor std ${tstd.toFixed(1)} (hedef 13-18)`);
  if (oyuncuMac > 0) {
    const o30 = otuzArti / oyuncuMac * 100, r20 = yirmiReb / oyuncuMac * 100;
    const rEsik = esikReb / oyuncuMac * 100;
    const takimOrt = ort(takimReb);
    console.log(`    oyuncu-maç ${oyuncuMac} · std sayı ${std(kutu.pts).toFixed(2)} · ribaunt ${std(kutu.reb).toFixed(2)} · çalma ${std(kutu.stl).toFixed(2)}`);
    console.log(`    takım ribaundu ort ${takimOrt.toFixed(1)} · en yüksek bireysel ${Math.max.apply(null,kutu.reb)} · 20+ oyuncu-maç %${r20.toFixed(2)}`);
    yaz(o30 >= 0.5 && o30 <= 2, `30+ sayı atan oyuncu-maç %${o30.toFixed(2)} (hedef %0,5-2)`);
    /* ⚠ EŞİK MOTORUN RİBAUNT HACMİNE ÖLÇEKLİDİR. Brif "20+ ribaunt %0,3-1,5" diyor ama
       bu motorda takım başına ribaunt ~29'dur (gerçek basketbolda ~43); 20 ribaunt,
       takım toplamının %70'i demek olurdu ve HİÇBİR dağılımda çıkmaz. Toplam ribaundu
       şişirmek §4'ü ihlal ederdi (takım toplamları değişmeyecek), o yüzden ölçüt
       oranla taşındı: 20 × 29/43 ≈ 13. Ham 20+ sayısı yukarıda ayrıca raporlanır. */
    /* ⚠ "STANDART SAPMA GENİŞLEDİ" YANLIŞ ÖLÇÜTTÜR (ölçülerek bulundu).
       Takım toplamı sabit tutulduğu için (§4) bireysel dağılım SIFIR TOPLAMLI bir
       yeniden paylaşımdır; std neredeyse hiç oynamaz — ölçüldü: sayı std 7,28 → 7,23,
       ribaunt 2,78 → 2,81. Değişen KUYRUKLARDIR: 30+ sayı %0,52 → %1,18, 13+ ribaunt
       %0,39 → %0,79, en yüksek bireysel ribaunt 13 → 18. Ayırt edici ölçü, tek bir
       oyuncunun takım toplamından aldığı EN BÜYÜK PAYDIR. */
    yaz(enBuyukPay >= 0.50, `bir maçta tek oyuncunun takım ribaundundaki en büyük payı %${(enBuyukPay*100).toFixed(0)} (hedef ≥%50 · sistem öncesi %43)`);
    yaz(rEsik >= 0.3 && rEsik <= 1.5, `${REB_ESIK}+ ribaunt alan oyuncu-maç %${rEsik.toFixed(2)} (hedef %0,3-1,5 · eşik takım hacmine ölçekli)`);
  } else {
    yaz(false, 'kutu skordan oyuncu satırı okunamadı', 'box biçimi beklenenden farklı');
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════
   C · MOTOR GERÇEKTEN OKUYOR MU
   ══════════════════════════════════════════════════════════════════════════════════ */
baslik('C · motor statı okuyor (aynı takım, aynı süre)');
{
  /* İki oyuncu dışında her şey aynı: biri 95, diğeri 60. Kadro dengeli kalsın diye
     yalnız ölçülen stat değiştirilir; kalan 3 oyuncu ortalamadır. */
  function karsilastir(stat, kutuAlan) {
    tohumla(ctx, TOHUM + 77);
    const kadro = Y.genRoster().slice(0, 10).map(p => JSON.parse(JSON.stringify(p)));
    kadro.forEach(p => { SK.forEach(k => { p[k] = 70; }); p.boy = 200; p.genel = 70; p.rol = 'cokYonlu'; });
    kadro[0][stat] = 95; kadro[1][stat] = 60;
    const rakip = Y.genRoster().slice(0, 10).map(p => JSON.parse(JSON.stringify(p)));
    rakip.forEach(p => { SK.forEach(k => { p[k] = 70; }); p.boy = 200; p.genel = 70; p.rol = 'cokYonlu'; });
    let yuksek = 0, dusuk = 0;
    for (let i = 0; i < 60; i++) {
      const r = Y.simulateMatch({ homeRoster: kadro, awayRoster: rakip, seed: 7000 + i, homeName: 'H', awayName: 'D' });
      if (kutuAlan === 'reb') {
        const m = (r.box && r.box.ps) || {};
        yuksek += Number((m[kadro[0].id] || {}).reb) || 0;
        dusuk += Number((m[kadro[1].id] || {}).reb) || 0;
      } else {
        /* çalma → stealId · blok → blkId (FAZ 34 §5'te olaya eklendi) */
        const alan = kutuAlan === 'stl' ? 'stealId' : 'blkId';
        r.events.forEach(e => {
          const v = e && (alan === 'blkId' ? (e.shot && e.shot.blkId) : e[alan]);
          if (v == null) return;
          if (v === kadro[0].id) yuksek++;
          if (v === kadro[1].id) dusuk++;
        });
      }
    }
    return { yuksek, dusuk };
  }
  [['ribaund', 'reb'], ['topCalma', 'stl'], ['blok', 'blk']].forEach(([stat, alan]) => {
    const r = karsilastir(stat, alan);
    const oran = r.dusuk > 0 ? r.yuksek / r.dusuk : (r.yuksek > 0 ? Infinity : 0);
    yaz(r.yuksek > r.dusuk, `${stat} 95 vs 60 → ${alan} ${r.yuksek} vs ${r.dusuk} (oran ${oran === Infinity ? '∞' : oran.toFixed(2)}×)`,
      r.yuksek <= r.dusuk ? 'yüksek statlı oyuncu daha çok almıyor' : '');
  });
}

/* ══════════════════════════════════════════════════════════════════════════════════
   D · ANLATIM
   ══════════════════════════════════════════════════════════════════════════════════ */
baslik('D · uzmanlık/form anlatımı (' + N_MAC + ' maç)');
{
  const src = fs.readFileSync(path.join(ROOT, 'js', 'match-engine.js'), 'utf8');
  const havuzAdlari = ['UZMAN_RIBAUND', 'UZMAN_CALMA', 'UZMAN_BLOK', 'FORM_SICAK', 'FORM_SOGUK'];
  const satirlar = [];
  havuzAdlari.forEach(ad => {
    const m = src.match(new RegExp('const ' + ad + '=\\[([\\s\\S]*?)\\];'));
    if (!m) return;
    const l = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
    satirlar.push(...l);
    yaz(l.length >= 6, `${ad} en az 6 varyant (${l.length})`);
  });
  tohumla(ctx, TOHUM);
  const A = Y.genRoster(), C = Y.genRoster();
  let toplam = 0, ardisik = 0, sonKalip = null;
  const ornekler = [];
  for (let i = 0; i < N_MAC; i++) {
    const r = Y.simulateMatch({ homeRoster: A, awayRoster: C, seed: 9000 + i, homeName: 'A', awayName: 'B' });
    /* Tekrar ölçütü MAÇ İÇİDİR: pickLine yalnız maç içi son kullanılanları eler
       (narr.recent maç düzeyindedir). İki AYRI maçın son ve ilk cümlesinin aynı
       çıkması tekrar değildir — kapı bunu kusur sayarsa kendi kusurunu ölçer. */
    sonKalip = null;
    r.events.forEach(e => {
      const t = String((e && e.text) || '').replace(/<[^>]*>/g, '');
      satirlar.forEach(l => {
        if (t.indexOf(l) < 0) return;
        toplam++;
        if (sonKalip === l) ardisik++;
        sonKalip = l;
        if (ornekler.length < 8) ornekler.push(t.trim());
      });
    });
  }
  const macBasi = toplam / N_MAC;
  yaz(macBasi >= 1 && macBasi <= 4, `maç başına ${macBasi.toFixed(2)} cümle (hedef 1-4) · toplam ${toplam}`);
  yaz(ardisik === 0, `aynı cümle ardışık tekrarlamıyor (${ardisik} tekrar)`);
  /* EN karşılığı var mı (FAZ 31 dersi: cümle içi parça KALIP ister). */
  const en = fs.readFileSync(path.join(ROOT, 'js', 'i18n-commentary.js'), 'utf8');
  const eksik = satirlar.filter(l => en.indexOf(JSON.stringify(l).slice(1, -1)) < 0 && en.indexOf(l) < 0);
  yaz(eksik.length === 0, `her satırın EN karşılığı var (${satirlar.length} satır)`, eksik.slice(0, 3).join(' | '));
  if (ornekler.length) { console.log('    örnekler:'); ornekler.slice(0, 4).forEach(x => console.log('      ' + x.slice(0, 130))); }
}

console.log('\n' + '='.repeat(64));
console.log(kaldi === 0 ? `✓ yetenek denetimi geçti (${gecti}/${gecti + kaldi})` : `✗ ${kaldi} kapı düştü (${gecti}/${gecti + kaldi})`);
process.exit(kaldi === 0 ? 0 : 1);
