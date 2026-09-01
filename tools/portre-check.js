#!/usr/bin/env node
/* FAZ 17 — PORTRE DENETÇİSİ  (node tools/portre-check.js)
 *
 * Eski durum: seçim yalnız seed hash'iydi — ülke ve yaş hesaba katılmıyordu, 201 görselin
 * tamamı tek havuzdaydı ve Türk oyuncuya Nijeryalı yüz düşebiliyordu. Yedek zincirinin
 * üçüncü basamağı canlı bir görsel API çağrısıydı (çevrimdışı oyunda ve Steam paketinde
 * kabul edilemez).
 *
 * Bu denetçi şunları sınar:
 *   A manifest ↔ disk uyumu           D portre bir kez seçilir, yaşlanınca değişmez
 *   B ULKE_KOVA bütünlüğü (43 ülke)   E yedek zincirinde canlı API yok
 *   C seçilen kova ülkeye uygun mu    F fon parlaklığı ölçümü (görsel varsa)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'portraits');
const MANIFEST = path.join(OUT, 'manifest.json');
const KOVALAR = ['akd', 'siyah', 'kuz', 'beyaz', 'afr', 'lat', 'asya'];
const BANTLAR = ['genc', 'kidemli'];

const FILES = ['js/i18n.js', 'js/i18n-dict.js', 'js/i18n-commentary.js', 'js/names.js',
  'js/state.js', 'js/economy.js', 'js/persistence.js', 'js/portraits.js', 'js/roster-gen.js',
  'js/league.js', 'js/match-prep.js', 'js/render.js', 'js/turkce-ek.js', 'js/match-engine.js'];

const stub = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => '' : stub()),
  apply: () => stub(), set: () => true, has: () => true,
});
const store = {};
const ctx = {
  console, Math, JSON, Date, String, Number, Boolean, Array, Object, Set, Map, RegExp, Error,
  isNaN, parseInt, parseFloat, setTimeout: () => 0, clearTimeout: () => {}, requestAnimationFrame: () => 0,
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: stub(), navigator: { onLine: true }, location: { search: '?test=1', hostname: 'localhost' },
  fetch: undefined, performance: { now: () => 0 },
};
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of FILES) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.error('yüklenemedi:', f, e.message); process.exit(1); }
}
const run = (src) => vm.runInContext(src, ctx);

let hata = 0, uyari = 0;
const yaz = (ok, s) => { console.log((ok ? '  ✓ ' : '  ✗ ') + s); if (!ok) hata++; };
const not = (s) => { console.log('  · ' + s); };

console.log('FAZ 17 — PORTRE DENETİMİ');
console.log('='.repeat(64));

/* ── A) manifest ↔ disk ─────────────────────────────────────────────────────────────── */
console.log('\nA) manifest.json ile gerçek dosya sayısı');
let man = null;
try { man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) {}
yaz(!!man, 'manifest.json okunabiliyor');
yaz(man && man.version === 2, `manifest sürümü ${man && man.version} (beklenen 2)`);
yaz(man && man.pattern === '%s_%s_%04d.jpg', `desen "${man && man.pattern}"`);

const diskSayim = {};
let diskToplam = 0;
for (const k of KOVALAR) {
  diskSayim[k] = {};
  for (const b of BANTLAR) {
    let n = 0;
    while (fs.existsSync(path.join(OUT, `${k}_${b}_${String(n).padStart(4, '0')}.jpg`))) n++;
    diskSayim[k][b] = n; diskToplam += n;
  }
}
const uyumsuz = [];
for (const k of KOVALAR) for (const b of BANTLAR) {
  const m = ((man && man.buckets && man.buckets[k]) || {})[b];
  if (Number(m || 0) !== diskSayim[k][b]) uyumsuz.push(`${k}/${b}: manifest ${m} ≠ disk ${diskSayim[k][b]}`);
}
yaz(uyumsuz.length === 0, uyumsuz.length ? uyumsuz.join(' · ') : `14 kova/bant sayısı diskle birebir (toplam ${diskToplam} portre)`);

/* Eski p_%04d.jpg şemasından kalıntı olmamalı (§8.2). */
const eski = fs.readdirSync(OUT).filter(f => /^p_\d{4}\.jpg$/.test(f));
yaz(eski.length === 0, eski.length ? `eski şemadan ${eski.length} dosya kaldı` : 'eski p_%04d.jpg şemasından dosya yok');

/* FAZ 17B §3.2: hiçbir kovada bir bant 0 kalamaz. İlk partide 7 kovanın 5'inde HİÇ
   kıdemli portre yoktu (kuz/beyaz/afr/lat/asya) — 30 yaşındaki bir Litvanyalıya genç
   yüz düşüyordu. Kova toplamı ≥2 ise iki bandın da dolu olması ŞART. */
const bantBos = [];
const bantOran = [];
for (const k of KOVALAR) {
  const g = diskSayim[k].genc, ki = diskSayim[k].kidemli, t = g + ki;
  if (t >= 2 && (g === 0 || ki === 0)) bantBos.push(`${k}: genc ${g} / kidemli ${ki}`);
  if (t >= 20) bantOran.push([k, g / t]);
}
yaz(bantBos.length === 0, bantBos.length
  ? 'boş bant: ' + bantBos.join(' · ')
  : 'her kovada iki bant da dolu (kova toplamı ≥2 olanlarda)');
const oranBozuk = bantOran.filter(([, o]) => o < 0.30 || o > 0.60);
yaz(oranBozuk.length === 0, oranBozuk.length
  ? 'genç payı %30-60 dışında: ' + oranBozuk.map(([k, o]) => `${k} %${(o*100).toFixed(0)}`).join(' · ')
  : `genç/kıdemli payı hedefte (%45/%55 ± tolerans)${bantOran.length ? ' — ' + bantOran.map(([k, o]) => `${k} %${(o*100).toFixed(0)}`).join(' · ') : ' — ölçülecek kova yok'}`);

/* Adı şemaya uymayan jpg olmamalı. */
const kacak = fs.readdirSync(OUT).filter(f => f.endsWith('.jpg') && !/^(akd|siyah|kuz|beyaz|afr|lat|asya)_(genc|kidemli)_\d{4}\.jpg$/.test(f));
yaz(kacak.length === 0, kacak.length ? `şema dışı dosya: ${kacak.slice(0, 5).join(', ')}` : 'tüm jpg adları <kova>_<bant>_<sıra>.jpg şemasında');

/* ── B) ULKE_KOVA bütünlüğü ─────────────────────────────────────────────────────────── */
console.log('\nB) ULKE_KOVA dağılımı');
const B = run(`(function(){
  const eksik = ULKELER.filter(u => !ULKE_KOVA[u.ad]).map(u => u.ad);
  const fazla = Object.keys(ULKE_KOVA).filter(a => !ULKELER.some(u => u.ad === a));
  const bozukToplam = [], bilinmeyenKova = [];
  Object.keys(ULKE_KOVA).forEach(a => {
    let t = 0;
    Object.keys(ULKE_KOVA[a]).forEach(k => {
      t += Number(ULKE_KOVA[a][k]) || 0;
      if (${JSON.stringify(KOVALAR)}.indexOf(k) < 0) bilinmeyenKova.push(a + '/' + k);
    });
    if (Math.abs(t - 1) > 0.001) bozukToplam.push(a + '=' + t.toFixed(3));
  });
  let vt = 0; Object.keys(ULKE_KOVA_VARSAYILAN).forEach(k => { vt += ULKE_KOVA_VARSAYILAN[k]; });
  return { eksik, fazla, bozukToplam, bilinmeyenKova, varsayilanToplam: vt, n: Object.keys(ULKE_KOVA).length };
})()`);
yaz(B.n === 43, `ULKE_KOVA'da ${B.n} ülke (beklenen 43)`);
yaz(B.eksik.length === 0, B.eksik.length ? 'kova dağılımı olmayan ülke: ' + B.eksik.join(', ') : '43 ülkenin hepsinin kova dağılımı var');
yaz(B.fazla.length === 0, B.fazla.length ? "ULKELER'de olmayan kova anahtarı: " + B.fazla.join(', ') : 'fazladan kova anahtarı yok');
yaz(B.bozukToplam.length === 0, B.bozukToplam.length ? 'toplamı 1.0 olmayan: ' + B.bozukToplam.join(', ') : 'her dağılımın toplamı 1.0 (±0.001)');
yaz(B.bilinmeyenKova.length === 0, B.bilinmeyenKova.length ? 'bilinmeyen kova: ' + B.bilinmeyenKova.join(', ') : 'yalnız tanımlı 7 kova kullanılmış');
yaz(Math.abs(B.varsayilanToplam - 1) <= 0.001, `ULKE_KOVA_VARSAYILAN toplamı ${B.varsayilanToplam}`);

/* ── C) Seçilen kova ülkeye uygun mu (2.000 sahte oyuncu) ───────────────────────────── */
console.log('\nC) 2.000 sahte oyuncu — seçilen kova ülkenin dağılımında mı');
/* Disk boşken de sınanabilmesi için manifest enjekte edilir: her kova/bant 50 dosya. */
const sahteMan = { version: 2, buckets: {}, pattern: '%s_%s_%04d.jpg' };
KOVALAR.forEach(k => { sahteMan.buckets[k] = { genc: 50, kidemli: 50 }; });
run(`setPortreManifest(${JSON.stringify(sahteMan)})`);
const C = run(`(function(){
  let n = 0, uygun = 0, bantDogru = 0; const disi = []; const kovaSay = {};
  for (let i = 0; i < 2000; i++) {
    const u = ULKELER[i % ULKELER.length];
    const p = genPlayer('SF', u.ad);
    p.id = 'chk' + i;
    portreAta(p);
    n++;
    const m = /([a-z]+)_([a-z]+)_\\d{4}\\.jpg$/.exec(p.portreDosya || '');
    if (!m) { disi.push(u.ad + ': dosya yok'); continue; }
    kovaSay[m[1]] = (kovaSay[m[1]] || 0) + 1;
    const dist = ULKE_KOVA[u.ad] || ULKE_KOVA_VARSAYILAN;
    if (dist[m[1]] > 0) uygun++; else disi.push(u.ad + ' → ' + m[1]);
    if (m[2] === (p.yas <= 25 ? 'genc' : 'kidemli')) bantDogru++;
  }
  return { n, uygun, bantDogru, disi: Array.from(new Set(disi)).slice(0, 6), kovaSay };
})()`);
console.log('    kova dağılımı: ' + Object.entries(C.kovaSay).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
yaz(C.uygun === C.n, `${C.n} oyuncunun ${C.uygun} tanesi ülkesinin dağılımındaki bir kovaya düştü${C.disi.length ? ' — dışı: ' + C.disi.join(', ') : ''}`);
yaz(C.bantDogru === C.n, `${C.n} oyuncunun ${C.bantDogru} tanesinde yaş bandı yaşla tutarlı`);

/* Türk oyuncu ASLA asya/afr/siyah kovasına düşmemeli (ULKE_KOVA['Türkiye'] = akd 1.00). */
const CT = run(`(function(){
  let disi = 0;
  for (let i = 0; i < 500; i++) {
    const p = genPlayer('C', 'Türkiye'); p.id = 'tr' + i; portreAta(p);
    if (String(p.portreDosya || '').indexOf('assets/portraits/akd_') !== 0) disi++;
  }
  return disi;
})()`);
/* FAZ 30: ULKE_KOVA eşlemesi KALDI (ad/yüz hâlâ ülkeye göre); yalnız 'ligin ev ülkesi'
   kavramı kalktığı için referans ülke sabit yazılır. */
yaz(CT === 0, `500 Türkiye oyuncusunun tamamı akd kovasında (dışı: ${CT})`);

/* ── D) Portre bir kez seçilir, oyuncu yaşlanınca DEĞİŞMEZ ──────────────────────────── */
console.log('\nD) 3 sezon yaşlandırma — portre sabit kalmalı');
const D = run(`(function(){
  let degisen = 0, bandDegisen = 0;
  for (let i = 0; i < 300; i++) {
    const p = genPlayer('PG', ULKELER[i % ULKELER.length].ad); p.id = 'age' + i; portreAta(p);
    const d0 = p.portreDosya, b0 = p.portreBand;
    for (let s = 0; s < 3; s++) { p.yas++; portreAta(p); }
    if (p.portreDosya !== d0) degisen++;
    if (p.portreBand !== b0) bandDegisen++;
  }
  return { degisen, bandDegisen };
})()`);
yaz(D.degisen === 0, `300 oyuncu 3 sezon yaşlandı, portreDosya değişen: ${D.degisen}`);
yaz(D.bandDegisen === 0, `portreBand değişen: ${D.bandDegisen} (bant üretim anında donar)`);

/* Manifest büyürse de mevcut oyuncunun dosyası değişmemeli (§8.5'in asıl gerekçesi). */
const D2 = run(`(function(){
  const p = genPlayer('SG', 'Türkiye'); p.id = 'grow'; portreAta(p);
  const d0 = p.portreDosya;
  const m = ${JSON.stringify(sahteMan)};
  Object.keys(m.buckets).forEach(k => { m.buckets[k].genc = 900; m.buckets[k].kidemli = 900; });
  setPortreManifest(m);
  portreAta(p);
  return p.portreDosya === d0;
})()`);
yaz(D2, 'manifest 50 → 900 dosyaya büyüdü, mevcut oyuncunun yüzü değişmedi');
run(`setPortreManifest(${JSON.stringify(sahteMan)})`);

/* ── E) Yedek zinciri ───────────────────────────────────────────────────────────────── */
console.log('\nE) Yedek zinciri ve tembel yükleme');
const kaynak = fs.readFileSync(path.join(ROOT, 'js', 'portraits.js'), 'utf8');
yaz(kaynak.indexOf('pollinations') < 0, 'js/portraits.js içinde canlı görsel API adresi geçmiyor');
yaz(kaynak.indexOf('navigator.onLine') < 0, 'çevrimiçi/çevrimdışı basamağı kaldırılmış');
yaz(kaynak.indexOf('PORTRAIT_POOL_SIZE') < 0, 'sabit havuz boyu kaldırılmış (manifest\'ten okunuyor)');
yaz(typeof run('playerAvatarSvgFallback') === 'function', 'playerAvatarSvgFallback duruyor');
yaz(typeof run('basketballPortraitDataUri') === 'function', 'SVG üreteci son çare olarak duruyor');
/* Komşu dosya AYNI kova + AYNI bant içinden gelmeli. */
const E = run(`(function(){
  const bad = [];
  ${JSON.stringify(KOVALAR)}.forEach(k => ${JSON.stringify(BANTLAR)}.forEach(b => {
    const d = 'assets/portraits/' + k + '_' + b + '_0007.jpg';
    const n = portreKomsu(d);
    if (!n || n.indexOf('assets/portraits/' + k + '_' + b + '_') !== 0) bad.push(k + '/' + b + ' → ' + n);
  }));
  return bad;
})()`);
yaz(E.length === 0, E.length ? 'komşu farklı kovaya düşüyor: ' + E.join(', ') : 'komşu dosya daima aynı kova + aynı bant içinden');
const attrs = run(`playerAvatarImgAttrs('s1','x1',{ulke:'Türkiye',yas:22})`);
yaz(/loading="lazy"/.test(attrs) && /decoding="async"/.test(attrs), 'img öznitelikleri loading="lazy" decoding="async" taşıyor');
yaz(/data-av-file="assets\/portraits\//.test(attrs), 'data-av-file yedek zinciri için dosya adını taşıyor');

/* ── F) Fon parlaklığı (görsel varsa) ───────────────────────────────────────────────── */
console.log('\nF) Fon parlaklığı');
if (diskToplam === 0) {
  not('havuz boş — ölçüm atlandı (üretim tools/generate-portraits.js ile yapılır)');
  uyari++;
} else {
  not(`${diskToplam} portre var; parlaklık ölçümü üretim betiğinin raporunda verilir`);
  not('(bu denetçide görüntü çözücü yok — ölçüm generate-portraits çıktısındadır)');
  /* FAZ 17B §1.4: dosya boyutu dağılımı. Aşırı küçük dosya boş/bozuk kare, aşırı büyük
     dosya yüksek detay (çoğu zaman formada yazı/desen) işaretidir. */
  const boyutlar = [];
  for (const k of KOVALAR) for (const b of BANTLAR) {
    for (let i = 0; i < diskSayim[k][b]; i++) {
      try { boyutlar.push(fs.statSync(path.join(OUT, `${k}_${b}_${String(i).padStart(4,'0')}.jpg`)).size); } catch (e) {}
    }
  }
  boyutlar.sort((a, b) => a - b);
  const ortB = boyutlar.reduce((a, b) => a + b, 0) / Math.max(1, boyutlar.length);
  const q = (p) => boyutlar[Math.min(boyutlar.length - 1, Math.floor(boyutlar.length * p))];
  not(`dosya boyutu: ort ${(ortB/1024).toFixed(1)} KB · min ${(q(0)/1024).toFixed(1)} · medyan ${(q(0.5)/1024).toFixed(1)} · p95 ${(q(0.95)/1024).toFixed(1)} · max ${(q(1)/1024).toFixed(1)} KB`);
  yaz(q(0) >= 3000, `en küçük dosya ${(q(0)/1024).toFixed(1)} KB (kapı ≥3 KB — boş/bozuk kare yok)`);
  not(`toplam havuz: ${(boyutlar.reduce((a,b)=>a+b,0)/1048576).toFixed(1)} MB`);
}

/* FAZ 17B §1.4: OCR ile forma yazısı taraması */
console.log('\nG) Forma yazısı taraması (OCR)');
not('OCR yok (tesseract / pytesseract kurulu değil, Python da yok) — bu adım ATLANDI.');
not('Yerine üretim betiğinde ÖLÇÜLEN kapı var: kumaş üzeri kenar enerjisi (MAX_YAZI_ENERJI)');
not('artı kadraj zoomu göğsü büyük ölçüde çerçeve dışına alıyor.');

console.log('\n' + '='.repeat(64));
console.log(hata ? `✗ ${hata} kontrol başarısız` : `✓ tüm portre kontrolleri geçti${uyari ? ` (${uyari} bilgi notu)` : ''}`);
process.exit(hata ? 1 : 0);
