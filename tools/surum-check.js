#!/usr/bin/env node
/* FAZ 20 — SÜRÜM DAMGASI DENETÇİSİ  (node tools/surum-check.js [--yaz])
 *
 * NEDEN VAR — pahalı bir ders:
 * FAZ 17B ve FAZ 19'da `js/*.js` değişti ama `charazay2.0.html` içindeki `?v=` ve
 * `sw.js` içindeki SCRIPT_V **53'te kaldı**. PWA service worker JS'i "önce önbellek"
 * ile sunduğu için siteye dönen her kullanıcı FAZ 17 kodunu çalıştırmaya devam etti:
 * maç saati düzeltmesi, market yerli oranı ve eski kayıt temizliği KODDA VARDI ama
 * tarayıcıya hiç ulaşmadı. FAZ 20 brifi bu üç maddeyi "uygulanmamış" diye raporladı —
 * oysa tek eksik sürüm damgasıydı.
 *
 * Bu denetçi iki şeyi sınar:
 *   1) HTML'deki `?v=` ile sw.js'deki SCRIPT_V aynı mı,
 *   2) Yayınlanan dosyaların İÇERİĞİ değiştiği hâlde sürüm aynı mı kalmış.
 *      (2) için dosya içeriklerinin hash'i tools/.surum-hash.json'da tutulur.
 *
 * Sürümü artırdıktan sonra kaydı tazelemek için:  node tools/surum-check.js --yaz
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const KAYIT = path.join(__dirname, '.surum-hash.json');
const HTML = path.join(ROOT, 'charazay2.0.html');
const SW = path.join(ROOT, 'sw.js');

let hata = 0;
const yaz = (ok, s) => { console.log((ok ? '  ✓ ' : '  ✗ ') + s); if (!ok) hata++; };

console.log('FAZ 20 — SÜRÜM DAMGASI DENETİMİ');
console.log('='.repeat(62));

const html = fs.readFileSync(HTML, 'utf8');
const sw = fs.readFileSync(SW, 'utf8');

/* 1) HTML ?v= tekliği ve sw.js ile uyumu */
const surumler = Array.from(new Set((html.match(/\.js\?v=(\d+)/g) || []).map(x => x.split('=')[1])));
const swV = (sw.match(/SCRIPT_V\s*=\s*'(\d+)'/) || [])[1];
yaz(surumler.length === 1, `HTML'de tek sürüm damgası (${surumler.join(', ') || 'yok'})`);
yaz(!!swV && surumler[0] === swV, `sw.js SCRIPT_V=${swV} ile HTML ?v=${surumler[0]} aynı`);
const surum = surumler[0];

/* 2) Yayınlanan dosyaların içeriği ↔ sürüm damgası */
const jsDosyalar = (sw.match(/const JS_FILES = \[([\s\S]*?)\];/) || [, ''])[1]
  .split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
yaz(jsDosyalar.length > 0, `sw.js önbellek listesinde ${jsDosyalar.length} JS dosyası`);

/* HTML'de yüklenen ile sw.js'in önbelleklediği liste aynı olmalı — biri eksikse o dosya
   ya hiç önbelleklenmez ya da eski sürümü servis edilir. */
const htmlJs = (html.match(/<script src="js\/([a-z0-9-]+)\.js\?v=/g) || [])
  .map(x => x.replace(/.*js\//, '').replace(/\.js\?v=/, ''));
const eksikSw = htmlJs.filter(n => jsDosyalar.indexOf(n) < 0);
const eksikHtml = jsDosyalar.filter(n => htmlJs.indexOf(n) < 0);
yaz(eksikSw.length === 0 && eksikHtml.length === 0,
  eksikSw.length || eksikHtml.length
    ? `liste uyuşmuyor — sw.js'te yok: ${eksikSw.join(', ') || '—'} · HTML'de yok: ${eksikHtml.join(', ') || '—'}`
    : 'HTML script listesi ile sw.js önbellek listesi birebir');

const hasher = crypto.createHash('sha256');
[...jsDosyalar.map(n => path.join(ROOT, 'js', n + '.js')), HTML].forEach(f => {
  try { hasher.update(fs.readFileSync(f)); } catch (e) { hasher.update('YOK:' + f); }
});
const simdi = hasher.digest('hex').slice(0, 16);

let kayit = null;
try { kayit = JSON.parse(fs.readFileSync(KAYIT, 'utf8')); } catch (e) {}

if (process.argv.includes('--yaz')) {
  fs.writeFileSync(KAYIT, JSON.stringify({ surum, hash: simdi }, null, 2) + '\n');
  console.log(`  · kayıt tazelendi: sürüm ${surum} · hash ${simdi}`);
} else if (!kayit) {
  console.log('  · kayıt yok — ilk kez çalışıyor, "--yaz" ile oluştur');
} else {
  const icerikDegisti = kayit.hash !== simdi;
  const surumDegisti = kayit.surum !== surum;
  console.log(`  · kayıtlı: sürüm ${kayit.surum} · hash ${kayit.hash}`);
  console.log(`  · şimdi  : sürüm ${surum} · hash ${simdi}`);
  yaz(!(icerikDegisti && !surumDegisti),
    icerikDegisti && !surumDegisti
      ? `YAYIN DOSYALARI DEĞİŞTİ AMA SÜRÜM ${surum}'TE KALDI — service worker eski JS'i servis eder, `
        + 'değişiklik kullanıcıya ULAŞMAZ. HTML ?v= ve sw.js SCRIPT_V artırılmalı.'
      : (icerikDegisti ? `içerik değişti ve sürüm ${kayit.surum} → ${surum} artırıldı`
                       : 'içerik değişmedi, sürüm damgası yerinde'));
}

console.log('\n' + '='.repeat(62));
console.log(hata ? `✗ ${hata} kontrol başarısız` : '✓ sürüm damgası tutarlı');
process.exit(hata ? 1 : 0);
