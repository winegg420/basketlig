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

const ctx = { console: Object.assign(Object.create(console), { warn() {} }), Math };
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

/* ── F) FAZ 24 §2.4: eski genel isim havuzu tamamen gitti mi ───────────────────────── */
console.log('\nF) Eski genel isim havuzu (ILK / SY) kalıntısı');
/* Neden: FAZ 17 §3.4 marka temizliği YALNIZ NAME_POOLS üzerinde yapılmıştı; state.js'teki
   ILK/SY ikilisi gözden kaçmış ve canlı kalmıştı. 32 ilk ismin neredeyse tamamı aktif NBA
   yıldızının adıydı ve üç yeri besliyordu: lig haberleri, ekonomi olayları ve
   randomNameFor'un SESSİZ yedek dalı. Canlıda görülen: "Ja Clark adlı genci A takıma
   çıkardı" — %100 Türk bir ligde. */
const kaynaklar = ['js/state.js', 'js/league.js', 'js/economy.js', 'js/roster-gen.js', 'js/render.js'];
const sabitVar = [], kullanimVar = [];
kaynaklar.forEach(f2 => {
  const src = fs.readFileSync(path.join(ROOT, f2), 'utf8');
  if (/^const (ILK|SY)=/m.test(src)) sabitVar.push(f2);
  if (/ch\(ILK\)|ch\(SY\)/.test(src)) kullanimVar.push(f2);
});
yaz(sabitVar.length === 0, sabitVar.length ? 'ILK/SY sabiti hâlâ var: ' + sabitVar.join(', ') : 'kaynakta ILK / SY sabiti yok');
yaz(kullanimVar.length === 0, kullanimVar.length ? 'ch(ILK)/ch(SY) kullanımı var: ' + kullanimVar.join(', ') : 'ch(ILK) / ch(SY) çağrısı yok');

/* FAZ 30: Bilinmeyen ülke SABİT LİSTEYE düşmemeli. Eskiden yedek "ligin ev ülkesi"
   havuzuydu; o kavram kalktığı için yedek artık GERÇEK havuzlardan biridir (rastgele).
   Kapının niyeti değişmedi: üretilen ad NAME_POOLS'un HERHANGİ bir ülkesinden olmalı,
   koda gömülü bir listeden değil. */
const yedek = vm.runInContext(
  '(function(){var o=[];for(var i=0;i<40;i++)o.push(randomNameFor("Atlantis"));return o;})()', ctx);
/* FAZ 30: 'ligin ev ülkesi' kavramı kalktı — ad↔havuz uyumu için sabit REFERANS ülke. */
const REF_ULKE = 'Türkiye';
const evPool = P[REF_ULKE];
const bolunuyorMuHer = (ad) => Object.keys(P).some(u => {
  const t = ad.split(' ');
  for (let k = 1; k < t.length; k++) {
    if (P[u].ilk.indexOf(t.slice(0, k).join(' ')) >= 0 && P[u].sy.indexOf(t.slice(k).join(' ')) >= 0) return true;
  }
  return false;
});
const yedekUyum = yedek.filter(bolunuyorMuHer).length;
yaz(yedekUyum === yedek.length,
  `bilinmeyen ülke GERÇEK bir havuza düşüyor (${yedekUyum}/${yedek.length}) — sabit listeye DEĞİL`);

/* ── G) Gerçek sporcuyla özdeşleşmiş ad taraması ───────────────────────────────────── */
console.log('\nG) Kara liste — oyuncu, koç, izci, haber, ekonomi');
const KARA = ['Luka','Nikola','Giannis','Shai','Ja','LaMelo','Trae','Jayson','Cade','Paolo',
  'Victor','Domantas','Donovan','Damian','Joel','Devin','Antetokounmpo','Doncic','Dončić',
  'Jokic','Jokić','Okonkwo','Sabonis','Gilgeous','Tiongko'];
const havuzKara = [];
Object.keys(P).forEach(u => {
  P[u].ilk.forEach(x => { if (KARA.indexOf(x) >= 0) havuzKara.push(u + '.ilk: ' + x); });
  P[u].sy.forEach(x => { if (KARA.indexOf(x) >= 0) havuzKara.push(u + '.sy: ' + x); });
});
yaz(havuzKara.length === 0,
  havuzKara.length ? 'havuzda riskli ad: ' + havuzKara.slice(0, 6).join(', ')
                   : '43 ülke havuzunda kara listeden ad yok');

const uretilen = vm.runInContext(
  '(function(){var o=[],u=Object.keys(NAME_POOLS);' +
  'for(var i=0;i<400;i++)o.push(randomNameFor(u[i%u.length]));' +
  'for(var j=0;j<200;j++)o.push(randomNameFor("Türkiye"));return o;})()', ctx);
const kacak = Array.from(new Set(uretilen.filter(ad =>
  ad.split(/\s+/).some(p => KARA.indexOf(p) >= 0))));
yaz(kacak.length === 0,
  kacak.length ? 'üretilen isimde kara liste: ' + kacak.slice(0, 5).join(', ')
               : `${uretilen.length} üretilen isimde kara listeden ad yok`);

/* FAZ 30: "ligin ev ülkesi" kavramı kalktı (oyun küresel). Bu bölüm ad↔havuz uyumunu
   ölçüyordu, ülkenin hangisi olduğu önemli değil — sabit bir REFERANS ülke kullanılır.
   ⚠ Ad ayrıştırması BÖLÜNEBİLİRLİK ile yapılır: havuzlarda çok kelimeli ön ad var
   ("Juan Pablo"), "ilk boşluktan böl" ölçütü onları yanlış havuzdan sayıyordu
   (FAZ 30 §7 kök nedeni). */
const haberAd = vm.runInContext(
  '(function(){var o=[];for(var i=0;i<200;i++)o.push(randomNameFor("Türkiye"));return o;})()', ctx);
const evUyum = haberAd.filter(ad => {
  const t = ad.split(' ');
  for (let k = 1; k < t.length; k++) {
    if (evPool.ilk.indexOf(t.slice(0, k).join(' ')) >= 0 && evPool.sy.indexOf(t.slice(k).join(' ')) >= 0) return true;
  }
  return false;
}).length;
yaz(evUyum === haberAd.length,
  `200 üretilen adın ${evUyum} tanesi referans ülke havuzundan`);

/* ── H) Kadın adı taraması (§3) ────────────────────────────────────────────────────── */
console.log('\nH) Havuzlarda kadın adı');
/* Yalnız AĞIRLIKLA kadın olan adlar aranır. İbranice Omer/Gal/Shai/Ziv, Çince Yan/Hui,
   Türkçe Deniz, İtalyanca-Gürcüce Nino, Romence Adi, Japonca Yuki gibi adlar kendi
   dillerinde erkek ya da gerçekten iki cinsiyetli — listeye alınmadı; alınsaydı denetim
   gerçek kusuru değil gürültüyü ölçerdi ve havuz gereksiz daralırdı. */
const KADIN = ['Işıl','Ayşe','Zeynep','Elif','Merve','Laurine','Camille','Manon','Chloé',
  'Maria','Elena','Carmen','Isabel','Katarzyna','Agnieszka','Milica','Jelena','Vesna',
  'Rusudan','Guranda','Kaisa','Sanna','Baiba','Ruta','Egle','Ornela','Rudina','Oksana',
  'Kalyna','Anastasia','Svetlana','Ingrid','Astrid','Zsofia','Eszter','Petra','Lejla',
  'Fang','Jing','Sakura'];
const kadinBulunan = [];
Object.keys(P).forEach(u => {
  P[u].ilk.forEach(x => { if (KADIN.indexOf(x) >= 0) kadinBulunan.push(u + ': ' + x); });
});
yaz(kadinBulunan.length === 0,
  kadinBulunan.length ? 'kadın adı: ' + kadinBulunan.join(', ')
                      : '43 ülkenin ilk-ad havuzlarında kadın adı yok');


/* ── I) FAZ 24 §4: eski kayıtta koç/izci adı ile ülkesi uyuşmuyor ──────────────────── */
console.log('\nI) Eski kayıt personel adı onarımı');
/* Canlıda görülen: Türk bayraklı "Mike Johnson". Sebep, adın genel ILK/SY havuzundan
   gelmiş olması; "ulke" alanı ise FAZ 17 göçünde ev ülkesi diye dolduruldu. Onarım
   YALNIZ adı değiştirir ve deterministiktir — aynı kayıt her açılışta aynı adı vermeli,
   yoksa oyuncu koçunun adının her açılışta değiştiğini görür. */
const rgSrc = fs.readFileSync(path.join(ROOT, 'js/roster-gen.js'), 'utf8');
const uygunKod = rgSrc.match(/function personelAdiUygunMu[\s\S]*?\r?\n}/)[0];
const sabitKod = rgSrc.match(/function personelAdiSabit[\s\S]*?\r?\n}/)[0];
vm.runInContext(uygunKod + '\n' + sabitKod, ctx);

const uygun = vm.runInContext('personelAdiUygunMu', ctx);
const sabit = vm.runInContext('personelAdiSabit', ctx);
const trPool = P['Türkiye'];
const gecerliAd = trPool.ilk[3] + ' ' + trPool.sy[7];
yaz(uygun(gecerliAd, 'Türkiye') === true, `havuzdaki ad geçerli sayılıyor ("${gecerliAd}")`);
yaz(uygun('Mike Johnson', 'Türkiye') === false, '"Mike Johnson" Türk koç için geçersiz sayılıyor');
yaz(uygun('Tek', 'Türkiye') === false, 'tek kelimelik ad geçersiz');
yaz(uygun('Her Ne', 'Atlantis') === true, 'havuzu olmayan ülkede ad yargılanmıyor');

const onarilan = sabit('Türkiye', 'c3|Türkiye');
yaz(uygun(onarilan, 'Türkiye'), `onarılan ad ev havuzundan: "${onarilan}"`);
yaz(sabit('Türkiye', 'c3|Türkiye') === onarilan,
  'aynı tohum her çağrıda aynı adı veriyor (koç adı yüklemeler arası sabit)');
const farkli = Array.from(new Set([0, 1, 2, 3, 4, 5].map(i => sabit('Türkiye', 'c' + i + '|Türkiye'))));
yaz(farkli.length >= 5, `6 farklı koç ${farkli.length} farklı ad alıyor`);

const psrc = fs.readFileSync(path.join(ROOT, 'js/persistence.js'), 'utf8');
yaz(/faz24PersonelAdiOnar\(\);/.test(psrc) && /function faz24PersonelAdiOnar/.test(psrc),
  'faz24PersonelAdiOnar kayıt yüklemesinde çağrılıyor');
const govde = (psrc.match(/function faz24PersonelAdiOnar[\s\S]*?\r?\n}/) || [''])[0];
yaz(!/\.(seviye|maas|skor|gecmis|atama|satisFiyat|id)\s*=/.test(govde),
  'onarım seviye / maaş / skor / geçmiş / atama / kimlik alanlarına dokunmuyor');


console.log('\n' + '='.repeat(60));
console.log(hata ? `✗ ${hata} kontrol başarısız` : '✓ tüm isim kontrolleri geçti');
process.exit(hata ? 1 : 0);
