#!/usr/bin/env node
/**
 * Charazay 2.0 — SEKME ARKA PLANDAYKEN SAHNE / MAÇ TUTARLILIĞI (FAZ 42-B · C)
 *
 * Brifin gözlemi (canlı site): `document.hidden === true` iken 100 sn boyunca görünür kare 0
 * (oyuncular ve top kıpırdamadı, `_sim.time` ilerlemedi) ama olay işleyici akmaya devam etti,
 * skor değişti; `mState._bgPause` bu sırada false kaldı — FAZ 37 §9.3 koruması devreye
 * girmiyordu. Kullanıcı sekmeye dönünce donmuş bir saha + ilerlemiş bir skor görüyordu.
 *
 * Bu araç aynı senaryoyu yerelde kurar: maç başlar, başka bir sekme öne alınır (rAF durur,
 * `document.hidden` true olur), 30 sn beklenir, geri dönülür.
 *   ✓ gizliyken `_bgPause` kuruldu ve olay kuyruğu DURDU (idx/skor değişmedi)
 *   ✓ dönüşte kuyruk sürdü, sahne olaya eşitlendi (jetonlar hedefinde, top sahipli/hedefli)
 *   ✓ konsol hatası 0
 *
 * Çalıştırma:  node tools/arka-plan-check.js [--secs=30]
 * Çıkış kodu:  0 = geçti, 1 = düştü.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? parseFloat(a.split('=')[1]) : d; };
const SECS = num('secs', 30);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function sunucu() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      try {
        let u = decodeURIComponent(req.url.split('?')[0]);
        if (u === '/') u = '/charazay2.0.html';
        const fp = path.join(ROOT, path.normalize(u).replace(/^(\.\.[/\\])+/, ''));
        if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('404'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(fp).pipe(res);
      } catch (e) { res.writeHead(500); res.end('500'); }
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
const bekle = (ms) => new Promise(r => setTimeout(r, ms));
const TOHUM = (seed) => {
  let a = seed >>> 0;
  Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const sonuc = [];
function ok(ad, gecti, not) { sonuc.push(!!gecti); console.log(`  ${gecti ? '✓' : '✗'} ${ad}${not ? ' — ' + not : ''}`); }

const DURUM = () => ({
  hidden: !!document.hidden,
  bgPause: !!(mState && mState._bgPause),
  running: !!(mState && mState.running),
  idx: mState ? (mState.idx | 0) : -1,
  skor: mState ? (mState.score || []).slice() : [],
  simT: (mState && mState._sim) ? +mState._sim.time.toFixed(2) : -1,
  timer: (typeof matchEventTimer !== 'undefined') ? !!matchEventTimer : null,
  sapma: (() => { try {
    const S = mState._sim; const P = (S.players || []).filter(p => p.tx != null);
    return P.length ? +(P.reduce((a, p) => a + Math.hypot(p.x - p.tx, p.y - p.ty), 0) / P.length).toFixed(0) : -1;
  } catch (e) { return -1; } })(),
  topDurum: (() => { try { const b = mState._sim.ball; return b.carrier ? 'sahipli' : (b.mode + (b.target ? '+hedef' : '')); } catch (e) { return '?'; } })()
});

(async () => {
  console.log('SEKME ARKA PLANI DENETİMİ (C)\n' + '='.repeat(64));
  const srv = await sunucu();
  const base = `http://127.0.0.1:${srv.address().port}`;
  /* ⚠ `--disable-renderer-backgrounding` VERİLMEZ: brifin gözlediği gerçek tarayıcı davranışı
     (arka planda rAF durur) aynen üretilsin. */
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const hatalar = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript('(' + TOHUM.toString() + ')(987654321);');
    await page.addInitScript("try{localStorage.setItem('charazay_lang','tr');}catch(e){}");
    page.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });
    page.on('pageerror', e => hatalar.push('pageerror: ' + e.message));
    await page.goto(base + '/charazay2.0.html?test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
    await page.click('#loginPage button.btn-p');
    await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
    await page.fill('#teamName', 'Arka Plan FK');
    await page.click('#setupPage button.btn-p');
    await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
    await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
    await page.evaluate(() => showPage('mac', document.querySelector('#sbNav button[data-page="mac"]')));
    await bekle(400);
    await page.evaluate(() => { setMatchRate(1); startMatch(); });
    await bekle(6000);

    const once = await page.evaluate(DURUM);
    /* Sekmeyi arka plana al. */
    const bos = await ctx.newPage();
    await bos.goto('about:blank');
    await bos.bringToFront();
    await bekle(1500);
    const gizliBas = await page.evaluate(DURUM);
    await bekle(SECS * 1000);
    const gizliSon = await page.evaluate(DURUM);
    await page.bringToFront();
    await bekle(400);
    const donus0 = await page.evaluate(DURUM);
    await bekle(10000);
    const donus = await page.evaluate(DURUM);
    await bos.close();

    console.log(`  önce      : idx ${once.idx} · skor ${once.skor} · sim ${once.simT} · hidden ${once.hidden}`);
    console.log(`  gizli/baş : idx ${gizliBas.idx} · skor ${gizliBas.skor} · sim ${gizliBas.simT} · hidden ${gizliBas.hidden} · _bgPause ${gizliBas.bgPause} · timer ${gizliBas.timer}`);
    console.log(`  gizli/son : idx ${gizliSon.idx} · skor ${gizliSon.skor} · sim ${gizliSon.simT} · hidden ${gizliSon.hidden} · _bgPause ${gizliSon.bgPause}`);
    console.log(`  dönüş     : idx ${donus0.idx} → ${donus.idx} · skor ${donus.skor} · sim ${donus0.simT} → ${donus.simT} · sapma ${donus.sapma} px · top ${donus.topDurum} · running ${donus.running}`);

    /* BİLGİ: headless Chrome'da (ve brifin canlı gözleminde) document.hidden arka planda da false kalıyor — koruma bu yüzden görünürlük API'sine değil sahne saatine bağlı. */
    console.log('  · bilgi: document.hidden gizliyken ' + gizliBas.hidden + '/' + gizliSon.hidden + ' (API güvenilmez; koruma sahne/duvar oranına bağlı)');
    ok('gizlenince duraklatma bayrağı kuruldu (_bgPause)', gizliBas.bgPause || gizliSon.bgPause, `_bgPause ${gizliBas.bgPause} / ${gizliSon.bgPause}`);
    /* gizlenmeden önce kurulmuş tek bir olay sızabilir (zamanlayıcı zaten çalışıyordu); ötesi kusur */
    ok(`gizliyken olay kuyruğu DURDU (${SECS} sn, en fazla 1 olay sızar)`, gizliSon.idx <= gizliBas.idx + 1,
      `idx ${gizliBas.idx} → ${gizliSon.idx} · skor ${gizliBas.skor} → ${gizliSon.skor}`);
    ok('dönüşte kuyruk sürdü (10 sn içinde olay ya da canlı zamanlayıcı)', (donus.idx > donus0.idx || donus.timer === true) && donus.running && !donus.bgPause, `idx ${donus0.idx} → ${donus.idx} · timer ${donus.timer} · _bgPause ${donus.bgPause}`);
    ok('dönüşte sahne olaya eşitlendi (jeton sapması ≤ 120 px, top sahipli/hedefli)',
      donus.sapma >= 0 && donus.sapma <= 120 && /sahipli|hedef|shot|rim/.test(donus.topDurum), `sapma ${donus.sapma} px · top ${donus.topDurum}`);
    ok('dönüşte sahne saati akıyor', donus.simT > donus0.simT, `sim ${donus0.simT} → ${donus.simT}`);
    ok('konsol hatası 0', hatalar.length === 0, hatalar.slice(0, 2).join(' | '));
    await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
  } finally { await browser.close(); srv.close(); }
  const dusen = sonuc.filter(x => !x).length;
  console.log('='.repeat(64) + `\nSONUÇ: ${sonuc.length - dusen}/${sonuc.length}` + (dusen ? ' — DÜŞTÜ' : ' — geçti'));
  process.exit(dusen ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
