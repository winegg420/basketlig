#!/usr/bin/env node
/**
 * Charazay 2.0 — CANLI MAÇ ANLATIMI DENETÇİSİ (FAZ 13)
 *
 * Neden: FAZ 13'ün bulgularının hiçbiri mevcut araçlarla yakalanmıyordu. `live-metrics`
 * senkronu, `sunum-check` üç özel oyunu, `box-band` dengeyi ölçüyor — **anlatım
 * tutarlılığını kimse ölçmüyordu.**
 *
 * Yöntem: maç TARAYICISIZ üretilir (tools/sim-node.js ile aynı vm yükleyicisi) ve olay
 * listesi metin olarak denetlenir. Hızlı: bir maç ~10 ms, varsayılan 30 maç taranır.
 * Ayrıca `--freeze` ile tarayıcıda F13-14 (sekme donması) davranışı sınanır.
 *
 * Çalıştırma:
 *   node tools/anlatim-check.js              → anlatım denetimleri (tarayıcısız)
 *   node tools/anlatim-check.js --n=100      → maç sayısı
 *   node tools/anlatim-check.js --freeze     → + sekme donması / kurtarma testi (Playwright)
 */
const fs = require('fs');
const _KAPI2 = require('./_lib/anlatim-kapilari.js');
const path = require('path');
const vm = require('vm');
const KAPI = require('./_lib/anlatim-kapilari.js');   /* FAZ 25 §8 okuyucuları */

const ROOT = path.resolve(__dirname, '..');
const arg = (ad, v) => { const m = process.argv.find(a => a.startsWith('--' + ad + '=')); return m ? Number(m.split('=')[1]) : v; };
/* FAZ 28: deyim/damga kapıları 40 maç üzerinden ölçülür (brif). */
const N = arg('n', 40);
const SEED0 = arg('seed', 987654321);
const FREEZE = process.argv.includes('--freeze');

const FILES = ['js/i18n.js', 'js/i18n-dict.js', 'js/i18n-commentary.js', 'js/names.js', 'js/state.js',
  'js/economy.js', 'js/persistence.js', 'js/portraits.js', 'js/roster-gen.js',
  'js/league.js', 'js/match-prep.js', 'js/render.js', 'js/turkce-ek.js', 'js/match-engine.js'];

const sonuc = [];
function ok(ad, gecti, not) {
  sonuc.push({ ad, gecti: !!gecti, not: not || '' });
  console.log(`  ${gecti ? '✓' : '✗'} ${ad}${not ? ' — ' + not : ''}`);
}

// ── Tarayıcısız yükleyici (sim-node.js ile aynı gerekçe: vm'de her script kendi
//    sözlüksel kapsamını açar, bu yüzden dosyalar TEK script olarak birleştirilir) ────────
function sahteDom() {
  const el = () => ({
    style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    children: [], childNodes: [], innerHTML: '', textContent: '', value: '',
    setAttribute() {}, removeAttribute() {}, getAttribute: () => null, hasAttribute: () => false,
    appendChild() {}, removeChild() {}, insertBefore() {}, remove() {}, focus() {}, blur() {}, click() {},
    addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }),
    closest: () => null, contains: () => false, scrollIntoView() {},
  });
  const doc = el();
  doc.readyState = 'complete'; doc.documentElement = el(); doc.body = el(); doc.head = el();
  doc.createElement = el; doc.createElementNS = el; doc.createTextNode = () => el();
  doc.getElementById = () => null; doc.getElementsByClassName = () => []; doc.getElementsByTagName = () => [];
  doc.createTreeWalker = () => ({ nextNode: () => null }); doc.scripts = [];
  return doc;
}
function ortamKur() {
  const ctx = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, Error, RegExp, Map, Set,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, Promise,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    performance: { now: () => Date.now() },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
    navigator: { language: 'tr', userAgent: 'node' },
    location: { search: '', href: 'file:///node', protocol: 'file:', hostname: '' },
    MutationObserver: function () { return { observe() {}, disconnect() {} }; },
    NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 },
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.document = sahteDom(); ctx.addEventListener = () => {};
  vm.createContext(ctx);
  const kaynak = FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  vm.runInContext(kaynak + `
;globalThis.__api={simulateMatch,genRoster,turkEk:(typeof turkEk!=="undefined")?turkEk:null,NAME_POOLS:(typeof NAME_POOLS!=="undefined")?NAME_POOLS:null,ULKELER:(typeof ULKELER!=="undefined")?ULKELER:null,randomNameFor:(typeof randomNameFor!=="undefined")?randomNameFor:null,prPick:(typeof prPick!=="undefined")?prPick:null};globalThis.SUT_LINES=(typeof SUT_LINES!=="undefined")?SUT_LINES:null;globalThis.KISA_CEKIRDEK_SUT=(typeof KISA_CEKIRDEK_SUT!=="undefined")?KISA_CEKIRDEK_SUT:null;globalThis.__i18n={dict:(typeof I18N_TR_EN!=='undefined')?I18N_TR_EN:null,havuz:{SUT_LINES:(typeof SUT_LINES!=='undefined')?SUT_LINES:null,KISA_CEKIRDEK_SUT:(typeof KISA_CEKIRDEK_SUT!=='undefined')?KISA_CEKIRDEK_SUT:null,KISA_CEKIRDEK:(typeof KISA_CEKIRDEK!=='undefined')?KISA_CEKIRDEK:null,AKIS_ON:(typeof AKIS_ON!=='undefined')?AKIS_ON:null,SON_BOLUM:(typeof SON_BOLUM!=='undefined')?SON_BOLUM:null,SAAT_LINES:(typeof SAAT_LINES!=='undefined')?SAAT_LINES:null,SAAT_QSON:(typeof SAAT_QSON!=='undefined')?SAAT_QSON:null,SPIKER_LINES:(typeof SPIKER_LINES!=='undefined')?SPIKER_LINES:null,IMZA_ESPRI:(typeof IMZA_ESPRI!=='undefined')?IMZA_ESPRI:null,ASSIST_PHRASES:(typeof ASSIST_PHRASES!=='undefined')?ASSIST_PHRASES:null}};`, ctx, { filename: 'charazay-bundle.js' });
  return ctx;
}
function kadroUret(ctx, seed) {
  const eski = ctx.Math.random;
  let a = seed >>> 0;
  ctx.Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return ctx.__api.genRoster(); } finally { ctx.Math.random = eski; }
}

// ── Metin yardımcıları ────────────────────────────────────────────────────────────────────
const metin = e => String((e && e.text) || '').replace(/<[^>]*>/g, '');
/** Olayı hangi taraf yaptı? true = ev sahibi (kullanıcı tarafı), false = rakip. */
function taraf(e) {
  if (e && e.shot && e.shot.isHome !== undefined) return !!e.shot.isHome;
  if (e && e.play && e.play.userPos !== undefined) return !!e.play.userPos;
  return null;
}
const SUT = new Set(['score2', 'score3', 'miss2', 'miss3']);
const KACAN = new Set(['miss2', 'miss3']);

/* Kadro adları — 'top çalma iki taraflı' ölçümü büyük harfli her sözcüğü ad sanmasın
   diye süzgeç. maclariUret'ten sonra doldurulur. */
const KADRO_ADLARI = new Set();
function kadroAdlariniDoldur(rosterler) {
  KADRO_ADLARI.clear();
  (rosterler || []).forEach(r => (r || []).forEach(pl => {
    const ad = String((pl && pl.isim) || '').trim();
    if (!ad) return;
    ad.split(/\s+/).forEach(w => { if (w.length > 1) KADRO_ADLARI.add(w); });
  }));
}

function analizEt(events) {
  const r = {
    sut: 0, kacan: 0, reb: 0, foul: 0, foulAdli: 0, steal: 0, stealCiftTarafli: 0,
    rebsizTarafDegisimi: 0, ardisikAyniTakimSutu: 0, seriIddia: 0, seriYanlis: 0,
    devreArasi: 0, qDt: { 1: 0, 2: 0, 3: 0, 4: 0 }, kalip: new Map(), olay: 0,
    yonQ: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() },
    foulAtlama: 0, enerjiSatiri: 0, koseIddia: 0, koseYanlis: 0,
  };
  let sonSutTaraf = null, sonSutIx = -1;
  let seriTakim = null, seriSayi = 0, oncekiHome = 0, oncekiAway = 0;
  const foulSay = {};                       /* oyuncu bazında anlatılan faul numarası */

  events.forEach((e, i) => {
    const t = e.type || '';
    const tx = _KAPI2.metinTam(e);   /* FAZ 37 §3: kurulum + sonuç tek birim */
    r.olay++;
    /* kalıp: isim ve sayılar çıkarılır */
    /* FAZ 17: isim silme kalıbı ASCII+TR harflerine bakıyordu; havuzda č/ć/š/ž/ū/ė
       geçen bir soyadı (Jokić, Šarić, Valančiūnas…) YARIM siliniyor ve artan harf satırı
       benzersiz yapıyordu — ölçüm oyuncu adı çeşitliliğini "kalıp çeşitliliği" sanıyordu.
       Unicode harf sınıfıyla ad tam silinir; ölçüm gerçekten ŞABLON çeşitliliğini verir. */
    const k = tx.replace(/\d+/g, '#').replace(/\p{Lu}[\p{Ll}\p{M}'’\-]+(\s\p{Lu}[\p{Ll}\p{M}'’\-]+)+/gu, '#');
    if (k.trim()) r.kalip.set(k, (r.kalip.get(k) || 0) + 1);

    if (e.q >= 1 && e.q <= 4 && Number(e.dt) > 0) r.qDt[e.q] += Number(e.dt);

    if (SUT.has(t)) {
      r.sut++;
      const tf = taraf(e);
      /* Yön YALNIZ kullanıcı takımının şutlarından ölçülür; iki takımı birleştirince her
         çeyrek hem sol hem sağ içerir ve devre arası değişimi görünmez olur. */
      if (e.shot && e.shot.x != null && e.shot.isHome) r.yonQ[e.q <= 4 ? e.q : 4].add(e.shot.x < 470 ? 'sol' : 'sag');
      if (KACAN.has(t)) r.kacan++;
      /* ardışık aynı takım şutu: arada ribaund/top kaybı/faul yoksa açıklamasızdır */
      if (sonSutTaraf !== null && tf === sonSutTaraf) {
        const arada = events.slice(sonSutIx + 1, i).some(x => /^(reb|steal|turnover|foul|free|sub|timeout|quarter_start|quarter_end|ihlal24|hucumFaulu|ihlal|tac|mola)$/.test(x.type || ''));
        if (!arada) { r.ardisikAyniTakimSutu++; if(process.argv.includes('--why')) console.log('ARDISIK:', events.slice(Math.max(0,sonSutIx),i+1).map(x=>x.type+'|q'+x.q+'|'+String(x.text||'').replace(/<[^>]*>/g,'').slice(0,70)).join('  ||  ')); }
      }
      /* ribaundsuz taraf değişimi: kaçan şuttan sonra karşı taraf şut atıyorsa arada reb olmalı */
      if (sonSutTaraf !== null && tf !== null && tf !== sonSutTaraf && KACAN.has(events[sonSutIx].type)) {
        const arada = events.slice(sonSutIx + 1, i).some(x => /^(reb|steal|turnover)$/.test(x.type || ''));
        if (!arada) r.rebsizTarafDegisimi++;
      }
      sonSutTaraf = tf; sonSutIx = i;
    }
    /* F13-9: "köşe" ifadesi yalnız corner3 bölgesinde geçmeli (bölge adı metinden değil
       shot.zone'dan türetilir). */
    if (SUT.has(t) && e.shot && e.shot.kind === '3') {
      const koseMetin = /köşe/i.test(tx);
      if (koseMetin) { r.koseIddia++; if (e.shot.zone !== 'corner3') r.koseYanlis++; }
    }
    if (t === 'reb') r.reb++;
    /* Kaçan SON serbest atış da ribaund üretir (canlı top) — kaçan şut sayımına dahildir. */
    if (t === 'free' && Array.isArray(e.shots) && e.shots.length) {
      const son = e.shots[e.shots.length - 1];
      if (son && son.made === false) r.kacan++;
    }
    /* Yalnız GERÇEK çalma olayları (type='steal') yargılanır; "adım ihlali / çift top" gibi
       savunmacısız top kayıpları iki taraflı anlatılamaz, ölçüye girmemeli. */
    if (t === 'steal') {
      r.steal++;
      /* İki taraflı = satırda EN AZ İKİ oyuncu adı geçiyor (kaybeden + kapan). Anahtar
         sözcük listesi yerine ad sayısı: kalıplar çeşitlendikçe ölçü bozulmasın. */
      /* Ad kalıbı Unicode büyük harfle kurulur: "LaMelo Lewis", "Nikola Jokić", "Đorđe Šarić"
         gibi adlar dar bir [A-ZÇĞİÖŞÜ] sınıfıyla kaçıyordu (ölçü yanlış düşük çıkıyordu). */
      /* FAZ 25 §7.4a: anlatım artık kısa ad kullanıyor; eski 'Ad Soyad' kalıbı 795
         satırın hiçbirini yakalamıyordu (0/795). Niyet iki tarafın da anılması. */
      if (KAPI.adlariBul(tx, KADRO_ADLARI).length >= 2) r.stealCiftTarafli++;
    }
    /* FAZ 25 §7.4d: satır künye ('Faul — X (kişisel 2)') YA DA cümle ('X'in ikinci
       faulü') biçiminde olabilir; kapının niyeti biçim değil, faulü yapanın anılması ve
       sayacın atlamaması.
       ⚠ Kapsam da düzeltildi: eski koşul 'Faul —' arıyordu, bu yüzden serbest atış
       (type='free') ve and-1 satırlarındaki CÜMLE biçimli fauller sayaca hiç girmiyor,
       araya giren faul görünmediği için sayaç 1→3 atlıyormuş gibi okunuyordu. */
    const fo = /faul/i.test(tx) ? KAPI.foulOku(tx) : null;
    if (fo || (t === 'foul' && /faul/i.test(tx))) {
      r.foul++;
      if (fo) {
        r.foulAdli++;
        if (foulSay[fo.ad] != null && fo.no > foulSay[fo.ad] + 1) r.foulAtlama++;
        foulSay[fo.ad] = fo.no;
      }
    }
    if (/devre aras/i.test(tx)) r.devreArasi++;
    if (/nefes|yorgun|bacakları|enerjisi/i.test(tx)) r.enerjiSatiri++;

    /* seri iddiası: "N-0'lık seri" */
    const sm = /(\d+)-0'?l[ıi]k seri/i.exec(tx);
    if (e.home !== undefined) {
      const dh = e.home - oncekiHome, da = e.away - oncekiAway;
      if (dh > 0 && da === 0) { if (seriTakim === 'h') seriSayi += dh; else { seriTakim = 'h'; seriSayi = dh; } }
      else if (da > 0 && dh === 0) { if (seriTakim === 'a') seriSayi += da; else { seriTakim = 'a'; seriSayi = da; } }
      else if (dh > 0 && da > 0) { seriTakim = null; seriSayi = 0; }
      oncekiHome = e.home; oncekiAway = e.away;
    }
    if (sm) {
      r.seriIddia++;
      if (Math.abs(Number(sm[1]) - seriSayi) > 2) r.seriYanlis++;
    }
  });
  return r;
}

(async () => {
  console.log('CANLI MAÇ ANLATIMI DENETİMİ (FAZ 13)\n' + '='.repeat(66));
  const ctx = ortamKur();
  const ev = kadroUret(ctx, SEED0 ^ 0x1111);
  const dep = kadroUret(ctx, SEED0 ^ 0x2222);
  kadroAdlariniDoldur([ev, dep]);

  const tumEvents = [];   /* FAZ 25 §8 dil kapıları için (yalın kopya) */
  const TOPK = new Map();
  const T = { sut: 0, kacan: 0, reb: 0, foul: 0, foulAdli: 0, steal: 0, stealCiftTarafli: 0,
    rebsizTarafDegisimi: 0, ardisikAyniTakimSutu: 0, seriIddia: 0, seriYanlis: 0, devreArasi: 0,
    foulAtlama: 0, enerjiSatiri: 0, koseIddia: 0, koseYanlis: 0, olay: 0, benzersiz: 0, qFazla: 0, yonHata: 0, mac: 0 };
  for (let i = 0; i < N; i++) {
    const m = ctx.__api.simulateMatch({
      homeRoster: ev, awayRoster: dep, homeName: 'Ev Kartalları', awayName: 'Deplasman Kurtları',
      seed: SEED0 + i,
    });
    (m.events||[]).forEach(e=>{ if(e&&e.text) tumEvents.push({type:e.type,text:e.text,preText:e.preText,chain:e.chain,ftPre:e.ftPre,ftRes:e.ftRes,q:e.q,t:e.t,shot:e.shot,pozIx:e.pozIx,dtPos:e.dtPos}); });
    const r = analizEt(m.events);
    ['sut', 'kacan', 'reb', 'foul', 'foulAdli', 'steal', 'stealCiftTarafli', 'rebsizTarafDegisimi',
      'ardisikAyniTakimSutu', 'seriIddia', 'seriYanlis', 'devreArasi', 'foulAtlama', 'enerjiSatiri', 'koseIddia', 'koseYanlis', 'olay']
      .forEach(k => { T[k] += r[k]; });
    T.benzersiz += r.kalip.size;
    for(const [k,v] of r.kalip) TOPK.set(k,(TOPK.get(k)||0)+v);
    [1, 2, 3, 4].forEach(q => { if (r.qDt[q] > 600) T.qFazla++; });
    if (process.argv.includes('--top') && i === N - 1) {
      Array.from(TOPK.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12)
        .forEach(([k, v]) => console.log(String(v).padStart(5), k.slice(0, 110)));
    }
    /* F13-10: Q1-Q2 yönü ile Q3-Q4 yönü FARKLI olmalı (devre arası saha değişimi) */
    const y12 = Array.from(new Set([...r.yonQ[1], ...r.yonQ[2]])).sort().join(',');
    const y34 = Array.from(new Set([...r.yonQ[3], ...r.yonQ[4]])).sort().join(',');
    if (y12 && y34 && y12 === y34) T.yonHata++;
    T.mac++;
  }

  console.log(`\n[Ölçüm] ${T.mac} maç · ${T.olay} olay · ${T.sut} şut · ${T.kacan} kaçan · ${T.reb} ribaund olayı`);

  console.log('\n[A] Ribaund ve akış');
  /* ── FAZ 36 §B1: RUTİN SAVUNMA RİBAUNDU ANLATILMAZ ─────────────────────────────────
     F13-1'in kapısı 'her kaçan şutun ribaundu anlatılsın' diyordu (kaçan ≈ ribaund olayı,
     ribaundsuz taraf değişimi = 0). O kural kopukluğu çözdü ama tersine düştü: canlıda
     256 satırın 69'u (%27) ribaund/top değişimiydi ve anlatım istatistik akışı gibi
     okunuyordu. Gerçek spiker rutin savunma ribaundunu GEÇER.
     Kapı niyeti değişti, ölçüsü de: (a) ribaund satırlarının payı %8-11 bandında olsun,
     (b) HÜCUM ribaundu (ikinci şans) hiçbir zaman sessiz geçmesin — bu, aşağıdaki
     'açıklamasız ardışık aynı-takım şutu' kapısının tam olarak ölçtüğü şeydir.
     ⚠ İstatistik DEĞİŞMEZ: ribaunt kutuya yazılmaya devam eder, kapı yalnız ANLATIM
     satırının basılıp basılmadığını yargılar. */
  const rebOran = 100 * T.reb / Math.max(1, T.olay);
  ok('ribaund satırı oranı %8-11 (rutin savunma ribaundu sessiz)', rebOran >= 8 && rebOran <= 11,
    `%${rebOran.toFixed(1)} (${T.reb}/${T.olay}) · maç başına kaçan ${(T.kacan / T.mac).toFixed(1)} · ribaund satırı ${(T.reb / T.mac).toFixed(1)}`);
  ok('hücum ribaundu daima anlatılıyor (ikinci şansa sessiz geçiş yok)',
    T.ardisikAyniTakimSutu === 0,
    `sessiz ikinci şans ${T.ardisikAyniTakimSutu} · sessiz geçen savunma ribaundu ${T.rebsizTarafDegisimi} (tasarım gereği)`);
  ok('açıklamasız ardışık aynı-takım şutu yok', T.ardisikAyniTakimSutu === 0, `${T.ardisikAyniTakimSutu} vaka`);

  console.log('\n[B] Sayısal tutarlılık');
  ok('N-0 seri iddiası skorla tutuyor', T.seriYanlis === 0,
    `${T.seriIddia} iddia · ${T.seriYanlis} tutmayan`);
  ok('çeyrek süresi 600 sn aşılmıyor', T.qFazla === 0, `${T.qFazla} çeyrek aştı`);
  ok('"köşe üçlüğü" gerçekten köşeden', T.koseYanlis === 0, `${T.koseIddia} iddia · ${T.koseYanlis} yanlış`);

  console.log('\n[C] Faul ve top kaybı anlatımı');
  ok('faul satırlarının %100\'ünde oyuncu adı + kişisel faul',
    T.foul === 0 || T.foulAdli / T.foul >= 0.999,
    `${T.foulAdli}/${T.foul} satır (%${T.foul ? (100 * T.foulAdli / T.foul).toFixed(0) : 0})`);
  ok('faul sayacı atlamıyor', T.foulAtlama === 0, `${T.foulAtlama} atlama`);
  ok('top çalma iki taraflı anlatılıyor',
    T.steal === 0 || T.stealCiftTarafli / T.steal >= 0.95,
    `${T.stealCiftTarafli}/${T.steal}`);

  console.log('\n[D] Zenginlik ve yön');
  const oran = T.benzersiz / T.olay;
  /* FAZ 17 ÖLÇÜM DÜZELTMESİ — okurken dikkat: bu oran ÖNCE şişiyordu. İsim silme kalıbı
     ASCII+TR harflerine bakıyordu, bu yüzden č/ć/š/ž/ū geçen soyadları (Jokić, Šarić,
     Valančiūnas…) yarım siliniyor ve artan harf her satırı "benzersiz kalıp" yapıyordu —
     ölçülen şey şablon çeşitliliği değil, oyuncu adı çeşitliliğiydi.
     Kalıp Unicode'a çevrilince gerçek değerler: FAZ 16 tabanı %82,5 · FAZ 17 %82,7.
     Yani %85 kapısı hiçbir zaman gerçekten geçilmemişti; eksik anlatım şablonu sayısındadır
     ve FAZ 13'ten kalmadır (FAZ 17 gerilemesi DEĞİL — FAZ 17 taban değerin bir tık üstünde).
     Kapı bilerek düşürülmedi: doldurulacak açık burada görünsün. */
  ok('benzersiz kalıp / olay ≥ %85', oran >= 0.85, `%${(100 * oran).toFixed(1)}`);
  ok('devre arası ayrı kalıp var', T.devreArasi >= T.mac, `${T.devreArasi} satır / ${T.mac} maç`);
  ok('enerji/yorgunluk anlatılıyor', T.enerjiSatiri > 0, `${T.enerjiSatiri} satır`);
  ok('devre arasında saha değişiyor (Q1-2 yönü ≠ Q3-4)', T.yonHata === 0, `${T.yonHata} maçta değişmedi`);

  // ── F13-14: sekme donması (tarayıcı gerekir) ────────────────────────────────────────────
  if (FREEZE) {
    console.log('\n[E] F13-14 — sekme arka plana alınınca maç donuyor mu?');
    const http = require('http');
    const { chromium } = require('playwright');
    const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.css': 'text/css; charset=utf-8' };
    const server = await new Promise(res => {
      const s = http.createServer((q, r) => {
        let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/charazay2.0.html';
        const f = path.join(ROOT, u);
        if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
        r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
        fs.createReadStream(f).pipe(r);
      });
      s.listen(0, '127.0.0.1', () => res(s));
    });
    const base = 'http://127.0.0.1:' + server.address().port;
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const p = await c.newPage();
      const hatalar = [];
      p.on('pageerror', e => hatalar.push(e.message));
      await p.goto(base + '/charazay2.0.html?test=1', { waitUntil: 'domcontentloaded' });
      await p.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
      await p.click('#loginPage button.btn-p');
      await p.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
      await p.fill('#teamName', 'Donma Testi');
      await p.click('#setupPage button.btn-p');
      await p.waitForSelector('#app', { state: 'visible', timeout: 8000 });
      await p.evaluate(() => { try { closeAppModal(); } catch (e) {} });
      await p.evaluate(() => showPage('mac', document.querySelector('#sbNav button[data-page="mac"]')));
      /* Maç başı akışı: kaç düdük çalıyor ve ilk aksiyona kadar ne kadar ölü zaman var?
         (37. oturum kullanıcı bildirimi: "düdük çalıyor, herkes sabit kalıyor, sonra bir
         düdük daha". Sebep: start/quarter_start olaylarında `dt` yoktu → oynatma 12 sn
         varsayıp her biri için 3,6 sn bekliyordu; üstüne 1. çeyrek düdüğü ikinci kez çalıyordu.) */
      await p.evaluate(() => {
        window.__sfx = [];
        const eski = window.sfx;
        window.sfx = function (k) { window.__sfx.push(k); try { return eski.apply(this, arguments); } catch (e) {} };
        window.__ev = [];
        window.__t0 = Date.now();
        window.__izle = setInterval(() => {
          if (typeof mState === 'undefined' || !mState || !mState.events) return;
          for (let i = window.__ev.length; i < mState.idx; i++) {
            window.__ev.push({ type: mState.events[i].type, ms: Date.now() - window.__t0 });
          }
        }, 50);
        setMatchRate(1); startMatch();
      });
      await new Promise(r => setTimeout(r, 9000));
      const acilis = await p.evaluate(() => {
        clearInterval(window.__izle);
        const ilkSut = window.__ev.find(e => /^(score2|score3|miss2|miss3|free|steal)$/.test(e.type));
        return {
          duduk: window.__sfx.filter(k => k === 'whistle').length,
          ilkAksiyonMs: ilkSut ? ilkSut.ms : -1,
          zincir: window.__ev.slice(0, 4).map(e => e.type + '@' + (e.ms / 1000).toFixed(1)).join(' → '),
        };
      });
      ok('maç başında TEK düdük çalıyor', acilis.duduk === 1, `${acilis.duduk} düdük`);
      ok('açılışta ölü bekleme yok (ilk aksiyon < 6 sn)',
        acilis.ilkAksiyonMs > 0 && acilis.ilkAksiyonMs < 6000,
        `${(acilis.ilkAksiyonMs / 1000).toFixed(1)} sn · ${acilis.zincir}`);

      await new Promise(r => setTimeout(r, 2500));
      const once = await p.evaluate(() => ({ idx: mState.idx, running: mState.running }));

      /* Sekmeyi arka plana al ve bekle */
      const bos = await c.newPage(); await bos.goto('about:blank'); await bos.bringToFront();
      await new Promise(r => setTimeout(r, 12000));
      const gizliyken = await p.evaluate(() => ({ idx: mState.idx, running: mState.running }));
      await p.bringToFront(); await bos.close();
      /* Tek bir olayın koreografisi 1× hızda 6-7 sn sürebiliyor; sabit 3,5 sn beklemek
         "ilerlemedi" gibi görünüyordu. İlerleme İÇİN beklenir (en fazla 12 sn). */
      const sonra = await p.evaluate(async (baslangic) => {
        const t0 = Date.now();
        while (Date.now() - t0 < 12000 && mState.idx <= baslangic) {
          await new Promise(r => setTimeout(r, 400));
        }
        return {
          idx: mState.idx, running: mState.running, toplam: mState.events.length,
          btn: (document.getElementById('startMatchBtn') || {}).textContent || '',
        };
      }, gizliyken.idx);
      ok('sekmeye dönünce maç ilerlemeye devam ediyor', sonra.idx > gizliyken.idx,
        `gizliyken ${gizliyken.idx} → dönüşte ${sonra.idx} (toplam ${sonra.toplam})`);
      ok('dönüşte oynatma canlı', sonra.running === true || sonra.idx >= sonra.toplam,
        `running=${sonra.running}`);

      /* Bayrak elle düşürülünce (donma senaryosu) kurtarma çalışıyor mu? */
      const kurtarma = await p.evaluate(async () => {
        mState.running = false;
        if (typeof matchEventTimer !== 'undefined' && matchEventTimer) { clearTimeout(matchEventTimer); matchEventTimer = null; }
        const oncekiIdx = mState.idx;
        const donmus = (typeof canResumeMatch === 'function') ? canResumeMatch() : null;
        await new Promise(r => setTimeout(r, 2600));            /* bekçi görsün */
        const btn = (document.getElementById('startMatchBtn') || {}).textContent || '';
        if (typeof resumeMatch === 'function') resumeMatch();
        /* Sürdükten sonra bir sonraki olay 1× hızda birkaç saniye sürebilir — ilerleme beklenir. */
        const t0 = Date.now();
        while (Date.now() - t0 < 10000 && mState.idx <= oncekiIdx) {
          await new Promise(r => setTimeout(r, 400));
        }
        return { donmus, btn, oncekiIdx, yeniIdx: mState.idx, running: mState.running };
      });
      ok('donmuş maç tespit ediliyor (canResumeMatch)', kurtarma.donmus === true);
      ok('donmuş maçta buton "Devam et" diyor', /Devam et|Resume/i.test(kurtarma.btn), kurtarma.btn.trim());
      ok('resumeMatch maçı sürdürüyor', kurtarma.yeniIdx > kurtarma.oncekiIdx && kurtarma.running === true,
        `${kurtarma.oncekiIdx} → ${kurtarma.yeniIdx}`);

      /* F13-18: sayfa değiştirip dönünce panel korunuyor mu? */
      const panel = await p.evaluate(async () => {
        const oku = () => (document.getElementById('boxScoreBodymac') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim();
        const ad = () => (document.getElementById('bsAwayNamemac') || { textContent: '' }).textContent.trim();
        const once = { govde: oku(), rakip: ad() };
        showPage('lig', document.querySelector('#sbNav button[data-page="lig"]'));
        await new Promise(r => setTimeout(r, 350));
        showPage('kadro', document.querySelector('#sbNav button[data-page="kadro"]'));
        await new Promise(r => setTimeout(r, 350));
        showPage('mac', document.querySelector('#sbNav button[data-page="mac"]'));
        await new Promise(r => setTimeout(r, 450));
        return { once, sonra: { govde: oku(), rakip: ad() } };
      });
      /* Ölçüt "panel DONMUŞ mu" değil "panel SIFIRLANMIŞ mı" olmalı: maç sayfa değişimi
         sırasında da akmaya devam ettiği için kutu skor gövdesi meşru olarak değişebilir
         (bu denetim o yüzden ara sıra sebepsiz kırmızı yanıyordu). Gerileme belirtisi
         gövdenin BOŞALMASI ve rakip adının kaybolmasıdır. */
      ok('sayfa değişince maç içi panel sıfırlanmıyor (F13-18)',
        !!panel.sonra.govde && panel.sonra.govde.length >= Math.min(20, panel.once.govde.length) &&
        panel.sonra.rakip === panel.once.rakip,
        `rakip "${panel.once.rakip}" → "${panel.sonra.rakip}" · gövde ${panel.once.govde.length} → ${panel.sonra.govde.length} krk`);
      /* F16-B: CANLI DOM'da ardışık aynı anlatım satırı OLMAMALI. Canlı testte aynı cümle
         iki kez basılmıştı; motor temiz olduğu için hata sunum katmanındaydı. Ayrıca
         kullanıcı eylemleri (taktik) bilerek tekrarlanabilir — bastırılmadıkları sınanır. */
      const log = await p.evaluate(async () => {
        const oku = () => Array.prototype.map.call(
          document.querySelectorAll('#commentary .ci'),
          e => (e.textContent || '').replace(/s+/g, ' ').trim()).filter(Boolean);
        const satirlar = oku();
        let ardisik = 0, ornek = '';
        for (let i = 1; i < satirlar.length; i++) {
          if (satirlar[i] === satirlar[i - 1]) { ardisik++; if (!ornek) ornek = satirlar[i]; }
        }
        /* Aynı taktik iki kez uygulanınca İKİ satır basılmalı (tekillik onları susturmamalı). */
        const once = oku().length;
        try { setLiveTactic('tempo', 'hizli'); } catch (e) {}
        await new Promise(r => setTimeout(r, 120));
        try { setLiveTactic('tempo', 'hizli'); } catch (e) {}
        await new Promise(r => setTimeout(r, 120));
        return { n: satirlar.length, ardisik, ornek, taktikArtis: oku().length - once };
      });
      ok('canlı logda ardışık aynı satır yok (F16-B)', log.ardisik === 0,
        `${log.n} satır · ardışık tekrar ${log.ardisik}${log.ornek ? ' — "' + log.ornek.slice(0, 60) + '"' : ''}`);
      ok('kullanıcı eylemi tekrarı bastırılmıyor (F16-B)', log.taktikArtis >= 2,
        `aynı taktik 2 kez → ${log.taktikArtis} satır`);
      /* 37. oturum: parkenin üzerinde O/X şut izi KALMAMALI (kullanıcı isteği). */
      const izler = await p.evaluate(() => {
        const svg = document.getElementById('courtSvg');
        if (!svg) return { yok: true };
        const metinler = Array.from(svg.querySelectorAll('text')).map(t => (t.textContent || '').trim());
        return { ox: metinler.filter(t => t === 'O' || t === 'X').length, katman: !!document.getElementById('shotsLayer') };
      });
      ok('parkede O/X şut izi yok', !izler.yok && izler.ox === 0 && !izler.katman,
        izler.yok ? 'saha bulunamadı' : `${izler.ox} işaret · shotsLayer ${izler.katman ? 'var' : 'yok'}`);
      ok('donma testinde konsol hatası yok', hatalar.length === 0, hatalar.slice(0, 2).join(' | '));
      await p.evaluate(() => { try { stopMatch(); } catch (e) {} });
    } finally { await browser.close(); server.close(); }
  } else {
    console.log('\n  ℹ F13-14 (sekme donması) testi için: node tools/anlatim-check.js --freeze');
  }

  /* ── FAZ 25 §8: DİL VE ÜSLUP KAPILARI ────────────────────────────────────────────
     FAZ 13 ölçümleri yukarıda (tutarlılık); buradakiler dilin KENDİSİNİ ölçer.
     Ayrı dosyada (tools/_lib/anlatim-kapilari.js) durur ki hangi ölçümün hangi
     brifden geldiği kaybolmasın. */
  console.log(String.fromCharCode(10)+"── FAZ 25: dil ve üslup ──");
  const K = require('./_lib/anlatim-kapilari.js').olcumler(tumEvents, N);
  ok('Türkçe ek uyumu hatası yok', K.ekHata.length === 0,
     K.ekHata.length ? K.ekHata.slice(0, 4).join(' | ') : `${K.olay} olay tarandı`);
  ok('failsiz anlatım satırı yok', K.failsiz.length === 0,
     K.failsiz.length ? K.failsiz.slice(0, 3).join(' | ') : 'oyun olaylarının hepsinde fail var');
  ok('saat referansı %6-14', K.saatOran >= 0.06 && K.saatOran <= 0.14,
     `%${(K.saatOran * 100).toFixed(1)} (${K.saat}/${K.olay})`);
  ok('4Ç son 3 dk ton satırı ≥3/maç', K.tonMac >= 3,
     `${K.tonMac.toFixed(1)}/maç (${K.ton} satır)`);
  /* ── FAZ 37 §3/§12.4: ZİNCİR ORANI KAPISI YERİNİ AD KAPISINA BIRAKTI ──────────────
     FAZ 25 §7.4a zincir oranını %50-60 bandında istiyordu çünkü kısa parçalı ritim o
     zaman İSTEĞE BAĞLI bir daldı. FAZ 37 ile ritim YAPISAL oldu: her şut kurulum +
     sonuç olarak iki beate bölünüyor, yani oran tanımı gereği %100. Ölçülecek şey
     değişti: kurulum beati şutörün adını HER ZAMAN taşımalı (§4.4), yoksa sonuç beati
     öznesiz kalır ve kimin attığı kaybolur. */
  {
    const sutlar = tumEvents.filter(e => e.shot);
    const AD_RE2 = /\p{Lu}[\p{L}’']+/u;
    const adsiz = sutlar.filter(e => !e.preText || !AD_RE2.test(String(e.preText)));
    ok("her şut olayında ön parça şutörün adını taşıyor", adsiz.length === 0,
       (sutlar.length - adsiz.length) + "/" + sutlar.length + (adsiz.length ? " · ör. " + String(adsiz[0].preText).slice(0, 70) : ""));
  }

  ok('ortalama olay kelime sayısı <9', K.kelimeOrt < 9, K.kelimeOrt.toFixed(2));
  ok('yabancı terim geçmiyor', Object.keys(K.yabanci).length === 0,
     Object.keys(K.yabanci).length ? JSON.stringify(K.yabanci) : 'spacing/box-out/drive/roll/AND-1 yok');
  ok('"hepsi içeride" ≤4/maç', K.hepsiIceridMac <= 4, `${K.hepsiIceridMac.toFixed(1)}/maç`);
  ok('künye biçimli faul satırı ≤%50', K.foulKunyeOran <= 0.50,
     `%${(K.foulKunyeOran * 100).toFixed(1)} (${K.foulKunye}/${K.foul})`);
  ok('anlatım-saha çelişmesi yok', K.celiski.length === 0,
     K.celiski.length ? K.celiski.slice(0, 3).join(' | ') : 'köşe/post/yakınlık iddiaları sahayla uyumlu');

  /* ── FAZ 28 §2: DEYİM VE YÜKLEM ────────────────────────────────────────────────── */
  console.log(String.fromCharCode(10)+"── FAZ 28: deyim ve yüklem ──");
  ok('anlatımda "servis" kelimesi geçmiyor (basketbol terimi değil)', K.servis.length === 0,
     K.servis.length ? K.servis.slice(0, 3).join(' | ') : `${K.olay} olay tarandı`);
  ok('kara listedeki deyim hataları yok', K.kara.length === 0,
     K.kara.length ? K.kara.slice(0, 3).join(' | ')
                   : '"demire geldi" · "turnike dönmedi" · "smacı tutmadı" yok');
  ok('fiilsiz anlatım cümlesi <%5', K.fiilsizOran < 0.05,
     `%${(K.fiilsizOran * 100).toFixed(2)} (${K.fiilsizN}/${K.cumle} cümle)` +
     (K.fiilsiz.length ? ' · ör. ' + K.fiilsiz.slice(0, 3).map(x => '"' + x + '"').join(' ') : ''));

  /* Havuz zenginliği: sınıf başına ≥8 ifade. Motor sabitlerini VM bağlamından okur. */
  const _KAPI = require('./_lib/anlatim-kapilari.js');
  const _ifade = _KAPI.sutIfadeSayisi(ctx);
  const _sinif = ['smac', 'turnike', 'floater', 'kanca', 'tipin'];
  const _eksik = _sinif.filter(k => (_ifade[k] || 0) < 8);
  ok('her şut sınıfı için havuzda ≥8 ifade var', _eksik.length === 0,
     _sinif.map(k => `${k} ${_ifade[k] || 0}`).join(' · ') +
     (_eksik.length ? ' — eksik: ' + _eksik.join(', ') : ''));

  /* ── FAZ 29: HER ANLATIM SATIRININ İNGİLİZCESİ VAR MI? ─────────────────────────────
     FAZ 28'de Türkçe satırlar KISALTILDI (kelime bütçesi); anahtar değişince sözlükteki
     eski girişler ölü kaldı ve EN oyuncu o satırları Türkçe gördü (canlıda %9,1).
     Bu kapı havuzları sözlükle karşılaştırır — çeviri unutması bir daha canlıda
     keşfedilmesin. */
  console.log(String.fromCharCode(10)+"── FAZ 29: anlatım çevirisi ──");
  const _i18n = ctx.__i18n || {dict:null,havuz:{}};
  const _eksikEN = [];
  (function bak(v){
    if (typeof v === 'string') {
      if (v.trim() && _i18n.dict && !Object.prototype.hasOwnProperty.call(_i18n.dict, v)) _eksikEN.push(v);
      return;
    }
    if (Array.isArray(v)) { v.forEach(bak); return; }
    if (v && typeof v === 'object') Object.keys(v).forEach(k => bak(v[k]));
  })(_i18n.havuz);
  ok('her anlatım havuzu satırının EN karşılığı var', _eksikEN.length === 0,
     _eksikEN.length ? _eksikEN.slice(0,5).map(x=>JSON.stringify(x)).join(' | ')
                     : 'SUT_LINES · KISA_CEKIRDEK(_SUT) · AKIS_ON · SON_BOLUM · SAAT · SPIKER · ASSIST tarandı');

  /* ── FAZ 33 §2: YABANCI ADLARDA ÇEKİM EKİ ──────────────────────────────────────
     turkEk() YAZILIŞA bakıyordu, OKUNUŞA değil. Lig küreselleşince yanlış ek üretmeye
     başladı ve canlıda ölçüldü: "Đurašković'de" (doğrusu 'te — ć Türkçede ç, sert),
     "Sy'a" (doğrusu 'ye — "Si" okunur, y burada ünlü). Tablo, canlı kadrodan gelen
     20 adın DÖRT durumunu birden sınar; biri bile kayarsa kapı düşer. */
  console.log(String.fromCharCode(10)+"── FAZ 33: yabancı adlarda çekim eki ──");
  {
    const tEk = ctx.__api.turkEk;
    /* Beklenen çıktılar Türkçe okunuşa göre elle doğrulanmıştır (brif §2.4). */
    const BEKLENEN = {
      'Đurašković': ["Đurašković'e", "Đurašković'te", "Đurašković'ten", "Đurašković'in"],
      'Núñez':      ["Núñez'e", "Núñez'de", "Núñez'den", "Núñez'in"],
      'Mihaylov':   ["Mihaylov'a", "Mihaylov'da", "Mihaylov'dan", "Mihaylov'un"],
      'Gyenge':     ["Gyenge'ye", "Gyenge'de", "Gyenge'den", "Gyenge'nin"],
      'Méndez':     ["Méndez'e", "Méndez'de", "Méndez'den", "Méndez'in"],
      'Scholz':     ["Scholz'a", "Scholz'da", "Scholz'dan", "Scholz'un"],
      'Milewski':   ["Milewski'ye", "Milewski'de", "Milewski'den", "Milewski'nin"],
      'Sy':         ["Sy'ye", "Sy'de", "Sy'den", "Sy'nin"],
      'Ba':         ["Ba'ya", "Ba'da", "Ba'dan", "Ba'nın"],
      'Ka':         ["Ka'ya", "Ka'da", "Ka'dan", "Ka'nın"],
      'Lo':         ["Lo'ya", "Lo'da", "Lo'dan", "Lo'nun"],
      'Ng':         ["Ng'e", "Ng'de", "Ng'den", "Ng'in"],
      'Wu':         ["Wu'ya", "Wu'da", "Wu'dan", "Wu'nun"],
      'Öz':         ["Öz'e", "Öz'de", "Öz'den", "Öz'ün"],
      'Ávila':      ["Ávila'ya", "Ávila'da", "Ávila'dan", "Ávila'nın"],
      'Morin':      ["Morin'e", "Morin'de", "Morin'den", "Morin'in"],
      'Mokin':      ["Mokin'e", "Mokin'de", "Mokin'den", "Mokin'in"],
      'Kowalski':   ["Kowalski'ye", "Kowalski'de", "Kowalski'den", "Kowalski'nin"],
      'Ivanović':   ["Ivanović'e", "Ivanović'te", "Ivanović'ten", "Ivanović'in"],
      'Nakamura':   ["Nakamura'ya", "Nakamura'da", "Nakamura'dan", "Nakamura'nın"]
    };
    const DURUM = ['e', 'de', 'den', 'in'];
    const hata = [];
    let toplam = 0;
    Object.keys(BEKLENEN).forEach(ad => {
      DURUM.forEach((d, i) => {
        toplam++;
        const c = tEk ? tEk(ad, d) : '';
        if (c !== BEKLENEN[ad][i]) hata.push(`${ad}[${d}] → ${c} (beklenen ${BEKLENEN[ad][i]})`);
      });
    });
    ok(`20 yabancı adın 4 durumu doğru (${toplam - hata.length}/${toplam})`, hata.length === 0,
      hata.length ? hata.slice(0, 6).join(' | ') : `${toplam} kapı`);

    /* 43 ülkeden 5'er ad: üretilen ekin ünlüsü, adın SON ünlüsüyle uyumlu olmalı.
       Bu kapı beklenen çıktı listesi tutmaz — kuralı sınar, dolayısıyla havuz
       büyüdükçe kendiliğinden kapsar. */
    const NP = ctx.__api.NAME_POOLS || {};
    const ulkeler = Object.keys(NP);
    const KALIN = 'aıouâû', INCE = 'eiöüî';
    const ihlal = [];
    let denenen = 0;
    ulkeler.forEach(u => {
      const pool = NP[u]; if (!pool || !pool.ilk || !pool.sy) return;
      for (let k = 0; k < 5; k++) {
        /* prPick hash'ten türer — rastgelelik TÜKETMEZ (F13-3/B-5 kuralı). */
        const ad = ctx.__api.prPick(u + '|f33|ilk|' + k, pool.ilk) + ' ' +
                   ctx.__api.prPick(u + '|f33|sy|' + k, pool.sy);
        DURUM.forEach(d => {
          denenen++;
          const c = tEk(ad, d);
          const ek = c.slice(c.lastIndexOf("'") + 1);
          /* Ekin İLK ünlüsü, adın okunuşundaki son ünlünün kalınlık/incelik sınıfında olmalı. */
          let ekUnlu = null;
          for (const ch of ek) { if (KALIN.indexOf(ch) >= 0 || INCE.indexOf(ch) >= 0) { ekUnlu = ch; break; } }
          if (ekUnlu == null) { ihlal.push(ad + '[' + d + '] → ek ünlüsüz: ' + c); return; }
          /* Referans: turkEk'in kendi okunuş kararı — 'a/e' düz ek üzerinden okunur. */
          const ref = tEk(ad, 'e');
          const refEk = ref.slice(ref.lastIndexOf("'") + 1);
          const refKalin = refEk.indexOf('a') >= 0;
          const ekKalin = KALIN.indexOf(ekUnlu) >= 0;
          if (refKalin !== ekKalin) ihlal.push(ad + '[' + d + '] → ' + c + ' (yönelme: ' + ref + ')');
        });
      }
    });
    ok(`${ulkeler.length} ülke × 5 ad — ünlü uyumu ihlali yok (${denenen} ek)`, ihlal.length === 0,
      ihlal.length ? ihlal.slice(0, 5).join(' | ') : `${denenen} ek üretildi`);
  }

  /* ── FAZ 28 §4: ARDIŞIK OLAY DAMGASI ───────────────────────────────────────────── */
  console.log(String.fromCharCode(10)+"── FAZ 28: olay saati ──");
  const _cak = _KAPI.damgaCakismasi(tumEvents);
  ok('ardışık iki olayın damgası aynı değil', _cak.length === 0,
     _cak.length ? `${_cak.length} çakışma · ör. ${JSON.stringify(_cak.slice(0, 3))}`
                 : `${tumEvents.length} olay tarandı (duraklama olayları hariç)`);

  const dusen = sonuc.filter(s => !s.gecti);
  console.log('\n' + '='.repeat(66));
  console.log(`SONUÇ: ${sonuc.length - dusen.length}/${sonuc.length} denetim geçti`);
  if (dusen.length) { dusen.forEach(d => console.log('  ✗ ' + d.ad + (d.not ? ' — ' + d.not : ''))); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('HATA:', e); process.exit(1); });
