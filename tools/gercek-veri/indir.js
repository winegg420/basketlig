#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 39 §3.3.1: GERÇEK MAÇ VERİSİ İNDİRİCİ
 *
 * Kaynak: shufinskiy/nba_data (Apache-2.0) — 1996/97 → 2024/25 play-by-play +
 * şut detayları, sezon başına tek `.tar.xz`. Kimlik doğrulaması gerekmez.
 *   https://github.com/shufinskiy/nba_data
 *
 * ⚠ HAM VERİ DEPOYA GİRMEZ. Her şey `tools/gercek-veri/_ham/` altına açılır ve o klasör
 *   `.gitignore` içindedir. Commit edilen tek şey `cikar.js`'in ürettiği toplu
 *   istatistiktir (`tools/_lib/gercek-bantlar.json`).
 *
 * Kullanılan üç veri kümesi:
 *   pbpstats   — pozisyon bazlı: başlangıç türü, süre, bitiş türü (tempo ölçümü buradan)
 *   nbastats   — stats.nba.com play-by-play: olay metinleri (faul/ihlal/mola türleri)
 *   shotdetail — şut şut koordinat + bölge + tip (şut coğrafyası ve isabet buradan)
 *
 * Kullanım:
 *   node tools/gercek-veri/indir.js                 # 2022, 2023, 2024 (varsayılan)
 *   node tools/gercek-veri/indir.js --sezon=2021,2022,2023,2024
 *   node tools/gercek-veri/indir.js --veri=pbpstats,shotdetail
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const HAM = path.resolve(__dirname, '_ham');
const LISTE_URL = 'https://raw.githubusercontent.com/shufinskiy/nba_data/main/list_data.txt';

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const SEZONLAR = arg('sezon', '2022,2023,2024').split(',').map(s => s.trim()).filter(Boolean);
const VERILER = arg('veri', 'pbpstats,nbastats,shotdetail').split(',').map(s => s.trim()).filter(Boolean);

/** Yönlendirmeleri izleyen tek indirici. Ağ hatası sessiz geçilmez — çağıran karar verir. */
function indir(url, hedef, derinlik) {
  return new Promise((res, rej) => {
    if ((derinlik || 0) > 6) return rej(new Error('çok fazla yönlendirme: ' + url));
    https.get(url, { headers: { 'User-Agent': 'charazay-faz39' } }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume();
        return indir(new URL(r.headers.location, url).toString(), hedef, (derinlik || 0) + 1).then(res, rej);
      }
      if (r.statusCode !== 200) { r.resume(); return rej(new Error('HTTP ' + r.statusCode + ' — ' + url)); }
      const toplam = Number(r.headers['content-length']) || 0;
      let alinan = 0, sonYuzde = -1;
      const ws = fs.createWriteStream(hedef);
      r.on('data', c => {
        alinan += c.length;
        if (toplam) {
          const y = Math.floor(alinan / toplam * 10) * 10;
          if (y !== sonYuzde) { sonYuzde = y; process.stdout.write('\r    %' + String(y).padStart(3) + ' (' + (alinan / 1048576).toFixed(1) + ' MB)'); }
        }
      });
      r.pipe(ws);
      ws.on('finish', () => { process.stdout.write('\r'); ws.close(() => res(hedef)); });
      ws.on('error', rej);
    }).on('error', rej);
  });
}

function metinIndir(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'charazay-faz39' } }, r => {
      if (r.statusCode !== 200) { r.resume(); return rej(new Error('HTTP ' + r.statusCode)); }
      let s = ''; r.setEncoding('utf8'); r.on('data', c => s += c); r.on('end', () => res(s));
    }).on('error', rej);
  });
}

(async () => {
  try {
    fs.mkdirSync(HAM, { recursive: true });
    console.log('FAZ 39 — gerçek maç verisi indiriliyor');
    console.log('kaynak : https://github.com/shufinskiy/nba_data (Apache-2.0)');
    console.log('hedef  : ' + HAM + '   (git dışı)');
    console.log('sezon  : ' + SEZONLAR.join(', ') + '   veri: ' + VERILER.join(', '));
    console.log('');

    const liste = await metinIndir(LISTE_URL);
    const harita = {};
    liste.split('\n').forEach(sat => { const i = sat.indexOf('='); if (i > 0) harita[sat.slice(0, i).trim()] = sat.slice(i + 1).trim(); });

    let indirilen = 0, atlanan = 0;
    for (const v of VERILER) {
      for (const sz of SEZONLAR) {
        const ad = v + '_' + sz;
        const csv = path.join(HAM, ad + '.csv');
        if (fs.existsSync(csv) && fs.statSync(csv).size > 1024) { console.log('  = ' + ad + '.csv zaten var (' + (fs.statSync(csv).size / 1048576).toFixed(1) + ' MB)'); atlanan++; continue; }
        const url = harita[ad];
        if (!url) { console.log('  ! ' + ad + ' listede yok — atlandı'); continue; }
        const arsiv = path.join(HAM, ad + '.tar.xz');
        console.log('  → ' + ad);
        await indir(url, arsiv);
        /* GNU tar / bsdtar ikisi de xz açar; ayrı bir bağımlılık eklemiyoruz. */
        /* ⚠ GNU tar (Git Bash) `C:...` biçimini UZAK SUNUCU sanar ("Cannot connect to C").
           Arşivi kendi klasöründen GÖRECELİ adla açıyoruz — hem GNU tar hem bsdtar çalışır. */
        execFileSync('tar', ['-xf', path.basename(arsiv)], { cwd: HAM, stdio: 'inherit' });
        fs.unlinkSync(arsiv);
        if (!fs.existsSync(csv)) { console.log('    ! beklenen dosya çıkmadı: ' + ad + '.csv'); continue; }
        console.log('    ✓ ' + (fs.statSync(csv).size / 1048576).toFixed(1) + ' MB');
        indirilen++;
      }
    }
    console.log('\nbitti — indirilen ' + indirilen + ' · zaten var ' + atlanan);
    console.log('sıradaki adım: node tools/gercek-veri/cikar.js');
  } catch (e) {
    console.error('\nHATA: ' + (e && e.message ? e.message : e));
    process.exit(1);
  }
})();
