#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 26 ŞUT TİPİ DENETÇİSİ
 *
 * FAZ 26 §1 iki şey ekledi ve ikisi de ayrı ayrı sınanmalı:
 *   A) MOTOR — her saha şutu bir TİP taşır (smac / turnike / floater / jumper / uc);
 *      tip bölgeyle tutarlıdır ve gerçekçi bir dağılım verir. Tip bir SUNUM kararıdır:
 *      isabeti, sayıyı, kutu skoru DEĞİŞTİRMEZ (determinizm ayrıca sınanır).
 *   B) ANLATIM — smaç dili yalnız smaçta, turnike dili yalnız turnikede, floater dili
 *      yalnız floater'da çıkar. Eskiden üçü de aynı havuzdan besleniyor, turnikede
 *      "potaya asıldı" çıkabiliyordu.
 *
 * Yörünge farkı (C) TARAYICIDA ölçülür — `tools/sunum-check.js` F26-1 kapısı.
 * Bu araç tarayıcısızdır (sim-node harness'ının aynısı), hızlı koşar.
 *
 * Çalıştırma:  node tools/sut-check.js [--n=60] [--seed=987654321]
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const arg = (ad, v) => { const m = process.argv.find(a => a.startsWith('--' + ad + '=')); return m ? Number(m.split('=')[1]) : v; };
const N = arg('n', 60);
const SEED0 = arg('seed', 987654321);

const FILES = ['js/i18n.js', 'js/i18n-dict.js', 'js/i18n-commentary.js', 'js/names.js', 'js/state.js',
  'js/economy.js', 'js/persistence.js', 'js/portraits.js', 'js/roster-gen.js',
  'js/league.js', 'js/match-prep.js', 'js/render.js', 'js/turkce-ek.js', 'js/match-engine.js'];

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
  doc.documentElement = el(); doc.body = el(); doc.head = el();
  doc.createElement = el; doc.createElementNS = el;
  doc.createTextNode = () => el(); doc.createDocumentFragment = el;
  doc.getElementById = () => null; doc.getElementsByClassName = () => [];
  doc.getElementsByTagName = () => []; doc.createTreeWalker = () => ({ nextNode: () => null });
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
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.document = sahteDom(); ctx.addEventListener = () => {};
  vm.createContext(ctx);
  const kaynak = FILES.map(f => '\n/* ==== ' + f + ' ==== */\n' + fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  const epilog = `
;globalThis.__api = {
  simulateMatch: (typeof simulateMatch==='function') ? simulateMatch : null,
  genRoster: (typeof genRoster==='function') ? genRoster : null,
  DUNK: (typeof _DUNK_WORDS!=='undefined') ? _DUNK_WORDS : null,
  LAYUP: (typeof _LAYUP_WORDS!=='undefined') ? _LAYUP_WORDS : null,
  FLOAT: (typeof _FLOAT_WORDS!=='undefined') ? _FLOAT_WORDS : null,
  HOOK: (typeof _HOOK_WORDS!=='undefined') ? _HOOK_WORDS : null,
  TIPIN: (typeof _TIPIN_WORDS!=='undefined') ? _TIPIN_WORDS : null,
  SUT_LINES: (typeof SUT_LINES!=='undefined') ? SUT_LINES : null
};`;
  try { vm.runInContext(kaynak + epilog, ctx, { filename: 'charazay-bundle.js' }); }
  catch (e) { console.error('✗ modüller yüklenemedi: ' + e.message); process.exit(1); }
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
  try { return (ctx.__api.genRoster)(); } finally { ctx.Math.random = eski; }
}

const sonuc = [];
function kayit(kod, ad, gecti, detay) {
  sonuc.push({ kod, gecti });
  console.log(`  ${gecti ? '✓' : '✗'} ${kod}  ${ad}\n       ${detay}`);
}

(function main() {
  console.log('FAZ 26 — ŞUT TİPİ DENETİMİ (tarayıcı YOK)\n' + '='.repeat(72));
  const ctx = ortamKur();
  const api = ctx.__api || {};
  if (!api.simulateMatch || !api.genRoster) { console.error('✗ simulateMatch/genRoster yok'); process.exit(1); }

  const home = kadroUret(ctx, SEED0);
  const away = kadroUret(ctx, SEED0 + 7);
  const sutlar = [];
  for (let i = 0; i < N; i++) {
    const r = api.simulateMatch({ homeRoster: home, awayRoster: away, homeTactics: {}, awayTactics: {}, seed: SEED0 + i });
    (r.events || []).forEach(ev => {
      if (ev && ev.shot && ev.shot.kind !== 'ft') sutlar.push({ s: ev.shot, text: (ev.preText ? String(ev.preText) + ' ' : '') + String(ev.text || '') });
    });
  }
  console.log(`  ${N} maç · ${sutlar.length} saha şutu\n`);

  /* ── A1: her saha şutunun tipi var ── */
  const tipsiz = sutlar.filter(x => !x.s.sut);
  kayit('F26-A1', 'Her saha şutu bir tip taşıyor', tipsiz.length === 0,
    `tipsiz ${tipsiz.length}/${sutlar.length}`);

  const say = {};
  sutlar.forEach(x => { say[x.s.sut] = (say[x.s.sut] || 0) + 1; });
  const oran = t => (say[t] || 0) / (sutlar.length || 1);
  console.log(`  tip dağılımı: ${Object.keys(say).sort().map(k => `${k} %${(oran(k) * 100).toFixed(1)}`).join(' · ')}`);

  /* ── A2: tip ↔ bölge tutarlılığı ──
     smaç/turnike/floater YALNIZ çember-boya; jumper YALNIZ orta mesafe; uc YALNIZ 3'lük. */
  /* FAZ 28 §2: kanca (postta uzun) ve tipin (hücum ribaundu) da yakın tiplerdir. */
  const yakinTipler = ['smac', 'turnike', 'floater', 'kanca', 'tipin'];
  const ihlal = sutlar.filter(x => {
    const t = x.s.sut, z = x.s.zone, u = (x.s.kind === '3');
    if (u) return t !== 'uc';
    if (t === 'uc') return true;
    if (t === 'jumper') return z !== 'midrange';
    if (yakinTipler.indexOf(t) >= 0) return z === 'midrange';
    return true;
  });
  kayit('F26-A2', 'Tip bölgeyle tutarlı (yakın tipler orta mesafede çıkmaz)', ihlal.length === 0,
    `ihlal ${ihlal.length}` + (ihlal.length ? ` · ör. ${JSON.stringify(ihlal.slice(0, 3).map(x => ({ sut: x.s.sut, zone: x.s.zone, kind: x.s.kind })))}` : ''));

  /* ── A3: smaç payı gerçekçi ──
     NBA'de smaçlar tüm saha şutlarının ~%7-13'ü. Sıfır olursa özellik ölü demektir. */
  const smacP = oran('smac');
  kayit('F26-A3', 'Smaç payı gerçekçi bantta', smacP >= 0.05 && smacP <= 0.16,
    `%${(smacP * 100).toFixed(1)} (hedef %5-16) · ${say.smac || 0} smaç`);

  /* ── A4: smaçı ağırlıkla uzunlar ve kanatlar atıyor ── */
  const smacSut = sutlar.filter(x => x.s.sut === 'smac');
  const cemberde = smacSut.filter(x => x.s.zone === 'rim').length / (smacSut.length || 1);
  kayit('F26-A4', 'Smaçların çoğu çember bölgesinden', cemberde >= 0.75,
    `%${(cemberde * 100).toFixed(1)} çemberden (hedef ≥ %75)`);

  /* ── A5: floater guard işidir — boyada ve az ── */
  const flt = oran('floater');
  kayit('F26-A5', 'Floater payı makul', flt > 0 && flt <= 0.14,
    `%${(flt * 100).toFixed(1)} (hedef 0 < x ≤ %14)`);

  /* ── A6: kanca postta ve uzunlarda ── */
  const kanca = sutlar.filter(x => x.s.sut === 'kanca');
  const kancaPost = kanca.filter(x => x.s.scheme === 'postup').length / (kanca.length || 1);
  kayit('F26-A6', 'Kanca yalnız post oyunundan geliyor', kanca.length > 0 && kancaPost >= 0.99,
    `${kanca.length} kanca · %${(kancaPost * 100).toFixed(1)} postup (hedef ≥ %99)`);

  /* ── A7: tip-in ikinci şans şutudur ── */
  const tipin = sutlar.filter(x => x.s.sut === 'tipin');
  const tipinPb = tipin.filter(x => x.s.pb).length / (tipin.length || 1);
  kayit('F26-A7', 'Tip-in yalnız hücum ribaundundan (ikinci şans) geliyor', tipin.length > 0 && tipinPb >= 0.99,
    `${tipin.length} tip-in · %${(tipinPb * 100).toFixed(1)} ikinci şans (hedef ≥ %99)`);

  /* ── B1/B2/B3: anlatım dili tiple çelişmiyor ── */
  const DUNK = api.DUNK, LAYUP = api.LAYUP, FLOAT = api.FLOAT;
  if (!DUNK || !LAYUP || !FLOAT) {
    kayit('F26-B1', 'Şut tipi sözcük süzgeçleri dışa verildi', false, 'regexler bulunamadı');
  } else {
    const yanlisDunk = sutlar.filter(x => x.s.sut !== 'smac' && DUNK.test(x.text));
    kayit('F26-B1', 'Smaç dili yalnız smaçta', yanlisDunk.length === 0,
      `ihlal ${yanlisDunk.length}` + (yanlisDunk.length ? ` · ör. "${yanlisDunk[0].text.slice(0, 70)}" (tip ${yanlisDunk[0].s.sut})` : ''));

    const yanlisLay = sutlar.filter(x => x.s.sut !== 'turnike' && LAYUP.test(x.text));
    kayit('F26-B2', 'Turnike dili yalnız turnikede', yanlisLay.length === 0,
      `ihlal ${yanlisLay.length}` + (yanlisLay.length ? ` · ör. "${yanlisLay[0].text.slice(0, 70)}" (tip ${yanlisLay[0].s.sut})` : ''));

    const yanlisHook = sutlar.filter(x => x.s.sut !== 'kanca' && api.HOOK.test(x.text));
    kayit('F26-B5', 'Kanca dili yalnız kancada', yanlisHook.length === 0,
      `ihlal ${yanlisHook.length}` + (yanlisHook.length ? ` · ör. "${yanlisHook[0].text.slice(0, 70)}" (tip ${yanlisHook[0].s.sut})` : ''));
    const yanlisTip = sutlar.filter(x => x.s.sut !== 'tipin' && api.TIPIN.test(x.text));
    kayit('F26-B6', 'Tip-in dili yalnız tip-inde', yanlisTip.length === 0,
      `ihlal ${yanlisTip.length}` + (yanlisTip.length ? ` · ör. "${yanlisTip[0].text.slice(0, 70)}" (tip ${yanlisTip[0].s.sut})` : ''));
    const yanlisFlt = sutlar.filter(x => x.s.sut !== 'floater' && FLOAT.test(x.text));
    kayit('F26-B3', 'Floater dili yalnız floater\'da', yanlisFlt.length === 0,
      `ihlal ${yanlisFlt.length}` + (yanlisFlt.length ? ` · ör. "${yanlisFlt[0].text.slice(0, 70)}" (tip ${yanlisFlt[0].s.sut})` : ''));

    /* Dil GERÇEKTEN kullanılıyor mu? Süzgeç her şeyi elerse kapılar boş yere yeşil olur. */
    const dunkDil = smacSut.filter(x => DUNK.test(x.text)).length / (smacSut.length || 1);
    kayit('F26-B4', 'Smaçların anlamlı kısmı smaç diliyle anlatılıyor', dunkDil >= 0.30,
      `%${(dunkDil * 100).toFixed(1)} (hedef ≥ %30) · ${smacSut.length} smaç`);
  }

  /* ── C: tip sonucu DEĞİŞTİRMİYOR ── */
  const a1 = api.simulateMatch({ homeRoster: home, awayRoster: away, homeTactics: {}, awayTactics: {}, seed: SEED0 });
  const a2 = api.simulateMatch({ homeRoster: home, awayRoster: away, homeTactics: {}, awayTactics: {}, seed: SEED0 });
  const ayni = a1.home === a2.home && a1.away === a2.away &&
    JSON.stringify((a1.events || []).map(e => e.shot ? e.shot.sut : null)) ===
    JSON.stringify((a2.events || []).map(e => e.shot ? e.shot.sut : null));
  kayit('F26-C1', 'Tip deterministik (aynı tohum → aynı tip dizisi)', ayni,
    `${a1.home}-${a1.away} ↔ ${a2.home}-${a2.away}`);

  console.log('\n' + '='.repeat(72));
  const dusen = sonuc.filter(r => !r.gecti);
  if (dusen.length) { console.log('✗ DÜŞEN: ' + dusen.map(r => r.kod).join(', ')); process.exit(1); }
  console.log(`✓ şut tipi sistemi doğrulandı (${sonuc.length}/${sonuc.length})`);
})();
