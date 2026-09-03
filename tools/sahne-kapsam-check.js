#!/usr/bin/env node
/**
 * Charazay 2.0 — SAHNE KAPSAM DENETÇİSİ (FAZ 40 · B5 + B6)
 *
 * İKİ SORU:
 *  [B5] Motorun ÜRETTİĞİ her olay türünün `movePlayersForEvent` içinde kendine ait bir
 *       sahnesi var mı? Tanımsız tür sondaki genel dala düşer; orada top KAYBEDEN takımda
 *       kalır ve çevresinde paslanır (düdük çalıyor, oyun durmuyor) — FAZ 39 §2.2'de
 *       maç başına 14,4 olay bu dala düşüyordu.
 *  [B6] `animateShotPossession`'ın döndürdüğü koreografi süresi olayın bütçesini aşıyor mu?
 *       `main.js`: delay = max(simMs, dtMs) — yani koreografi süresi ALT SINIRDIR ve
 *       yapısal olarak kesilemez. Bu bölüm o sözleşmenin hâlâ geçerli olduğunu ve
 *       koreografinin bütçeye göre ne kadar uzadığını RAPORLAR.
 *
 * Tarayıcısız: 14 modülü `sim-node`'un yükleyicisiyle düz Node'da çalıştırır.
 *
 * Kullanım: node tools/sahne-kapsam-check.js [--n=60] [--seed=42]
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? parseFloat(a.split('=')[1]) : d; };
const N = num('n', 60);
const SEED0 = num('seed', 42);

const FILES = ['js/i18n.js', 'js/i18n-dict.js', 'js/i18n-commentary.js', 'js/names.js', 'js/state.js',
  'js/economy.js', 'js/persistence.js', 'js/portraits.js', 'js/roster-gen.js',
  'js/league.js', 'js/match-prep.js', 'js/render.js', 'js/turkce-ek.js', 'js/match-engine.js'];

function sahteEl() {
  const el = {
    style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], attributes: {},
    appendChild(c) { this.children.push(c); return c; }, removeChild() {}, insertBefore(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k]; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }; },
    focus() {}, blur() {}, remove() {}, cloneNode() { return sahteEl(); },
    get innerHTML() { return ''; }, set innerHTML(v) {},
    get textContent() { return ''; }, set textContent(v) {},
    get firstChild() { return null; }
  };
  return el;
}
function sahteDom() {
  return {
    createElement: () => sahteEl(), createElementNS: () => sahteEl(),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    body: sahteEl(), documentElement: sahteEl(), addEventListener() {}, removeEventListener() {},
    createTextNode: () => sahteEl(), createDocumentFragment: () => sahteEl()
  };
}

function ortamKur() {
  const ctx = { console, Math, Date, JSON, String, Number, Boolean, Array, Object, RegExp, Error, isFinite, isNaN, parseInt, parseFloat, Set, Map, Promise, Intl };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.setTimeout = () => 0; ctx.clearTimeout = () => {}; ctx.setInterval = () => 0; ctx.clearInterval = () => {};
  ctx.requestAnimationFrame = () => 0; ctx.cancelAnimationFrame = () => {};
  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {}, clear() {} };
  ctx.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {}, clear() {} };
  ctx.indexedDB = null; ctx.navigator = { userAgent: 'node', language: 'tr' };
  ctx.location = { href: '', search: '', hostname: 'localhost', protocol: 'http:' };
  ctx.performance = { now: () => Date.now() };
  ctx.document = sahteDom();
  ctx.addEventListener = () => {};
  vm.createContext(ctx);
  const kaynak = FILES.map(f => '\n/* ==== ' + f + ' ==== */\n' + fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  const epilog = `
;globalThis.__api = {
  simulateMatch: (typeof simulateMatch==='function') ? simulateMatch : null,
  genRoster: (typeof genRoster==='function') ? genRoster : null
};`;
  try { vm.runInContext(kaynak + epilog, ctx, { filename: 'charazay-bundle.js' }); }
  catch (e) { console.error('✗ modüller yüklenemedi: ' + e.message); process.exit(1); }
  return ctx;
}
function kadroUret(ctx, seed) {
  const eski = ctx.Math.random;
  let a = seed >>> 0;
  ctx.Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return ctx.__api.genRoster(); } finally { ctx.Math.random = eski; }
}

/* `movePlayersForEvent` kaynağından, kendi dalı olan olay türlerini çıkar. */
function sahneDallari() {
  const src = fs.readFileSync(path.join(ROOT, 'js/match-engine.js'), 'utf8');
  const i = src.indexOf('function movePlayersForEvent');
  if (i < 0) return null;
  /* Fonksiyonun sonunu kabaca bir sonraki top-level `function ` ile sınırla. */
  const j = src.indexOf('\nfunction ', i + 10);
  const govde = src.slice(i, j > 0 ? j : src.length);
  const set = new Set();
  for (const m of govde.matchAll(/type===['"]([a-zA-Z0-9_]+)['"]/g)) set.add(m[1]);
  return set;
}

(async () => {
  console.log('\n' + '='.repeat(74));
  console.log('SAHNE KAPSAM DENETİMİ (FAZ 40 · B5+B6) — tarayıcısız');
  console.log('='.repeat(74));
  const ctx = ortamKur();
  const ev = kadroUret(ctx, SEED0 ^ 0x1111);
  const dep = kadroUret(ctx, SEED0 ^ 0x2222);

  const sayac = {}, sutlu = { n: 0, dtPosTop: 0 };
  const ftAlanli = new Set();
  let toplamOlay = 0;
  for (let i = 0; i < N; i++) {
    const r = ctx.__api.simulateMatch({
      homeRoster: ev, awayRoster: dep, homeTactics: {}, awayTactics: {},
      homeName: 'Ev', awayName: 'Dep', seed: SEED0 + i
    });
    r.events.forEach(e => {
      toplamOlay++;
      sayac[e.type] = (sayac[e.type] || 0) + 1;
      /* ⚠ SAHNE SÖZLEŞMESİ TÜR ADIYLA DEĞİL ALANLA KURULABİLİR (CLAUDE.md, FAZ 38 eki-3):
         `movePlayersForEvent` serbest atış dalına `ev.shots[0].kind==='ft'` ile girer,
         `ev.type`ye bakmaz. `free`, `teknik` ve `sportmenlikDisi` bu yoldan kapsanır.
         Kapı bunu görmezse kendi ürettiği yanlış pozitifi savunur (FAZ 26 dersi). */
      if (e.shots && e.shots[0] && e.shots[0].kind === 'ft') ftAlanli.add(e.type);
      if (e.shot) { sutlu.n++; sutlu.dtPosTop += Number(e.dtPos != null ? e.dtPos : (e.dt != null ? e.dt : 12)); }
    });
  }
  const dallar = sahneDallari();
  if (!dallar) { console.error('✗ movePlayersForEvent bulunamadı'); process.exit(1); }
  /* Şut olayları `ev.shot` ile ayrılır ve kendi koreografisine (animateShotPossession)
     gider — tür adına göre dal ARAMAZLAR. Aynı şekilde sahneye dokunmayan duyuru
     türleri de bilinçli olarak dalsızdır (kod başındaki `sub`/`tactic` kısa devresi). */
  const SUT_TIP = new Set(['score2', 'score3', 'miss2', 'miss3']);
  const eksik = [], kapsanan = [];
  Object.keys(sayac).sort((a, b) => sayac[b] - sayac[a]).forEach(t => {
    if (SUT_TIP.has(t)) { kapsanan.push([t, sayac[t], 'şut koreografisi']); return; }
    if (dallar.has(t)) { kapsanan.push([t, sayac[t], 'kendi dalı']); return; }
    if (ftAlanli.has(t)) { kapsanan.push([t, sayac[t], 'serbest atış dalı (shots[].kind=ft)']); return; }
    eksik.push([t, sayac[t]]);
  });

  console.log('\n[B5] OLAY TÜRÜ ↔ SAHNE DALI');
  kapsanan.forEach(([t, n, k]) => console.log('  ✓ ' + t.padEnd(16) + String(n).padStart(7) + '   ' + k));
  eksik.forEach(([t, n]) => console.log('  ✗ ' + t.padEnd(16) + String(n).padStart(7) + '   SAHNE DALI YOK — genel dala düşüyor'));
  const macBasi = eksik.reduce((a, x) => a + x[1], 0) / N;
  console.log('  → dalsız olay / maç: ' + macBasi.toFixed(2) + '   hedef 0');

  console.log('\n[B6] KOREOGRAFİ BÜTÇESİ');
  /* main.js sözleşmesi: delay = max(simMs, dtMs). Kaynaktan doğrula. */
  const mjs = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
  const altSinir = /const\s+delay\s*=\s*Math\.max\(\s*140\s*,\s*Math\.max\(\s*simMs\s*,\s*dtMs\s*\)/.test(mjs);
  console.log('  ' + (altSinir ? '✓' : '✗') + ' delay = max(simMs, dtMs) — koreografi süresi ALT SINIR (kesilmez)');
  const ortDtPos = sutlu.n ? sutlu.dtPosTop / sutlu.n : 0;
  console.log('  bilgi: şutlu olay ' + sutlu.n + ' · ortalama dtPos ' + ortDtPos.toFixed(2) + ' sn'
    + ' → bütçe ' + (ortDtPos * 0.30).toFixed(2) + ' sn (MATCH_TIME_SCALE 0,30)');
  console.log('  bilgi: koreografi bu bütçeyi aşarsa maç saati YAVAŞLAR, animasyon KESİLMEZ.');

  const dusen = (eksik.length ? 1 : 0) + (altSinir ? 0 : 1);
  console.log('\n  toplam olay ' + toplamOlay + ' · ' + N + ' maç');
  console.log('  SONUÇ: ' + (dusen === 0 ? 'GEÇTİ' : dusen + ' kapı DÜŞTÜ'));
  process.exit(dusen === 0 ? 0 : 1);
})();
