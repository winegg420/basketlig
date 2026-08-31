#!/usr/bin/env node
/* FAZ 17 — MİLLİYET DENETÇİSİ  (node tools/milliyet-check.js)
 *
 * Çekirdek kural: LİG KURULURKEN İÇİNDEKİ HER OYUNCU LİGİN EV ÜLKESİNDENDİR.
 * Yabancılar yalnızca sezon başladıktan sonra transfer yoluyla gelir.
 *
 * Eski hata: genPlayer(poz, tr=false) — ikinci parametre hiçbir yerden true geçilmiyordu,
 * ülke ch(ULKELER) ile rastgele seçiliyordu. Türkiye'nin şansı 1/26 ≈ %3,8; 15 kişilik
 * kadroda ortalama 0,6 Türk çıkıyordu ve TR_ULKE ölü koddu.
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
const EV = run('LIG_EV_ULKE');

console.log('FAZ 17 — MİLLİYET DENETİMİ');
console.log('='.repeat(64));
console.log(`ligin ev ülkesi: ${EV} · ULKELER.length = ${run('ULKELER.length')}`);

/* A) Yeni lig: 20 takım × 15 oyuncu → %100 ev ülkesi */
console.log('\nA) Yeni lig kurulumu — 20 takımın tüm oyuncuları');
const A = run(`(function(){
  let toplam = 0, yerli = 0; const yabancilar = [];
  for (let t = 0; t < 20; t++) {
    genRoster().forEach(p => { toplam++; if (p.ulke === LIG_EV_ULKE) yerli++; else yabancilar.push(p.ulke); });
  }
  return { toplam, yerli, yabancilar: Array.from(new Set(yabancilar)) };
})()`);
console.log(`    ${A.toplam} oyuncu · ${A.yerli} yerli · %${(A.yerli / A.toplam * 100).toFixed(1)}`);
yaz(A.yerli === A.toplam, `lig kadroları %100 ${EV}${A.yabancilar.length ? ' — sızan: ' + A.yabancilar.join(', ') : ''}`);

/* B) Draft adayları → %100 ev ülkesi */
console.log('\nB) Draft adayları (50 aday)');
const B = run(`(function(){
  let t = 0, y = 0; const d = [];
  for (let i = 0; i < 50; i++) { const p = genDraftProspect(i); t++; if (p.ulke === LIG_EV_ULKE) y++; else d.push(p.ulke); }
  return { t, y, d: Array.from(new Set(d)) };
})()`);
yaz(B.y === B.t, `${B.t} draft adayının ${B.y} tanesi ${EV}${B.d.length ? ' — sızan: ' + B.d.join(', ') : ''}`);

/* C) Altyapı → %100 ev ülkesi */
console.log('\nC) Altyapı oyuncuları (60 genç)');
const C = run(`(function(){
  let t = 0, y = 0; const d = [];
  for (let i = 0; i < 60; i++) { const p = genSingleYouth(0); t++; if (p.ulke === LIG_EV_ULKE) y++; else d.push(p.ulke); }
  return { t, y, d: Array.from(new Set(d)) };
})()`);
yaz(C.y === C.t, `${C.t} altyapı oyuncusunun ${C.y} tanesi ${EV}${C.d.length ? ' — sızan: ' + C.d.join(', ') : ''}`);

/* D) Bot kadro derinliği — 200 takım */
console.log('\nD) botClubEnsureDepth · 200 takım');
const D = run(`(function(){
  let toplam = 0, yabanci = 0, maxTakim = 0; const dagilim = {};
  for (let t = 0; t < 200; t++) {
    const roster = [];
    botClubEnsureDepth(roster, 'TBL||Bot Kulüp ' + t);
    let tk = 0;
    roster.forEach(p => { toplam++; if (p.ulke !== LIG_EV_ULKE) { yabanci++; tk++; dagilim[p.ulke] = (dagilim[p.ulke]||0)+1; } });
    if (tk > maxTakim) maxTakim = tk;
  }
  return { toplam, yabanci, maxTakim, cesit: Object.keys(dagilim).length };
})()`);
const oranD = D.yabanci / D.toplam * 100;
console.log(`    ${D.toplam} bot oyuncu · ${D.yabanci} yabancı · %${oranD.toFixed(1)} · ${D.cesit} farklı ülke`);
yaz(oranD <= 12, `bot yabancı oranı %${oranD.toFixed(1)} (kapı ≤%12)`);
yaz(D.maxTakim <= run('BOT_YABANCI_MAX'), `takım başına en fazla ${D.maxTakim} yabancı (kapı ≤${run('BOT_YABANCI_MAX')})`);

/* E) Bot kararı deterministik mi (Math.random kullanılmamalı) */
console.log('\nE) Bot milliyet kararı deterministik mi');
/* Sınanan şey KAPI'nın kendisidir. Kapı açıldığında oyuncunun ülkesi ch(ULKELER) ile
   çekilir ve bu BİLEREK maçın rastgele akışından gelir (F13-3/B-5 dersinin milliyet
   karşılığı: çekilişi atlamak tüm akışı kaydırır ve band.js hash'ini değiştirirdi).
   Yani "hangi yabancı" rastgeledir, "yabancı olsun mu" deterministiktir. */
const E = run(`(function(){
  const desen = [];
  for (let k = 0; k < 30; k++) {
    let d = '';
    for (let i = 0; i < BOT_ROSTER_DIST.length; i++) d += prChance('TBL||Sabit|yabanci|' + i, BOT_YABANCI_ORAN) ? '1' : '0';
    desen.push(d);
  }
  return { hepsiAyni: desen.every(x => x === desen[0]) };
})()`);
yaz(E.hepsiAyni, 'aynı kulüp anahtarı → aynı yabancı KAPISI deseni (prChance deterministik)');
const botKaynak = run('String(botClubEnsureDepth)');
yaz(!/Math\.random|[^a-zA-Z]rand\(/.test(botKaynak), 'botClubEnsureDepth içinde Math.random() / rand() yok');

/* E2) prUnit dağılımı düz mü — kümelenirse kapı doğru oranda açılsa bile tavana çarpar */
const E2 = run(`(function(){
  const d = new Array(10).fill(0); let n = 0, N = 0;
  for (let t = 0; t < 400; t++) for (let i = 0; i < 10; i++) {
    const v = prUnit('TBL||Bot ' + t + '|yabanci|' + i); N++; d[Math.min(9, Math.floor(v * 10))]++;
    if (v < BOT_YABANCI_ORAN) n++;
  }
  return { oran: n / N, sapma: Math.max.apply(null, d.map(x => Math.abs(x / N - 0.1))) };
})()`);
console.log(`    prUnit: p<0,10 oranı %${(E2.oran * 100).toFixed(2)} · en büyük desil sapması %${(E2.sapma * 100).toFixed(2)}`);
yaz(E2.sapma <= 0.02, `prUnit desil sapması %${(E2.sapma * 100).toFixed(2)} (kapı ≤%2 — kümelenme yok)`);

/* F) Transfer marketi — FAZ 17B: sezona bağlı yerli payı + yabancı kalite primi */
console.log('\nF) Transfer marketi uyruk dengesi (FAZ 17B)');
const F = run(`(function(){
  G.players = genRoster();
  function olc(sezon){
    G.season = { year: sezon };
    const m = []; for (let i = 0; i < 400; i++) m.push(genSingleMarketPlayer(i));
    const yerli = m.filter(p => p.ulke === LIG_EV_ULKE).length;
    const s = m.slice().sort((a, b) => (b.genel||0) - (a.genel||0));
    const dilim = Math.max(1, Math.round(s.length * 0.2));
    const ustYab = s.slice(0, dilim).filter(p => p.ulke !== LIG_EV_ULKE).length / dilim;
    const altYab = s.slice(-dilim).filter(p => p.ulke !== LIG_EV_ULKE).length / dilim;
    const ovrYerli = m.filter(p => p.ulke === LIG_EV_ULKE);
    const ovrYab = m.filter(p => p.ulke !== LIG_EV_ULKE);
    const ort = a => a.length ? a.reduce((x, p) => x + (p.genel||0), 0) / a.length : 0;
    const d = {}; m.forEach(p => { d[p.ulke] = (d[p.ulke]||0)+1; });
    return { n: m.length, yerliPay: yerli / m.length, ustYab, altYab,
             ortYerli: ort(ovrYerli), ortYab: ort(ovrYab),
             enYuksek: s[0] ? s[0].genel : 0, cesit: Object.keys(d).length };
  }
  const r = { s1: olc(1), s3: olc(3), s6: olc(6) };
  G.season = null;
  return r;
})()`);
[['s1', 1], ['s3', 3], ['s6', 6]].forEach(([k, y]) => {
  const r = F[k];
  console.log(`    sezon ${y}: yerli %${(r.yerliPay*100).toFixed(1)} · yerli OVR ort ${r.ortYerli.toFixed(1)} · yabancı OVR ort ${r.ortYab.toFixed(1)} · ${r.cesit} ülke`);
});
yaz(F.s1.yerliPay >= 0.45 && F.s1.yerliPay <= 0.65,
  `sezon 1 yerli payı %${(F.s1.yerliPay*100).toFixed(1)} (kapı %45-65)`);
yaz(F.s6.yerliPay >= 0.20 && F.s6.yerliPay <= 0.32,
  `sezon 6 yerli payı %${(F.s6.yerliPay*100).toFixed(1)} (kapı %20-32)`);
yaz(F.s3.yerliPay < F.s1.yerliPay && F.s6.yerliPay < F.s3.yerliPay,
  `yerli payı sezonla azalıyor: %${(F.s1.yerliPay*100).toFixed(1)} → %${(F.s3.yerliPay*100).toFixed(1)} → %${(F.s6.yerliPay*100).toFixed(1)}`);
/* Üst dilim yabancı ağırlıklı olmalı — "ithal edilmeye değecek oyuncu" kuralı. */
console.log(`    sezon 1 · OVR sıralamasında ilk %20'de yabancı %${(F.s1.ustYab*100).toFixed(0)} · son %20'de %${(F.s1.altYab*100).toFixed(0)}`);
yaz(F.s1.ustYab > F.s1.altYab,
  `ilk %20 yabancı payı (%${(F.s1.ustYab*100).toFixed(0)}) > son %20 (%${(F.s1.altYab*100).toFixed(0)})`);
yaz(F.s1.ortYab > F.s1.ortYerli,
  `yabancı OVR ortalaması yerliden yüksek (${F.s1.ortYab.toFixed(1)} > ${F.s1.ortYerli.toFixed(1)})`);
/* Aşırıya kaçmasın: yabancı üstünlüğü ölçülü kalmalı, erişilemez olmamalı. */
yaz(F.s1.ortYab - F.s1.ortYerli <= 12,
  `yabancı–yerli OVR farkı ${(F.s1.ortYab - F.s1.ortYerli).toFixed(1)} (kapı ≤12 — erişilemez olmasın)`);
yaz(F.s1.cesit >= 20, `markette ${F.s1.cesit} farklı ülke`);

/* ── F2) Koç ve izci milliyeti (FAZ 22 §1) ─────────────────────────────────────────── */
console.log('\nF2) Koç / izci milliyeti ve isim kaynağı');
const F2 = run(`(function(){
  const takimKoc = genCoaches();
  const pazarKoc = genCoachMarket();
  const kocla = [].concat(takimKoc, pazarKoc);
  const izciler = genScoutMarket();
  const hepsi = kocla.concat(izciler);
  const yerli = hepsi.filter(c => c.ulke === LIG_EV_ULKE).length;
  const ulkesiz = hepsi.filter(c => !c.ulke).length;
  /* Ad, kendi ülkesinin havuzundan mı geliyor? */
  let havuzdan = 0;
  hepsi.forEach(c => {
    const p = NAME_POOLS[c.ulke]; if (!p) return;
    const par = String(c.ad || '').split(' ');
    const ilk = par[0], sy = par.slice(1).join(' ');
    if (p.ilk.indexOf(ilk) >= 0 || p.sy.indexOf(sy) >= 0) havuzdan++;
  });
  /* 200 koç üret: yabancı payı bot kuralıyla aynı bantta kalmalı */
  let n = 0, yab = 0;
  for (let i = 0; i < 100; i++) {
    genCoaches().forEach(c => { n++; if (c.ulke !== LIG_EV_ULKE) yab++; });
  }
  return { toplam: hepsi.length, yerli, ulkesiz, havuzdan,
           takimYerli: takimKoc.filter(c=>c.ulke===LIG_EV_ULKE).length, takimN: takimKoc.length,
           kocAdlari: kocla.map(c => c.ad + ' · ' + c.ulke),
           yabanciOran: yab / Math.max(1, n) };
})()`);
console.log('    örnek: ' + F2.kocAdlari.slice(0, 4).join(' · '));
yaz(F2.ulkesiz === 0, `${F2.toplam} personelin hepsinde ulke alanı var (eksik ${F2.ulkesiz})`);
/* §1.6: kariyer başındaki TAKIM koçları %100 yerli; pazarda ~%10 yabancı serbest. */
yaz(F2.takimYerli === F2.takimN,
  `kariyer başındaki takım koçlarının %100'ü ${EV} (${F2.takimYerli}/${F2.takimN})`);
yaz(F2.yerli / F2.toplam >= 0.85,
  `personelin %${(F2.yerli/F2.toplam*100).toFixed(0)}'i ${EV} (pazarda az sayıda yabancı serbest)`);
yaz(F2.havuzdan === F2.toplam,
  `${F2.toplam} personelin ${F2.havuzdan} tanesinin adı kendi ülkesinin havuzundan`);
yaz(F2.yabanciOran <= 0.12,
  `uzun vadede yabancı personel payı %${(F2.yabanciOran*100).toFixed(1)} (kapı ≤%12, bot kuralıyla aynı)`);

/* Marka riski: tek bir yaşayan sporcuyla özdeşleşmiş ad personelde de olmamalı.
   Canlıda koç pazarında "LaMelo Okonkwo" çıkmıştı — oyuncu havuzları FAZ 17 §3.4'te
   temizlenmişti ama koç/izci genel ILK/SY havuzundan besleniyordu. */
/* Ölçüt AYIRT EDİCİ adlardır (FAZ 17 §3.4): tek bir yaşayan sporcuyla neredeyse
   özdeşleşmiş, günlük hayatta nadir görülen adlar. Yaygın ilk adlar (Jayson, Joel, Luka,
   Nikola, Jonas, Victor) BİLEREK dışarıda — bunlar milyonlarca kişinin adı ve kimseyi
   işaret etmez; listeye alınırsa denetim gerçek riski değil gürültüyü ölçer. */
const RISKLI = ['LaMelo','Giannis','Shai','Trae','Domantas','Hakeem','Kwame','Cedi',
  'Alperen','Antetokounmpo','Doncic','Dončić','Jokic','Jokić','Okonkwo','Sabonis',
  'Valanciunas','Valančiūnas','Gilgeous','Yabusele','Varejao','Varejão','Campazzo'];
const F3 = run(`(function(){
  const adlar = [];
  for (let i = 0; i < 60; i++) {
    [].concat(genCoaches(), genCoachMarket(), genScoutMarket()).forEach(c => adlar.push(String(c.ad||'')));
  }
  return adlar;
})()`);
const bulunan = Array.from(new Set(F3.filter(ad =>
  RISKLI.some(r => ad.split(/\s+/).indexOf(r) >= 0))));
yaz(bulunan.length === 0,
  bulunan.length ? 'riskli ad: ' + bulunan.slice(0, 5).join(', ')
                 : `${F3.length} personel adında gerçek sporcuyla özdeşleşmiş ad yok`);

/* G) Kullanıcıya yabancı sınırı YOK */
console.log('\nG) Kullanıcı kadrosunda yabancı sınırı');
const G_ = run(`typeof rosterHasRoom === 'function' ? String(rosterHasRoom) : ''`);
yaz(!/ulke|yabanc/i.test(G_), 'rosterHasRoom uyruk kontrolü yapmıyor (kullanıcı serbest)');

/* H) 43 ülkenin hepsi NAME_POOLS'ta */
console.log('\nH) ULKELER ↔ NAME_POOLS');
const H = run(`ULKELER.filter(u => !NAME_POOLS[u.ad]).map(u => u.ad)`);
yaz(H.length === 0, H.length ? 'havuzu olmayan ülke: ' + H.join(', ') : '43 ülkenin hepsinin isim havuzu var');

/* I) İsim ↔ bayrak uyumu (üretilen oyuncuda) */
console.log('\nI) İsim–ülke uyumu');
const I = run(`(function(){
  let uyum = 0, n = 0;
  ULKELER.forEach(u => {
    for (let i = 0; i < 6; i++) {
      const p = genPlayer('PG', u.ad); n++;
      const sy = p.isim.split(' ').slice(1).join(' ');
      if (NAME_POOLS[u.ad].sy.indexOf(sy) >= 0 || NAME_POOLS[u.ad].ilk.indexOf(p.isim.split(' ')[0]) >= 0) uyum++;
    }
  });
  return { uyum, n };
})()`);
yaz(I.uyum === I.n, `${I.n} oyuncunun ${I.uyum} tanesinin adı kendi ülkesinin havuzundan`);

console.log('\n' + '='.repeat(64));
console.log(hata ? `✗ ${hata} kontrol başarısız` : '✓ tüm milliyet kontrolleri geçti');
process.exit(hata ? 1 : 0);
