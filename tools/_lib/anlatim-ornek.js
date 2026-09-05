/**
 * Tarayıcısız anlatım örnekleyici — anlatim-check ile AYNI vm yükleyicisi.
 *
 * Neden ayrı dosya: §7 çalışması sırasında "önce/sonra" satırlarını görmek ve yeni
 * kapıları (ek uyumu, failsiz cümle, saat referansı, zincir oranı) beslemek için
 * olay listesine tekrar tekrar ihtiyaç var. Yükleyiciyi üçüncü kez kopyalamak yerine
 * tek yerde durur; anlatim-check ve sunum-check bunu çağırır.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '../..');
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
  vm.runInContext(kaynak + '\n;globalThis.__api={simulateMatch,genRoster,sutSaatiKarar:(typeof sutSaatiKarar==="function")?sutSaatiKarar:null};', ctx, { filename: 'charazay-bundle.js' });
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

/**
 * N maç üretip olayları döndürür.
 * @returns {{events:Array, maclar:Array, ctx:Object, evAd:string, depAd:string}}
 */
function maclariUret(n, seed0, opt) {
  opt = opt || {};
  const ctx = opt.ctx || ortamKur();
  const ev = kadroUret(ctx, (seed0 ^ 0x1111) >>> 0);
  const dep = kadroUret(ctx, (seed0 ^ 0x2222) >>> 0);
  const evAd = opt.evAd || 'Kayseri Boğaları';
  const depAd = opt.depAd || 'Bursa Yıldırım';
  const maclar = [], events = [];
  for (let i = 0; i < n; i++) {
    const r = ctx.__api.simulateMatch({
      homeRoster: ev, awayRoster: dep, homeTactics: opt.homeTactics || {}, awayTactics: opt.awayTactics || {},
      homeName: evAd, awayName: depAd, seed: seed0 + i,
    });
    maclar.push(r);
    (r.events || []).forEach(e => events.push(e));
  }
  return { events, maclar, ctx, evAd, depAd };
}

const metin = e => String((e && e.text) || '').replace(/<[^>]*>/g, '');

module.exports = { ortamKur, kadroUret, maclariUret, metin, FILES, ROOT };
