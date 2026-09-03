#!/usr/bin/env node
/**
 * Charazay 2.0 — İZ GRAFİKLERİ (FAZ 40 · İŞ 0)
 *
 * `tools/iz-kaydet.js` çıktısından iki resim üretir:
 *   olcum/iz-<etiket>-yorunge.png   parke üzerine 10 jetonun ve topun izi (0,4 sn'de bir
 *                                   nokta — nokta ARALIĞI hızdır). Hücum turuncu,
 *                                   savunma yeşil, top kalın turuncu.
 *   olcum/iz-<etiket>-hiz.png       oyuncu ve top hızları, zamana karşı (100 ms pencere).
 *
 * Kullanım: node tools/iz-ciz.js --etiket=temel [--pen=0..N]   (pen: hangi pozisyon dilimi)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'olcum');
const args = process.argv.slice(2);
const str = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? parseFloat(a.split('=')[1]) : d; };
const ETIKET = str('etiket', 'temel');
const PX_M = 29.5429;
const PENCERE_MS = 100;
/* Saha sınırları — match-engine.js CRT_* ile aynı */
const X0 = 56.4, X1 = 883.6, Y0 = 28.43, Y1 = 471.57;

function hiz(K, al) {
  const out = [];
  for (let i = 0; i < K.length; i++) {
    let j = i;
    while (j + 1 < K.length && (K[j + 1].t - K[i].t) * 1000 < PENCERE_MS) j++;
    const dt = K[j].t - K[i].t;
    if (dt < 0.05 || dt > 0.4) { out.push(null); continue; }
    const a = al(K[i]), b = al(K[j]);
    if (!a || !b) { out.push(null); continue; }
    out.push(Math.hypot(b[0] - a[0], b[1] - a[1]) / dt / PX_M);
  }
  return out;
}

function yorungeSvg(K) {
  const W = 940, H = 500;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  s += `<rect width="${W}" height="${H}" fill="#12100e"/>`;
  s += `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="#1d1712" stroke="#6b5a45" stroke-width="2"/>`;
  s += `<line x1="${(X0 + X1) / 2}" y1="${Y0}" x2="${(X0 + X1) / 2}" y2="${Y1}" stroke="#6b5a45" stroke-width="1.5"/>`;
  s += `<circle cx="${(X0 + X1) / 2}" cy="${(Y0 + Y1) / 2}" r="53" fill="none" stroke="#6b5a45" stroke-width="1.5"/>`;
  /* boya (4,9 × 5,8 m) */
  const bw = 5.8 * PX_M, bh = 4.9 * PX_M;
  s += `<rect x="${X0}" y="${(Y0 + Y1) / 2 - bh / 2}" width="${bw}" height="${bh}" fill="none" stroke="#6b5a45" stroke-width="1.5"/>`;
  s += `<rect x="${X1 - bw}" y="${(Y0 + Y1) / 2 - bh / 2}" width="${bw}" height="${bh}" fill="none" stroke="#6b5a45" stroke-width="1.5"/>`;

  const nokta = (pts, renk, r) => {
    let g = `<polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${renk}" stroke-width="${r > 2 ? 2.2 : 1.1}" opacity="${r > 2 ? 0.85 : 0.5}"/>`;
    /* 0,4 sn'de bir nokta */
    pts.forEach((p, i) => { if (p[2]) g += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}" fill="${renk}" opacity="0.9"/>`; });
    return g;
  };
  let sonNokta = -1;
  const isaret = K.map((k, i) => { if (k.t - sonNokta >= 0.4) { sonNokta = k.t; return 1; } return 0; });

  for (let i = 0; i < 10; i++) {
    /* S.players = home.concat(away) — TAKIM sabittir, hücum/savunma her pozisyonda değişir.
       Renk takımı gösterir; hücum yönü yörüngeden zaten okunur. */
    const pts = K.map((k, j) => k.p[i] ? [k.p[i][0], k.p[i][1], isaret[j]] : null).filter(Boolean);
    s += nokta(pts, i < 5 ? '#e8863a' : '#4fa76a', 1.9);
  }
  s += nokta(K.map((k, j) => [k.b[0], k.b[1], isaret[j]]), '#ff9d3d', 3.2);
  s += `<text x="12" y="${H - 12}" fill="#a89880" font-family="monospace" font-size="13">${ETIKET} — yörünge · nokta = 0,4 sn (aralık = hız) · turuncu ev sahibi + top · yeşil deplasman</text>`;
  return s + '</svg>';
}

function hizSvg(K) {
  const W = 1200, H = 460, L = 62, B = 46;
  const topV = hiz(K, k => k.b);
  const oyV = []; for (let i = 0; i < 10; i++) oyV.push(hiz(K, k => k.p[i]));
  const t0 = K[0].t, t1 = K[K.length - 1].t;
  const VMAX = 26;
  const X = t => L + (t - t0) / (t1 - t0) * (W - L - 14);
  const Y = v => H - B - Math.min(v, VMAX) / VMAX * (H - B - 24);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  s += `<rect width="${W}" height="${H}" fill="#12100e"/>`;
  for (let v = 0; v <= VMAX; v += 5) {
    s += `<line x1="${L}" y1="${Y(v)}" x2="${W - 14}" y2="${Y(v)}" stroke="#3a322a" stroke-width="1"/>`;
    s += `<text x="${L - 8}" y="${Y(v) + 4}" fill="#a89880" font-family="monospace" font-size="11" text-anchor="end">${v}</text>`;
  }
  /* gerçek basketbol sprint bandı (maç ölçeği 7,5 m/sn · sahne = ×sahneKat) */
  oyV.forEach(seri => {
    let d = '', acik = false;
    seri.forEach((v, i) => { if (v == null) { acik = false; return; } d += (acik ? 'L' : 'M') + X(K[i].t).toFixed(1) + ',' + Y(v).toFixed(1); acik = true; });
    s += `<path d="${d}" fill="none" stroke="#4fa76a" stroke-width="0.8" opacity="0.45"/>`;
  });
  { let d = '', acik = false;
    topV.forEach((v, i) => { if (v == null) { acik = false; return; } d += (acik ? 'L' : 'M') + X(K[i].t).toFixed(1) + ',' + Y(v).toFixed(1); acik = true; });
    s += `<path d="${d}" fill="none" stroke="#ff9d3d" stroke-width="1.5" opacity="0.95"/>`; }
  s += `<line x1="${L}" y1="${Y(0)}" x2="${W - 14}" y2="${Y(0)}" stroke="#6b5a45" stroke-width="1.5"/>`;
  for (let t = Math.ceil(t0); t <= t1; t += 10) s += `<text x="${X(t)}" y="${H - B + 18}" fill="#a89880" font-family="monospace" font-size="11" text-anchor="middle">${t}s</text>`;
  s += `<text x="12" y="18" fill="#e8dcc8" font-family="monospace" font-size="13">${ETIKET} — hız profili (m/sn, SAHNE ölçeği · 100 ms pencere) · turuncu = TOP · yeşil = oyuncular</text>`;
  s += `<text x="12" y="${H - 10}" fill="#a89880" font-family="monospace" font-size="11">tavan ${VMAX} m/sn'de kırpıldı — bunun üstündeki tepeler ışınlanmadır</text>`;
  return s + '</svg>';
}

(async () => {
  const d = JSON.parse(fs.readFileSync(path.join(OUT, `iz-${ETIKET}.json`), 'utf8'));
  const K = d.kare;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  for (const [ad, svg, w, h] of [['yorunge', yorungeSvg(K), 940, 500], ['hiz', hizSvg(K), 1200, 460]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<body style="margin:0">${svg}</body>`);
    await page.screenshot({ path: path.join(OUT, `iz-${ETIKET}-${ad}.png`) });
    console.log('  yazıldı: olcum/iz-' + ETIKET + '-' + ad + '.png');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
