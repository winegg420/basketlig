/* Kontak sayfası: node kontak.js <ROOT> <etiket> [--secs=60] [--adim=2] — canlı maç sahasını `adim` sn'de bir
   kaydeder, 15'lik sayfalara (5×3) dizip tek PNG olarak yazar (olcum/goruntu/<etiket>-kontak-N.png). */
const http = require('http'), fs = require('fs'), path = require('path');
const MAIN = require('path').resolve(__dirname, '..');
const { chromium } = require('playwright');
const ROOT = path.resolve(process.argv[2] || MAIN); const ET = process.argv[3] || 'kontak';
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? +a.split('=')[1] : d; };
const SECS = arg('secs', 60), ADIM = arg('adim', 2);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
function sunucu() { return new Promise((resolve) => { const srv = http.createServer((req, res) => { try { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/charazay2.0.html'; const fp = path.join(ROOT, path.normalize(u).replace(/^(\.\.[/\\])+/, '')); if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('404'); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(fp).pipe(res); } catch (e) { res.writeHead(500); res.end('500'); } }); srv.listen(0, '127.0.0.1', () => resolve(srv)); }); }
const bekle = (ms) => new Promise(r => setTimeout(r, ms));
const TOHUM = (seed) => { let a = seed >>> 0; Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
(async () => {
  const srv = await sunucu(); const port = srv.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript('(' + TOHUM.toString() + ')(987654321);');
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('charazay_lang', 'tr'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html?test=1`);
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Izle FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} try { showPage('mac'); } catch (e) {} });
  await bekle(300);
  await page.evaluate(() => { startMatch(); });
  const el = await page.$('#courtSvg');
  const kareler = []; const t0 = Date.now();
  for (let s = ADIM; s <= SECS; s += ADIM) {
    const kalan = t0 + s * 1000 - Date.now(); if (kalan > 0) await bekle(kalan);
    const bilgi = await page.evaluate(() => { try { const S = mState._sim, b = S.ball; const c = b.carrier; return `${mState.idx}·${S.curType || '-'}·${b.mode}${c ? '·' + ((c.pl && c.pl.poz) || '?') + (c._oob ? '*' : '') : ''}${S.canliSet ? '·SET' : ''}${S._ftAktif ? '·FT' : ''}${S.inb ? '·INB' : ''}`; } catch (e) { return '?'; } });
    const buf = await el.screenshot({ type: 'jpeg', quality: 70 });
    kareler.push({ s, bilgi, data: 'data:image/jpeg;base64,' + buf.toString('base64') });
  }
  await page.close();
  const dir = path.join(MAIN, 'olcum', 'goruntu'); fs.mkdirSync(dir, { recursive: true });
  const sayfa = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  let n = 0;
  for (let i = 0; i < kareler.length; i += 15) {
    const grup = kareler.slice(i, i + 15);
    const html = `<!doctype html><body style="margin:0;background:#111;color:#eee;font:12px monospace"><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;padding:4px">${grup.map(k => `<div><div style="padding:2px 4px;background:#222">${k.s}s ${k.bilgi}</div><img src="${k.data}" style="width:100%;display:block"></div>`).join('')}</div></body>`;
    await sayfa.setContent(html); await bekle(200);
    const f = path.join(dir, `${ET}-kontak-${++n}.png`); await sayfa.screenshot({ path: f, fullPage: true });
    console.log('yazıldı: ' + path.relative(MAIN, f) + ' (' + grup.map(k => k.s + 's ' + k.bilgi).join(' | ') + ')');
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
