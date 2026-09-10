#!/usr/bin/env node
/**
 * Charazay 2.0 — KURAL GÖZÜ: BASKETBOL KURALI DENETÇİSİ (FAZ 76)
 *
 * Neden var: FAZ 68-75'in bütün denetçileri GEOMETRİK ölçüyordu (çakışma, mesafe,
 * yayılım) ve o kalemlerin çoğu ölçüm düzeltilince gürültü çıktı. Kullanıcı ise
 * "basketbola özgü olmayan davranış" diyordu — hiçbir araç OYUNUN KURALLARINA
 * bakmıyordu. Bu araç o boşluğu kapatır.
 *
 * Ölçtükleri (hepsi EPİZOT ve TOPLAM SANİYE olarak raporlanır — olay sayısı DEĞİL):
 *   UCLUK_CIZGISINDE_KIMSE_YOK  hücumun en uzak oyuncusu bile potaya 209 px'ten yakın
 *   TOP_POTA_DIBINDE_SAHIPSIZ   top pota dibinde sahipsiz, en yakın oyuncu 50 px+ uzakta
 *   SAYI_SONRASI_TAC_YANLIS     sayı sonrası sokucu, sayı olan potanın dip çizgisinden uzak
 *   HAVA_ATISI_MERKEZ_DISI      maç başında top merkez daireden uzakta
 *   TOP_SICRADI                 mod değişmeden top tek karede 40 px+ yer değiştirdi
 *   BOYADA_3_HUCUMCU            aynı anda boyalı alanda 3+ hücumcu
 *
 * ⚠ setInterval(16) KULLANIR, requestAnimationFrame DEĞİL: rAF arka plan sekmesinde
 *   boğuluyor ve ölçüm sessizce duruyor (canlı oturumda yakalandı).
 *
 * Kullanım:
 *   node tools/kural-goz.js [--sn=300] [--playoff] [--seed=987654321] [--exec=/yol/chromium]
 * Ham döküm: tools/kural-goz-rapor.json
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? parseFloat(a.split('=')[1]) : d; };
const str = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const SN = num('sn', 300);
const SEED = num('seed', 987654321);
const EXEC = str('exec', null);
const PLAYOFF = args.includes('--playoff');

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

function kaydedici() {
  const G0 = window.__KG = {
    kare: 0, ep: {}, acik: {}, olay: [], sonSkor: null, hava: null,
    tacOrn: [], ucOrn: [], potaOrn: []
  };
  const X0 = 56.4, X1 = 883.6, Y0 = 28.43, Y1 = 471.57, MID = 470;
  const UC_R = 209;          /* üç sayı çizgisi yarıçapı (px) */
  let onceki = null, oncekiMod = null, t0 = performance.now();
  /* epizot: bir ihlal AÇIK kaldığı sürece tek epizottur; kapanınca süresi eklenir */
  const ac = (tip, saat, bilgi) => {
    if (G0.acik[tip]) return;
    G0.acik[tip] = { t: performance.now(), saat, bilgi };
    const e = G0.ep[tip] || (G0.ep[tip] = { n: 0, sn: 0 });
    e.n++;
    if (G0.olay.length < 500) G0.olay.push({ tip, saat, bilgi });
  };
  const kapa = (tip) => {
    const a = G0.acik[tip]; if (!a) return;
    G0.ep[tip].sn += (performance.now() - a.t) / 1000;
    G0.acik[tip] = null;
  };
  const tik = () => {
    try {
      const S = mState && mState._sim, P = S && S.players, b = S && S.ball;
      if (!S || !b || !P || P.length < 10) return;
      const clk = mState._clkNow || 0;
      const saat = (mState.quarter || 1) + 'P ' + Math.floor(clk / 60) + ':' + String(Math.floor(clk % 60)).padStart(2, '0');
      G0.kare++;
      /* ── hava atışı: maçın ilk ölçülebilir karesi ── */
      if (G0.hava === null && (mState.idx | 0) <= 1) {
        const d = Math.hypot(b.x - MID, b.y - 250);
        G0.hava = +d.toFixed(0);
        if (d > 45) { ac('HAVA_ATISI_MERKEZ_DISI', saat, 'top merkezden ' + d.toFixed(0) + ' px'); kapa('HAVA_ATISI_MERKEZ_DISI'); }
      }
      const offP = S.offP || [], defP = S.defP || [];
      let rim = null; try { if (S.offSide != null && typeof _rim === 'function') rim = _rim(S.offSide); } catch (e) {}
      /* ── üçlük çizgisinde kimse yok · boyada 3+ hücumcu ── */
      if (rim && offP.length >= 5 && (b.mode === 'held' || b.mode === 'pass')) {
        let enUzak = 0, boyada = 0;
        for (const q of offP) {
          if (!q || !isFinite(q.x)) continue;
          const dr = Math.hypot(q.x - rim[0], q.y - rim[1]);
          if (dr > enUzak) enUzak = dr;
          if (Math.abs(q.x - rim[0]) < 171 && Math.abs(q.y - 250) < 72) boyada++;
        }
        /* yalnız ÖN SAHA hücumunda anlamlı: top rakip yarıda ve taşıyıcı ön sahada */
        const onSaha = (S.offSide ? (b.x < MID) : (b.x > MID));
        if (onSaha && enUzak < UC_R) {
          ac('UCLUK_CIZGISINDE_KIMSE_YOK', saat, 'en uzak hücumcu ' + enUzak.toFixed(0) + ' px');
          if (G0.ucOrn.length < 10) G0.ucOrn.push(saat + ' ' + enUzak.toFixed(0) + 'px');
        } else kapa('UCLUK_CIZGISINDE_KIMSE_YOK');
        if (onSaha && boyada >= 3) ac('BOYADA_3_HUCUMCU', saat, boyada + ' hücumcu'); else kapa('BOYADA_3_HUCUMCU');
      } else { kapa('UCLUK_CIZGISINDE_KIMSE_YOK'); kapa('BOYADA_3_HUCUMCU'); }
      /* ── top potanın dibinde sahipsiz ── */
      if ((b.mode === 'loose' || b.mode === 'dead') && !(S._hakemTop && S._hakemTop.aktif)) {
        const r1 = [62, 250], r2 = [878, 250];
        const dr = Math.min(Math.hypot(b.x - r1[0], b.y - r1[1]), Math.hypot(b.x - r2[0], b.y - r2[1]));
        let en = 1e9; for (const q of P) { const d = Math.hypot(q.x - b.x, q.y - b.y); if (d < en) en = d; }
        if (dr < 130 && en > 50) {
          ac('TOP_POTA_DIBINDE_SAHIPSIZ', saat, 'pota ' + dr.toFixed(0) + ' px · en yakın oyuncu ' + en.toFixed(0) + ' px');
          if (G0.potaOrn.length < 10) G0.potaOrn.push(saat + ' oyuncu ' + en.toFixed(0) + 'px');
        } else kapa('TOP_POTA_DIBINDE_SAHIPSIZ');
      } else kapa('TOP_POTA_DIBINDE_SAHIPSIZ');
      /* ── sayı sonrası taç: skor değişti → sokucunun konumu ölçülür ── */
      const sk = (mState.score || [0, 0]).join('-');
      if (G0.sonSkor !== null && sk !== G0.sonSkor) {
        G0._tacBekle = { saat, t: performance.now() };
      }
      G0.sonSkor = sk;
      /* ⚠ ÖLÇÜM ANI: sokucu daha çizgiye YÜRÜRKEN ölçmek yanlış pozitif üretir
         (o an haklı olarak sahanın içindedir). Doğru an, sokma PASININ atıldığı andır —
         yani top sokucunun elinden çıktığı kare. */
      if (G0._tacBekle && S.inb && S.inb.tok) {
        const inb = S.inb.tok;
        /* sayı olan pota = sokma noktasına en yakın pota */
        const rr = (Math.abs(S.inb.x - 62) < Math.abs(S.inb.x - 878)) ? 62 : 878;
        const d = Math.abs(inb.x - rr);
        const pasAnI = (b.mode === 'pass' && b.from && Math.abs(b.from[0] - inb.x) < 40);
        if (!pasAnI) { /* henüz sokmadı — bekle */ }
        else if (d > 100) {
          ac('SAYI_SONRASI_TAC_YANLIS_YERDE', G0._tacBekle.saat, 'sokucu dip çizgiden ' + d.toFixed(0) + ' px içeride');
          kapa('SAYI_SONRASI_TAC_YANLIS_YERDE');
          if (G0.tacOrn.length < 10) G0.tacOrn.push(G0._tacBekle.saat + ' ' + d.toFixed(0) + 'px');
        }
        if (pasAnI) G0._tacBekle = null;
      }
      if (G0._tacBekle && performance.now() - G0._tacBekle.t > 9000) G0._tacBekle = null;
      /* ── top sıçraması: mod değişmeden 40 px+ ── */
      if (onceki && oncekiMod === b.mode) {
        const d = Math.hypot(b.x - onceki[0], b.y - onceki[1]);
        if (d > 40) { ac('TOP_SICRADI', saat, d.toFixed(0) + ' px · mod=' + b.mode); kapa('TOP_SICRADI'); }
      }
      onceki = [b.x, b.y]; oncekiMod = b.mode;
    } catch (e) { G0.err = String(e); }
  };
  /* ⚠ setInterval: rAF arka plan sekmesinde boğulur ve ölçüm sessizce durur */
  G0._iv = setInterval(tik, 16);
}

async function main() {
  const srv = await sunucu();
  const port = srv.address().port;
  const lo = EXEC ? { executablePath: EXEC, headless: true } : { channel: 'chrome', headless: true };
  const browser = await chromium.launch(lo);
  const hatalar = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => hatalar.push(e.message));
  await page.addInitScript('(' + TOHUM.toString() + ')(' + SEED + ');');
  await page.addInitScript("try{localStorage.setItem('charazay_lang','tr');}catch(e){}");
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Kural FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await page.evaluate(() => { try { showPage('mac'); } catch (e) {} });
  await bekle(250);
  if (PLAYOFF) {
    await page.evaluate(() => {
      try {
        if (!G.season || !G.season.active) { try { startLeagueSeason(); } catch (e) {} }
        let g = 0; while (G.season && G.season.active && g++ < 400) { const m = findNextUserSeasonMatch(); if (!m) break; simulateCpuMatch(m); }
        (G.season.matches || []).forEach(m => { if (!m.played) simulateCpuMatch(m); });
        G.season.active = false; startPlayoffs();
        if (!userPlayoffMatch() && G.playoff && G.playoff.teams) {
          const t = G.playoff.teams.slice(), ben = G.team.isim;
          if (t.indexOf(ben) < 0) {
            t[7] = ben;
            const r0 = [[0, 7], [3, 4], [1, 6], [2, 5]].map(([x, y]) => makeSeries(t[x], t[y], x, y));
            G.playoff = { active: true, year: G.season.year, teams: t, round: 0, rounds: [r0], champion: null, finalStats: {}, mvp: null };
            simPlayoffBotMatches();
          }
        }
      } catch (e) { window.__kgErr = String(e); }
    });
  }
  await page.evaluate('(' + kaydedici.toString() + ')()');
  await page.evaluate((po) => { try { if (po) startPlayoffMatch(); else startMatch(); setMatchRate(1); } catch (e) { window.__kgErr = String(e); } }, PLAYOFF);
  await bekle(SN * 1000);
  const R = await page.evaluate(() => { try { clearInterval(window.__KG._iv); } catch (e) {} Object.keys(window.__KG.acik || {}).forEach(k => { const a = window.__KG.acik[k]; if (a) window.__KG.ep[k].sn += (performance.now() - a.t) / 1000; }); return window.__KG; });
  const err = await page.evaluate(() => window.__kgErr || null);
  await browser.close(); srv.close();

  fs.writeFileSync(path.join(__dirname, 'kural-goz-rapor.json'), JSON.stringify(R, null, 2));
  let dusen = 0;
  const kapi = (tip, epMax, snMax) => {
    const e = R.ep[tip] || { n: 0, sn: 0 };
    const ok = e.n <= epMax && e.sn <= snMax;
    if (!ok) dusen++;
    console.log('  ' + (ok ? '✓' : '✗') + ' ' + tip.padEnd(30) + String(e.n).padStart(4) + ' epizot' + (e.sn).toFixed(1).padStart(9) + ' sn    hedef ≤' + epMax + ' / ≤' + snMax + ' sn');
  };
  console.log('\nKURAL GÖZÜ (FAZ 76) — ' + R.kare + ' örnek / ' + SN + ' sn · tohum ' + SEED + (PLAYOFF ? ' · PLAYOFF' : ' · lig'));
  if (err) console.log('  ⚠ ' + err);
  if (R.err) console.log('  ⚠ kaydedici: ' + R.err);
  console.log('  ── KURAL İHLALLERİ (epizot / toplam saniye) ──');
  kapi('UCLUK_CIZGISINDE_KIMSE_YOK', 25, 40);
  kapi('TOP_POTA_DIBINDE_SAHIPSIZ', 10, 5);
  kapi('SAYI_SONRASI_TAC_YANLIS_YERDE', 0, 0);
  kapi('HAVA_ATISI_MERKEZ_DISI', 0, 0);
  kapi('TOP_SICRADI', 5, 5);
  kapi('BOYADA_3_HUCUMCU', 40, 60);
  console.log('  ── BİLGİ ──');
  console.log('    hava atışında top merkezden: ' + (R.hava == null ? '-' : R.hava + ' px'));
  if (R.ucOrn && R.ucOrn.length) console.log('    üçlük boşluğu örnekleri : ' + R.ucOrn.slice(0, 6).join(' · '));
  if (R.potaOrn && R.potaOrn.length) console.log('    pota dibi örnekleri     : ' + R.potaOrn.slice(0, 6).join(' · '));
  if (R.tacOrn && R.tacOrn.length) console.log('    sayı sonrası taç        : ' + R.tacOrn.slice(0, 6).join(' · '));
  console.log('    sayfa hatası: ' + hatalar.length);
  console.log(dusen ? '\n✗ ' + dusen + ' kapı düştü' : '\n✓ bütün kural kapıları geçti');
  process.exit(dusen ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
