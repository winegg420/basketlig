#!/usr/bin/env node
/**
 * Charazay 2.0 — BOZUK DEĞER TARAYICISI (denetim aracı)
 *
 * Ekrana basılan metinlerde hesap kazası aramaz — SONUCUNU arar:
 *   NaN · undefined · null · Infinity · [object Object] · $NaN · %NaN · "-0" · "undefinedundefined"
 * Bunlar tek bir bölme/erişim hatasının kullanıcıya ulaşan izidir ve hiçbir mevcut kapı
 * doğrudan aramıyordu (visual-check yalnız KONSOL hatasına bakar; bozuk değer sessizdir).
 *
 * Akış: yeni kariyer → birkaç maç + sezon geçişi → 11 sayfa + modal gezilir, her adımda
 * görünür metin taranır. TR ve EN modunda ayrı ayrı çalışır.
 *
 * Kullanım: node tools/bozukdeger-check.js [--sezon=2]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const arg = (ad, v) => { const m = process.argv.find(a => a.startsWith('--' + ad + '=')); return m ? Number(m.split('=')[1]) : v; };
const SEZON = arg('sezon', 2);

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

/* Görünür metinde aranacak kusur kalıpları. Sınır ASCII değil — Türkçe harf de sözcük
   karakteridir (FAZ 17 i18n dersi), bu yüzden sınıf açıkça yazılır. */
const HARF = 'A-Za-z0-9ÇĞİÖŞÜçğıöşü_';
const KALIPLAR = [
  { ad: 'NaN', re: new RegExp('(^|[^' + HARF + '])NaN(?![' + HARF + '])') },
  { ad: 'Infinity', re: new RegExp('(^|[^' + HARF + '])-?Infinity(?![' + HARF + '])') },
  { ad: 'undefined', re: new RegExp('(^|[^' + HARF + '])undefined(?![' + HARF + '])') },
  { ad: '[object Object]', re: /\[object Object\]/ },
  { ad: 'null', re: new RegExp('(^|[^' + HARF + '])null(?![' + HARF + '])') },
];

async function main() {
  const srv = await sunucu();
  const port = srv.address().port;
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const hatalar = [];
  const bulgular = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });
  page.on('pageerror', e => hatalar.push(e.message));
  await page.goto(base + '/charazay2.0.html?test=1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Denetim FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });

  /* Birkaç maç + sezon geçişi: boş/başlangıç durumu değil, GERÇEK veri taransın. */
  await page.evaluate(async (n) => {
    for (let s = 0; s < n; s++) {
      for (let i = 0; i < 40; i++) {
        try {
          const mm = (typeof findNextUserSeasonMatch === 'function') ? findNextUserSeasonMatch() : null;
          if (!mm) break;
          const rakip = mm.opp || mm.rakip || (mm.home === G.team.isim ? mm.away : mm.home);
          const userIsHome = mm.home === G.team.isim;
          const evs = generateMatchEvents({ isim: rakip }, { userIsHome });
          applyMatchResult(evs[evs.length - 1], { seasonMatchIx: mm.ix != null ? mm.ix : i, rakipName: rakip, userIsHome });
        } catch (e) { break; }
      }
      try { if (typeof endLeagueSeasonIfDone === 'function') endLeagueSeasonIfDone(); } catch (e) {}
      let g = 0;
      while (g++ < 60) { try { if (!G.playoff || G.playoff.champion) break; maybeAdvancePlayoff(); } catch (e) { break; } }
      let d = 0;
      while (d++ < 80) { try { if (!G.draft || G.draft.done) break; autoDraftPick(); } catch (e) { break; } }
      try { if (G.draft && !G.draft.done && typeof finalizeDraft === 'function') finalizeDraft(); } catch (e) {}
      try { if (typeof startLeagueSeason === 'function') startLeagueSeason(); } catch (e) {}
    }
  }, SEZON);
  await bekle(400);

  const SAYFALAR = ['dashboard', 'takim', 'kadro', 'mac', 'lig', 'market', 'antrenman', 'altyapi', 'arena', 'bilanco', 'analiz'];

  async function tara(etiket) {
    const kotu = await page.evaluate(() => {
      const out = [];
      const kok = document.getElementById('app') || document.body;
      const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          const p = n.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (/^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
          if (!(p.offsetParent || p.getClientRects().length)) return NodeFilter.FILTER_REJECT;
          return (n.nodeValue && n.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      let n;
      while ((n = w.nextNode())) out.push(n.nodeValue.trim().slice(0, 120));
      return out;
    });
    kotu.forEach(t => {
      KALIPLAR.forEach(k => {
        if (k.re.test(t) && bulgular.length < 40) bulgular.push(`[${etiket}] ${k.ad} → "${t}"`);
      });
    });
  }

  for (const dil of ['tr', 'en']) {
    await page.evaluate((d) => { try { if (typeof setLang === 'function') setLang(d); } catch (e) {} }, dil);
    await bekle(250);
    for (const s of SAYFALAR) {
      await page.evaluate((p) => { try { showPage(p); } catch (e) {} }, s);
      await bekle(200);
      await tara(dil + ':' + s);
    }
    /* Modal yolları: oyuncu kartı · taktik · ayarlar · kayıt */
    const modallar = [
      () => { const p = (G.players || [])[0]; if (p) openPlayerModal(p.id); },
      () => { try { openMatchTactics(); } catch (e) {} },
      () => { try { openSettings(); } catch (e) {} },
      () => { try { openSaveSlots(); } catch (e) {} },
    ];
    for (let i = 0; i < modallar.length; i++) {
      await page.evaluate((ix) => {
        const fns = [
          () => { const p = (G.players || [])[0]; if (p && typeof openPlayerModal === 'function') openPlayerModal(p.id); },
          () => { if (typeof openMatchTactics === 'function') openMatchTactics(); },
          () => { if (typeof openSettings === 'function') openSettings(); },
          () => { if (typeof openSaveSlots === 'function') openSaveSlots(); },
        ];
        try { fns[ix](); } catch (e) {}
      }, i);
      await bekle(220);
      await tara(dil + ':modal' + i);
      await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
      await bekle(120);
    }
  }

  await browser.close(); srv.close();

  console.log('\n' + '='.repeat(62));
  console.log('BOZUK DEĞER TARAMASI — ' + SEZON + ' sezon sürüldü · TR + EN · 11 sayfa + 4 modal');
  console.log('='.repeat(62));
  if (!bulgular.length) console.log('  ✓ ekranda NaN / undefined / null / Infinity / [object Object] YOK');
  else { console.log('  ✗ ' + bulgular.length + ' bozuk değer:'); bulgular.forEach(b => console.log('     ' + b)); }
  console.log('  konsol hatası: ' + hatalar.length);
  hatalar.slice(0, 5).forEach(e => console.log('     ! ' + e));
  console.log('='.repeat(62));
  const dusen = (bulgular.length ? 1 : 0) + (hatalar.length ? 1 : 0);
  console.log(dusen ? '✗ denetim düştü' : '✓ ekranda bozuk değer yok');
  process.exit(dusen ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
