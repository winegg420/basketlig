#!/usr/bin/env node
/**
 * FAZ 29 §3 — BİÇİM YARDIMCILARI BİRİM TESTİ (tarayıcısız)
 *
 * `fmtSayi` / `fmtYuzde` / `fmtSira` dile bağlı biçimin TEK KAYNAĞIDIR. EN modunda
 * Türkçe biçimler ekranda duruyordu: binlik ayracı nokta (14.714), yüzde işareti önde
 * (%77), sıra sayısı noktalı (2. place). Bu satırlarda Türkçe HARF olmadığı için
 * `i18n-scan`in eski tarayıcısı onları hiç göremiyordu.
 *
 * Burada üç şey sınanır:
 *   1) TR biçimi DEĞİŞMEDİ (gerileme kapısı — oyunun Türkçe yüzü bozulmasın)
 *   2) EN biçimi doğru
 *   3) İngilizce sıra eki 11/12/13 İSTİSNASI ve 101/111 gibi üç basamaklılar
 *
 * Çalıştırma: node tools/bicim-check.js
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

const ctx = {
  console, Math, Number, String, Object, Array, JSON, Date, RegExp, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { language: 'tr' },
  document: { createElement: () => ({}), createTreeWalker: () => ({ nextNode: () => null }), body: {}, documentElement: { setAttribute() {} } },
  NodeFilter: { SHOW_TEXT: 4 },
  setTimeout: () => 0,
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/i18n.js'), 'utf8') +
  ';globalThis.__f={fmtSayi,fmtYuzde,fmtSira,i18nNum};', ctx, { filename: 'i18n.js' });
const F = ctx.__f;

let gecen = 0, dusen = 0;
const es = (ad, alinan, beklenen) => {
  const ok = alinan === beklenen;
  if (ok) gecen++; else dusen++;
  console.log('  ' + (ok ? '✓' : '✗') + ' ' + ad + ' → ' + JSON.stringify(alinan) +
    (ok ? '' : '   (beklenen ' + JSON.stringify(beklenen) + ')'));
};

console.log('FAZ 29 §3 — BİÇİM YARDIMCILARI');
console.log('='.repeat(62));

console.log('\nA) Binlik ayracı');
es("fmtSayi(14714,'tr')", F.fmtSayi(14714, 'tr'), '14.714');
es("fmtSayi(14714,'en')", F.fmtSayi(14714, 'en'), '14,714');
es("fmtSayi(129000,'tr')", F.fmtSayi(129000, 'tr'), '129.000');
es("fmtSayi(129000,'en')", F.fmtSayi(129000, 'en'), '129,000');
es("fmtSayi(0,'en')", F.fmtSayi(0, 'en'), '0');
es("fmtSayi(-2500,'en')", F.fmtSayi(-2500, 'en'), '-2,500');

console.log('\nB) Yüzde — işaretin YERİ dile göre değişir');
es("fmtYuzde(77,'tr')", F.fmtYuzde(77, 'tr'), '%77');
es("fmtYuzde(77,'en')", F.fmtYuzde(77, 'en'), '77%');
es("fmtYuzde(0,'en')", F.fmtYuzde(0, 'en'), '0%');
es("fmtYuzde(100,'tr')", F.fmtYuzde(100, 'tr'), '%100');

console.log('\nC) Sıra eki — TR nokta, EN st/nd/rd/th');
es("fmtSira(1,'tr')", F.fmtSira(1, 'tr'), '1.');
es("fmtSira(16,'tr')", F.fmtSira(16, 'tr'), '16.');
[[1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [5, '5th'], [10, '10th'],
 /* 11-12-13 İSTİSNADIR: son basamağa bakan naif kural "11st/12nd/13rd" üretir. */
 [11, '11th'], [12, '12th'], [13, '13th'],
 [16, '16th'], [21, '21st'], [22, '22nd'], [23, '23rd'], [24, '24th'],
 [101, '101st'], [111, '111th'], [112, '112th'], [113, '113th'], [121, '121st']
].forEach(([n, b]) => es("fmtSira(" + n + ",'en')", F.fmtSira(n, 'en'), b));

console.log('\nD) Kaynakta elle biçim kalmadı mı?');
const kaynaklar = ['js/roster-gen.js', 'js/render.js', 'js/league.js', 'js/economy.js',
  'js/main.js', 'js/match-engine.js', 'js/match-prep.js', 'js/persistence.js', 'js/state.js'];
const elle = [];
kaynaklar.forEach(f => {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  src.split('\n').forEach((satir, i) => {
    /* Tarih biçimi hariç: `new Date(...).toLocaleString('tr-TR')` yerelleştirme değil,
       kayıt zaman damgasıdır ve ayrı ele alınır. */
    if (/toLocaleString\('tr-TR'\)/.test(satir) && !/Date\(/.test(satir) && !/fmtSayi/.test(satir)) {
      elle.push(f + ':' + (i + 1) + ' ' + satir.trim().slice(0, 80));
    }
    /* Yüzde işaretini elle ÖNE koyan şablon.
       ⚠ Anlatım yer tutucusu ÇÖZÜCÜSÜ hariç: `adKoy` içindeki `'%'+k` bir YÜZDE değil,
       "%S / %SC / %B" yer tutucusunun kendisini kurar (match-engine.js). */
    if (/adKoy|out\.split\('%'\+k\)/.test(satir)) return;
    if (/%\$\{/.test(satir) || /'%'\s*\+/.test(satir)) {
      elle.push(f + ':' + (i + 1) + ' ' + satir.trim().slice(0, 80));
    }
  });
});
if (elle.length) { dusen++; console.log('  ✗ elle biçim kalmış:'); elle.slice(0, 8).forEach(x => console.log('     ' + x)); }
else { gecen++; console.log("  ✓ dağınık toLocaleString('tr-TR') ve elle '%' öneki yok"); }

console.log('\n' + '='.repeat(62));
if (dusen) { console.log('✗ ' + dusen + ' ölçüt düştü (' + gecen + ' geçti)'); process.exit(1); }
console.log('✓ biçim yardımcıları doğru (' + gecen + '/' + gecen + ')');
