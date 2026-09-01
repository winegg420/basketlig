/**
 * Charazay 2.0 — EKONOMİ ÖLÇÜM ORTAMI (FAZ 25 USD)
 *
 * `tools/sim-node.js` içindeki vm yükleyicisinin ekonomi tarafına açılmış hâli.
 * Fark: `js/main.js` dışındaki TÜM modüller yüklenir ve epilog ekonomi tutamaklarını
 * dışa verir (`G`, `ecoRound`, `salaryUSDFromGenel`, `weeklyWageBill`, `homeTicketIncome`,
 * `sponsorHaftalik`, `genRoster`, `startLeagueSeason` …).
 *
 * Neden ayrı dosya: `ekonomi-check.js` ve gelecekteki ölçüm araçları aynı ortamı
 * kurmak zorunda; kopyalanan yükleyici sessizce eskiyordu (sim-node'un modül listesi
 * FAZ 25'te `turkce-ek.js` eklenince iki yerde ayrı ayrı güncellenmişti).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

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
  doc.getElementById = () => null;
  doc.getElementsByClassName = () => []; doc.getElementsByTagName = () => [];
  doc.createTreeWalker = () => ({ nextNode: () => null });
  doc.scripts = [];
  return doc;
}

/** Basit anahtar/değer localStorage taklidi — bot kulüp önbelleği bunu kullanır. */
function sahteStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: (k) => { m.delete(String(k)); },
    clear: () => m.clear(),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
}

/** Tohumlanabilir Math.random — ölçümler tekrarlanabilir olsun diye. */
function tohumlu(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


/** js/main.js yüklenmiyor (arayüz katmanı) — ekonomi kodunun çağırdığı UI kancaları
 *  boş bırakılır. Liste eksik kalırsa ölçüm 'X is not defined' ile düşer, sessizce
 *  yanlış sonuç vermez. */
const UI_STUB = ['updateStats', 'updateCoins', 'showNotif', 'renderRoster', 'renderLig', 'renderMarket',
  'renderArena', 'renderAltyapi', 'renderAntrenman', 'renderBilanco', 'renderAnalytics', 'showPage',
  'renderScouts', 'renderCoaches', 'renderFixtures', 'renderNews', 'updateSidebar', 'refreshAll',
  'saveGame', 'sfx', 'unlockAchievement', 'trackEvent', 'trackOnce', 'trackMilestone',
  'closeAppModal', 'openAppModal', 'syncMatchButtons', 'renderTeamPage', 'updateHeader'];

function ortamKur(opt) {
  opt = opt || {};
  const ctx = {
    console: opt.sessiz ? { log() {}, warn() {}, error() {}, info() {} } : console,
    Math, Date, JSON, Number, String, Boolean, Array, Object, Error, RegExp, Map, Set,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, Promise,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    performance: { now: () => Date.now() },
    localStorage: sahteStorage(), sessionStorage: sahteStorage(),
    navigator: { language: 'tr', userAgent: 'node' },
    location: { search: '', href: 'file:///node', protocol: 'file:', hostname: '' },
    indexedDB: null,
    MutationObserver: function () { return { observe() {}, disconnect() {} }; },
    NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 },
    AudioContext: null, webkitAudioContext: null,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.document = sahteDom();
  ctx.addEventListener = () => {};
  UI_STUB.forEach(k => { if (ctx[k] == null) ctx[k] = function () {}; });
  vm.createContext(ctx);

  const kaynak = FILES.map(f => '\n/* ==== ' + f + ' ==== */\n' + fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  /* top-level `const/let` global nesneye düşmez — gereken her şey elle dışa verilir. */
  const ad = (x) => `(typeof ${x}!=='undefined')?${x}:null`;
  const epilog = `
;globalThis.__eko = {
  get G(){ return ${ad('G')}; },
  ARENA_LVL: ${ad('ARENA_LVL')},
  DIV_SAYISI: ${ad('DIV_SAYISI')},
  LEAGUE_SIZE: ${ad('LEAGUE_SIZE')},
  START_USD: ${ad('START_USD')},
  ECO_MUL: ${ad('ECO_MUL')},
  BILET_FIYAT: ${ad('BILET_FIYAT')},
  MAAS_ANKOR: ${ad('MAAS_ANKOR')},
  SPONSOR_KADEME: ${ad('SPONSOR_KADEME')},
  fn: {
    ecoRound: ${ad('ecoRound')},
    salaryUSDFromGenel: ${ad('salaryUSDFromGenel')},
    transferFeeUSD: ${ad('transferFeeUSD')},
    weeklyWageBill: ${ad('weeklyWageBill')},
    homeTicketIncome: ${ad('homeTicketIncome')},
    arenaDolulukOrani: ${ad('arenaDolulukOrani')},
    sponsorHaftalik: ${ad('sponsorHaftalik')},
    sponsorKademe: ${ad('sponsorKademe')},
    getFanBaseStats: ${ad('getFanBaseStats')},
    genRoster: ${ad('genRoster')},
    botOvrKaydir: ${ad('botOvrKaydir')},
    divizyonNo: ${ad('divizyonNo')},
    divizyonAnahtari: ${ad('divizyonAnahtari')},
    divizyonAnahtarlari: ${ad('divizyonAnahtarlari')},
    genPlayer: ${ad('genPlayer')},
    genMarket: ${ad('genMarket')},
    startLeagueSeason: ${ad('startLeagueSeason')},
    processEconomyWeeks: ${ad('processEconomyWeeks')},
    simulateCpuMatch: ${ad('simulateCpuMatch')},
    updateStandingsFromResult: ${ad('updateStandingsFromResult')},
    buildLeagueRows: ${ad('buildLeagueRows')},
    txn: ${ad('txn')},
    fmtPara: ${ad('fmtPara')},
    fmtMaas: ${ad('fmtMaas')},
    ecoInflationMul: ${ad('ecoInflationMul')},
    haftalikGelirBeklentisi: ${ad('haftalikGelirBeklentisi')}
  }
};`;
  try { vm.runInContext(kaynak + epilog, ctx, { filename: 'charazay-eko-bundle.js' }); }
  catch (e) { throw new Error('modüller yüklenemedi: ' + e.message); }
  UI_STUB.forEach(k => { if (typeof ctx[k] !== "function") ctx[k] = function () {}; });
  if (opt.seed != null) ctx.Math.random = tohumlu(opt.seed);
  return ctx;
}

module.exports = { ortamKur, tohumlu, FILES, ROOT };
