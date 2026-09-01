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

const [ARENA0_KAP, ARENA_SON_KAP] = vm.runInContext(`[ARENA_LVL[0].kap, ARENA_LVL[ARENA_LVL.length-1].kap]`, ctx);
const olcum = vm.runInContext(`(function(){
  const out = [];
  G.team = { isim: 'Test', tblKey: 'tbl', renk: '#fff' };
  /* FAZ 25 USD: kapasiteler ARENA_LVL tablosundan okunur — sabit liste tablo değişince
     sessizce eskiyordu (5.000/30.000 artık YOK). */
  for (const kap of ARENA_LVL.map(a => a.kap))
    for (let fiyat = 0; fiyat < 5; fiyat++)
      for (const w of [0, 3, 8, 14, 17]) {
        G.arena = { s: 1, kap, bk: ARENA_LVL[0].bk };
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

console.log('\nC) Sezon başı geliri çapada mı (başlangıç arenası · normal fiyat · maç oynanmamış)');
/* KAPININ NİYETİ: doluluk/gelir formülü yeniden düzenlendiğinde sezon başı gelirinin
   SESSİZCE kaymadığını görmek. Rakamlar FAZ 22 ölçeğine (5.000 kap · 4.350 KR) çakılıydı;
   FAZ 25 USD'de hem para birimi hem arena tablosu değişti, kapı ölçtüğü şeyi değil ESKİ
   BİR SAYIYI savunur hâle geldi (FAZ 25/28 dersi: havuz değişince kapıyı da güncelle).
   Yeni çapa brifin §2.2/§2.3 tablosudur: 2.000 kapasite · $13 bilet · maç oynanmamışken
   doluluk %67 · gelir ≈ $17.400. */
const basKap = ARENA0_KAP;
const bas = olcum.find(x => x.kap === basKap && x.fiyat === 2 && x.w === 0);
yaz(!!bas && Math.abs(bas.occ - 0.67) < 0.02,
  `doluluk %${bas ? (bas.occ * 100).toFixed(1) : '—'} (beklenen ~%67 — form bağlayıcı, taraftar değil)`);
yaz(!!bas && Math.abs(bas.gelir - 17420) < 900,
  `bilet geliri $${bas ? bas.gelir : '—'} (FAZ 25 çapası ≈ $17.420)`);

console.log('\nD) Arena büyütmek taraftar olmadan gelir getirmiyor mu');
const kucuk = olcum.find(x => x.kap === ARENA0_KAP && x.fiyat === 2 && x.w === 0);
const dev = olcum.find(x => x.kap === ARENA_SON_KAP && x.fiyat === 2 && x.w === 0);
yaz(!!dev && dev.seyirci <= dev.fan,
  `${ARENA_SON_KAP}'lik arenada seyirci ${dev ? dev.seyirci : '—'} ≤ taraftar ${dev ? dev.fan : '—'}`);
/* Eşik kapasite ORANINA bağlanır: eskiden 6× kapasite için sabit 1,35 yazılmıştı, tablo
   değişince (10×) kapı kendi eski çapasını savunuyordu. Niyet: gelir artışı kapasite
   artışının çok altında kalmalı (taraftar tavanı iş görüyor). */
const KAP_ORAN = ARENA_SON_KAP / ARENA0_KAP;
yaz(!!dev && !!kucuk && dev.gelir <= kucuk.gelir * KAP_ORAN * 0.35,
  `${(ARENA_SON_KAP / ARENA0_KAP).toFixed(0)}× kapasite geliri yalnız ${dev && kucuk ? (dev.gelir / kucuk.gelir).toFixed(2) : '—'}× yapıyor (taraftar tavanı iş görüyor)`);

console.log('\nE) Tek kaynak — render.js kopya sabit tutmuyor');
const rsrc = fs.readFileSync(path.join(ROOT, 'js/render.js'), 'utf8');
yaz(!/fsx\.count\s*\*\s*1\.6/.test(rsrc) && /fsx\.count\s*\*\s*TARAFTAR_KATSAYI/.test(rsrc),
  'renderArena taraftar tavanını TARAFTAR_KATSAYI üzerinden okuyor (gömülü 1.6 yok)');

console.log('\n' + '='.repeat(60));
console.log(hata ? `✗ ${hata} kontrol başarısız` : '✓ arena doluluğu tutarlı');
process.exit(hata ? 1 : 0);
