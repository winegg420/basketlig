#!/usr/bin/env node
/* FAZ 19 — LİG DENETÇİSİ  (node tools/lig-check.js)
 *
 * A) TEK KAYNAK (§1.4). Canlı bulgu: puan durumu 20 satır basıyor ama yalnız 3'ünde veri
 *    var, kullanıcının takımı tabloda hiç yok, Ana Panel'de sıra "-" görünüyor. Sebep iki
 *    ayrı takım evreni: ekran TBL deposundaki adları, istatistik G.season.standings'i
 *    kullanıyordu; kesişim 3 isimdi. Bu bölüm ayrışmayı ve onarımı sınar.
 *
 * B) LİG DENGESİ (§2.4). Canlı ölçüm: ortalama sayı farkı 21,4 · 20+ farkla biten maç
 *    %51,9 · 5- farkla biten %15,6 · bir takım 16-0, iki takım 0-16. Gerçek ligde fark
 *    ~10-11 ve uçlar bu kadar sık değil.
 *
 * C) ŞEHİR TEKRARI (§3). Canlı bulgu: 20 takım ~8 şehirden; Kayseri ×4, Konya ×4.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
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
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  },
  sessionStorage: (function(){var m={};return{getItem:k=>(k in m?m[k]:null),setItem:(k,v)=>{m[k]=String(v);},removeItem:k=>{delete m[k];}};})(),
  document: stub(), navigator: { onLine: true },
  location: { search: '?test=1', hostname: 'localhost' },
  fetch: undefined, performance: { now: () => 0 },
};
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of FILES) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.error('yüklenemedi:', f, e.message); process.exit(1); }
}
/* Arayüz katmanı bu harness'ta yok: renderX / updateX / showNotif gibi çağrılar
   sessiz birer no-op'a bağlanır ki oyun mantığı (startLeagueSeason, simulateCpuMatch)
   tarayıcısız koşabilsin. */
vm.runInContext([
  'updateStats','updateCoins','updateChemistry','showNotif','renderLig','renderRoster',
  'renderMarket','renderDashboard','renderDashboardSummary','renderDashboardNextMatch',
  'renderTeamFixturePanel','renderNews','saveGame','autoSave','refreshSidebar',
  'renderPlayoffPanel','updateMobileBadges','applyMobileFolds','trackEvent','trackOnce',
  'trackMilestone','sfx','pushNotif','renderAnalytics','renderBilanco','syncMatchButtons',
].map(n => 'if(typeof ' + n + ' === "undefined") { var ' + n + ' = function(){}; }').join(String.fromCharCode(10)), ctx);

const run = (src) => vm.runInContext(src, ctx);

let hata = 0;
const yaz = (ok, s) => { console.log((ok ? '  ✓ ' : '  ✗ ') + s); if (!ok) hata++; };
const not = (s) => console.log('  · ' + s);

console.log('FAZ 19 — LİG DENETİMİ');
console.log('='.repeat(66));

/* Kariyer kur + bir sezon oyna (bot-bot dâhil). */
const kurulum = run(`(function(){
  G.team = { isim:'Test Kartalları', arena:'Test Arena', renk:'#f97316', tblKey:null, sehir:'İstanbul' };
  G.players = genRoster();
  const k = assignUserToTblSlot(G.team.isim);
  G.team.tblKey = k;
  G.coaches = []; G.youth = []; G.marketPlayers = [];
  startLeagueSeason();
  return { key:k, takim:G.team.isim, mac:(G.season&&G.season.matches||[]).length,
           st:Object.keys(G.season.standings||{}).length };
})()`);
not(`lig ${kurulum.key} · ${kurulum.st} takım · ${kurulum.mac} maç`);

/* ── A) Tek kaynak ─────────────────────────────────────────────────────────────────── */
console.log('\nA) Tek kaynak — standings ↔ fikstür ↔ tablo');
const A = run(`(function(){
  const sea = G.season;
  const stAdlar = Object.keys(sea.standings);
  const macAdlar = Array.from(new Set([].concat(
    sea.matches.map(m=>m.home), sea.matches.map(m=>m.away))));
  const eksik = macAdlar.filter(n=>stAdlar.indexOf(n)<0);
  const fazla = stAdlar.filter(n=>macAdlar.indexOf(n)<0);
  return { stAdlar, fark: eksik.length+fazla.length, eksik, fazla,
           kullaniciVar: stAdlar.indexOf(G.team.isim)>=0 };
})()`);
yaz(A.fark === 0, `standings ↔ fikstür ad farkı ${A.fark}` +
  (A.fark ? ` (fikstürde fazla: ${A.eksik.slice(0,3)} · tabloda fazla: ${A.fazla.slice(0,3)})` : ''));
yaz(A.kullaniciVar, 'kullanıcının takımı standings içinde');

/* Ayrışmayı BİLEREK üret: TBL deposunu farklı adlarla ez, onarım düzeltmeli. */
console.log('\nA2) Ayrışma senaryosu — depo bozulunca onarım');
const A2 = run(`(function(){
  const st = getTblState();
  const sub = st.subs[G.team.tblKey];
  const oncekiler = sub.teams.slice();
  sub.teams = sub.teams.map((t,i)=> t===G.team.isim ? t : 'Sahte Kulüp '+i);
  localStorage.setItem(TBL_STORAGE_KEY, JSON.stringify(st));
  const bozukRows = buildLeagueRows(G.team.tblKey);
  const veriliBozuk = bozukRows.filter(r=>!r.bos && r.puan!=='—').length;
  const sonrasi = getTblState().subs[G.team.tblKey].teams.filter(Boolean);
  const seaAdlar = Object.keys(G.season.standings);
  const kalanFark = seaAdlar.filter(n=>sonrasi.indexOf(n)<0).length;
  const siraOncesi = userLigSirasi(G.team.tblKey);   /* hiç maç yok → null olmalı (§7) */
  let oynanan=0;
  for(const m of G.season.matches){ if(oynanan>=2) break; simulateCpuMatch(m); oynanan++; }
  return { satir:bozukRows.length, veriliBozuk, kalanFark,
           kullaniciSatirda: bozukRows.some(r=>r.isUser),
           siraOncesi,
           sira: userLigSirasi(G.team.tblKey) };
})()`);
yaz(A2.satir === 20, `bozulmadan sonra tablo yine ${A2.satir} satır`);
yaz(A2.veriliBozuk === 20, `20 satırın ${A2.veriliBozuk} tanesinde veri var ("—" yok)`);
yaz(A2.kullaniciSatirda, 'kullanıcının takımı tabloda görünüyor');
yaz(A2.kalanFark === 0, `onarım sonrası depo ↔ sezon farkı ${A2.kalanFark}`);
/* FAZ 20 §7: hiç maç oynanmadan sıra gösterilmez — 20 takım 0-0 iken "3. sıra" keyfîydi. */
yaz(A2.siraOncesi === null, 'sezon başlamadan sıra yok (null → ekranda "—")');
yaz(A2.sira != null && A2.sira >= 1 && A2.sira <= 20, `maç oynandıktan sonra sıra ${A2.sira} (1..20 arası)`);

/* ── B) Tablo tutarlılığı — bir sezon oynanır ──────────────────────────────────────── */
console.log('\nB) Sezon oynandıktan sonra tablo tutarlılığı');
const B = run(`(function(){
  let guard=0;
  while(G.season.matches.some(m=>!m.played) && guard++<400){
    const m=G.season.matches.find(x=>!x.played);
    if(!m) break;
    simulateCpuMatch(m);
  }
  const st=G.season.standings;
  const adlar=Object.keys(st);
  const oDegerleri=Array.from(new Set(adlar.map(n=>st[n].o)));
  const tutmayan=adlar.filter(n=>st[n].o !== (st[n].g+st[n].m));
  return { oDegerleri, tutmayan, oynanmamis:G.season.matches.filter(m=>!m.played).length };
})()`);
yaz(B.oynanmamis === 0, `tüm maçlar oynandı (kalan ${B.oynanmamis})`);
yaz(B.oDegerleri.length === 1, `her takımın oynadığı maç sayısı eşit (${B.oDegerleri.join(', ')})`);
yaz(B.tutmayan.length === 0, `o = g + m her takımda tutuyor (${B.tutmayan.length} sapma)`);

/* ── C) Lig dengesi — 10 sezon ─────────────────────────────────────────────────────── */
console.log('\nC) Lig dengesi — 60 sezon (§2.3 hedefleri)');
const C = run(`(function(){
  const farklar=[]; let ucSifir=0, sezon=0, takimSayisi=0;
  for(let s=0;s<60;s++){
    let guard=0;
    while(G.season.matches.some(m=>!m.played) && guard++<400){
      const m=G.season.matches.find(x=>!x.played); if(!m) break; simulateCpuMatch(m);
    }
    G.season.matches.forEach(m=>{ if(m.played&&m.hs!=null&&m.as!=null) farklar.push(Math.abs(m.hs-m.as)); });
    const st=G.season.standings;
    Object.keys(st).forEach(n=>{
      takimSayisi++;
      if(st[n].g===0 || st[n].m===0) ucSifir++;
    });
    sezon++;
    try{ startLeagueSeason(); }catch(e){ break; }
  }
  const n=farklar.length;
  const ort=farklar.reduce((a,b)=>a+b,0)/Math.max(1,n);
  return { n, sezon, ort,
    buyuk: farklar.filter(d=>d>20).length/Math.max(1,n),
    kucuk: farklar.filter(d=>d<=5).length/Math.max(1,n),
    ucSifirOran: ucSifir/Math.max(1,takimSayisi) };
})()`);
not(`${C.sezon} sezon · ${C.n} maç ölçüldü`);
console.log(`    ortalama fark ${C.ort.toFixed(1)} · 20+ fark %${(C.buyuk*100).toFixed(1)} · ` +
  `5- fark %${(C.kucuk*100).toFixed(1)} · yenilgisiz/galibiyetsiz takım %${(C.ucSifirOran*100).toFixed(2)}`);
yaz(C.ort >= 10 && C.ort <= 13, `ortalama sayı farkı ${C.ort.toFixed(1)} (hedef 10-13)`);
yaz(C.buyuk < 0.25, `20+ farkla biten maç %${(C.buyuk*100).toFixed(1)} (hedef <%25)`);
yaz(C.kucuk > 0.25, `5 ve altı farkla biten maç %${(C.kucuk*100).toFixed(1)} (hedef >%25)`);
/* ⚠ ÖRNEKLEM BOYU ÖLÇÜTE GÖRE SEÇİLDİ. 20 sezonda (400 takım-sezon) tek bir 16-0
   takımı %0,25 eder ve eşik <%1 — yani kapı 4 olayda düşer. Ölçülen dağılım
   %0,25 · %0,50 · %0,25 · %1,00 idi: DAVRANIŞ değişmeden koşudan koşuya düşüyordu.
   60 sezon (1.200 takım-sezon) ile tek olay %0,083 eder, eşik ortalamadan ~8 olay
   uzakta kalır. Eşik DEĞİŞMEDİ. */
yaz(C.ucSifirOran < 0.01, `16-0 / 0-16 takım oranı %${(C.ucSifirOran*100).toFixed(2)} (hedef <%1)`);

/* ── D2) Kariyer değişiminde haber akışı (FAZ 20 §6) ───────────────────────────────── */
console.log('\nD2) Yeni kariyerde önceki kariyerin haberi kalmamalı');
const D2 = run(`(function(){
  /* Önceki kariyerin haberini üret */
  pushLeagueNewsLine('<div>🏀 dasd 85-73 Konya Spor · Gün 21</div>');
  const oncesi = (sessionStorage.getItem(NEWS_SESSION_KEY)||'');
  const kulupOnce = localStorage.getItem(CLUB_CACHE_KEY);
  kariyerAkislariniSifirla();
  const sonrasi = (sessionStorage.getItem(NEWS_SESSION_KEY)||'');
  return {
    oncesindeVardi: oncesi.indexOf('dasd')>=0,
    sonrasindaYok: sonrasi.indexOf('dasd')<0,
    kulupOnbellekTemiz: localStorage.getItem(CLUB_CACHE_KEY)==null,
    kulupOnceVardi: kulupOnce!=null
  };
})()`);
yaz(D2.oncesindeVardi, 'test kurgusu: önceki kariyerin haberi akışa yazıldı');
yaz(D2.sonrasindaYok, 'kariyer sıfırlamasından sonra önceki takım adı akışta YOK');
yaz(D2.kulupOnbellekTemiz, 'kulüp önbelleği (CLUB_CACHE_KEY) de temizlendi');

/* ── D) Şehir tekrarı ──────────────────────────────────────────────────────────────── */
console.log('\nD) Takım adlarında şehir tekrarı (§3)');
const D = run(`(function(){
  const sub=getTblState().subs[G.team.tblKey];
  const adlar=sub.teams.filter(Boolean);
  const say={};
  adlar.forEach(a=>{ const sehir=SEHIR.find(s=>a.indexOf(s)===0); if(sehir) say[sehir]=(say[sehir]||0)+1; });
  const enCok=Math.max.apply(null,Object.values(say).concat([0]));
  return { adlar, say, enCok, sehirSayisi:Object.keys(say).length, havuz:SEHIR.length };
})()`);
console.log('    ' + Object.entries(D.say).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`${k} ×${v}`).join(' · '));
yaz(D.havuz >= 30, `şehir havuzu ${D.havuz} (hedef ≥30)`);
yaz(D.enCok <= 2, `bir ligde aynı şehirden en fazla ${D.enCok} takım (hedef ≤2)`);

/* ── FAZ 33 §3: DİVİZYONDA ÜLKE ÇEŞİTLİLİĞİ ─────────────────────────────────────────
   FAZ 30 oyuncuları küreselleştirdi, takım adlarını değil — canlıda kurulan Divizyon 3'te
   20 takımın 19'u Türk şehriydi. Şehir tekrarı kapısı (D) bunu göremez: 19 FARKLI Türk
   şehri kuralı ihlal etmez. Ölçülmesi gereken ÜLKE dağılımıdır. Kapı yeni kurulan
   TÜM divizyonları tarar, tek seferlik bir örneğe bakmaz. */
console.log(String.fromCharCode(10)+'D3) Divizyonda ülke dağılımı (FAZ 33 §3)');
const D3 = run(`(function(){
  const st=getTblState();
  const out=[];
  Object.keys(st.subs||{}).forEach(k=>{
    const sub=st.subs[k]; if(!sub||!sub.teams) return;
    /* Kullanıcının KENDİ takımı havuzdan gelmez (adı elle yazılır) — kurala tabi değil. */
    const kendi=(G.team&&G.team.isim)||null;
    const adlar=sub.teams.filter(a=>a&&a!==kendi); if(adlar.length<5) return;
    const say={}, eksik=[];
    adlar.forEach(a=>{
      const sh=String(a).split(' ')[0];
      const u=sehirUlkesi(sh);
      if(!u){ eksik.push(sh); return; }
      say[u]=(say[u]||0)+1;
    });
    const paylar=Object.values(say);
    out.push({
      anahtar:k, takim:adlar.length, ulke:Object.keys(say).length,
      enBuyukPay: paylar.length?Math.max.apply(null,paylar)/adlar.length:1,
      enBuyukUlke: Object.keys(say).sort((a,b)=>say[b]-say[a])[0]||null,
      eksik
    });
  });
  return { bolumler:out, payMax:LIG_ULKE_PAY_MAX, ulkeMin:LIG_ULKE_MIN,
           haritaBoy:Object.keys(SEHIR_ULKE).length, sehirBoy:SEHIR.length };
})()`);
yaz(D3.haritaBoy === D3.sehirBoy,
  `SEHIR_ULKE haritası eksiksiz (${D3.haritaBoy}/${D3.sehirBoy} şehir)`);
const _eksikSehir = D3.bolumler.reduce((a, b) => a.concat(b.eksik), []);
yaz(_eksikSehir.length === 0,
  _eksikSehir.length ? `ülkesi bilinmeyen şehir: ${[...new Set(_eksikSehir)].slice(0,5).join(' · ')}`
                     : 'her takım adının şehri haritada var');
D3.bolumler.forEach(b => console.log(
  `    ${b.anahtar}: ${b.takim} takım · ${b.ulke} ülke · en büyük pay %${(b.enBuyukPay*100).toFixed(0)} (${b.enBuyukUlke})`));
const _payIhlal = D3.bolumler.filter(b => b.enBuyukPay > D3.payMax + 0.001);
yaz(_payIhlal.length === 0,
  _payIhlal.length ? `${_payIhlal.length} divizyonda tek ülke payı %${(D3.payMax*100)}'u aşıyor · ör. ${_payIhlal[0].anahtar} %${(_payIhlal[0].enBuyukPay*100).toFixed(0)} ${_payIhlal[0].enBuyukUlke}`
                   : `her divizyonda tek ülkenin payı ≤%${D3.payMax*100} (${D3.bolumler.length} divizyon)`);
const _cesitIhlal = D3.bolumler.filter(b => b.ulke < D3.ulkeMin);
yaz(_cesitIhlal.length === 0,
  _cesitIhlal.length ? `${_cesitIhlal.length} divizyonda ülke sayısı ${D3.ulkeMin}'in altında · ör. ${_cesitIhlal[0].anahtar}: ${_cesitIhlal[0].ulke}`
                     : `her divizyonda ≥${D3.ulkeMin} farklı ülke (en az ${Math.min.apply(null,D3.bolumler.map(b=>b.ulke))})`);

/* ── FAZ 30 §4: DİVİZYON MERDİVENİ ──────────────────────────────────────────────────
   Divizyon 1 en üst, aşağı doğru uzar. Her divizyon 20 takım; Divizyon 1 tek grup,
   alt divizyonlar paralel gruplara ayrılabilir. Yeni kariyer EN ALT divizyonda başlar. */
console.log(String.fromCharCode(10)+'E) Divizyon merdiveni (FAZ 30 §4)');
const E = run(`(function(){
  const st = getTblState();
  const out = { div: [], eksik: [], boy: [] };
  for (let d = 1; d <= DIV_SAYISI; d++) {
    const anahtarlar = divizyonAnahtarlari(d);
    out.div.push({ d, grup: anahtarlar.length, ilk: anahtarlar[0] });
    anahtarlar.forEach(k => {
      const sub = st.subs[k];
      if (!sub || !Array.isArray(sub.teams)) { out.eksik.push(k); return; }
      if (sub.teams.length !== LEAGUE_SIZE) out.boy.push(k + '=' + sub.teams.length);
    });
  }
  return out;
})()`);
console.log('    ' + E.div.map(x => 'Div' + x.d + ' (' + x.grup + ' grup, ilk "' + x.ilk + '")').join(' · '));
yaz(E.eksik.length === 0, 'her divizyon grubunun slotu depoda var' + (E.eksik.length ? ' — eksik: ' + E.eksik.join(', ') : ''));
yaz(E.boy.length === 0, `her grup ${run('LEAGUE_SIZE')} takım` + (E.boy.length ? ' — ' + E.boy.join(', ') : ''));
yaz(E.div[0].grup === 1, 'Divizyon 1 tek gruptur — ' + E.div[0].grup);
yaz(E.div.length >= 2 && E.div[E.div.length - 1].grup > 1, 'alt divizyonlar paralel gruplara açık — en alt ' + E.div[E.div.length - 1].grup + ' grup');

/* Etiketler nötr olmalı: "TBL" / "Türkiye Basketbol Ligi" küresel yapıda yanlış. */
const E2 = run(`(function(){
  const et = [];
  for (let d = 1; d <= DIV_SAYISI; d++) divizyonAnahtarlari(d).forEach(k => et.push(formatTblSlotLabel(k)));
  return { et, tbl: et.filter(x => /TBL|Türkiye/i.test(x)).length, ornek: et.slice(0, 4) };
})()`);
console.log('    etiket örneği: ' + E2.ornek.join(' · '));
yaz(E2.tbl === 0, 'divizyon etiketlerinde "TBL"/"Türkiye" geçmiyor');

/* Merdiven gücü: üst divizyon bot kadroları daha güçlü. */
const E3 = run(`(function(){
  const ort = {};
  for (let d = 1; d <= DIV_SAYISI; d++) {
    const key = divizyonAnahtarlari(d)[0];
    let top = 0, n = 0;
    for (let t = 0; t < 10; t++) {
      const r = []; botClubEnsureDepth(r, key + '||Lig Olcum ' + d + '-' + t);
      r.forEach(p => { top += p.genel; n++; });
    }
    ort[d] = n ? top / n : 0;
  }
  return ort;
})()`);
let merdiven = true;
for (let d = 1; d < run('DIV_SAYISI'); d++) if (!(E3[d] > E3[d + 1] + 1)) merdiven = false;
console.log('    ortalama OVR: ' + Object.keys(E3).map(d => 'Div' + d + ' ' + E3[d].toFixed(1)).join(' · '));
yaz(merdiven, 'üst divizyon alttakinden güçlü');

console.log('\n' + '='.repeat(66));
console.log(hata ? `✗ ${hata} kontrol başarısız` : '✓ tüm lig kontrolleri geçti');
process.exit(hata ? 1 : 0);
