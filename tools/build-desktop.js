#!/usr/bin/env node
/**
 * Charazay 2.0 — masaüstü (Tauri) dist hazırlığı.
 * Oyunun çalışması için gereken statik dosyaları dist-desktop/ altına toplar:
 *   charazay2.0.html → index.html (ayrıca orijinal adla da kopyalanır; iç linkler bozulmasın)
 *   js/              → js/
 *   assets/          → assets/
 * node_modules, tools, *.bat, rapor/markdown dosyaları PAKETE GİRMEZ.
 * Kullanım: node tools/build-desktop.js   (tauri.conf.json beforeBuildCommand olarak da çağırır)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist-desktop');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const mainHtml = path.join(ROOT, 'charazay2.0.html');
if (!fs.existsSync(mainHtml)) { console.error('charazay2.0.html bulunamadı!'); process.exit(1); }
fs.copyFileSync(mainHtml, path.join(DIST, 'index.html'));
fs.copyFileSync(mainHtml, path.join(DIST, 'charazay2.0.html'));
copyDir(path.join(ROOT, 'js'), path.join(DIST, 'js'));
if (fs.existsSync(path.join(ROOT, 'assets'))) copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));

const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else files.push(p); } })(DIST);
const mb = (files.reduce((a, f) => a + fs.statSync(f).size, 0) / 1048576).toFixed(1);
console.log(`dist-desktop hazır: ${files.length} dosya, ${mb} MB`);
