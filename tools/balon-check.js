#!/usr/bin/env node
/**
 * Charazay 2.0 — ANLATIM BALONU DENETÇİSİ (FAZ 40 · B2)
 *
 * ⚠ NEDEN AYRI BİR KAPI: `anlatim-check` olayları MOTORDAN okur ve ön parça (`preText`)
 *   ile sonuç parçasını (`text`) AYRI AYRI tarar. Ekranda ise ikisi TEK BALONDA birleşir
 *   (`addComment`, `chain`). Birleşme noktasında doğan kusurları — "nokta + küçük harf",
 *   çift boşluk, çift noktalama — motor tarafı GÖREMEZ. Harness yeşilken ekran bozuktu;
 *   bu kapı RENDER EDİLMİŞ balonu okur.
 *
 * Kullanım: node tools/balon-check.js [--secs=150] [--seed=987654321] [--rate=3]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? parseFloat(a.split('=')[1]) : d; };
const SEED = num('seed', 987654321);
const SECS = num('secs', 150);
const RATE = num('rate', 3);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
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

async function main() {
  const srv = await sunucu();
  const port = srv.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const hatalar = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });
  page.on('pageerror', e => hatalar.push(e.message));
  await page.addInitScript('(' + TOHUM.toString() + ')(' + SEED + ');');
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Balon FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await page.evaluate(() => { try { showPage('mac'); } catch (e) {} });
  await bekle(300);
  await page.evaluate((r) => { try { startMatch(); setMatchRate(r); } catch (e) { window.__startErr = String(e); } }, RATE);
  await bekle(SECS * 1000);

  /* Balon metnini SAAT DAMGASINDAN ARINDIRILMIŞ hâliyle oku — damga ayrı bir <span>. */
  const balon = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#commentary .ci').forEach(el => {
      const c = el.cloneNode(true);
      const sp = c.querySelector('.ci-time'); if (sp) sp.remove();
      const t = (c.textContent || '').trim().replace(/\s+/g, ' ');
      if (t) out.push(t);
    });
    return out;
  });
  await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
  await browser.close(); srv.close();

  /* ── KUSURLAR ──
     Türkçe küçük harf ASCII değildir: ç ğ ı ö ş ü de küçüktür. */
  const KUCUK = 'a-zçğıöşü';
  /* ⚠ RAKAMDAN SONRAKİ NOKTA SIRA EKİDİR, cümle sonu değil: "2. çeyrek", "kişisel 4.
     takım faulü", "üst üste 3. isabetini". Geriye bakış olmadan kapı bu üç kalıbı kusur
     sayar ve KENDİ ürettiği yanlış pozitifi savunur (FAZ 26 dersi). */
  const noktaKucuk = new RegExp('(?<![0-9])[.!?]\\s+[' + KUCUK + ']');
  const ciftNoktalama = /[.,;:!?]\s*[.,;:!?]/;
  const kusur = { nk: [], cn: [], bosluk: [] };
  balon.forEach(t => {
    if (noktaKucuk.test(t)) kusur.nk.push(t);
    if (ciftNoktalama.test(t)) kusur.cn.push(t);
    if (/ {2,}| [.,;:!?]/.test(t)) kusur.bosluk.push(t);
  });

  const n = balon.length || 1;
  const K = [];
  const ok = (ad, deger, gec, hedef) => K.push({ ad, deger, gec, hedef });
  ok('nokta + küçük harf', kusur.nk.length + ' / ' + balon.length + ' (%' + (100 * kusur.nk.length / n).toFixed(1) + ')', kusur.nk.length === 0, '0');
  ok('çift noktalama', kusur.cn.length + ' / ' + balon.length, kusur.cn.length === 0, '0');
  ok('çift boşluk / boşluklu noktalama', kusur.bosluk.length + ' / ' + balon.length, kusur.bosluk.length === 0, '0');
  ok('balon örneklemi', String(balon.length), balon.length >= 40, '≥ 40');

  console.log('\n' + '='.repeat(74));
  console.log(`ANLATIM BALONU (RENDER EDİLMİŞ) — ${balon.length} balon · ${SECS} sn · hız ${RATE}× · seed=${SEED}`);
  console.log('='.repeat(74));
  let dusen = 0;
  K.forEach(x => { if (!x.gec) dusen++; console.log('  ' + (x.gec ? '✓' : '✗') + ' ' + x.ad.padEnd(36) + String(x.deger).padStart(20) + '   hedef ' + x.hedef); });
  if (kusur.nk.length) { console.log('\n  örnekler (nokta + küçük harf):'); kusur.nk.slice(0, 5).forEach(t => console.log('    · ' + t)); }
  if (kusur.cn.length) { console.log('\n  örnekler (çift noktalama):'); kusur.cn.slice(0, 3).forEach(t => console.log('    · ' + t)); }
  if (kusur.bosluk.length) { console.log('\n  örnekler (boşluk):'); kusur.bosluk.slice(0, 3).forEach(t => console.log('    · ' + JSON.stringify(t))); }
  console.log('\n  konsol hatası: ' + hatalar.length);
  hatalar.slice(0, 3).forEach(e => console.log('     ! ' + e));
  console.log('  SONUÇ: ' + (dusen === 0 ? 'GEÇTİ' : dusen + ' kapı DÜŞTÜ'));
  process.exit(dusen === 0 ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
