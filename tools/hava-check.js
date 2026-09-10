#!/usr/bin/env node
/**
 * Charazay 2.0 — HAVA ATIŞI DENETÇİSİ (FAZ 70)
 *
 * Kullanıcı: "Hava atışı yapılıyor, YEŞİL takım kazanıyor, ilk pası KIRMIZI takıma atıyor."
 *
 * Maçın ilk 6 saniyesini kare kare izler ve şunu sınar: motorun kararına göre topu KAZANAN
 * takım hangisiyse, hava atışından sonra topu İLK ELE ALAN oyuncu da o takımdan olmalı ve
 * ilk pas o takımın içinde kalmalı. Birden çok tohumla koşulur (hava atışını kimin kazandığı
 * tohuma bağlıdır — tek tohum kusuru gizleyebilir).
 *
 * Kullanım: node tools/hava-check.js [--n=6] [--exec=/yol/chromium]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? parseFloat(a.split('=')[1]) : d; };
const str = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const N = num('n', 6);
const EXEC = str('exec', null);

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

/* sayfa içi kaydedici: hava atışının ilk 6 saniyesi */
function kaydedici() {
  window.__HV = { kare: [], kazanan: null, olay: [] };
  const H = window.__HV;
  const t0 = performance.now();
  /* FAZ 70 teşhis: topu 'held' yapan YOLU yığın iziyle yakala (FAZ 62 dersi: kanca) */
  try{
    ['_ballTut','_ballHold','_ballPass','_ballKurtar','_chase'].forEach(function(fn){
      if(typeof window[fn]!=='function') return;
      const _e=window[fn];
      window[fn]=function(){
        try{ const S=mState&&mState._sim; const t=(performance.now()-t0)/1000;
          if(t<=3.0) H.olay.push({t:+t.toFixed(2),fn:fn,
            arg:(arguments[0]&&arguments[0].pl)?(((S.home||[]).indexOf(arguments[0])>=0?'EV/':'DEP/')+(arguments[0].pl.poz||'?')):String(arguments[0]&&arguments[0].ghost?'hakem':typeof arguments[0]),
            yol:(new Error().stack||String()).split(String.fromCharCode(10)).slice(2,6).map(function(x){var m=x.trim().match(/at ([A-Za-z0-9_$.]+)/);return m?m[1]:String(63);}).join(String.fromCharCode(60))});
        }catch(e){}
        return _e.apply(this,arguments);
      };
    });
  }catch(e){}
  const tick = () => {
    try {
      const S = mState && mState._sim;
      if (S && S.ball && (S.players || []).length >= 10) {
        const t = (performance.now() - t0) / 1000;
        if (t <= 6.5) {
          const b = S.ball;
          const kim = q => { if (!q) return null; if (q.ghost) return 'hakem'; const h = (S.home || []).indexOf(q); if (h >= 0) return 'EV/' + ((q.pl && q.pl.poz) || '?'); const a = (S.away || []).indexOf(q); if (a >= 0) return 'DEP/' + ((q.pl && q.pl.poz) || '?'); return 'bilinmez'; };
          H.kare.push({ t: +t.toFixed(2), mod: b.mode, h: +(b.h || 0).toFixed(0), tasiyici: kim(b.carrier), hedef: kim(b.target) });
          if (H.kazanan == null && typeof mState._lastOff === 'boolean') H.kazanan = mState._lastOff ? 'EV' : 'DEP';
        }
      }
    } catch (e) { H.err = String(e); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function tekKosu(port, browser, seed) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const hatalar = [];
  page.on('pageerror', e => hatalar.push(e.message));
  await page.addInitScript('(' + TOHUM.toString() + ')(' + seed + ');');
  await page.addInitScript("try{localStorage.setItem('charazay_lang','tr');}catch(e){}");
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Hava FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await page.evaluate(() => { try { showPage('mac'); } catch (e) {} });
  await bekle(250);
  await page.evaluate('(' + kaydedici.toString() + ')()');
  await page.evaluate(() => { try { startMatch(); setMatchRate(1); } catch (e) { window.__hvErr = String(e); } });
  await bekle(7000);
  const R = await page.evaluate(() => window.__HV);
  await page.close();
  R.hatalar = hatalar;
  return R;
}

async function main() {
  const srv = await sunucu();
  const port = srv.address().port;
  const lo = EXEC ? { executablePath: EXEC, headless: true } : { channel: 'chrome', headless: true };
  const browser = await chromium.launch(lo);
  const sonuc = [];
  const tohumlar = [987654321, 42, 7, 123, 555, 31, 999, 2024].slice(0, N);
  for (const s of tohumlar) sonuc.push({ seed: s, r: await tekKosu(port, browser, s) });
  await browser.close(); srv.close();

  let dusen = 0;
  console.log('\nHAVA ATIŞI DENETİMİ (FAZ 70) — ' + tohumlar.length + ' tohum');
  console.log('  tohum        motor kazanan   ilk ELE ALAN   ilk PAS hedefi   sonuç');
  for (const { seed, r } of sonuc) {
    const K = r.kare || [];
    /* ilk gerçek taşıyıcı (hakem/ghost hariç) */
    const ilkTut = K.find(k => k.mod === 'held' && k.tasiyici && k.tasiyici !== 'hakem');
    const ilkPas = K.find(k => k.mod === 'pass' && k.hedef && k.hedef !== 'hakem');
    const kaz = r.kazanan;
    const tutTakim = ilkTut ? ilkTut.tasiyici.split('/')[0] : null;
    const pasTakim = ilkPas ? ilkPas.hedef.split('/')[0] : null;
    const ok = !!kaz && !!tutTakim && tutTakim === kaz && (!pasTakim || pasTakim === kaz);
    if (!ok) dusen++;
    console.log('  ' + String(seed).padEnd(12) + String(kaz).padEnd(15) +
      String(ilkTut ? ilkTut.tasiyici + '@' + ilkTut.t : '—').padEnd(15) +
      String(ilkPas ? ilkPas.hedef + '@' + ilkPas.t : '—').padEnd(17) + (ok ? '✓' : '✗ RAKİBE GEÇTİ'));
    if (!ok) {
      const ilk = K.filter(k => k.t <= 3.2);
      let son = null;
      ilk.forEach(k => { const im = k.mod + '|' + k.tasiyici + '|' + k.hedef; if (im !== son) { son = im; console.log('        t=' + String(k.t).padStart(5) + '  ' + k.mod.padEnd(6) + ' h=' + String(k.h).padStart(3) + '  tutan=' + String(k.tasiyici) + '  hedef=' + String(k.hedef)); } });
    }
    if (r.hatalar && r.hatalar.length) console.log('        ⚠ sayfa hatası: ' + r.hatalar[0].slice(0, 120));
  }
  sonuc.forEach(function(o){ if(dusen&&o.r.olay&&o.r.olay.length){ console.log('  --- yol izi (tohum '+o.seed+') ---'); o.r.olay.slice(0,14).forEach(function(e){ console.log('      t='+String(e.t).padStart(5)+'  '+e.fn.padEnd(12)+' arg='+String(e.arg).padEnd(10)+' <- '+e.yol); }); } });
  console.log(dusen ? '\n✗ ' + dusen + ' / ' + sonuc.length + ' maçta hava atışı topu RAKİBE gitti' : '\n✓ hava atışını kazanan takım topu aldı ve ilk pas takım içinde kaldı');
  process.exit(dusen ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
