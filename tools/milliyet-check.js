#!/usr/bin/env node
/* FAZ 30 — KÜRESEL LİG DENETÇİSİ  (node tools/milliyet-check.js)
 *
 * FAZ 17-24'te bu araç "ülke bazlı lig" kuralını doğruluyordu: lig kurulurken içindeki
 * her oyuncu ligin ev ülkesindendi, yabancılar yalnız transferle gelirdi. FAZ 30 o
 * tasarımı geri aldı — oyun KÜRESEL. Kapılar da yeniden yazıldı:
 *
 *   A) Oyuncu milliyeti gelişigüzel dağılıyor (tek ülke baskın değil, çeşitlilik yüksek)
 *   B) Oyuncunun ADI kendi ÜLKESİNİN havuzundan (bu kural KALDI — ad/bayrak/portre uyumu)
 *   C) Takım adı havuzu küresel ve yeterince geniş
 *   D) Bir divizyonda aynı şehirden en fazla 2 takım, adlar benzersiz
 *   E) Divizyon merdiveni: üst divizyon daha güçlü, kariyer en alttan başlıyor
 *   F) Kullanıcının profil ülkesi hiçbir mekaniği etkilemiyor
 *   G) Kaldırılan kuralların kaynakta izi kalmamış
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FILES = ['js/i18n.js', 'js/i18n-dict.js', 'js/i18n-commentary.js', 'js/names.js',
  'js/state.js', 'js/economy.js', 'js/persistence.js', 'js/portraits.js', 'js/roster-gen.js',
  'js/league.js', 'js/match-prep.js', 'js/render.js', 'js/turkce-ek.js', 'js/match-engine.js'];

/* Tarayıcı kabuğu — modüller global kapsamda çalışır, DOM'a dokunanlar sessizce yutulur. */
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
  indexedDB: undefined, fetch: undefined, performance: { now: () => 0 },
};
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of FILES) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.error('yüklenemedi:', f, e.message); process.exit(1); }
}
const run = (src) => vm.runInContext(src, ctx);

let hata = 0;
const yaz = (ok, s) => { console.log((ok ? '  ✓ ' : '  ✗ ') + s); if (!ok) hata++; };

console.log('FAZ 30 — KÜRESEL LİG DENETİMİ');
console.log('='.repeat(70));
console.log(`ülke: ${run('ULKELER.length')} · divizyon: ${run('DIV_SAYISI')} · lig boyu: ${run('LEAGUE_SIZE')}`);

/* ── A) Oyuncu milliyeti gelişigüzel ────────────────────────────────────────────────
   Eski kural "%100 ev ülkesi" idi. Yeni kuralda hiçbir ülke baskın olmamalı ve
   çeşitlilik yüksek olmalı — aksi hâlde "küresel" iddiası kâğıt üstünde kalır. */
console.log('\nA) Oyuncu milliyeti dağılımı — 20 takım × 15 oyuncu');
const A = run(`(function(){
  const say = {}; let n = 0;
  for (let t = 0; t < 20; t++) {
    genRoster().forEach(p => { n++; say[p.ulke] = (say[p.ulke] || 0) + 1; });
  }
  const enCok = Object.keys(say).reduce((a, k) => (say[k] > (say[a] || 0) ? k : a), Object.keys(say)[0]);
  return { n, cesit: Object.keys(say).length, enCok, enCokN: say[enCok] };
})()`);
const enCokPay = A.enCokN / A.n * 100;
console.log(`    ${A.n} oyuncu · ${A.cesit} farklı ülke · en çok "${A.enCok}" (%${enCokPay.toFixed(1)})`);
yaz(enCokPay <= 15, `hiçbir ülke %15'i aşmıyor — en yüksek %${enCokPay.toFixed(1)}`);
yaz(A.cesit >= 20, `en az 20 farklı ülke temsil ediliyor — ${A.cesit}`);

/* ── B) Ad ↔ ülke uyumu ─────────────────────────────────────────────────────────────
   ⚠ ARALIKLI HATANIN KÖK NEDENİ (FAZ 30 §7) — KUSUR KODDA DEĞİL, BU DENETİMDEYDİ.
   Eski ölçüt adı "ilk boşluktan" ikiye bölüyordu: ad = ilk parça, soyad = kalanı.
   İsim havuzlarında 75 ÇOK KELİMELİ giriş var; çok kelimeli SOYAD ("De Luca") bu
   ayrıştırmayla doğru toparlanıyor ama çok kelimeli ÖN AD bozuyor:
     "Juan Pablo Reyes" → ad "Juan"  (havuzda "Juan Pablo" var, "Juan" yok)   ✗
                        → soyad "Pablo Reyes" (havuzda "Reyes" var)           ✗
   İkisi de tutmayınca oyuncu "yanlış havuzdan" sayılıyordu. Etkilenen 5 ön ad:
   Juan Pablo (Meksika) · El Hadji, Alioune Badara, Cheikh Tidiane (Senegal) ·
   John Paul (Filipinler). Ülke başına 6 çekilişte rastlama olasılığı ≈ %18 — dört
   koşudan biri bu yüzden düşüyordu. Oyunun ürettiği ad HER ZAMAN doğru havuzdandı.
   Doğru ölçüt: adın havuzdaki bir (ilk, soyad) çiftine BÖLÜNEBİLİYOR olması. */
console.log('\nB) Ad ↔ ülke uyumu (43 ülke × 6 oyuncu)');
const B = run(`(function(){
  let uyum = 0, n = 0; const kotu = [];
  const bolunuyorMu = (isim, pool) => {
    const t = String(isim).split(' ');
    for (let k = 1; k < t.length; k++) {
      if (pool.ilk.indexOf(t.slice(0, k).join(' ')) >= 0 && pool.sy.indexOf(t.slice(k).join(' ')) >= 0) return true;
    }
    return false;
  };
  ULKELER.forEach(u => {
    for (let i = 0; i < 6; i++) {
      const p = genPlayer('PG', u.ad); n++;
      if (bolunuyorMu(p.isim, NAME_POOLS[u.ad])) uyum++;
      else if (kotu.length < 5) kotu.push(u.ad + ' → ' + p.isim);
    }
  });
  return { uyum, n, kotu };
})()`);
yaz(B.uyum === B.n, `${B.n} oyuncunun ${B.uyum} tanesinin adı kendi ülkesinin havuzundan` +
  (B.kotu.length ? ' — ör. ' + B.kotu.join(', ') : ''));

const B2 = run(`(function(){
  let cokAd = 0, cokSoyad = 0;
  Object.keys(NAME_POOLS).forEach(u => {
    (NAME_POOLS[u].ilk || []).forEach(x => { if (String(x).indexOf(' ') >= 0) cokAd++; });
    (NAME_POOLS[u].sy || []).forEach(x => { if (String(x).indexOf(' ') >= 0) cokSoyad++; });
  });
  return { cokAd, cokSoyad };
})()`);
console.log(`    bilgi: havuzda ${B2.cokAd} çok kelimeli ön ad, ${B2.cokSoyad} çok kelimeli soyad — ölçüt bu yüzden bölünebilirliğe bakar`);

/* ── C) Takım adı havuzu ────────────────────────────────────────────────────────── */
console.log('\nC) Küresel takım adı havuzu');
const C = run('({sehir:SEHIR.length,sonek:LIG_T.length})');
console.log(`    ${C.sehir} şehir × ${C.sonek} sonek = ${C.sehir * C.sonek} kombinasyon`);
yaz(C.sehir >= 120, `şehir havuzu ≥120 — ${C.sehir}`);
yaz(C.sonek >= 25, `sonek havuzu ≥25 — ${C.sonek}`);
const C2 = run(`(function(){
  const tr = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Adana','Konya','Trabzon','Eskişehir','Samsun'];
  const trSay = SEHIR.filter(x => tr.indexOf(x) >= 0).length;
  const enSonek = LIG_T.filter(x => /^(Eagles|Wolves|Lions|Hawks|Panthers|Bulls|Kings|Giants|Raptors|Thunder|Storm|Titans|Warriors|Pilots|Miners|United)$/.test(x)).length;
  return { trSay, enSonek, trOran: trSay / SEHIR.length };
})()`);
yaz(C2.trOran <= 0.15 && C2.enSonek >= 8,
  `havuz karışık — Türk şehri payı %${(C2.trOran * 100).toFixed(1)}, İngilizce sonek ${C2.enSonek}`);

/* ── D) Divizyon içi ad kuralları ──────────────────────────────────────────────── */
console.log('\nD) Divizyon içi ad kuralları');
const D = run(`(function(){
  const kotu = [], tekrar = [];
  for (let d = 0; d < 8; d++) {
    const taken = new Set(); const isimler = [];
    for (let i = 0; i < LEAGUE_SIZE; i++) isimler.push(genUniqueClubName(taken));
    const sehirSay = {};
    isimler.forEach(ad => { const sh = String(ad).split(' ')[0]; sehirSay[sh] = (sehirSay[sh] || 0) + 1; });
    Object.keys(sehirSay).forEach(sh => { if (sehirSay[sh] > 2 && kotu.length < 5) kotu.push('div' + d + ' ' + sh + '×' + sehirSay[sh]); });
    if (new Set(isimler).size !== isimler.length && tekrar.length < 5) tekrar.push('div' + d);
  }
  return { kotu, tekrar };
})()`);
yaz(D.kotu.length === 0, 'aynı divizyonda aynı şehirden ≤2 takım (8 divizyon denendi)' + (D.kotu.length ? ' — ' + D.kotu.join(', ') : ''));
yaz(D.tekrar.length === 0, 'üretilen takım adları benzersiz' + (D.tekrar.length ? ' — ' + D.tekrar.join(', ') : ''));
console.log('    örnek: ' + run(`(function(){ const t=new Set(); const o=[]; for(let i=0;i<8;i++) o.push(genUniqueClubName(t)); return o.join(' · '); })()`));

/* ── E) Divizyon merdiveni ────────────────────────────────────────────────────────
   Üst divizyon daha güçlü olmalı ki kullanıcı yükseldikçe zorluk artsın. */
console.log('\nE) Divizyon merdiveni');
const DIVN = run('DIV_SAYISI');
const E = run(`(function(){
  const ort = {};
  for (let d = 1; d <= DIV_SAYISI; d++) {
    const key = divizyonAnahtarlari(d)[0];
    let top = 0, n = 0;
    for (let t = 0; t < 12; t++) {
      const r = [];
      botClubEnsureDepth(r, key + '||Olcum ' + d + '-' + t);
      r.forEach(p => { top += p.genel; n++; });
    }
    ort[d] = n ? top / n : 0;
  }
  return ort;
})()`);
let merdivenOk = true;
for (let d = 1; d < DIVN; d++) if (!(E[d] > E[d + 1] + 1)) merdivenOk = false;
console.log('    ortalama OVR: ' + Object.keys(E).map(d => 'Div' + d + ' ' + E[d].toFixed(1)).join(' · '));
yaz(merdivenOk, 'her divizyon bir alttakinden güçlü (≥1 OVR fark)');

const E2 = run(`(function(){
  const sira = divizyonDoldurmaSirasi();
  return { ilk: sira[0], son: sira[sira.length - 1], enAltDiv: divizyonNo(sira[0]) };
})()`);
yaz(E2.enAltDiv === DIVN,
  `yeni kariyer en alt divizyonda başlıyor — ilk slot "${E2.ilk}" (Divizyon ${E2.enAltDiv}), son "${E2.son}"`);

/* ── F) Profil ülkesi mekaniği etkilemiyor ────────────────────────────────────────
   Ülke yalnız profil kartında görünür. Aynı tohumla farklı ülke seçilirse üretilen
   kadro BİREBİR aynı olmalı — aksi hâlde ülke gizli bir mekanik parametreye dönüşür. */
console.log('\nF) Profil ülkesi mekaniği etkilemiyor');
const F = run(`(function(){
  const tohumlu = (seed, ulke) => {
    let a = seed >>> 0;
    const eski = Math.random;
    Math.random = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    try { G.menajerUlke = ulke; return genRoster().map(p => p.isim + '|' + p.ulke + '|' + p.genel).join(','); }
    finally { Math.random = eski; }
  };
  const a1 = tohumlu(4242, 'Türkiye');
  const a2 = tohumlu(4242, 'Japonya');
  G.menajerUlke = null;
  return { ayni: a1 === a2 };
})()`);
yaz(F.ayni, 'aynı tohum + farklı profil ülkesi → birebir aynı kadro');

/* ── G) Kaldırılan kuralların izi kalmamış ─────────────────────────────────────── */
console.log('\nG) Kaldırılan kurallar kaynakta yok');
const kaynak = ['js/state.js', 'js/roster-gen.js', 'js/league.js', 'js/economy.js',
  'js/render.js', 'js/main.js', 'js/persistence.js', 'js/portraits.js', 'js/match-prep.js']
  .map(f => ({ f, src: fs.readFileSync(path.join(ROOT, f), 'utf8') }));
const kalan = [];
[['LIG_EV_ULKE', /LIG_EV_ULKE/], ['BOT_YABANCI_', /BOT_YABANCI_[A-Z]/],
 ['MARKET_YERLI_', /MARKET_YERLI_[A-Z]/], ['marketYerliOran', /marketYerliOran\s*\(/]]
  .forEach(([ad, re]) => {
    kaynak.forEach(({ f, src }) => {
      /* ⚠ Yorum ayıklama SATIR BAZLI YAPILAMAZ: bu depoda blok yorumların devam
         satırları `*` ile başlamıyor, düz metin olarak girintili yazılıyor. Satır
         bazlı süzgeç bu yüzden FAZ 30'un kendi açıklama metnini "kalan kod" sanıyordu.
         Blok yorumlar satır sayısı korunarak silinir, sonra satır satır aranır. */
      const temiz = src
        .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
        .replace(/\/\/[^\n]*/g, '');
      temiz.split('\n').forEach((satir, i) => {
        if (re.test(satir)) kalan.push(ad + ' @ ' + f + ':' + (i + 1));
      });
    });
  });
yaz(kalan.length === 0, 'LIG_EV_ULKE · BOT_YABANCI_* · MARKET_YERLI_* · marketYerliOran yok' +
  (kalan.length ? ' — ' + kalan.slice(0, 5).join(', ') : ''));

console.log('\n' + '='.repeat(70));
console.log(hata ? `✗ ${hata} kontrol başarısız` : '✓ tüm küresel lig kontrolleri geçti');
process.exit(hata ? 1 : 0);
