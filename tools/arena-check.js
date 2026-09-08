#!/usr/bin/env node
/**
 * FAZ 24 §5 — Arena doluluğu / seyirci tavanı denetçisi.
 *
 * Kural: bir maça gelen seyirci sayısı taraftar tabanını AŞAMAZ. Bu kapı iki gerçek
 * kusuru yakaladı: (1) TARAFTAR_KATSAYI 1,6 idi, 2.800 taraftarlı kulüp 4.480 kişi
 * ağırlıyordu; (2) doluluğun %20 tabanı Math.max ile en DIŞTA duruyordu ve taraftar
 * tavanını eziyordu — 800 taraftarlı kulüp 30.000'lik arenada 6.000 seyirci topluyordu.
 * Arena / bilet / taraftar formülü değişince çalıştır.
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
 'js/economy.js', 'js/persistence.js', 'js/portraits.js', 'js/roster-gen.js'
].forEach(f => {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.log('  ! yükleme ' + f + ': ' + e.message); }
});

console.log('FAZ 24 §5 — ARENA DOLULUĞU / SEYİRCİ TAVANI');
console.log('='.repeat(60));

const [ARENA0_KAP, ARENA_SON_KAP] = vm.runInContext(`[ARENA_LVL[0].kap, ARENA_LVL[ARENA_LVL.length-1].kap]`, ctx);
const olcum = vm.runInContext(`(function(){
  const out = [];
  G.team = { isim: 'Test', tblKey: 'tbl', renk: '#fff' };
  /* FAZ 25 USD: kapasiteler ARENA_LVL tablosundan okunur — sabit liste tablo değişince
     sessizce eskiyordu (5.000/30.000 artık YOK). */
  for (const kap of ARENA_LVL.map(a => a.kap))
    for (let fiyat = 0; fiyat < 5; fiyat++)
      for (const w of [0, 3, 8, 14, 17]) {
        G.arena = { s: 1, kap, bk: ARENA_LVL[0].bk };
        G.ticketPrice = fiyat;
        G.wins = w; G.losses = (w === 0 ? 0 : 17 - w);   /* w=0 → sezon başı (hiç oynanmamış) */
        const fan = getFanBaseStats().count;
        const occ = arenaDolulukOrani();
        out.push({ kap, fiyat, w, fan, occ, seyirci: Math.round(occ * kap), gelir: homeTicketIncome() });
      }
  return out;
})()`, ctx);

console.log('\nA) Seyirci ≤ taraftar tabanı');
const ihlal = olcum.filter(x => x.seyirci > x.fan);
yaz(ihlal.length === 0,
  ihlal.length
    ? `${ihlal.length}/${olcum.length} birleşimde seyirci taraftarı aşıyor, ör. ${JSON.stringify(ihlal[0])}`
    : `${olcum.length} arena×fiyat×form birleşiminin hepsinde seyirci ≤ taraftar`);

console.log('\nB) Doluluk sınırları');
yaz(olcum.every(x => x.occ >= 0 && x.occ <= 0.98),
  `doluluk her zaman 0–%98 arası (en yüksek %${Math.round(Math.max(...olcum.map(x => x.occ)) * 100)})`);

console.log('\nC) Sezon başı geliri çapada mı (başlangıç arenası · normal fiyat · maç oynanmamış)');
/* KAPININ NİYETİ: doluluk/gelir formülü yeniden düzenlendiğinde sezon başı gelirinin
   SESSİZCE kaymadığını görmek. Rakamlar FAZ 22 ölçeğine (5.000 kap · 4.350 KR) çakılıydı;
   FAZ 25 USD'de hem para birimi hem arena tablosu değişti, kapı ölçtüğü şeyi değil ESKİ
   BİR SAYIYI savunur hâle geldi (FAZ 25/28 dersi: havuz değişince kapıyı da güncelle).
   Yeni çapa brifin §2.2/§2.3 tablosudur: 2.000 kapasite · $13 bilet · maç oynanmamışken
   doluluk %67 · gelir ≈ $17.400. */
const basKap = ARENA0_KAP;
const bas = olcum.find(x => x.kap === basKap && x.fiyat === 2 && x.w === 0);
yaz(!!bas && Math.abs(bas.occ - 0.67) < 0.02,
  `doluluk %${bas ? (bas.occ * 100).toFixed(1) : '—'} (beklenen ~%67 — form bağlayıcı, taraftar değil)`);
yaz(!!bas && Math.abs(bas.gelir - 17420) < 900,
  `bilet geliri $${bas ? bas.gelir : '—'} (FAZ 25 çapası ≈ $17.420)`);

console.log('\nD) Arena büyütmek taraftar olmadan gelir getirmiyor mu');
const kucuk = olcum.find(x => x.kap === ARENA0_KAP && x.fiyat === 2 && x.w === 0);
const dev = olcum.find(x => x.kap === ARENA_SON_KAP && x.fiyat === 2 && x.w === 0);
yaz(!!dev && dev.seyirci <= dev.fan,
  `${ARENA_SON_KAP}'lik arenada seyirci ${dev ? dev.seyirci : '—'} ≤ taraftar ${dev ? dev.fan : '—'}`);
/* Eşik kapasite ORANINA bağlanır: eskiden 6× kapasite için sabit 1,35 yazılmıştı, tablo
   değişince (10×) kapı kendi eski çapasını savunuyordu. Niyet: gelir artışı kapasite
   artışının çok altında kalmalı (taraftar tavanı iş görüyor). */
const KAP_ORAN = ARENA_SON_KAP / ARENA0_KAP;
yaz(!!dev && !!kucuk && dev.gelir <= kucuk.gelir * KAP_ORAN * 0.35,
  `${(ARENA_SON_KAP / ARENA0_KAP).toFixed(0)}× kapasite geliri yalnız ${dev && kucuk ? (dev.gelir / kucuk.gelir).toFixed(2) : '—'}× yapıyor (taraftar tavanı iş görüyor)`);

console.log('\nE) Tek kaynak — render.js kopya sabit tutmuyor');
const rsrc = fs.readFileSync(path.join(ROOT, 'js/render.js'), 'utf8');
yaz(!/fsx\.count\s*\*\s*1\.6/.test(rsrc) && /fsx\.count\s*\*\s*TARAFTAR_KATSAYI/.test(rsrc),
  'renderArena taraftar tavanını TARAFTAR_KATSAYI üzerinden okuyor (gömülü 1.6 yok)');


/* ── FAZ 52: ARENA MODÜLLERİ ─────────────────────────────────────────────────────────
   Yeni kapılar. NİYET: (a) modül tablosunun kendisi tutarlı olsun (artan bedel, artan
   bakım, azalan verim), (b) SEVİYE 1 = BUGÜNKÜ DAVRANIŞ kuralı sessizce bozulmasın —
   bu kural, FAZ 25 ekonomi çapalarının ve `season-loop` dengesinin korunmasının tek
   güvencesidir, (c) migrasyon eski kaydı kapasite/para kaybı olmadan taşısın,
   (d) gelir dökümünün toplamı `homeTicketIncome()` ile birebir aynı olsun. */
console.log('\nF) Modül tablosu tutarlı (FAZ 52)');
const modOlcum = vm.runInContext(`(function(){
  const t = {};
  ARENA_MOD.forEach(m => {
    t[m.key] = {
      n: m.sv.length,
      bedelArtan: m.sv.every((s,i) => i===0 ? s.m===0 : s.m > m.sv[i-1].m),
      bakimArtan: m.sv.every((s,i) => i===0 ? true : s.bk >= m.sv[i-1].bk),
      gunSayisi: (m.gun||[]).length,
      ilkBakim: m.sv[0].bk,
      /* azalan verim: son kademenin bedel/etki oranı ilkinden büyük olmalı */
      son: m.sv[m.sv.length-1]
    };
  });
  return t;
})()`, ctx);
const modKeys = Object.keys(modOlcum);
yaz(modKeys.length === 13, `13 modül tanımlı (${modKeys.length})`);   /* FAZ 52-B: +soyunma, saglik, taraftarOrg */
yaz(modKeys.every(k => modOlcum[k].n === 5), 'her modül 5 seviyeli');
yaz(modKeys.every(k => modOlcum[k].bedelArtan), 'bedel her kademede artıyor ve Sv1 bedava');
yaz(modKeys.every(k => modOlcum[k].bakimArtan), 'haftalık bakım hiçbir kademede azalmıyor');
yaz(modKeys.every(k => modOlcum[k].gunSayisi === 5), 'her modülün 5 kademelik inşaat süresi var');
/* Sv1 bakım toplamı = eski ARENA_LVL[0].bk — yeni modüller bedava başlar. */
const sv1Bakim = modKeys.reduce((s, k) => s + modOlcum[k].ilkBakim, 0);
const ARENA0_BK = vm.runInContext('ARENA_LVL[0].bk', ctx);
yaz(sv1Bakim === ARENA0_BK, `Sv1 toplam bakımı eski başlangıç bakımıyla aynı (${sv1Bakim} = ${ARENA0_BK})`);

console.log('\nG) Seviye 1 = bugünkü davranış (ekonomi çapası korunuyor)');
const nots = vm.runInContext(`(function(){
  G.team = { isim:'Test', tblKey:'tbl', renk:'#fff' };
  G.arena = { s:1, kap:ARENA_LVL[0].kap, bk:ARENA_LVL[0].bk, isim:'A', mods:null, insaat:null };
  G.ticketPrice = 2; G.wins = 0; G.losses = 0;
  arenaSenkron();
  const d = arenaGelirDokumu();
  return {
    bakim: arenaHaftalikBakim(),
    kap: G.arena.kap,
    guc: arenaGucu(),
    dokum: d,
    toplam: homeTicketIncome(),
    biletSaf: Math.round(G.arena.kap * arenaDolulukOrani() * biletFiyati()),
    gise: arenaGiseKaybi(),
    guvEksik: arenaGuvenlikEksigi(),
    cazibe: arenaCazibe(),
    tol: arenaFiyatToleransi()
  };
})()`, ctx);
yaz(nots.cazibe === 0 && nots.tol === 0, 'Sv1 doluluk katkısı ve fiyat toleransı 0');
yaz(nots.gise === 0 && nots.guvEksik === 0, 'başlangıç arenasında gişe kaybı ve güvenlik eksiği yok');
yaz(nots.dokum.toplam === nots.biletSaf,
  `maç geliri saf bilet geliriyle birebir (${nots.dokum.toplam} = ${nots.biletSaf})`);
yaz(nots.bakim === ARENA0_BK, `haftalık bakım ${nots.bakim} (eski ${ARENA0_BK})`);
yaz(nots.guc.puan === 13 && nots.guc.max === 65, `arena gücü ${nots.guc.puan}/${nots.guc.max}`);

console.log('\nH) Gelir dökümü toplamı = homeTicketIncome()');
const dokumOlcum = vm.runInContext(`(function(){
  const out = [];
  G.team = { isim:'Test', tblKey:'tbl', renk:'#fff' };
  for (const kol of [1,3,5]) for (const lvl of [1,3,5]) for (const fiyat of [0,2,4]) {
    G.arena = { s:1, kap:0, bk:0, isim:'A', mods:{}, insaat:null };
    ARENA_MOD.forEach(m => { G.arena.mods[m.key] = (m.key==='koltuk') ? kol : lvl; });
    G.ticketPrice = fiyat; G.wins = 8; G.losses = 6;
    arenaSenkron();
    const d = arenaGelirDokumu();
    const s = d.bilet + d.loca + d.yiyecek + d.magaza + d.sponsor + d.otopark - d.ceza;
    out.push({ kol, lvl, fiyat, esit: Math.max(0,s) === d.toplam, esit2: homeTicketIncome() === d.toplam,
               occ: d.occ, seyirci: d.seyirci, fan: d.taraftar, toplam: d.toplam, bakim: arenaHaftalikBakim() });
  }
  return out;
})()`, ctx);
yaz(dokumOlcum.every(x => x.esit && x.esit2),
  `${dokumOlcum.length} modül birleşiminde döküm toplamı = maç geliri`);
yaz(dokumOlcum.every(x => x.seyirci <= x.fan + 1),
  'modüller açıkken de seyirci taraftar tabanını aşmıyor');
yaz(dokumOlcum.every(x => x.occ >= 0 && x.occ <= 0.98), 'modüller açıkken doluluk 0–%98 arası');
const tamMod = dokumOlcum.find(x => x.kol === 5 && x.lvl === 5 && x.fiyat === 2);
const azMod = dokumOlcum.find(x => x.kol === 5 && x.lvl === 1 && x.fiyat === 2);
yaz(!!tamMod && !!azMod && tamMod.toplam > azMod.toplam,
  `tam donanımlı arena daha çok kazandırıyor (${azMod ? azMod.toplam : '—'} → ${tamMod ? tamMod.toplam : '—'})`);
yaz(!!tamMod && !!azMod && tamMod.bakim > azMod.bakim * 2,
  `karşılığında bakım da katlanıyor (${azMod ? azMod.bakim : '—'} → ${tamMod ? tamMod.bakim : '—'})`);

console.log('\nI) Önkoşullar ve inşaat');
const onk = vm.runInContext(`(function(){
  G.team = { isim:'Test', tblKey:'tbl', renk:'#fff' };
  G.arena = { s:1, kap:0, bk:0, isim:'A', mods:null, insaat:null };
  arenaSenkron();
  const locaSv1 = arenaOnkosulEngeli('loca',2);          /* koltuk Sv1 iken engellenmeli */
  const giseSv1 = arenaOnkosulEngeli('gise',2);          /* koltuk Sv1 iken engellenmeli */
  G.arena.mods.koltuk = 2; arenaSenkron();
  const locaSv2 = arenaOnkosulEngeli('loca',2);          /* artık serbest */
  const koltuk3 = arenaOnkosulEngeli('koltuk',3);        /* güvenlik Sv2 istenmeli */
  G.arena.mods.guvenlik = 2; arenaSenkron();
  const koltuk3b = arenaOnkosulEngeli('koltuk',3);
  return { locaSv1, giseSv1, locaSv2, koltuk3, koltuk3b };
})()`, ctx);
yaz(!!onk.locaSv1 && !!onk.giseSv1, `loca ve gişe koltuk Sv1 iken kilitli (${onk.locaSv1})`);
yaz(onk.locaSv2 === null, 'koltuk Sv2 olunca loca açılıyor');
yaz(!!onk.koltuk3, `koltuk Sv3 güvenlik istiyor (${onk.koltuk3})`);
yaz(onk.koltuk3b === null, 'güvenlik Sv2 olunca koltuk Sv3 açılıyor');
const guvGerek = vm.runInContext('[arenaGuvenlikGerek(2000),arenaGuvenlikGerek(7000),arenaGuvenlikGerek(12000),arenaGuvenlikGerek(20000)]', ctx);
yaz(JSON.stringify(guvGerek) === '[1,2,3,4]', `güvenlik merdiveni ${guvGerek.join('/')}`);

console.log('\nJ) Eski kayıt migrasyonu (v10 → v11)');
const mig = vm.runInContext(`(function(){
  const out = [];
  for (let s = 1; s <= 5; s++) {
    const d = { v:10, arena:{ s, kap:ARENA_LVL[s-1].kap, bk:ARENA_LVL[s-1].bk, isim:'Eski Salon' } };
    migrateArenaV10ToV11(d);
    out.push({ s, v:d.v, koltuk:d.arena.mods.koltuk, kap:d.arena.kap, bk:d.arena.bk,
               eskiKap:ARENA_LVL[s-1].kap, eskiBk:ARENA_LVL[s-1].bk,
               digerHepsi1: ARENA_MOD.filter(m=>m.key!=='koltuk').every(m=>d.arena.mods[m.key]===1),
               isim:d.arena.isim, insaat:d.arena.insaat });
  }
  return out;
})()`, ctx);
yaz(mig.every(x => x.v === 11), 'sürüm damgası v11');
yaz(mig.every(x => x.koltuk === x.s), 'eski arena seviyesi koltuk modülüne taşındı');
yaz(mig.every(x => x.kap === x.eskiKap), 'kapasite birebir korundu (oyuncu kapasite kaybetmiyor)');
yaz(mig.every(x => x.bk === x.eskiBk), 'haftalık bakım birebir korundu (gider artmıyor)');
yaz(mig.every(x => x.digerHepsi1), 'diğer bütün modüller Sv1');
yaz(mig.every(x => x.isim === 'Eski Salon' && !x.insaat), 'arena adı korundu, bekleyen inşaat yok');


/* ── FAZ 52-B (FAZ 2): TAKIMA ETKİ EDEN MODÜLLER ─────────────────────────────────────
   NİYET: (a) üçü de Sv1'de SIFIR etki üretsin — `band.js`/`measure.js` hash'lerinin ve
   FAZ 25 ekonomi çapalarının korunmasının tek güvencesi budur; (b) etkiler seviyeyle
   TEK YÖNLÜ büyüsün; (c) ev avantajı maç motoruna `G` üzerinden değil ctx ile girsin
   (sunucu sözleşmesi). */
console.log('\nK) Takıma etki eden modüller (FAZ 52-B)');
const f2 = vm.runInContext(`(function(){
  G.team = { isim:'Test', tblKey:'tbl', renk:'#fff' };
  const oku = (sv) => {
    G.arena = { s:1, kap:0, bk:0, isim:'A', mods:{}, insaat:null };
    ARENA_MOD.forEach(m => { G.arena.mods[m.key] = sv; });
    arenaSenkron();
    return { mor:arenaTesisMoral(), ikna:arenaTesisIkna(), yum:arenaTesisKayipYum(),
             maas:arenaTesisMaasIndirimi(), sure:arenaSaglikSure(), risk:arenaSaglikRisk(),
             ev:arenaEvAvantaji() };
  };
  const out = [];
  for (let sv = 1; sv <= 5; sv++) out.push(oku(sv));
  /* istenenMaas: Sv1'de dokunmaz, Sv5'te indirir */
  G.arena.mods && ARENA_MOD.forEach(m => { G.arena.mods[m.key] = 1; }); arenaSenkron();
  const maasSv1 = istenenMaas({ maas: 10000 });
  ARENA_MOD.forEach(m => { G.arena.mods[m.key] = 5; }); arenaSenkron();
  const maasSv5 = istenenMaas({ maas: 10000 });
  return { out, maasSv1, maasSv5 };
})()`, ctx);
const s1 = f2.out[0], s5 = f2.out[4];
yaz(s1.mor === 0 && s1.ikna === 0 && s1.yum === 0 && s1.maas === 0,
  'Sv1: soyunma odası hiçbir etki üretmiyor');
yaz(s1.sure === 0 && s1.risk === 0, 'Sv1: sağlık ünitesi hiçbir etki üretmiyor');
yaz(s1.ev.ft === 0 && s1.ev.to === 0, 'Sv1: ev avantajı yok (motor eski kodu çalıştırır)');
yaz(f2.maasSv1 === 10000, `Sv1: istenen maaş değişmiyor (${f2.maasSv1})`);
const artan = (al) => f2.out.every((x, i) => i === 0 || al(x) >= al(f2.out[i - 1]));
yaz(artan(x => x.mor) && artan(x => x.ikna) && artan(x => x.yum), 'moral/ikna/yumuşatma seviyeyle artıyor');
yaz(artan(x => x.sure) && artan(x => x.risk), 'iyileşme ve risk azaltma seviyeyle artıyor');
yaz(artan(x => x.ev.ft) && artan(x => x.ev.to), 'ev avantajı seviyeyle artıyor');
yaz(s5.maas > 0 && s5.maas <= 0.20 && f2.maasSv5 < 10000,
  `Sv5: istenen maaş %${Math.round(s5.maas * 100)} düşüyor ($10.000 → ${f2.maasSv5})`);
/* Ev avantajının büyüklüğü: FT etkisi sayı olarak ~1, top kaybı ~2 sayı — toplam ~3 sayı.
   Gerçek NBA ev avantajı ~2,5-3 sayıdır; modül TAVANI bunu aşmamalı. */
yaz(s5.ev.ft <= 0.05 && s5.ev.to <= 0.03,
  `ev avantajı tavanı makul (rakip SA −%${(s5.ev.ft * 100).toFixed(1)} · ek top kaybı %${(s5.ev.to * 100).toFixed(1)}/poz)`);

/* Motor sözleşmesi: `buildMatchCtx` evAvantaj alanını DOLDURUYOR ve motor onu G'den
   değil ctx'ten okuyor. `simulateMatch` (sunucu yolu) çağıranın verdiğini kullanır. */
const mesrc = fs.readFileSync(path.join(ROOT, 'js/match-engine.js'), 'utf8');
yaz(/evAvantaj:\(typeof arenaEvAvantaji==='function'\)/.test(mesrc),
  'buildMatchCtx evAvantaj alanını dolduruyor');
yaz(/evAvantaj:o\.homeEvAvantaj\|\|\{ft:0,to:0\}/.test(mesrc),
  'simulateMatch (sunucu yolu) evAvantaj için G okumuyor, çağırandan alıyor');
yaz(/const _evAv=\(userIsHome&&MC\.home&&MC\.home\.evAvantaj\)/.test(mesrc),
  'motor ev avantajını YALNIZ kullanıcı ev sahibiyken uyguluyor');
yaz(!/arenaEvAvantaji\(\)/.test(mesrc.slice(mesrc.indexOf('function generateMatchEvents'))),
  'generateMatchEvents içinde doğrudan G/arena çağrısı yok (sunucu sözleşmesi)');

console.log('\n' + '='.repeat(60));
console.log(hata ? `✗ ${hata} kontrol başarısız` : '✓ arena doluluğu tutarlı');
process.exit(hata ? 1 : 0);
