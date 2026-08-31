#!/usr/bin/env node
/**
 * FAZ 24 §5 — Arena doluluğu / seyirci tavanı denetçisi.
 *
 * Kural: bir maça gelen seyirci sayısı taraftar tabanını AŞAMAZ. Bu kapı iki gerçek
 * kusuru yakaladı: (1) TARAFTAR_KATSAYI 1,6 idi, 2.800 taraftarlı kulüp 4.480 kişi
 * ağırlıyordu; (2) doluluğun %20 tabanı Math.max ile en DIŞTA duruyordu ve taraftar
 * tavanını eziyordu — 800 taraftarlı kulüp 30.000'lik arenada 6.000 seyirci topluyordu.
 * Arena / bilet / taraftar formülü değişince çalıştır.
 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let hata = 0;
const yaz = (ok, s) => { console.log((ok ? '  ✓ ' : '  ✗ ') + s); if (!ok) hata++; };

const ctx = {
  console: Object.assign(Object.create(console), { warn() {} }), Math, Date, JSON,
  setTimeout() {}, clearTimeout() {},
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  document: {
    getElementById() { return null; },
    createElement() { return { style: {}, classList: { add() {}, remove() {} } }; },
    addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, body: {}
  },
  navigator: {}, location: { search: '?test=1' }
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['js/i18n.js', 'js/i18n-dict.js', 'js/i18n-commentary.js', 'js/names.js', 'js/state.js',
 'js/economy.js', 'js/persistence.js', 'js/portraits.js', 'js/roster-gen.js'
].forEach(f => {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.log('  ! yükleme ' + f + ': ' + e.message); }
});

console.log('FAZ 24 §5 — ARENA DOLULUĞU / SEYİRCİ TAVANI');
console.log('='.repeat(60));

const olcum = vm.runInContext(`(function(){
  const out = [];
  G.team = { isim: 'Test', tblKey: 'tbl', renk: '#fff' };
  for (const kap of [5000, 10000, 15000, 20000, 30000])
    for (let fiyat = 0; fiyat < 5; fiyat++)
      for (const w of [0, 3, 8, 14, 17]) {
        G.arena = { s: 1, kap, bk: 150 };
        G.ticketPrice = fiyat;
        G.wins = w; G.losses = (w === 0 ? 0 : 17 - w);   /* w=0 → sezon başı (hiç oynanmamış) */
        const fan = getFanBaseStats().count;
        const occ = arenaDolulukOrani();
        out.push({ kap, fiyat, w, fan, occ, seyirci: Math.round(occ * kap), gelir: homeTicketIncome() });
      }
  return out;
})()`, ctx);

console.log('\nA) Seyirci ≤ taraftar tabanı');
const ihlal = olcum.filter(x => x.seyirci > x.fan);
yaz(ihlal.length === 0,
  ihlal.length
    ? `${ihlal.length}/${olcum.length} birleşimde seyirci taraftarı aşıyor, ör. ${JSON.stringify(ihlal[0])}`
    : `${olcum.length} arena×fiyat×form birleşiminin hepsinde seyirci ≤ taraftar`);

console.log('\nB) Doluluk sınırları');
yaz(olcum.every(x => x.occ >= 0 && x.occ <= 0.98),
  `doluluk her zaman 0–%98 arası (en yüksek %${Math.round(Math.max(...olcum.map(x => x.occ)) * 100)})`);

console.log('\nC) Sezon başı geliri değişmedi mi (5.000 kap · normal fiyat · maç oynanmamış)');
/* Taban 2.800 × 1,6 = 4.480 → tavan %89,6; taban 4.700 × 1,0 = 4.700 → tavan %94.
   İkisinde de bağlayıcı olan form dalıdır (%72,5), bu yüzden gelir aynı kalmalı. */
const bas = olcum.find(x => x.kap === 5000 && x.fiyat === 2 && x.w === 0);
yaz(!!bas && Math.abs(bas.occ - 0.725) < 0.005,
  `doluluk %${bas ? (bas.occ * 100).toFixed(1) : '—'} (beklenen %72,5 — form bağlayıcı, taraftar değil)`);
yaz(!!bas && bas.gelir === 4350, `bilet geliri ${bas ? bas.gelir : '—'} KR (FAZ 22 değeriyle aynı: 4350)`);

console.log('\nD) Arena büyütmek taraftar olmadan gelir getirmiyor mu');
const kucuk = olcum.find(x => x.kap === 5000 && x.fiyat === 2 && x.w === 0);
const dev = olcum.find(x => x.kap === 30000 && x.fiyat === 2 && x.w === 0);
yaz(!!dev && dev.seyirci <= dev.fan,
  `30.000'lik arenada seyirci ${dev ? dev.seyirci : '—'} ≤ taraftar ${dev ? dev.fan : '—'}`);
yaz(!!dev && !!kucuk && dev.gelir <= kucuk.gelir * 1.35,
  `6× kapasite geliri yalnız ${dev && kucuk ? (dev.gelir / kucuk.gelir).toFixed(2) : '—'}× yapıyor (taraftar tavanı iş görüyor)`);

console.log('\nE) Tek kaynak — render.js kopya sabit tutmuyor');
const rsrc = fs.readFileSync(path.join(ROOT, 'js/render.js'), 'utf8');
yaz(!/fsx\.count\s*\*\s*1\.6/.test(rsrc) && /fsx\.count\s*\*\s*TARAFTAR_KATSAYI/.test(rsrc),
  'renderArena taraftar tavanını TARAFTAR_KATSAYI üzerinden okuyor (gömülü 1.6 yok)');

console.log('\n' + '='.repeat(60));
console.log(hata ? `✗ ${hata} kontrol başarısız` : '✓ arena doluluğu tutarlı');
process.exit(hata ? 1 : 0);
