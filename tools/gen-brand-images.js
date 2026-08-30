#!/usr/bin/env node
/**
 * Charazay 2.0 — MARKA GÖRSELİ ÜRETİCİ (F10-5 / F10-7).
 *
 * Üretilenler (hepsi depoya yazılır, çalışma anında ağ gerekmez):
 *   assets/og-image.png   1200×630  — WhatsApp / X / Discord link önizlemesi
 *   assets/icon-192.png    192×192  — PWA / Android ana ekran
 *   assets/icon-512.png    512×512  — PWA maskable / mağaza
 *
 * Kaynak, aşağıdaki gömülü HTML'dir — yeniden üretmek için:  node tools/gen-brand-images.js
 * (Playwright + sistem Chrome; visual-check.js ile aynı gereksinim.)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');

const FONT = "'Segoe UI',system-ui,-apple-system,sans-serif";
const BG = '#0a0a0f', BG2 = '#16161f', ACCENT = '#f97316', TEXT = '#f1f5f9', TEXT2 = '#94a3b8';

/** Turuncu basketbol topu — oyunun favicon'u ile aynı dil. */
function ball(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="${ACCENT}"/>
      <g stroke="#7c2d12" stroke-width="2.6" fill="none" stroke-linecap="round">
        <circle cx="50" cy="50" r="48"/><path d="M2 50 H98"/><path d="M50 2 V98"/>
        <path d="M16 16 C40 40 40 60 16 84"/><path d="M84 16 C60 40 60 60 84 84"/>
      </g></svg>`;
}

const OG_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:${BG};color:${TEXT};font-family:${FONT};
    display:flex;align-items:center;gap:56px;padding:0 84px;overflow:hidden;position:relative}
  body::before{content:'';position:absolute;inset:0;
    background:radial-gradient(900px 520px at 78% 18%,rgba(249,115,22,.20),transparent 62%),
               linear-gradient(160deg,${BG} 0%,${BG2} 100%)}
  .in{position:relative;z-index:1}
  .art{flex:0 0 300px;display:flex;align-items:center;justify-content:center}
  h1{font-size:82px;line-height:.98;letter-spacing:-2px;font-weight:800}
  h1 span{color:${ACCENT}}
  h2{font-size:31px;font-weight:600;color:${TEXT};margin-top:18px;letter-spacing:-.4px}
  p{font-size:23px;color:${TEXT2};margin-top:14px;line-height:1.45;max-width:640px}
  .tags{display:flex;gap:10px;margin-top:26px;flex-wrap:wrap}
  .tag{font-size:18px;padding:8px 16px;border:1px solid rgba(249,115,22,.45);
    border-radius:999px;color:${ACCENT};background:rgba(249,115,22,.08)}
</style></head><body>
  <div class="art in">${ball(300)}</div>
  <div class="in">
    <h1>CHARAZAY <span>2.0</span></h1>
    <h2>Basketbol Menajerlik Oyunu</h2>
    <p>Kulübünü kur, kadronu yönet, maçları canlı izle ve ligde zirveye çık.</p>
    <div class="tags"><div class="tag">Canlı maç simülasyonu</div><div class="tag">Transfer &amp; altyapı</div><div class="tag">Ücretsiz · tarayıcıda</div></div>
  </div>
</body></html>`;

const ICON_HTML = (size) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${size}px;height:${size}px;background:${BG};display:flex;
    align-items:center;justify-content:center}
</style></head><body>${ball(Math.round(size * 0.78))}</body></html>`;

async function shot(browser, html, w, h, file) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: file, type: 'png' });
  await page.close();
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`  ✓ ${path.relative(ROOT, file)}  ${w}×${h}  ${kb} KB`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    console.log('Marka görselleri üretiliyor…');
    await shot(browser, OG_HTML, 1200, 630, path.join(OUT, 'og-image.png'));
    await shot(browser, ICON_HTML(192), 192, 192, path.join(OUT, 'icon-192.png'));
    await shot(browser, ICON_HTML(512), 512, 512, path.join(OUT, 'icon-512.png'));
  } finally {
    await browser.close();
  }
  console.log('Bitti.');
})().catch((e) => { console.error('HATA:', e.message); process.exit(1); });
