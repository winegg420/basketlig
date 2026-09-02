/**
 * FAZ 37 §4.1 — YASAK ANLATIM KALIPLARI
 *
 * Spikerin dili yayın rejistridir; tabela/rapor/istatistik dili değildir. Aşağıdaki
 * kalıplar ölçümle canlı anlatımda bulundu ve havuzlardan kaldırıldı. Liste hem
 * `anlatim-check` kapısı hem de yeni satır yazarken referans olsun diye TEK YERDE durur.
 *
 * ⚠ Sınır ASCII değildir: Türkçe harf de sözcük karakteridir (FAZ 17 i18n dersi).
 */
const H = 'A-Za-z0-9ÇĞİÖŞÜçğıöşü';
const s = (kok) => new RegExp('(^|[^' + H + '])' + kok, 'i');

const YASAK = [
  { ad: 'tabela dili: "iki/üç sayıyı buldu"', re: /(iki|üç) sayıyı buldu/i, yerine: '"içeride" · "fileyi buldu"' },
  { ad: 'rapor dili: "skora … ekledi"', re: /skora\s+\S+\s+ekledi|skora katkı/i, yerine: '"farkı ikiye indirdi"' },
  { ad: 'istatistik dili: "isabet bulamadı"', re: /isabet bulamadı/i, yerine: '"çemberden döndü" · "kısa kaldı"' },
  { ad: 'istatistik dili: "sayı üretemedi"', re: /sayı üretemedi/i, yerine: '"tutturamadı"' },
  { ad: 'bozuk: "dış şutu geçti"', re: /dış şutu geçti|sayılık şutu geçti/i, yerine: '"dıştan vurdu"' },
  { ad: 'özne-yüklem uyumsuz: "X üçlük kaçtı"', re: /[^'’\s]\s+üçlük kaçtı/i, yerine: '"üçlüğü çemberden döndü"' },
  { ad: 'belirsiz: "Havada kaldı."', re: /(^|[^A-Za-zÇĞİÖŞÜçğıöşü])havada kaldı\./i, yerine: '"fileye değmedi, hava atışı"' },
  { ad: 'öznesiz: "Uzun düştü."', re: /(^|[^A-Za-zÇĞİÖŞÜçğıöşü])uzun düştü\./i, yerine: '"şut uzun kaldı, arka demire çarptı"' },
  { ad: 'anlamsız FT: "birini içeride tuttu"', re: /birini içeride tuttu/i, yerine: '"ikincisini fileye bıraktı, biri dışarıda"' },
  { ad: 'rapor dili: "bu denemede isabetsiz"', re: /bu denemede isabetsiz/i, yerine: '"bu kez tutturamadı"' },
  { ad: 'Türkçe değil: "sağduyulu bir bitiriş"', re: /sağduyulu/i, yerine: '"sakin bitirdi"' },
  { ad: 'tabela dili: "skora üç ekledi"', re: /skora üç ekledi/i, yerine: '"üç sayı geldi"' },
  { ad: 'rapor dili: "şansını değerlendiremedi"', re: /şansını değerlendiremedi/i, yerine: '"tutturamadı"' },
  { ad: 'rapor dili: "denemesi boşa gitti"', re: /denemesi boşa gitti/i, yerine: '"çemberden döndü"' },
];

/** Bir metinde yasak kalıp var mı? Dönüş: bulunanların listesi. */
function yasakBul(tx) {
  const out = [];
  const t = String(tx || '');
  YASAK.forEach(y => { if (y.re.test(t)) out.push(y.ad); });
  return out;
}

module.exports = { YASAK, yasakBul };
