/**
 * FAZ 25 USD — CRLF güvenli yama yardımcısı.
 * Depo dosyaları Windows'ta CRLF ile duruyor; LF varsayan bir `indexOf` çapası
 * sessizce bulunamıyor ve yama "uygulandı" diyip hiçbir şey değiştirmiyordu.
 * Bu modül dosyayı LF'e indirger, yamayı uygular, orijinal satır sonuyla geri yazar.
 */
const fs = require('fs');

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);

function oku(p) {
  const ham = fs.readFileSync(p, 'utf8');
  const crlf = ham.indexOf(CR + LF) >= 0;
  return { metin: crlf ? ham.split(CR + LF).join(LF) : ham, crlf };
}

function yaz(p, metin, crlf) {
  fs.writeFileSync(p, crlf ? metin.split(LF).join(CR + LF) : metin);
}

/** Tek seferlik, ZORUNLU değişim: çapa yoksa fırlatır (sessiz atlama yok). */
function degistir(metin, eski, yeni, etiket) {
  const ix = metin.indexOf(eski);
  if (ix < 0) throw new Error('çapa bulunamadı: ' + (etiket || eski.slice(0, 60)));
  if (metin.indexOf(eski, ix + eski.length) >= 0) throw new Error('çapa BİRDEN FAZLA yerde: ' + (etiket || eski.slice(0, 60)));
  return metin.slice(0, ix) + yeni + metin.slice(ix + eski.length);
}

/** Tüm geçişleri değiştirir; en az bir tane bulunmalı. Kaç tane değiştiğini sayar. */
function degistirHepsi(metin, eski, yeni, etiket) {
  const parca = metin.split(eski);
  if (parca.length < 2) throw new Error('çapa bulunamadı: ' + (etiket || eski.slice(0, 60)));
  degistirHepsi.sayac = parca.length - 1;
  return parca.join(yeni);
}

/** Dosyayı aç → fn(metin) → geri yaz. fn metni döndürmeli. */
function dosya(p, fn) {
  const { metin, crlf } = oku(p);
  const yeni = fn(metin);
  if (typeof yeni !== 'string') throw new Error('yama fonksiyonu metin döndürmedi: ' + p);
  if (yeni === metin) { console.log('  · ' + p + ' değişmedi'); return false; }
  yaz(p, yeni, crlf);
  return true;
}

module.exports = { oku, yaz, degistir, degistirHepsi, dosya, LF };
