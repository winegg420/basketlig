#!/usr/bin/env node
/**
 * Charazay 2.0 — SAF NODE MAÇ SİMÜLASYONU (BÖLÜM 3 · KARAR-SUNUCU.md madde 3.0)
 *
 * Neyi kanıtlar: maç motoru artık **tarayıcısız** ve **küresel `G` olmadan** çalışıyor.
 * Sunucu tarafı simülasyonun ön koşulu buydu. Diğer ölçüm araçları (band, box-band,
 * season-loop) Playwright ile BAŞSIZ BİR TARAYICI açar — bu araç açmaz, düz Node'dur.
 *
 * Sözleşme (js/match-engine.js → simulateMatch):
 *     simulateMatch({ homeRoster, awayRoster, homeTactics, awayTactics, seed })
 *   · G okunmaz, DOM'a dokunulmaz
 *   · aynı `seed` → birebir aynı skor ve olay listesi
 *   · iki taraf da AYNI güç formülünden geçer (rakip artık "ad hash'i" değil, gerçek kadro)
 *
 * Çalıştırma:
 *   node tools/sim-node.js            → 50 maç oynatır, determinizmi sınar
 *   node tools/sim-node.js --n=200    → maç sayısı
 *   node tools/sim-node.js --seed=42  → taban tohum
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const arg = (ad, v) => { const m = process.argv.find(a => a.startsWith('--' + ad + '=')); return m ? Number(m.split('=')[1]) : v; };
const N = arg('n', 50);
const SEED0 = arg('seed', 987654321);

/* main.js YOKTUR: arayüz bağlantıları sunucuya gitmeyecek. Sıra charazay2.0.html ile aynı. */
const FILES = ['js/i18n.js', 'js/i18n-dict.js', 'js/i18n-commentary.js', 'js/state.js',
  'js/economy.js', 'js/persistence.js', 'js/portraits.js', 'js/roster-gen.js',
  'js/league.js', 'js/match-prep.js', 'js/render.js', 'js/match-engine.js'];

/** Tarayıcı yerine geçen en küçük yüzey — çizim kodu yüklenirken patlamasın diye. */
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
  doc.readyState = 'complete';
  doc.documentElement = el();
  doc.body = el();
  doc.head = el();
  doc.createElement = el;
  doc.createElementNS = el;
  doc.createTextNode = () => el();
  doc.createDocumentFragment = el;
  doc.getElementById = () => null;
  doc.getElementsByClassName = () => [];
  doc.getElementsByTagName = () => [];
  doc.createTreeWalker = () => ({ nextNode: () => null });
  doc.scripts = [];
  return doc;
}

function ortamKur() {
  const ctx = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, Error, RegExp, Map, Set,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, Promise,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    performance: { now: () => Date.now() },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 },
    navigator: { language: 'tr', userAgent: 'node' },
    location: { search: '', href: 'file:///node', protocol: 'file:', hostname: '' },
    indexedDB: null,
    MutationObserver: function () { return { observe() {}, disconnect() {} }; },
    NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 },
    AudioContext: null, webkitAudioContext: null,
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.self = ctx;
  ctx.document = sahteDom();
  ctx.addEventListener = () => {};
  vm.createContext(ctx);
  /* Dosyalar TEK script olarak birleştirilip bir kez çalıştırılır. Tarayıcıda klasik
     script'ler ortak bir "global sözlüksel ortam" paylaşır: bir dosyadaki top-level
     `const/let` diğerinden görünür. Node'un vm modülünde her `runInContext` çağrısı kendi
     sözlüksel kapsamını açar — dosyalar ayrı ayrı çalıştırılırsa `G`, `SPIKERS`, `POZLAR`
     gibi `const/let` bağları birbirini görmez. Birleştirme, tarayıcı davranışının aynısıdır. */
  const kaynak = FILES.map(f => '\n/* ==== ' + f + ' ==== */\n' + fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  /* Epilog: `const/let` bağları global nesneye düşmediği için gereken tutamaklar dışa verilir. */
  const epilog = `
;globalThis.__api = {
  simulateMatch: (typeof simulateMatch==='function') ? simulateMatch : null,
  genRoster: (typeof genRoster==='function') ? genRoster : null,
  computeRosterOfrDef: (typeof computeRosterOfrDef==='function') ? computeRosterOfrDef : null,
  gSnapshot: function(){ try{ return JSON.stringify({team:G.team,players:(G.players||[]).length,wins:G.wins,coins:G.coins}); }catch(e){ return 'yok'; } }
};`;
  try { vm.runInContext(kaynak + epilog, ctx, { filename: 'charazay-bundle.js' }); }
  catch (e) { console.error('✗ modüller yüklenemedi: ' + e.message); process.exit(1); }
  return { ctx, yuklenen: FILES.slice() };
}

function kadroUret(ctx, seed) {
  /* Kadro üretimi de tohumlanır ki iki koşu aynı takımları kursun. */
  const eski = ctx.Math.random;
  let a = seed >>> 0;
  ctx.Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return (ctx.__api.genRoster)(); } finally { ctx.Math.random = eski; }
}

(async () => {
  console.log('SAF NODE MAÇ SİMÜLASYONU (tarayıcı YOK)\n' + '='.repeat(60));
  const t0 = Date.now();
  const { ctx, yuklenen } = ortamKur();
  console.log(`✓ ${yuklenen.length} modül düz Node'da yüklendi (main.js hariç — arayüz katmanı)`);
  const api = ctx.__api || {};
  if (typeof api.simulateMatch !== 'function') { console.error('✗ simulateMatch bulunamadı'); process.exit(1); }

  const ev = kadroUret(ctx, SEED0 ^ 0x1111);
  const dep = kadroUret(ctx, SEED0 ^ 0x2222);
  console.log(`✓ iki gerçek kadro üretildi (${ev.length} + ${dep.length} oyuncu)`);

  /* G'ye hiç dokunulmadığını kanıtla: bağlam modunda motor G'yi okumamalı. */
  const gYedek = api.gSnapshot();

  const skorlar = [];
  let hata = 0;
  for (let i = 0; i < N; i++) {
    try {
      const r = api.simulateMatch({
        homeRoster: ev, awayRoster: dep,
        homeTactics: {}, awayTactics: {},
        homeName: 'Ev Kartalları', awayName: 'Deplasman Kurtları',
        seed: SEED0 + i,
      });
      skorlar.push([r.home, r.away, r.events.length]);
    } catch (e) { hata++; if (hata <= 2) console.error('  maç hatası:', e.message); }
  }
  const gSonra = api.gSnapshot();

  /* Determinizm: aynı tohum iki kez → birebir aynı */
  const a1 = api.simulateMatch({ homeRoster: ev, awayRoster: dep, homeName: 'A', awayName: 'B', seed: 4242 });
  const a2 = api.simulateMatch({ homeRoster: ev, awayRoster: dep, homeName: 'A', awayName: 'B', seed: 4242 });
  const ayni = a1.home === a2.home && a1.away === a2.away &&
    a1.events.length === a2.events.length &&
    JSON.stringify(a1.events.map(e => [e.type, e.home, e.away, e.t])) ===
    JSON.stringify(a2.events.map(e => [e.type, e.home, e.away, e.t]));
  const farkli = api.simulateMatch({ homeRoster: ev, awayRoster: dep, homeName: 'A', awayName: 'B', seed: 777 });

  const ort = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const evO = ort(skorlar.map(s => s[0])), depO = ort(skorlar.map(s => s[1]));
  const olayO = ort(skorlar.map(s => s[2]));

  console.log('\n' + '='.repeat(60));
  console.log(`maç sayısı        : ${skorlar.length}/${N} (hata ${hata})`);
  console.log(`ortalama skor     : ${evO.toFixed(1)} - ${depO.toFixed(1)}  · olay/maç ${olayO.toFixed(0)}`);
  console.log(`süre              : ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
  console.log(`aynı tohum aynı maç: ${ayni ? 'EVET' : 'HAYIR'}  (${a1.home}-${a1.away} ↔ ${a2.home}-${a2.away})`);
  console.log(`farklı tohum farklı: ${(farkli.home !== a1.home || farkli.away !== a1.away) ? 'EVET' : 'hayır (rastlantı olabilir)'}  (${farkli.home}-${farkli.away})`);
  console.log(`G durumu değişmedi : ${gYedek === gSonra ? 'EVET' : 'HAYIR'}`);

  const gecti = skorlar.length === N && hata === 0 && ayni && gYedek === gSonra &&
    evO > 55 && evO < 130 && depO > 55 && depO < 130;
  console.log('='.repeat(60));
  console.log(gecti ? '✓ saf Node simülasyonu çalışıyor ve deterministik' : '✗ kabul kapısı düştü');
  process.exit(gecti ? 0 : 1);
})();
