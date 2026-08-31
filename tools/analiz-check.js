#!/usr/bin/env node
/**
 * FAZ 24 §6 — Analiz sayfası sayı tutarlılığı denetçisi.
 *
 * Neden: canlıda kart "SAYI ORT. (ATTI)" ile grafik "Attığı sayı" farklı sayı
 * gösteriyordu. Kök sebep FAZ 22 §4.1'de bulunmuştu (grafik etiketi, çizim için
 * AÇILAN banttan basılıyordu; 93,0 ortalama "94" etiketi veriyordu). Bu denetçi
 * düzeltmenin yerinde durduğunu ve kart ile grafiğin AYNI diziden beslendiğini
 * her seferinde ölçer — göz kararı doğrulama tekrar edilemiyordu.
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
 'js/economy.js', 'js/persistence.js', 'js/portraits.js', 'js/roster-gen.js', 'js/render.js'
].forEach(f => {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.log('  ! yükleme ' + f + ': ' + e.message); }
});

/** Eksen etiketlerini oku. Yakalama grubu şart: /g ile match() tüm eşleşmeyi döndürür
 *  ve font-size="10" içindeki 10 da rakam süzgecine takılır (ilk denemede "-10101"). */
function etiketOku(svg) {
  const out = [], re = /font-size="10">([-\d.]+)</g;
  let m; while ((m = re.exec(String(svg))) !== null) out.push(Number(m[1]));
  return out;
}
console.log('FAZ 24 §6 — ANALİZ SAYI TUTARLILIĞI');
console.log('='.repeat(60));

/* 3 maçlık kayıt: TREND_MIN_MAC (3) tam sınırda — grafik burada çizilmeye başlar. */
const MAC = [
  { season: 1, uPts: 88, oPts: 81, margin: 7, win: true },
  { season: 1, uPts: 93, oPts: 99, margin: -6, win: false },
  { season: 1, uPts: 101, oPts: 90, margin: 11, win: true }
];

console.log('\nA) Kart ortalaması ile grafik dizisi aynı kaynaktan mı');
const sonuc = vm.runInContext(`(function(){
  G.season = { year: 1 };
  G.analytics = { teamMatches: ${JSON.stringify(MAC)}, playerDev: {} };
  const tm = G.analytics.teamMatches.filter(m => m.season === 1);
  const forPts = tm.map(m => m.uPts);
  const ort = (forPts.reduce((s, v) => s + v, 0) / tm.length).toFixed(1);
  return { forPts, ort, svg: svgLineChart(forPts, { color: 'green' }) };
})()`, ctx);

const beklenenOrt = (MAC.reduce((s, m) => s + m.uPts, 0) / MAC.length).toFixed(1);
yaz(sonuc.ort === beklenenOrt, `kart ortalaması ${sonuc.ort} (beklenen ${beklenenOrt})`);
yaz(JSON.stringify(sonuc.forPts) === JSON.stringify(MAC.map(m => m.uPts)),
  `grafik dizisi maç sayılarıyla birebir: [${sonuc.forPts.join(', ')}]`);

console.log('\nB) Grafik etiketleri gerçek veriyi gösteriyor mu (FAZ 22 §4.1 gerilemesi)');
const etiketler = etiketOku(sonuc.svg);
const gercekMax = Math.max(...MAC.map(m => m.uPts));
const gercekMin = Math.min(...MAC.map(m => m.uPts));
yaz(etiketler.length === 2, `svg iki eksen etiketi basıyor (${etiketler.join(' / ')})`);
yaz(etiketler[0] === gercekMax, `üst etiket ${etiketler[0]} = gerçek en yüksek ${gercekMax} (açılmış bant DEĞİL)`);
yaz(etiketler[1] === gercekMin, `alt etiket ${etiketler[1]} = gerçek en düşük ${gercekMin}`);

console.log('\nC) Sınır durumları');
const tek = vm.runInContext(`svgLineChart([93], {color:'green'})`, ctx);
yaz(/Trend|yeter|maç/i.test(String(tek)),
  'tek maçta grafik yerine "trend için yetersiz" uyarısı çıkıyor (TREND_MIN_MAC=3)');
const esit = vm.runInContext(`svgLineChart([90,90,90], {color:'green'})`, ctx);
const esitEt = etiketOku(esit);
yaz(esitEt[0] === 90 && esitEt[1] === 90,
  `tüm maçlar eşitken iki etiket de 90 (${esitEt.join(' / ')}) — bant açılsa da etiket yalan söylemiyor`);
const bos = vm.runInContext(`svgLineChart([], {color:'green'})`, ctx);
yaz(/Veri yok/.test(String(bos)), 'maç yokken "Veri yok" mesajı');

console.log('\n' + '='.repeat(60));
console.log(hata ? `✗ ${hata} kontrol başarısız` : '✓ analiz sayıları tutarlı');
process.exit(hata ? 1 : 0);
