/* Dizilim ölçümü olay indeksine göre: node dizilim-olc.js <ROOT> <etiket> [--secs=45]
   100 ms'de bir: idx, tip, canliSet, 10 jetonun ağırlık merkezine ort. uzaklığı (px), en yakın
   çift (px), 22 px altı çift sayısı, saha dışı jeton. Olay başına özet basar. */
const http = require('http'), fs = require('fs'), path = require('path');
const MAIN = require('path').resolve(__dirname, '..');
const { chromium } = require('playwright');
const ROOT = path.resolve(process.argv[2] || MAIN); const ET = process.argv[3] || 'dz';
const a = process.argv.find(x => x.startsWith('--secs=')); const SECS = a ? +a.split('=')[1] : 45;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
function sunucu() { return new Promise((resolve) => { const srv = http.createServer((req, res) => { try { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/charazay2.0.html'; const fp = path.join(ROOT, path.normalize(u).replace(/^(\.\.[/\\])+/, '')); if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('404'); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(fp).pipe(res); } catch (e) { res.writeHead(500); res.end('500'); } }); srv.listen(0, '127.0.0.1', () => resolve(srv)); }); }
const bekle = (ms) => new Promise(r => setTimeout(r, ms));
const TOHUM = (seed) => { let a = seed >>> 0; Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
(async () => {
  const srv = await sunucu(); const port = srv.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const hatalar = []; page.on('pageerror', e => hatalar.push(String(e)));
  await page.addInitScript('(' + TOHUM.toString() + ')(987654321);');
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('charazay_lang', 'tr'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html?test=1`);
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Dz FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} try { showPage('mac'); } catch (e) {} });
  await bekle(300);
  await page.evaluate(() => {
    window.__DZ = [];
    setInterval(() => {
      try {
        const S = mState._sim; if (!S || !S.players) return;
        const P = S.players; let cx = 0, cy = 0; P.forEach(p => { cx += p.x; cy += p.y; }); cx /= P.length; cy /= P.length;
        let ort = 0, enYakin = 1e9, cakisan = 0, dis = 0;
        P.forEach((p, i) => { ort += Math.hypot(p.x - cx, p.y - cy); if (p.x < 56 || p.x > 884 || p.y < 28 || p.y > 472) dis++;
          for (let j = i + 1; j < P.length; j++) { const d = Math.hypot(p.x - P[j].x, p.y - P[j].y); if (d < enYakin) enYakin = d; if (d < 22) cakisan++; } });
        window.__DZ.push({ t: +(performance.now() / 1000).toFixed(1), idx: mState.idx | 0, tip: S.curType || '-', cs: S.canliSet ? 1 : 0, ort: +(ort / P.length).toFixed(0), enYakin: +enYakin.toFixed(0), cakisan, dis, mod: S.ball.mode, faz: S._faz || '-' });
      } catch (e) {}
    }, 100);
    startMatch();
  });
  await bekle(SECS * 1000);
  const D = await page.evaluate(() => window.__DZ);
  await browser.close(); srv.close();
  fs.writeFileSync(path.join(MAIN, 'olcum', 'dizilim-' + ET + '.json'), JSON.stringify(D));
  const byIdx = {};
  D.forEach(k => { const o = byIdx[k.idx] = byIdx[k.idx] || { tip: k.tip, n: 0, ortMin: 1e9, ortOrt: 0, cakisanMax: 0, cakisanOrt: 0, csN: 0, csOrtMin: 1e9, t0: k.t, t1: k.t, dis: 0 };
    o.n++; o.t1 = k.t; o.ortOrt += k.ort; o.cakisanOrt += k.cakisan; if (k.ort < o.ortMin) o.ortMin = k.ort; if (k.cakisan > o.cakisanMax) o.cakisanMax = k.cakisan; if (k.dis > o.dis) o.dis = k.dis;
    if (k.cs) { o.csN++; if (k.ort < o.csOrtMin) o.csOrtMin = k.ort; } });
  console.log(`${ET}: ${D.length} örnek · hata ${hatalar.length}`);
  console.log(' idx  tip          t0-t1        ortYay(min/ort)  çakışan(max/ort)  set-kare  setYayMin  dış');
  Object.keys(byIdx).map(Number).sort((a, b) => a - b).forEach(i => { const o = byIdx[i];
    console.log(` ${String(i).padStart(3)}  ${o.tip.padEnd(12)} ${(o.t0 + '-' + o.t1).padEnd(12)} ${String(o.ortMin + '/' + (o.ortOrt / o.n).toFixed(0)).padStart(14)}  ${String(o.cakisanMax + '/' + (o.cakisanOrt / o.n).toFixed(1)).padStart(15)}  ${String(o.csN).padStart(8)}  ${String(o.csN ? o.csOrtMin : '-').padStart(9)}  ${o.dis}`); });
})().catch(e => { console.error(e); process.exit(1); });
