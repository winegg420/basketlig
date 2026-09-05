#!/usr/bin/env node
/**
 * Charazay 2.0 — HAREKET DAĞILIMI ↔ GERÇEK VERİ (FAZ 48 · 2. taş)
 *   node tools/hareket-bant-check.js olcum/iz-<etiket>.json [--esik=0.35]
 * `iz-kaydet` kaydından SportVU ile AYNI tanımlarla dağılımlar çıkarır (maç ölçeğinde: sahne
 * hızı / sahne→maç oranı) ve `tools/_lib/gercek-hareket.json` ile histogram L1 farkını basar
 * (0 = aynı, 2 = ayrık). Kapı: L1 ≤ eşik. Elle yazılmış bant YOK; eşik tek sabittir ve belgelidir.
 * Gerçek veride bulunmayan ölçüt (perde sayısı, şut tipi) kapı DEĞİLDİR.
 */
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const dosya = args.find(a => !a.startsWith('--'));
if (!dosya) { console.error('kullanım: node tools/hareket-bant-check.js olcum/iz-<etiket>.json'); process.exit(2); }
const ESIK = +((args.find(a => a.startsWith('--esik=')) || '--esik=0.35').split('=')[1]);
const GER = JSON.parse(fs.readFileSync(path.join(__dirname, '_lib', 'gercek-hareket.json'), 'utf8'));
const K = JSON.parse(fs.readFileSync(path.resolve(dosya), 'utf8')).kare.filter(k => k && k.saat > 0);
const PX = 29.5429, ORTA = 470;
const RIM = (os) => os ? [102.6, 250] : [837.4, 250];

/* sahne→maç oranı (iz-kaydet ile aynı: çeyrek başına net saat) */
let macSn = 0, duvarSn = 0; { let bq = K[0].q, bi = 0; for (let i = 1; i <= K.length; i++) { if (i === K.length || K[i].q !== bq) { const net = K[bi].saat - K[i - 1].saat, dt = K[i - 1].t - K[bi].t; if (net > 0 && dt > 0) { macSn += net; duvarSn += dt; } if (i < K.length) { bq = K[i].q; bi = i; } } } }
const KAT = duvarSn > 0 ? macSn / duvarSn : 1;

const hist = (edges) => ({ edges, counts: new Array(edges.length - 1).fill(0), n: 0, toplam: 0 });
const ekle = (h, v) => { if (!isFinite(v)) return; h.n++; h.toplam += v; for (let i = 0; i < h.edges.length - 1; i++) { if (v >= h.edges[i] && v < h.edges[i + 1]) { h.counts[i]++; return; } } if (v >= h.edges[h.edges.length - 1]) h.counts[h.counts.length - 1]++; };
const oran = (h) => { const s = h.counts.reduce((a, b) => a + b, 0) || 1; return h.counts.map(c => c / s); };
const L1 = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - (b[i] || 0)), 0);
const O = GER.olcutler;
const H = { savunmaciOn: hist(O.savunmaciOn.edges), savunmaciArka: hist(O.savunmaciArka.edges), hiz: hist(O.hiz.edges), yayilimX: hist(O.yayilimX.edges), yayilimY: hist(O.yayilimY.edges), savunmaci: hist(O.savunmaci.edges), pasPoz: hist(O.pasPoz.edges), tutma: hist(O.tutma.edges), kosan: hist(O.kosan.edges), kesme: hist(O.kesme.edges), sutDuran: hist(O.sutDuran.edges), potaUzaklik: hist(O.potaUzaklik.edges) };

/* hızlar: 100 ms pencere, maç ölçeği */
const tasiyan = (k) => { const P = k.p || []; for (let i = 0; i < P.length; i++) if (P[i] && P[i][4] === 1) return i; return -1; };
const hiz = new Array(K.length);
for (let i = 0; i < K.length; i++) {
  let j = i; while (j > 0 && K[i].t - K[j].t < 0.1) j--;
  const v = new Array(10).fill(0); const dt = K[i].t - K[j].t;
  if (dt >= 0.08) for (let a = 0; a < 10; a++) { const p = K[i].p[a], p0 = K[j].p[a]; if (p && p0) v[a] = Math.hypot(p[0] - p0[0], p[1] - p0[1]) / PX / dt / KAT; }
  hiz[i] = v;
}
let held = 0, ucus = 0, arkaHeld = 0, onHeld = 0; let tutan = -1, tutBas = 0, pasN = 0, os0 = null; let sonKes = -1e9;
const gecen = { G: 0, F: 0, C: 0 };
for (let i = 0; i < K.length; i++) {
  const k = K[i]; const ti = tasiyan(k); const tutuyor = ti >= 0 && k.b[2] === 'held';
  if (tutuyor) held++; else ucus++;
  hiz[i].forEach(v => ekle(H.hiz, v)); ekle(H.kosan, hiz[i].filter(v => v > 2.0).length);
  if (tutuyor) {
    const q = k.p[ti];
    if (ti !== tutan) {
      if (tutan >= 0) { const q0 = K[tutBas].p[tutan]; ekle(H.tutma, (k.t - K[tutBas].t) * KAT); if (q0 && q0[2] === q[2]) pasN++; }
      tutan = ti; tutBas = i;
    }
    const huc = k.p.filter(p => p[2] === q[2]), sav = k.p.filter(p => p[2] !== q[2]);
    if (huc.length === 5) {
      const mx = huc.reduce((s, p) => s + p[0], 0) / 5, my = huc.reduce((s, p) => s + p[1], 0) / 5;
      ekle(H.yayilimX, Math.sqrt(huc.reduce((s, p) => s + (p[0] - mx) ** 2, 0) / 5) / PX);
      ekle(H.yayilimY, Math.sqrt(huc.reduce((s, p) => s + (p[1] - my) ** 2, 0) / 5) / PX);
      const rim = RIM(k.os);
      ekle(H.potaUzaklik, huc.reduce((s, p) => s + Math.hypot(p[0] - rim[0], p[1] - rim[1]), 0) / 5 / PX);
      if (k.t - sonKes >= 1.5 / KAT) { sonKes = k.t; let j = i; while (j > 0 && k.t - K[j].t < 1.5 / KAT) j--; if (K[j].q === k.q) { let kes = 0; huc.forEach(p => { const a = k.p.indexOf(p); if (a === ti) return; const p0 = K[j].p[a]; if (!p0) return; const d0 = Math.hypot(p0[0] - rim[0], p0[1] - rim[1]) / PX, d1 = Math.hypot(p[0] - rim[0], p[1] - rim[1]) / PX; if (d0 - d1 >= 3 && hiz[i][a] > 3) kes++; }); ekle(H.kesme, kes); } }
    }
    if (sav.length) { let m = 1e9; sav.forEach(p => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]) / PX; if (d < m) m = d; }); ekle(H.savunmaci, m);
      const arka = k.os ? (q[0] > ORTA) : (q[0] < ORTA); if (arka) { arkaHeld++; ekle(H.savunmaciArka, m); } else { onHeld++; ekle(H.savunmaciOn, m); } }
  } else if (tutan >= 0 && (k.b[2] === 'loose' || k.b[2] === 'rim' || k.b[2] === 'shot' || k.b[2] === 'idle')) {
    /* uçuş dışı serbest top: tutma segmenti biter */
    ekle(H.tutma, (k.t - K[tutBas].t) * KAT); tutan = -1;
  }
  if (os0 === null) os0 = k.os; else if (k.os !== os0) { ekle(H.pasPoz, pasN); pasN = 0; os0 = k.os; }
  /* şut anı: held → shot */
  if (i > 0 && k.b[2] === 'shot' && K[i - 1].b[2] === 'held') {
    const ti0 = tasiyan(K[i - 1]); if (ti0 >= 0) { const q = K[i - 1].p[ti0]; let duran = 0; K[i - 1].p.forEach((p, a) => { if (a === ti0 || p[2] !== q[2]) return; if (hiz[i - 1][a] < 1.0) duran++; }); ekle(H.sutDuran, duran); }
  }
  /* orta çizgi geçişi (top eldeyken) */
  if (i > 0 && tutuyor) { const x0 = K[i - 1].b[0], x1 = k.b[0]; const gecti = k.os ? (x0 >= ORTA && x1 < ORTA) : (x0 <= ORTA && x1 > ORTA); if (gecti) { const poz = k.p[ti][3]; const s = (poz === 'PG' || poz === 'SG') ? 'G' : (poz === 'C' ? 'C' : 'F'); gecen[s]++; } }
}
const sonuc = []; let dusen = 0;
const satir = (ad, h, ger, etiket) => { const o = oran(h); const l1 = L1(o, ger.oran); const ok = l1 <= ESIK; if (!ok) dusen++; sonuc.push({ ad, l1, ok }); const ort = h.n ? (h.toplam / h.n) : NaN; console.log(`  ${ok ? '✓' : '✗'} ${ad.padEnd(22)} L1 ${l1.toFixed(3).padStart(6)}  (eşik ${ESIK})   ort ${isFinite(ort) ? ort.toFixed(2) : '-'} ↔ gerçek ${ger.ort}${etiket ? '   ' + etiket : ''}   n=${h.n}`); };
console.log(`HAREKET DAĞILIMI ↔ GERÇEK — ${path.basename(dosya)} · ${K.length} kare · sahne→maç ${KAT.toFixed(3)} · gerçek: ${GER.mac} maç / ${GER.kare} kare`);
satir('oyuncu hızı (m/sn)', H.hiz, O.hiz);
satir('yayılım x (m)', H.yayilimX, O.yayilimX);
satir('yayılım y (m)', H.yayilimY, O.yayilimY);
satir('savunmacı mesafesi (m)', H.savunmaci, O.savunmaci);
satir('  ↳ ön sahada (m)', H.savunmaciOn, O.savunmaciOn);
satir('  ↳ arka sahada (m)', H.savunmaciArka, O.savunmaciArka);
satir('pas / pozisyon', H.pasPoz, O.pasPoz);
satir('topu tutma süresi (sn)', H.tutma, O.tutma);
satir('aynı anda koşan', H.kosan, O.kosan);
satir('kesme / 1,5 sn', H.kesme, O.kesme);
satir('şut anında duran', H.sutDuran, O.sutDuran);
satir('potaya uzaklık (m)', H.potaUzaklik, O.potaUzaklik);
const heldOran = held / (held + ucus || 1);
console.log(`  · arka sahada tutma payı    ${(100 * arkaHeld / (arkaHeld + onHeld || 1)).toFixed(1)}% ↔ gerçek ${(O.arkaSaha.tutmaPayi * 100).toFixed(1)}%   (bilgi)`);
console.log(`  · top elde oranı            ${(heldOran * 100).toFixed(1)}% ↔ gerçek ${(O.topElde.heldOran * 100).toFixed(1)}%   (bilgi)`);
const g = gecen.G + gecen.F + gecen.C || 1;
console.log(`  · yarı sahayı geçen         G ${(100 * gecen.G / g).toFixed(0)}% F ${(100 * gecen.F / g).toFixed(0)}% C ${(100 * gecen.C / g).toFixed(0)}% ↔ gerçek G ${(100 * O.gecenPozisyon.G).toFixed(0)}% F ${(100 * O.gecenPozisyon.F).toFixed(0)}% C ${(100 * O.gecenPozisyon.C).toFixed(0)}%   (bilgi)`);
console.log(`  · çıkarılamadı: ${Object.keys(GER.cikarilamadi || {}).join(', ') || '-'}`);
console.log(dusen ? `✗ ${dusen} dağılım eşiğin dışında` : '✓ tüm dağılımlar gerçeğe yakın');
process.exit(dusen ? 1 : 0);
