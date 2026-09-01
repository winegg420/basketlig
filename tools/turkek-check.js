#!/usr/bin/env node
/**
 * turkEk() BİRİM TESTİ — brif §7.1 tablosu (8 ad × 4 durum = 32 kapı).
 *
 * Neden var: anlatım şablonlarında ek sabit yazılıydı ("Top %S'ye düştü"), isim
 * değişince ek değişmiyordu. Canlıda 263 olayda 20 dilbilgisi hatası ölçülmüştü.
 * Bu test ekleme kuralının kendisini sınar; şablonların dönüştüğünü anlatim-check
 * ölçer.
 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ctx = { console, Math };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/state.js'), 'utf8').match(/const LIG_T=[\s\S]*?\];/)[0], ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/turkce-ek.js'), 'utf8'), ctx);
const turkEk = vm.runInContext('turkEk', ctx);
const turkEkUygula = vm.runInContext('turkEkUygula', ctx);
const trKucuk = vm.runInContext('trKucuk', ctx);

let hata = 0;
const yaz = (ok, s) => { console.log((ok ? '  ✓ ' : '  ✗ ') + s); if (!ok) hata++; };

console.log('turkEk() — TÜRKÇE ÇEKİM EKİ BİRİM TESTİ');
console.log('='.repeat(72));

/* Brif §7.1 tablosu. Beklenen değerler SON kelimeye göre yazılı; ek tam ada yapışır. */
const TABLO = {
  'Ömer Polat':       ["Polat'a",     "Polat'ta",     "Polat'tan",     "Polat'ın"],
  'Kayseri Boğaları': ["Boğaları'na", "Boğaları'nda", "Boğaları'ndan", "Boğaları'nın"],
  'Bursa Yıldırım':   ["Yıldırım'a",  "Yıldırım'da",  "Yıldırım'dan",  "Yıldırım'ın"],
  'Koray Gündoğdu':   ["Gündoğdu'ya", "Gündoğdu'da",  "Gündoğdu'dan",  "Gündoğdu'nun"],
  'Onur Kaplan':      ["Kaplan'a",    "Kaplan'da",    "Kaplan'dan",    "Kaplan'ın"],
  'Uluç Demirel':     ["Demirel'e",   "Demirel'de",   "Demirel'den",   "Demirel'in"],
  'Erkan Korkmaz':    ["Korkmaz'a",   "Korkmaz'da",   "Korkmaz'dan",   "Korkmaz'ın"],
  'Beşiktaş':         ["Beşiktaş'a",  "Beşiktaş'ta",  "Beşiktaş'tan",  "Beşiktaş'ın"]
};
const DURUM = ['e', 'de', 'den', 'in'];

console.log('\nA) Brif tablosu (8 ad × 4 durum)');
console.log('  ' + 'AD'.padEnd(19) + DURUM.map(d => ('-' + d).padEnd(17)).join(''));
let gecen = 0, toplam = 0;
Object.keys(TABLO).forEach(ad => {
  const hucre = DURUM.map((d, i) => {
    const uretilen = turkEk(ad, d);
    const son = uretilen.split(' ').pop();
    const dogru = son === TABLO[ad][i];
    toplam++; if (dogru) gecen++;
    return ((dogru ? '' : '✗') + son).padEnd(17);
  });
  console.log('  ' + ad.padEnd(19) + hucre.join(''));
});
yaz(gecen === toplam, `birim testi tablosu ${gecen}/${toplam}`);

console.log('\nB) Kural ayrıntıları');
/* Zamir n'si (iyelik ekli) ile kaynaştırma y'si (sıradan ünlü) KARIŞMAMALI —
   ilk sürümde ikisi tek kural sayılmış, "Boğaları'da" ve "Gündoğdu'na" çıkmıştı. */
yaz(turkEk('Ejderleri', 'de') === "Ejderleri'nde", `iyelikli ad bulunmada zamir n'si alıyor: ${turkEk('Ejderleri', 'de')}`);
yaz(turkEk('Üniversite', 'e') === "Üniversite'ye", `ünlüyle biten iyeliksiz ad yönelmede y alıyor: ${turkEk('Üniversite', 'e')}`);
yaz(turkEk('Balıkesir Koleji', 'de') === "Balıkesir Koleji'nde", `tekil iyelikli ad: ${turkEk('Balıkesir Koleji', 'de')}`);
yaz(turkEk('Beşiktaş', 'de') === "Beşiktaş'ta" && turkEk('Trabzon', 'de') === "Trabzon'da",
  `ünsüz benzeşmesi: Beşiktaş'ta / Trabzon'da`);
yaz(turkEk('Görkem', 'e') === "Görkem'e" && turkEk('Uğur', 'e') === "Uğur'a",
  `ünlü uyumu (ince/kalın): Görkem'e / Uğur'a`);
yaz(turkEk('Onur Kaplan', 'in') === "Onur Kaplan'ın", `tamlayan ünsüz sonrası kaynaştırmasız: ${turkEk('Onur Kaplan', 'in')}`);
yaz(turkEk('Kayseri Boğaları', 'le') === "Kayseri Boğaları'yla", `vasıta: ${turkEk('Kayseri Boğaları', 'le')}`);

console.log('\nC) Sınır durumları — anlatım katmanı çökmemeli');
yaz(turkEk('', 'e') === '', 'boş ad boş dönüyor');
yaz(turkEk(null, 'e') === '', 'null ad boş dönüyor');
yaz(turkEk('Polat', 'bilinmeyen') === 'Polat', 'bilinmeyen durum düz adı döndürüyor');
/* FAZ 33 §2: eski beklenti "BK'a" idi — ünlüsüz girdide kör bir kalın-düz varsayılan.
   Doğrusu okunuştur: ünlüsüz KISALTMA harf harf okunur ("BK" = "be-ke"), ünlüyle biter
   ve kaynaştırma alır. Ünlüsüz AD (Ng) harf harf okunmaz; harf adlarının hepsi ince
   ünlü taşıdığı için ince ek alır. */
yaz(turkEk('BK', 'e') === "BK'ye", `ünlüsüz kısaltma harf adıyla okunuyor: ${turkEk('BK', 'e')}`);
yaz(turkEk('BK', 'de') === "BK'de" && turkEk('BK', 'in') === "BK'nin",
  `kısaltmanın diğer durumları: ${turkEk('BK', 'de')} · ${turkEk('BK', 'in')}`);
yaz(turkEk('Ng', 'e') === "Ng'e", `ünlüsüz AD ince ek alıyor: ${turkEk('Ng', 'e')}`);

console.log('\nD) Şablon çözücü (%X{durum})');
const cikti = turkEkUygula('%R{e} düştü; hücum sırası %T{de}.', { R: 'Ömer Polat', T: 'Kayseri Boğaları' });
yaz(cikti === "Ömer Polat'a düştü; hücum sırası Kayseri Boğaları'nda.", `çözüldü: "${cikti}"`);
const duz = turkEkUygula('%S geldi.', { S: 'Ömer Polat' });
yaz(duz === '%S geldi.', 'süslü parantezsiz %S dokunulmadan geçiyor (düz değiştirme sonra yapılır)');
yaz(turkEkUygula('%R{e} aldı.', {}) === ' aldı.', 'eksik ad yer tutucuyu boşa çeviriyor, çökmüyor');

console.log('\nE) Türkçe küçük harf (İ→i, I→ı)');
yaz(trKucuk('İsabet') === 'isabet', `trKucuk('İsabet') = ${trKucuk('İsabet')}`);
yaz(trKucuk('Iskaladı') === 'ıskaladı', `trKucuk('Iskaladı') = ${trKucuk('Iskaladı')}`);

console.log('\n' + '='.repeat(72));
console.log(hata ? `✗ ${hata} kontrol başarısız` : '✓ turkEk() tüm kuralları karşılıyor');
process.exit(hata ? 1 : 0);
