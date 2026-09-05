#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 48 GERÇEK HAREKET VERİSİ İNDİRİCİ (SportVU 2015-16, 25 kare/sn)
 *   node tools/gercek-hareket/indir.js [--n=10] [--7z=<7zr.exe yolu>]
 * Kaynak: github.com/linouk23/NBA-Player-Movements (7z başına bir maç, JSON) +
 *         sumitrodatta/nba-alt-awards 2015-16 play-by-play CSV.
 * Ham veri `tools/gercek-hareket/_ham/` altına iner ve `.gitignore`'dadır — lisansı belirsiz,
 * DEPOYA KOYMA. Yalnız türetilmiş toplu istatistikler (`tools/_lib/gercek-hareket.json`) commit edilir.
 * 7z açmak için 7zr.exe (7-zip.org, kamu malı) gerekir: --7z ile yol ver.
 */
const fs = require('fs'), path = require('path'), https = require('https'), { execFileSync } = require('child_process');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? +a.split('=')[1] : d; };
const str = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const N = num('n', 10);
const SEVENZ = str('7z', '7zr.exe');
const HAM = path.join(__dirname, '_ham');
fs.mkdirSync(HAM, { recursive: true });
const LISTE = 'https://api.github.com/repos/linouk23/NBA-Player-Movements/contents/data/2016.NBA.Raw.SportVU.Game.Logs';
const PBP = 'https://github.com/sumitrodatta/nba-alt-awards/raw/main/Historical/PBP%20Data/2015-16_pbp.csv';

function al(url, hedef) {
  return new Promise((resolve, reject) => {
    const git = (u) => https.get(u, { headers: { 'User-Agent': 'charazay-olcum', 'Accept': 'application/vnd.github+json' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return git(res.headers.location);
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' ' + u));
      if (hedef) { const w = fs.createWriteStream(hedef); res.pipe(w); w.on('finish', () => resolve(hedef)); w.on('error', reject); }
      else { let s = ''; res.setEncoding('utf8'); res.on('data', d => s += d); res.on('end', () => resolve(s)); }
    }).on('error', reject);
    git(url);
  });
}
(async () => {
  const liste = JSON.parse(await al(LISTE));
  /* sezona yayılmış alt küme: eşit aralıkla N maç */
  const adim = Math.max(1, Math.floor(liste.length / N));
  const secim = liste.filter((_, i) => i % adim === 0).slice(0, N);
  console.log(`toplam ${liste.length} maç · seçilen ${secim.length}`);
  for (const f of secim) {
    const yol7 = path.join(HAM, f.name);
    const json = path.join(HAM, f.name.replace(/\.7z$/, '.json'));
    if (fs.existsSync(json)) { console.log('var: ' + f.name); continue; }
    process.stdout.write('indiriliyor ' + f.name + ' (' + (f.size / 1e6).toFixed(1) + ' MB) … ');
    await al(f.download_url, yol7);
    execFileSync(SEVENZ, ['e', '-y', '-o' + HAM, yol7], { stdio: 'ignore' });
    /* arşivin içindeki json adı farklı olabilir: en yeni .json'u maç adına taşı */
    const jsons = fs.readdirSync(HAM).filter(x => x.endsWith('.json') && !fs.existsSync(path.join(HAM, x.replace(/\.json$/, '.7z'))) && x !== path.basename(json));
    const ic = jsons.map(x => ({ x, t: fs.statSync(path.join(HAM, x)).mtimeMs })).sort((a, b) => b.t - a.t)[0];
    if (ic && !fs.existsSync(json)) fs.renameSync(path.join(HAM, ic.x), json);
    fs.unlinkSync(yol7);
    console.log('tamam → ' + path.basename(json));
  }
  const pbp = path.join(HAM, '2015-16_pbp.csv');
  if (!fs.existsSync(pbp)) { process.stdout.write('play-by-play CSV … '); await al(PBP, pbp); console.log('tamam'); }
  console.log('bitti: ' + HAM);
})().catch(e => { console.error(e); process.exit(1); });
