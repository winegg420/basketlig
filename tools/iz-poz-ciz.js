#!/usr/bin/env node
/**
 * Charazay 2.0 — TEK POZİSYON YÖRÜNGE ÇİZİMİ (FAZ 48 · 3. taş: kendi çıktına bak)
 *   node tools/iz-poz-ciz.js olcum/iz-<etiket>.json --t=93-104 [--t=200-212 ...] [--cikti=olcum/iz-<etiket>-poz]
 * Verilen zaman pencerelerini (sahne sn) ayrı panellere çizer: 5 hücumcu (turuncu), 5 savunmacı
 * (yeşil), top (beyaz). Yol kalınlığı sabit, her 0,5 sn'de nokta (nokta aralığı = hız). Başlangıç
 * "○", bitiş "●". Gerçek veri paneli için `--gercek=<sportvu json> --olay=<eventId>` verilebilir.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const dosya = args.find(a => !a.startsWith('--'));
const pencereler = args.filter(a => a.startsWith('--t=')).map(a => a.slice(4).split('-').map(Number));
const cikti = (args.find(a => a.startsWith('--cikti=')) || '').slice(8) || (dosya ? dosya.replace(/\.json$/, '-poz') : 'olcum/poz');
const gercek = (args.find(a => a.startsWith('--gercek=')) || '').slice(9);
const olayId = (args.find(a => a.startsWith('--olay=')) || '').slice(7);
if (!dosya && !gercek) { console.error('kullanım: node tools/iz-poz-ciz.js olcum/iz-<etiket>.json --t=93-104'); process.exit(2); }
const W = 940, Hh = 500;
function panelIz(K, t1, t2) {
  const F = K.filter(k => k.t >= t1 && k.t <= t2); if (F.length < 5) return '';
  const yol = (pts, renk, kalin) => `<polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${renk}" stroke-width="${kalin}" stroke-linejoin="round" opacity="0.85"/>`;
  let s = '';
  for (let j = 0; j < 10; j++) {
    const pts = F.map(k => k.p[j]).filter(Boolean); const huc = F[Math.floor(F.length / 2)].p[j][2] === 1;
    const renk = huc ? '#f97316' : '#22c55e';
    s += yol(pts, renk, 2);
    let son = -1e9; F.forEach(k => { if (k.t - son >= 0.5) { son = k.t; s += `<circle cx="${k.p[j][0]}" cy="${k.p[j][1]}" r="2.2" fill="${renk}"/>`; } });
    s += `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="7" fill="none" stroke="${renk}" stroke-width="2"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="7" fill="${renk}"/><text x="${pts[pts.length - 1][0] + 9}" y="${pts[pts.length - 1][1] + 4}" font-size="11" fill="#fff">${F[0].p[j][3]}</text>`;
  }
  s += yol(F.map(k => [k.b[0], k.b[1]]), '#ffffff', 1.5);
  return s;
}
function panelGercek(G, eventId, t1, t2) {
  const ev = (G.events || []).find(e => String(e.eventId) === String(eventId)); if (!ev) return '';
  const M = ev.moments.filter(m => m[5] && m[5].length >= 11); const sub = M.filter((m, i) => t1 == null || (i / 25 >= t1 && i / 25 <= t2));
  const sx = (x) => 56.4 + x / 94 * 827.2, sy = (y) => 28.43 + y / 50 * 443.14;
  const ids = sub[0][5].slice(1, 11).map(p => p[1]); const takim0 = sub[0][5][1][0];
  let s = '';
  ids.forEach((pid, j) => {
    const pts = sub.map(m => m[5].find(p => p[1] === pid)).filter(Boolean).map(p => [sx(p[2]), sy(p[3])]); if (pts.length < 3) return;
    const renk = sub[0][5].find(p => p[1] === pid)[0] === takim0 ? '#f97316' : '#22c55e';
    s += `<polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${renk}" stroke-width="2" opacity="0.85"/>`;
    pts.forEach((p, i) => { if (i % 12 === 0) s += `<circle cx="${p[0]}" cy="${p[1]}" r="2.2" fill="${renk}"/>`; });
    s += `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="7" fill="none" stroke="${renk}" stroke-width="2"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="7" fill="${renk}"/>`;
  });
  const top = sub.map(m => [sx(m[5][0][2]), sy(m[5][0][3])]);
  s += `<polyline points="${top.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="#fff" stroke-width="1.5"/>`;
  return s;
}
const saha = `<rect x="56.4" y="28.43" width="827.2" height="443.14" fill="none" stroke="#666"/><line x1="470" y1="28.43" x2="470" y2="471.57" stroke="#666"/><circle cx="470" cy="250" r="53" fill="none" stroke="#666"/><circle cx="102.6" cy="250" r="7" fill="none" stroke="#999"/><circle cx="837.4" cy="250" r="7" fill="none" stroke="#999"/><path d="M56.4 50 L56.4 450" stroke="#666"/><rect x="56.4" y="164" width="171" height="172" fill="none" stroke="#666"/><rect x="712.6" y="164" width="171" height="172" fill="none" stroke="#666"/>`;
(async () => {
  const paneller = [];
  if (dosya) { const K = JSON.parse(fs.readFileSync(dosya, 'utf8')).kare; pencereler.forEach(([a, b]) => paneller.push({ baslik: `${path.basename(dosya)} · ${a}-${b} sn`, svg: panelIz(K, a, b) })); }
  if (gercek) { const G = JSON.parse(fs.readFileSync(gercek, 'utf8')); const ids = olayId ? olayId.split(',') : []; ids.forEach(id => paneller.push({ baslik: `GERÇEK SportVU ${path.basename(gercek)} · olay ${id}`, svg: panelGercek(G, id) })); }
  const html = `<!doctype html><body style="margin:0;background:#111;color:#ddd;font:12px monospace">${paneller.map(p => `<div style="padding:6px"><div>${p.baslik}</div><svg width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">${saha}${p.svg}</svg></div>`).join('')}</body>`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: W + 20, height: (Hh + 30) * paneller.length + 10 } });
  await page.setContent(html); const out = cikti + '.png'; await page.screenshot({ path: out, fullPage: true }); await browser.close();
  console.log('yazıldı: ' + out + ' (' + paneller.length + ' panel)');
})();
