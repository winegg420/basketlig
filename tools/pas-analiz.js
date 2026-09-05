#!/usr/bin/env node
/**
 * Charazay 2.0 — PAS YÖNÜ + SOKMA YERİ ANALİZİ (FAZ 45)
 *   node tools/pas-analiz.js olcum/iz-<etiket>.json [--geri=2] [--liste]
 *
 * `iz-kaydet` kaydını okur:
 *  · GERİ PAS: canlı topta (serbest atış / ölü top sokması hariç) pasın bitiş noktası hücum
 *    edilen potadan başlangıcına göre `--geri` m'den (varsayılan 2) UZAKSA. Her vaka damgalı.
 *  · SOKMA YERİ: çizgi dışı izni (`p[11]`) olan oyuncu topu elinden çıkarırken saha İÇİNDE
 *    miydi (çember altından sokma) — sayı ve damga.
 */
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const dosya = args.find(a => !a.startsWith('--'));
if (!dosya) { console.error('kullanım: node tools/pas-analiz.js olcum/iz-<etiket>.json'); process.exit(2); }
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? +a.split('=')[1] : d; };
const GERI_M = num('geri', 2);
const LISTE = args.includes('--liste');
const PX_M = 29.5429;
const X0 = 56.4, X1 = 883.6, Y0 = 28.43, Y1 = 471.57;
const RIM_L = [102.6, 250], RIM_R = [837.4, 250];
const K = JSON.parse(fs.readFileSync(path.resolve(dosya), 'utf8')).kare;
const tasiyan = (k) => { const P = k.p || []; for (let i = 0; i < P.length; i++) if (P[i] && P[i][4] === 1) return i; return -1; };
const disarida = (x, y) => (x < X0 || x > X1 || y < Y0 || y > Y1);
const rol = (q) => q ? ((q[2] ? 'HUC' : 'SAV') + '/' + q[3]) : '?';

const paslar = [];
for (let i = 1; i < K.length; i++) {
  if (K[i].b[2] !== 'pass' || K[i - 1].b[2] === 'pass') continue;
  const on = K[i - 1];
  let j = i; while (j + 1 < K.length && K[j + 1].b[2] === 'pass') j++;
  const son = K[Math.min(j + 1, K.length - 1)];
  const vi = tasiyan(on), ai = tasiyan(son);
  const rim = on.os ? RIM_L : RIM_R;                      /* os=1: sol potaya hücum */
  const d0 = Math.hypot(on.b[0] - rim[0], on.b[1] - rim[1]);
  const d1 = Math.hypot(K[j].b[0] - rim[0], K[j].b[1] - rim[1]);
  const veren = vi >= 0 ? on.p[vi] : null, alan = ai >= 0 ? son.p[ai] : null;
  paslar.push({
    t: K[i].t, tip: on.tip, uz: +(Math.hypot(K[j].b[0] - on.b[0], K[j].b[1] - on.b[1]) / PX_M).toFixed(1),
    geriM: +((d1 - d0) / PX_M).toFixed(1),
    verenPota: +(d0 / PX_M).toFixed(1),
    oluTop: !!(on.ft === 1 || on.inb === 1 || (veren && veren[11] === 1)),
    ft: on.ft === 1,
    sokma: !!(veren && veren[11] === 1),
    verenDis: veren ? disarida(veren[0], veren[1]) : null,
    verenX: veren ? Math.round(veren[0]) : null, verenY: veren ? Math.round(veren[1]) : null,
    veren: rol(veren), alan: rol(alan), aynıTakim: !!(veren && alan && veren[2] === alan[2]),
    onceMod: on.b[2], cs: on.cs
  });
}
const canli = paslar.filter(p => !p.oluTop && p.aynıTakim);
/* Geri pas: potadan uzaklaşan; İÇERİDEN AÇMA (veren potaya 5 m'den yakın — inside-out) ve ÇEVRE
   ÇEVİRMESİ (ikisi de yayın dışında, fark < 3 m) gerçek basketbolda vardır, sayılmaz. */
const geri = canli.filter(p => p.geriM > GERI_M && p.verenPota >= 5 && !(p.verenPota >= 6.4 && p.geriM < 3));
/* Serbest atış karesindeki paslar (hakem/toplayıcı) ve 2 m altı el değişimleri (hakemin topu
   vermesi) sokma sayılmaz. */
const sokma = paslar.filter(p => p.sokma && !p.ft && p.uz >= 2);
const sokmaIcerden = sokma.filter(p => p.verenDis === false);

/* Sayı sonrası pozisyon başlangıçları: `inb` bayrağının 1→0 düşmesinden sonraki ilk pas */
let inbBas = 0; const sayiSonrasi = [];
for (let i = 1; i < K.length; i++) {
  if (K[i - 1].inb === 1 && K[i].inb === 0) {
    const ilk = paslar.find(p => p.t >= K[i].t && p.t < K[i].t + 6 && !p.ft && p.uz >= 2);
    sayiSonrasi.push({ t: K[i].t, tip: K[i].tip, ilkPas: ilk || null });
  }
}
const ssDis = sayiSonrasi.filter(s => s.ilkPas && s.ilkPas.verenDis === true).length;
const ssIc = sayiSonrasi.filter(s => s.ilkPas && s.ilkPas.verenDis === false).length;

console.log(`PAS ANALİZİ — ${path.basename(dosya)} · ${paslar.length} pas · canlı top aynı takım ${canli.length}`);
console.log(`  GERİ PAS (> ${GERI_M} m potadan uzaklaşan, canlı top): ${geri.length}  (${canli.length ? (100 * geri.length / canli.length).toFixed(1) : 0}%)`);
const bag = {}; geri.forEach(p => { const k = p.tip + (p.cs ? '/set' : '/geçiş'); bag[k] = (bag[k] || 0) + 1; });
console.log('     bağlam: ' + Object.keys(bag).sort((a, b) => bag[b] - bag[a]).map(k => k + ':' + bag[k]).join(' · '));
const rolBag = {}; geri.forEach(p => { const k = p.veren + '→' + p.alan; rolBag[k] = (rolBag[k] || 0) + 1; });
console.log('     kim→kime: ' + Object.keys(rolBag).sort((a, b) => rolBag[b] - rolBag[a]).slice(0, 8).map(k => k + ':' + rolBag[k]).join(' · '));
if (LISTE) geri.forEach(p => console.log(`     ${p.t}s ${p.tip}${p.cs ? '/set' : ''} ${p.veren}→${p.alan} ${p.uz} m, potadan +${p.geriM} m, önce ${p.onceMod}`));
/* Rakibe giden pas (çalma anı böyle çizilmemeli: top hırsıza PASLANMAZ, elden alınır) */
const karsiya = paslar.filter(p => !p.aynıTakim && !p.oluTop && p.veren !== '?' && p.alan !== '?' && p.uz > 3);
console.log(`  RAKİBE PAS (> 3 m, veren ≠ alan takımı): ${karsiya.length}`);
karsiya.forEach(p => console.log(`     ✗ ${p.t}s ${p.tip} ${p.veren}→${p.alan} ${p.uz} m`));
console.log(`  SOKMA (çizgi dışı izinli oyuncunun pası): ${sokma.length} · saha İÇİNDEN: ${sokmaIcerden.length}`);
sokmaIcerden.forEach(p => console.log(`     ✗ ${p.t}s ${p.tip} ${p.veren}→${p.alan} veren (${p.verenX},${p.verenY}) İÇERİDE, ${p.uz} m`));
console.log(`  SAYI SONRASI POZİSYON: ${sayiSonrasi.length} · ilk pas çizgi dışından: ${ssDis} · içeriden: ${ssIc} · pas yok/geç: ${sayiSonrasi.length - ssDis - ssIc}`);
sayiSonrasi.forEach(s => { const p = s.ilkPas; console.log(`     ${p && p.verenDis ? '✓' : '✗'} ${s.t}s ${s.tip} ${p ? p.veren + '→' + p.alan + ' veren (' + p.verenX + ',' + p.verenY + ') ' + (p.verenDis ? 'DIŞARIDA' : 'İÇERİDE') + ' ' + p.uz + ' m' : 'ilk 6 sn pas yok'}`); });
