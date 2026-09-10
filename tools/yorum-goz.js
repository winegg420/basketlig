#!/usr/bin/env node
/**
 * Charazay 2.0 — YORUM GÖZÜ: ANLATIM ↔ SAHNE DENETÇİSİ (FAZ 76)
 *
 * Neden var: anlatım ile sahnenin AYNI maçı anlatıp anlatmadığını hiçbir araç
 * ölçmüyordu. `anlatim-check` metnin kendi tutarlılığına, `balon-check` noktalamaya,
 * `sahne-check` geometriye bakar — ama "spiker 'çembere yükseldi' derken oyuncu
 * gerçekten potanın dibinde miydi" sorusunu kimse sormuyordu.
 *
 * Ölçtükleri:
 *   YAKIN_SUT_UZAKTAN   "turnike/smaç/çembere yükseldi/kanca" derken şut noktası uzakta
 *   UCLUK_YAKINDAN      "üç sayı/üçlük" derken şut noktası yay içinde
 *   SAHADA_OLMAYAN      olayın öznesi o an sahada olmayan bir oyuncu
 *   SKOR_UYUSMAZ        metinde geçen skor ile tabeladaki skor farklı
 *
 * ⚠ ÖZNE AYRIŞTIRMASI GÜRÜLTÜLÜDÜR: değişiklik satırlarında kenara çıkan oyuncunun adı
 *   doğal olarak geçer ve "Top Min'in" gibi kalıplar isim sanılabilir. Bu yüzden özne
 *   YALNIZ olay nesnesinden (`ev.sid` / `ev.rebId` / şutörün kimliği) okunur, metinden
 *   ad ayıklanmaz — metinden ad çıkarmak yanlış pozitif üretir (brifin kendi uyarısı).
 *
 * ⚠ setInterval(16) kullanır (rAF arka planda boğulur).
 *
 * Kullanım: node tools/yorum-goz.js [--sn=300] [--playoff] [--seed=...] [--exec=...]
 * Ham döküm: tools/yorum-goz-rapor.json
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
  const Y = window.__YG = { n: 0, sayac: {}, olay: [], gecikme: [] };
  const YAKIN = /turnike|smaç|smac|çembere yükseld|cembere yukseld|kanca|tip-?in|potaya yükseld/i;
  const UCLUK = /üç sayı|uc sayi|üçlük|uclук|üçlüğ/i;
  const kay = (tip, bilgi) => { Y.sayac[tip] = (Y.sayac[tip] || 0) + 1; if (Y.olay.length < 200) Y.olay.push({ tip, bilgi }); };
  let sonN = 0;
  const tik = () => {
    try {
      const S = mState && mState._sim; if (!S) return;
      Y.n++;
      const el = Array.from(document.querySelectorAll('#commentary .ci'));
      if (el.length === sonN) return;
      /* balonlar listenin BAŞINA eklenir — yeni gelenler baştadır */
      const yeni = el.slice(0, Math.max(0, el.length - sonN));
      sonN = el.length;
      const ev = (mState.events && mState.events[Math.max(0, (mState.idx | 0) - 1)]) || null;
      for (const e of yeni) {
        const txt = (e.textContent || '').trim();
        if (!txt) continue;
        /* şut olayıysa gerçek şut noktasının potaya uzaklığı */
        let d = null, rim = null;
        try { if (S.offSide != null && typeof _rim === 'function') rim = _rim(S.offSide); } catch (er) {}
        const sh = ev && ev.shots && ev.shots[0];
        if (sh && rim && isFinite(sh.x)) d = Math.hypot(sh.x - rim[0], sh.y - rim[1]);
        /* ⚠ İKİ AYRI MESAFE: (a) motorun ŞUT NOKTASI — anlatımın öznesi budur;
           (b) o an topu tutan JETONUN potaya uzaklığı — kullanıcının EKRANDA gördüğü.
           İkisi ayrışıyorsa metin doğru ama SAHNE geride demektir (brifin 750/782 px'lik
           vakaları bu ikincisiydi). Ayrı sayılır ki kök neden karışmasın. */
        if (rim && S.ball) {
          const c = S.ball.carrier;
          const dc = c && isFinite(c.x) ? Math.hypot(c.x - rim[0], c.y - rim[1]) : null;
          if (dc != null && YAKIN.test(txt) && dc > 300) kay('SAHNE_GERIDE', Math.round(dc) + ' px (taşıyıcı) · ' + txt.slice(0, 50));
        }
        if (d != null) {
          if (YAKIN.test(txt) && d > 200) kay('YAKIN_SUT_UZAKTAN', Math.round(d) + ' px · ' + txt.slice(0, 60));
          if (UCLUK.test(txt) && d < 190) kay('UCLUK_YAKINDAN', Math.round(d) + ' px · ' + txt.slice(0, 60));
        }
        /* olayın öznesi sahada mı — ad METİNDEN ayıklanmaz, olay nesnesinden okunur */
        const kimlik = (sh && sh.sid != null) ? sh.sid : (ev && ev.rebId != null ? ev.rebId : null);
        if (kimlik != null) {
          const sahada = (S.players || []).some(p => p && p.pl && p.pl.id === kimlik);
          if (!sahada) kay('SAHADA_OLMAYAN', String(kimlik) + ' · ' + txt.slice(0, 50));
        }
        /* metinde skor geçiyorsa tabelayla karşılaştır */
        const m = txt.match(/(\d{2,3})\s*[-–]\s*(\d{2,3})/);
        if (m && mState.score) {
          const a2 = +m[1], b2 = +m[2], s0 = mState.score[0], s1 = mState.score[1];
          if (!((a2 === s0 && b2 === s1) || (a2 === s1 && b2 === s0))) kay('SKOR_UYUSMAZ', m[0] + ' ↔ tabela ' + s0 + '-' + s1);
        }
      }
    } catch (er) { Y.err = String(er); }
  };
  Y._iv = setInterval(tik, 16);
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
  await page.fill('#teamName', 'Yorum FK');
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
      } catch (e) {}
    });
  }
  await page.evaluate('(' + kaydedici.toString() + ')()');
  await page.evaluate((po) => { try { if (po) startPlayoffMatch(); else startMatch(); setMatchRate(1); } catch (e) { window.__ygErr = String(e); } }, PLAYOFF);
  await bekle(SN * 1000);
  const R = await page.evaluate(() => { try { clearInterval(window.__YG._iv); } catch (e) {} return window.__YG; });
  await browser.close(); srv.close();

  fs.writeFileSync(path.join(__dirname, 'yorum-goz-rapor.json'), JSON.stringify(R, null, 2));
  let dusen = 0;
  const kapi = (tip, max) => {
    const n = R.sayac[tip] || 0; const ok = n <= max; if (!ok) dusen++;
    console.log('  ' + (ok ? '✓' : '✗') + ' ' + tip.padEnd(22) + String(n).padStart(4) + '    hedef ≤' + max);
  };
  console.log('\nYORUM GÖZÜ (FAZ 76) — ' + SN + ' sn · tohum ' + SEED + (PLAYOFF ? ' · PLAYOFF' : ' · lig'));
  if (R.err) console.log('  ⚠ kaydedici: ' + R.err);
  console.log('  ── ANLATIM ↔ SAHNE ──');
  kapi('YAKIN_SUT_UZAKTAN', 0);
  kapi('UCLUK_YAKINDAN', 0);
  kapi('SAHADA_OLMAYAN', 0);
  kapi('SKOR_UYUSMAZ', 0);
  kapi('SAHNE_GERIDE', 0);
  (R.olay || []).slice(0, 10).forEach(o => console.log('      ' + o.tip + '  ' + o.bilgi));
  console.log('    sayfa hatası: ' + hatalar.length);
  console.log(dusen ? '\n✗ ' + dusen + ' kapı düştü' : '\n✓ anlatım ile sahne uyuşuyor');
  process.exit(dusen ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
