#!/usr/bin/env node
/**
 * Charazay 2.0 — POZİSYON SÜRESİ / TEMPO (FAZ 38 §4)
 *
 * Gerçek basketbolda pozisyon süresi DÜZGÜN DAĞILMAZ, iki tepelidir: geçiş hücumu
 * (5-9 sn) ve set hücumu (14-20 sn). Motorda maliyet `rand(decLo,decHi)` ile düzgün
 * dağıtılıyordu ve pozisyonun TÜRÜNDEN habersizdi — bu yüzden hiçbir pozisyon 9 sn'den
 * kısa süremiyor, yani hızlı hücum maç saatinde TANIM GEREĞİ imkânsız oluyordu.
 *
 * Ölçüt `dtPos` (pozisyonun tamamı). `dt` olayın maç saati PAYIdır, karıştırma (F13-17).
 *
 * Kullanım: node tools/tempo-check.js [--mac=60] [--tohum=20000]
 */
const { ortamKur, kadroUret } = require('./_lib/anlatim-ornek.js');

const arg = (ad, v) => { const m = process.argv.find(a => a.startsWith('--' + ad + '=')); return m ? Number(m.split('=')[1]) : v; };
const MAC = arg('mac', 60);
const TOHUM = arg('tohum', 20000);

const ctx = ortamKur();
const ev = kadroUret(ctx, 0x1111), dep = kadroUret(ctx, 0x2222);

const BANT = [[0, 4], [5, 7], [8, 10], [11, 13], [14, 16], [17, 19], [20, 24], [25, 999]];
const HEDEF = [[1, 2], [12, 16], [14, 18], [15, 18], [16, 19], [15, 18], [12, 16], [0, 2]];
const say = BANT.map(() => 0), sayFb = BANT.map(() => 0);
let n = 0, nFb = 0, top = 0, topFb = 0, mac = 0;

for (let i = 0; i < MAC; i++) {
  const m = ctx.__api.simulateMatch({ homeRoster: ev, awayRoster: dep, homeName: 'A', awayName: 'B', seed: TOHUM + i });
  mac++;
  /* Bir POZİSYON birden çok olay üretir (şut + ribaunt) ve hepsi dtPos taşır; olayı
     pozisyon saymak dağılımı çok-olaylı pozisyonlar lehine çarpıtır. Motor pozisyonu
     damgalıyor (pozIx) — her pozisyon bir kez sayılır. */
  const gorulen = new Set();
  (m.events || []).forEach(e => {
    const d = Number(e.dtPos);
    if (!isFinite(d) || d <= 0) return;
    if (e.pozIx != null) { const k = i + ":" + e.pozIx; if (gorulen.has(k)) return; gorulen.add(k); }
    const fb = !!(e.fbPoz || (e.shot && e.shot.fb));
    const ix = BANT.findIndex(([a, b]) => d >= a && d <= b);
    if (ix >= 0) { say[ix]++; if (fb) sayFb[ix]++; }
    n++; top += d;
    if (fb) { nFb++; topFb += d; }
  });
}
const p = (a, t) => 100 * a / Math.max(1, t);

console.log('\n' + '='.repeat(70));
console.log(`POZİSYON SÜRESİ — ${mac} maç · ${n} pozisyon · tohum ${TOHUM}`);
console.log('='.repeat(70));
let dusen = 0;
console.log('  süre        tümü     hızlı hücum   hedef (tümü)');
BANT.forEach(([a, b], i) => {
  const v = p(say[i], n), vf = p(sayFb[i], nFb);
  /* ── BANT TABLOSU BİLGİDİR, KAPI DEĞİL ────────────────────────────────────────────
     FAZ 38 §4'teki 'Gerçek' sütunu BETİMLEYİCİDİR (toplamı %100 tutmaz, gözlem aralığı
     verir). Brifin İŞ 2 için yazdığı KABUL ölçütü ayrıdır ve üç satırdır: 5-7 bandı
     ≥%10 · hızlı hücumun ortalama süresi ≤9,5 sn · genel ortalama 12,5-14,5 sn.
     Bant başına gömülü eşik kurmak, komşu bantların birbirinden pay çalmasını 'kusur'
     sayar (CLAUDE.md: 'kapı yanlış şeyi ölçerse kusuru KENDİSİ üretir'). */
  const [lo, hi] = HEDEF[i];
  const gec = v >= lo && v <= hi;
  const et = (b > 900 ? (a + '+') : (a + ' - ' + b)) + ' sn';
  console.log('  ' + (gec ? '✓' : '⋯') + ' ' + et.padEnd(11) + ('%' + v.toFixed(1)).padStart(7) +
    ('%' + vf.toFixed(1)).padStart(13) + '     %' + lo + ' - %' + hi);
});
const ortTum = top / Math.max(1, n), ortFb = topFb / Math.max(1, nFb);
const poz = n / Math.max(1, mac);
const kapi = (ad, v, lo, hi, bi) => {
  const gec = v >= lo && v <= hi;
  if (!gec) dusen++;
  console.log('  ' + (gec ? '✓' : '✗') + ' ' + ad.padEnd(30) + v.toFixed(1).padStart(7) + (bi || '') + '   hedef ' + lo + ' - ' + hi + (bi || ''));
};
console.log('');
kapi('5 - 7 sn bandı (§İŞ2 kabul)', p(say[1], n), 10, 100, '%');
kapi('25+ sn (şut saati ihlali payı)', p(say[7], n), 0, 2, '%');
kapi('hızlı hücumun ortalama süresi', ortFb, 0, 9.5, ' sn');
kapi('genel ortalama pozisyon süresi', ortTum, 12.5, 14.5, ' sn');
kapi('pozisyon / maç', poz, 160, 190);
console.log(`\n  bilgi: hızlı hücum pozisyonu ${nFb} (%${p(nFb, n).toFixed(1)})`);
console.log('='.repeat(70));
console.log(dusen ? `✗ ${dusen} hedef düştü` : '✓ tempo dağılımı gerçek bantlarda');
process.exit(dusen ? 1 : 0);
