#!/usr/bin/env node
/* FAZ 17 — İSİM HAVUZU DENETÇİSİ  (node tools/isim-check.js)
 *
 * Neden var: eski havuz ülke başına 16 ad × 16 soyad = 256 kombinasyondu. Sezon 1'de tek
 * başına ~285 Türk oyuncu üretiliyor; havuz daha ilk sezonda tükeniyor ve
 * ensureUniquePlayerNames sürekli yeniden çekiyordu ("her takımda aynı soyad" hissi).
 * Bu denetçi havuzun 150×140 tabanını, liste içi tekrarsızlığı ve ULKELER ile
 * NAME_POOLS'un birebir örtüşmesini sınar — biri eksikse randomNameFor genel havuza
 * düşer ve o ülkenin oyuncuları yabancı isimli çıkar.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const MIN_ILK = 150, MIN_SY = 140;

const ctx = { console, Math };
vm.createContext(ctx);
for (const f of ['js/names.js', 'js/state.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
}
vm.runInContext('globalThis.__P = NAME_POOLS; globalThis.__U = ULKELER; globalThis.__RN = randomNameFor;', ctx);
/* randomNameFor ch() kullanır; ch/rand roster-gen.js'te tanımlı, burada mini karşılığı yeter. */
vm.runInContext('function ch(a){return a[Math.floor(Math.random()*a.length)];}', ctx);

const P = ctx.__P, U = ctx.__U;
let hata = 0;
const yaz = (ok, s) => { console.log((ok ? '  ✓ ' : '  ✗ ') + s); if (!ok) hata++; };

console.log('FAZ 17 — İSİM HAVUZU DENETİMİ');
console.log('='.repeat(60));

/* A) ULKELER ↔ NAME_POOLS örtüşmesi */
console.log('\nA) Ülke listesi ile havuz örtüşmesi');
const ulkeAdlari = U.map(u => u.ad);
const havuzAdlari = Object.keys(P);
yaz(ulkeAdlari.length === 43, `ULKELER.length = ${ulkeAdlari.length} (beklenen 43)`);
yaz(havuzAdlari.length === 43, `NAME_POOLS anahtarı = ${havuzAdlari.length} (beklenen 43)`);
const eksik = ulkeAdlari.filter(a => !P[a]);
const fazla = havuzAdlari.filter(a => ulkeAdlari.indexOf(a) < 0);
yaz(eksik.length === 0, `havuzda karşılığı olmayan ülke: ${eksik.length ? eksik.join(', ') : 'yok'}`);
yaz(fazla.length === 0, `ULKELER'de olmayan havuz anahtarı: ${fazla.length ? fazla.join(', ') : 'yok'}`);

/* B) Havuz boyu ve liste içi tekrar */
console.log('\nB) Havuz boyu (≥150 ad × ≥140 soyad) ve liste içi tekrar');
const sorunlu = [];
let toplamDizgi = 0, minKomb = Infinity;
havuzAdlari.forEach(k => {
  const p = P[k];
  const ti = new Set(p.ilk).size, ts = new Set(p.sy).size;
  toplamDizgi += p.ilk.length + p.sy.length;
  minKomb = Math.min(minKomb, p.ilk.length * p.sy.length);
  if (p.ilk.length < MIN_ILK) sorunlu.push(`${k}: ilk ${p.ilk.length} < ${MIN_ILK}`);
  if (p.sy.length < MIN_SY) sorunlu.push(`${k}: sy ${p.sy.length} < ${MIN_SY}`);
  if (ti !== p.ilk.length) sorunlu.push(`${k}: ilk listesinde tekrar (${p.ilk.length - ti})`);
  if (ts !== p.sy.length) sorunlu.push(`${k}: sy listesinde tekrar (${p.sy.length - ts})`);
});
yaz(sorunlu.length === 0, sorunlu.length ? sorunlu.join(' · ') : `43 ülke ≥${MIN_ILK}×${MIN_SY}, liste içi tekrar yok`);
console.log(`    toplam dizgi: ${toplamDizgi} · en küçük kombinasyon: ${minKomb}`);
yaz(minKomb >= 21000, `en küçük ülke kombinasyonu ${minKomb} (hedef ≥21.000)`);

/* C) Boş / bozuk giriş yok */
console.log('\nC) Boş veya bozuk giriş');
const bozuk = [];
havuzAdlari.forEach(k => {
  ['ilk', 'sy'].forEach(alan => {
    (P[k][alan] || []).forEach(v => {
      if (typeof v !== 'string' || !v.trim()) bozuk.push(`${k}.${alan}: boş`);
      else if (/\d/.test(v)) bozuk.push(`${k}.${alan}: sayı içeren ad "${v}"`);
    });
  });
});
yaz(bozuk.length === 0, bozuk.length ? bozuk.slice(0, 8).join(' · ') : 'boş / sayı içeren ad yok');

/* D) 5.000 çekilişte benzersizlik */
console.log('\nD) 5.000 rastgele isim çekilişi');
const cekilis = vm.runInContext(`(function(){
  const ulkeler = Object.keys(NAME_POOLS);
  const out = [];
  for (let i = 0; i < 5000; i++) out.push(randomNameFor(ulkeler[i % ulkeler.length]));
  return out;
})()`, ctx);
const tekil = new Set(cekilis).size;
const oran = tekil / cekilis.length;
console.log(`    ${cekilis.length} çekiliş · ${tekil} benzersiz · %${(oran * 100).toFixed(2)}`);
yaz(oran >= 0.99, `benzersizlik oranı %${(oran * 100).toFixed(2)} (kapı ≥%99)`);

/* E) Türkiye havuzu tek başına sezon 1 yükünü kaldırıyor mu */
console.log('\nE) Sezon 1 Türk isim yükü (~285) ve 20 sezonluk kariyer (~1.500)');
const tr = vm.runInContext(`(function(){
  const out = []; for (let i = 0; i < 1500; i++) out.push(randomNameFor('Türkiye')); return out;
})()`, ctx);
const trTekil = new Set(tr).size;
console.log(`    1.500 Türk isim · ${trTekil} benzersiz · %${(trTekil / 15).toFixed(2)}`);
yaz(trTekil / tr.length >= 0.95, `Türkiye benzersizliği %${(trTekil / 15).toFixed(2)} (kapı ≥%95)`);

console.log('\n' + '='.repeat(60));
console.log(hata ? `✗ ${hata} kontrol başarısız` : '✓ tüm isim kontrolleri geçti');
process.exit(hata ? 1 : 0);
