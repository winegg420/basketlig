#!/usr/bin/env node
/**
 * ŞARTNAME TANI ARACI (FAZ 80) — tools/sartname-tani.js
 *
 * NEDEN VAR: `tools/sartname.js` kabul ölçütüdür ve DOKUNULMAZ; ama kusuru NEREDE
 * arayacağımı söylemez. Bu araç ŞARTNAMENİN AYNI FORMÜLLERİNİ kullanır ve her kalemi
 * **KLİP ve FİZİK kareleri AYRI** raporlar (FAZ 71 dersi: klip, gerçek SportVU
 * kaydının birebir oynatılmasıdır ve aynı koşunun kontrol grubudur).
 *
 * ⚠ Şartnamenin B · C · K7 kalemlerinde klip muafiyeti YOKTUR ve klip kareleri maçın
 *   ~%50'sidir. Bir kalem klip karelerinde de düşüyorsa eşik gerçek basketbolun
 *   altındadır ve kodu ona ayarlamak oyunu gerçeklikten UZAKLAŞTIRIR (FAZ 39 dersi).
 *
 * Kullanım: node tools/sartname-tani.js [--sn=300] [--playoff] [--seed=987654321]
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
  const CRT = { x0: 56.4, x1: 883.6, y0: 28.43, y1: 471.57 };
  const RIM_L = [102.6, 250], RIM_R = [837.4, 250];
  const MID = 470, UCLUK = 209, JETON = 26.2;
  const T = window.__tani = { kare: 0, klip: 0, k: {}, ek: {}, orn: {} };
  const mes = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const raketMi = (x, y, r) => Math.abs(x - r[0]) <= 172 && Math.abs(y - r[1]) <= 74;
  /* pay(ad, dogruMu, klipMi): her kalem klip/fizik paydalarıyla */
  const pay = (ad, v, klip) => {
    const o = T.k[ad] || (T.k[ad] = { n: 0, h: 0, nk: 0, hk: 0, nf: 0, hf: 0 });
    o.n++; if (klip) o.nk++; else o.nf++;
    if (v) { o.h++; if (klip) o.hk++; else o.hf++; }
  };
  const dizi = (ad, v, klip) => { const o = T.ek[ad] || (T.ek[ad] = { t: 0, n: 0, tk: 0, nk: 0, tf: 0, nf: 0 }); o.t += v; o.n++; if (klip) { o.tk += v; o.nk++; } else { o.tf += v; o.nf++; } };
  const orn = (ad, s) => { const a = T.orn[ad] || (T.orn[ad] = []); if (a.length < 8) a.push(s); };

  const tik = () => {
    try {
      const S = mState && mState._sim; if (!S || !mState.running) return;
      const P = S.players, b = S.ball; if (!P || P.length < 10 || !b) return;
      const klip = !!S._klipTop || P.some(p => p && p._klip);
      const off = S.offP || [], def = S.defP || [];
      if (S.offSide == null || off.length !== 5 || def.length !== 5) return;
      const pt = S.offSide ? RIM_L : RIM_R;   /* offSide=true → sola hücum → RIM_L */
      T.kare++; if (klip) T.klip++;
      const sagaHucum = pt[0] > MID;
      const saat = ((document.getElementById('liveTime') || {}).textContent || '').trim();
      const oamFaz = S.oam && S.oam.aktif ? ('oam:' + S.oam.faz) : (klip ? 'klip' : 'bekle');

      /* ── B1 / B4 / B5 / B6 / B7 ── */
      let eslenen = 0, onde = 0, ustunde = 0, savunmasiz = 0, ikili = 0;
      for (const a of off) {
        let m = 1e9, en = null;
        for (const d2 of def) { const dd = mes([a.x, a.y], [d2.x, d2.y]); if (dd < m) { m = dd; en = d2; } }
        if (m <= 90) eslenen++;
        if (m < 20) ustunde++;
        if (m > 150) savunmasiz++;
        if (en) { if (mes([en.x, en.y], pt) < mes([a.x, a.y], pt)) onde++; }
        let c2 = 0; for (const d2 of def) if (mes([a.x, a.y], [d2.x, d2.y]) < 60) c2++;
        if (c2 >= 2) ikili++;
      }
      pay('B1', eslenen === 5, klip);
      dizi('B1_eslenenSayi', eslenen, klip);
      pay('B4', onde >= 3, klip);
      pay('B5', ustunde > 0, klip);
      pay('B6', ikili > 0, klip);
      pay('B7_kare', savunmasiz > 0, klip);
      if (eslenen < 5 && T.orn.B1 === undefined) orn('B1', saat + ' eşlenen ' + eslenen + '/5 · faz ' + oamFaz);

      /* ── B2 topu tutanın savunması (ön/arka saha ayrı) ── */
      if (b.carrier && off.indexOf(b.carrier) >= 0) {
        let m = 1e9; for (const d2 of def) m = Math.min(m, mes([b.carrier.x, b.carrier.y], [d2.x, d2.y]));
        dizi('B2', m, klip);
        const onSaha = sagaHucum ? (b.carrier.x > MID) : (b.carrier.x < MID);
        dizi(onSaha ? 'B2_on' : 'B2_arka', m, klip);
      }

      /* ── B3 / B10 savunmanın yarı sahası ── */
      let kendiYarida = 0, rakipYarida = 0;
      for (const d2 of def) {
        if (sagaHucum ? d2.x > MID : d2.x < MID) kendiYarida++; else rakipYarida++;
      }
      pay('B3', kendiYarida === 5, klip);
      pay('B10', rakipYarida >= 3, klip);
      dizi('B10_rakipYarida', rakipYarida, klip);
      /* B10 hangi fazda bozuluyor */
      if (rakipYarida >= 3) { const o = T.ek['B10_faz_' + oamFaz] || (T.ek['B10_faz_' + oamFaz] = { t: 0, n: 0, tk: 0, nk: 0, tf: 0, nf: 0 }); o.t++; o.n++; }
      { const o = T.ek['B10_fazTum_' + oamFaz] || (T.ek['B10_fazTum_' + oamFaz] = { t: 0, n: 0, tk: 0, nk: 0, tf: 0, nf: 0 }); o.t++; o.n++; }

      /* ── B12 savunmacı çakışması ── */
      let bc = false;
      for (let i = 0; i < 5 && !bc; i++) for (let j = i + 1; j < 5; j++) if (mes([def[i].x, def[i].y], [def[j].x, def[j].y]) < JETON) { bc = true; break; }
      pay('B12', bc, klip);

      /* ── C1 / C2 / C3 / C8 / C10 ── */
      const dler = off.map(p => mes([p.x, p.y], pt));
      pay('C1', Math.max.apply(null, dler) < UCLUK, klip);
      let raket = 0; for (const p of off) if (raketMi(p.x, p.y, pt)) raket++;
      pay('C2', raket >= 3, klip);
      dizi('C2_raketSayi', raket, klip);
      let cak = false;
      for (let i = 0; i < 5 && !cak; i++) for (let j = i + 1; j < 5; j++) if (mes([off[i].x, off[i].y], [off[j].x, off[j].y]) < 30) { cak = true; break; }
      pay('C3', cak, klip);
      let kose = 0; for (const p of off) if ((p.y < 100 || p.y > 400) && mes([p.x, p.y], pt) < 230) kose++;
      pay('C8', kose >= 1, klip);
      const piv = off.filter(p => p.role === 4); if (piv.length) dizi('C10', mes([piv[0].x, piv[0].y], pt), klip);
      const piv34 = off.filter(p => p.role === 3 || p.role === 4);
      piv34.forEach(p => dizi('C10_rol34', mes([p.x, p.y], pt), klip));

      /* ── C5 orta saha ── */
      let orta = 0; for (const p of P) if (Math.abs(p.x - MID) < 120) orta++;
      pay('C5', orta >= 6, klip);

      /* ── K7 / J4 jeton çakışması (K7 KLİP DAHİL — şartname böyle) ── */
      let k7 = false, j4 = false;
      for (let i = 0; i < P.length && !k7; i++) for (let j = i + 1; j < P.length; j++) if (mes([P[i].x, P[i].y], [P[j].x, P[j].y]) < JETON) { k7 = true; break; }
      for (let i = 0; i < P.length && !j4; i++) for (let j = i + 1; j < P.length; j++) { if (P[i]._klip || P[j]._klip) continue; if (mes([P[i].x, P[i].y], [P[j].x, P[j].y]) < 17) { j4 = true; break; } }
      pay('K7', k7, klip);
      pay('J4', j4, klip);
      /* K7 çizim katmanında (kullanıcının GÖRDÜĞÜ) */
      let k7c = false;
      for (let i = 0; i < P.length && !k7c; i++) for (let j = i + 1; j < P.length; j++) {
        const ax = P[i].x + (P[i]._cizDx || 0), ay = P[i].y + (P[i]._cizDy || 0);
        const bx = P[j].x + (P[j]._cizDx || 0), by = P[j].y + (P[j]._cizDy || 0);
        if (Math.hypot(ax - bx, ay - by) < JETON) { k7c = true; break; }
      }
      pay('K7_cizim', k7c, klip);

      /* ── E3 boyada kalış (hangi rol) ── */
      for (const p of off) {
        const k = 'E3r' + p.role;
        if (raketMi(p.x, p.y, pt)) { T.ek[k] = T.ek[k] || { t: 0, n: 0, tk: 0, nk: 0, tf: 0, nf: 0 }; T.ek[k].t += 0.016; T.ek[k].n++; }
      }
    } catch (e) { T.err = String(e); }
  };
  T._iv = setInterval(tik, 16);
}

async function main() {
  const srv = await sunucu();
  const port = srv.address().port;
  const lo = EXEC ? { executablePath: EXEC, headless: true } : { channel: 'chrome', headless: true };
  const browser = await chromium.launch(lo);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript('(' + TOHUM.toString() + ')(' + SEED + ');');
  await page.addInitScript("try{localStorage.setItem('charazay_lang','tr');}catch(e){}");
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Tani FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} try { showPage('mac'); } catch (e) {} });
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
      } catch (e) { window.__taniErr = String(e); }
    });
  }
  await page.evaluate('(' + kaydedici.toString() + ')()');
  await page.evaluate((po) => { try { if (po) startPlayoffMatch(); else startMatch(); setMatchRate(1); } catch (e) { window.__taniErr = String(e); } }, PLAYOFF);
  await bekle(SN * 1000);
  const R = await page.evaluate(() => { try { clearInterval(window.__tani._iv); } catch (e) {} const t = window.__tani; return { kare: t.kare, klip: t.klip, k: t.k, ek: t.ek, orn: t.orn, err: t.err }; });
  await browser.close(); srv.close();

  fs.writeFileSync(path.join(__dirname, 'sartname-tani-rapor.json'), JSON.stringify(R, null, 1));
  const pct = (h, n) => n ? (h / n * 100).toFixed(1) + '%' : '   -  ';
  console.log('\nŞARTNAME TANI — ' + R.kare + ' kare · klip %' + (R.klip / Math.max(1, R.kare) * 100).toFixed(1) + ' · ' + SN + ' sn' + (PLAYOFF ? ' · PLAYOFF' : ''));
  if (R.err) console.log('  ⚠ ' + R.err);
  console.log('\n  KARE PAYI              TOPLAM    KLİP(gerçek)   FİZİK(bizim)   hedef');
  const H = { B1: '≥%70 ok', B3: '≥%85 ok', B4: '≥%65 ok', B5: '≤%3', B6: '≤%10', B7_kare: '—', B10: '≤%10', B12: '≤%3', C1: '≤%3', C2: '≤%8', C3: '≤%2', C5: '≤%4', C8: '≥%20 ok', K7: '≤%3', K7_cizim: '(bilgi)', J4: '≤%1' };
  Object.keys(H).forEach(k => {
    const o = R.k[k]; if (!o) return;
    console.log('  ' + k.padEnd(20) + pct(o.h, o.n).padStart(8) + pct(o.hk, o.nk).padStart(14) + pct(o.hf, o.nf).padStart(14) + '   ' + H[k]);
  });
  console.log('\n  ORTALAMA               TOPLAM    KLİP        FİZİK');
  ['B1_eslenenSayi', 'B2', 'B2_on', 'B2_arka', 'B10_rakipYarida', 'C2_raketSayi', 'C10', 'C10_rol34'].forEach(k => {
    const o = R.ek[k]; if (!o) return;
    const f = (t, n) => n ? (t / n).toFixed(1) : '-';
    console.log('  ' + k.padEnd(20) + String(f(o.t, o.n)).padStart(8) + String(f(o.tk, o.nk)).padStart(12) + String(f(o.tf, o.nf)).padStart(12) + '   n=' + o.n);
  });
  console.log('\n  B10 FAZ KIRILIMI (savunmanın 3+ oyuncusu rakip yarıda):');
  Object.keys(R.ek).filter(k => k.indexOf('B10_faz_') === 0).forEach(k => {
    const ad = k.replace('B10_faz_', ''); const tum = R.ek['B10_fazTum_' + ad];
    console.log('    ' + ad.padEnd(14) + pct(R.ek[k].t, tum ? tum.t : 0).padStart(8) + '  (' + R.ek[k].t + '/' + (tum ? tum.t : 0) + ')');
  });
  console.log('\n  BOYADA KALIŞ (rol başına toplam sn):');
  Object.keys(R.ek).filter(k => k.indexOf('E3r') === 0).sort().forEach(k => console.log('    ' + k + ' : ' + R.ek[k].t.toFixed(1) + ' sn'));
  console.log('\n  ÖRNEKLER:');
  Object.keys(R.orn).forEach(k => console.log('    ' + k + ': ' + R.orn[k].slice(0, 4).join(' · ')));
  console.log('\n  ham: tools/sartname-tani-rapor.json');
}
main().catch(e => { console.error(e); process.exit(2); });
