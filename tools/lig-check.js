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
  'js/league.js', 'js/match-prep.js', 'js/render.js', 'js/match-engine.js'];

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
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
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
  return { satir:bozukRows.length, veriliBozuk, kalanFark,
           kullaniciSatirda: bozukRows.some(r=>r.isUser),
           sira: userLigSirasi(G.team.tblKey) };
})()`);
yaz(A2.satir === 20, `bozulmadan sonra tablo yine ${A2.satir} satır`);
yaz(A2.veriliBozuk === 20, `20 satırın ${A2.veriliBozuk} tanesinde veri var ("—" yok)`);
yaz(A2.kullaniciSatirda, 'kullanıcının takımı tabloda görünüyor');
yaz(A2.kalanFark === 0, `onarım sonrası depo ↔ sezon farkı ${A2.kalanFark}`);
yaz(A2.sira != null && A2.sira >= 1 && A2.sira <= 20, `Ana Panel sırası ${A2.sira} (1..20 arası, "—" değil)`);

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
console.log('\nC) Lig dengesi — 10 sezon (§2.3 hedefleri)');
const C = run(`(function(){
  const farklar=[]; let ucSifir=0, sezon=0, takimSayisi=0;
  for(let s=0;s<10;s++){
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
yaz(C.ucSifirOran < 0.01, `16-0 / 0-16 takım oranı %${(C.ucSifirOran*100).toFixed(2)} (hedef <%1)`);

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

console.log('\n' + '='.repeat(66));
console.log(hata ? `✗ ${hata} kontrol başarısız` : '✓ tüm lig kontrolleri geçti');
process.exit(hata ? 1 : 0);
