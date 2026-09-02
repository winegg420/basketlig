#!/usr/bin/env node
/**
 * Charazay 2.0 — ŞUT COĞRAFYASI · TİP · HIZLI HÜCUM · POZİSYON KİLİDİ (FAZ 37 §6/§5/§10)
 *
 * `sut-check` tipin KENDİ İÇİNDE tutarlı olduğunu sınar (smaç dili yalnız smaçta vb.);
 * bu araç DAĞILIMI sınar: şut nereden geliyor, hangi tiple, ne kadarı hızlı hücum,
 * üçlükleri kim atıyor. 15+ maç · 1.500+ şut.
 *
 * ⚠ HEDEF BANTLARI BRİFTEN TÜRETİLİR AMA BİR KISITA ÖLÇEKLENİR: üçlük DENEMESİ payı
 *   sayıyı belirler (`is3` → 2 mi 3 mü), yani maç sonucu matematiğinin parçasıdır ve
 *   FAZ 37 §1 kırmızı çizgisi gereği DEĞİŞTİRİLEMEZ. Motorun üçlük payı %27,9; brifin
 *   tablosu ise %33-38 varsayıyor. İki sayılık bölge/tip hedefleri bu yüzden kalan paya
 *   ölçeklenir — brifin oranları korunur, toplam 100 tutar. Aynı gerekçe tip-in için de
 *   geçerlidir: tip-in yalnız hücum ribaundundan gelir, hücum ribaundu sıklığı ise sonuç
 *   matematiğindedir (bkz. PROGRESS.md FAZ 37).
 *
 * Kullanım: node tools/sut-cografya-check.js [--mac=15]
 */
const { ortamKur, kadroUret } = require('./_lib/anlatim-ornek.js');

const arg = (ad, v) => { const m = process.argv.find(a => a.startsWith('--' + ad + '=')); return m ? Number(m.split('=')[1]) : v; };
const MAC = arg('mac', 15);

const ctx = ortamKur();
const ev = kadroUret(ctx, 0x1111), dep = kadroUret(ctx, 0x2222);

const say = {}, inc = (k, n) => { say[k] = (say[k] || 0) + (n == null ? 1 : n); };
let sut = 0, fb = 0, fb3 = 0, uc = 0, ast = 0;
const uc3Poz = {}, astPoz = {};
/* FAZ 37 §10: POZİSYON-ŞUT KİLİDİ. Pivotun üçlüğü ŞU AN doğru çalışıyor (%0,8) —
   bu kapı onu KORUR. Şut nesnesi pozisyonu taşımadığı için id → pozisyon eşlemesi
   kadrodan kurulur (iki kadro da bu araçta zaten üretiliyor). */
const POZ = {};
[ev, dep].forEach(r => (r || []).forEach(pl => { if (pl && pl.id != null) POZ[pl.id] = pl.poz; }));
const pozAl = id => POZ[id] || null;
for (let i = 0; i < MAC; i++) {
  const m = ctx.__api.simulateMatch({ homeRoster: ev, awayRoster: dep, homeName: 'A', awayName: 'B', seed: 20000 + i });
  (m.events || []).forEach(e => {
    const s = e.shot; if (!s) return;
    sut++;
    inc('z:' + s.zone); inc('t:' + (s.sut || '-'));
    if (s.fb) { fb++; if (s.kind === '3') fb3++; }
    if (s.kind === '3') {
      uc++;
      const poz = pozAl(s.sid);
      if (poz) uc3Poz[poz] = (uc3Poz[poz] || 0) + 1;
    }
    if (s.pid != null) { const pz = pozAl(s.pid); if (pz) { ast++; astPoz[pz] = (astPoz[pz] || 0) + 1; } }
  });
}
const pct = n => 100 * (n || 0) / sut;
const f = n => pct(n).toFixed(1) + '%';

/* İki sayılık payı: motorun üçlük payı sabit olduğu için bölge/tip hedefleri buna ölçeklenir. */
const ikiPay = 100 - pct(say['t:uc']);
const BRIF_IKI = 25 + 6 + 9 + 16 + 2.25 + 5;      /* turnike+smaç+floater+jumper+kanca+tipin */
const K = ikiPay / BRIF_IKI;                       /* ölçek katsayısı */
const bant = (a, b) => [a * K, b * K];

const H = [];
const ok = (ad, deger, alt, ust, not) => H.push({ ad, deger, alt, ust, not });
/* Bölge (iki sayılık hedefler ölçeklenir, üçlük bölgeleri üçlük payına ölçeklenir) */
const ucPay = pct(say['t:uc']);
const Ku = ucPay / (9 + 14 + 12);
ok('bölge: rim', pct(say['z:rim']), 26 * K, 30 * K);
ok('bölge: boya (rim dışı)', pct(say['z:paint']), 18 * K, 22 * K);
ok('bölge: orta mesafe', pct(say['z:midrange']), 14 * K, 18 * K);
ok('bölge: köşe üçlüğü', pct(say['z:corner3']), 8 * Ku, 10 * Ku);
ok('bölge: kanat üçlüğü', pct(say['z:wing3']), 13 * Ku, 15 * Ku);
ok('bölge: tepe üçlüğü', pct(say['z:top3']), 11 * Ku, 13 * Ku);
/* Tip */
/* Tip-in bütçesi kilitli (hücum ribaundu sıklığı sonuç matematiğinde) ve gerçekleşmeyen
   pay TURNİKEYE düşüyor — bant o kadar yukarı kaydırılır, yoksa kapı erişilemez bir sayıyı
   savunur (CLAUDE.md: 'kapı eşiği TABLODAN türetilmeli, elle yazılmamalı'). */
const tipinAcik = Math.max(0, 5 * K - pct(say['t:tipin']));
ok('tip: turnike', pct(say['t:turnike']), 22 * K + tipinAcik, 28 * K + tipinAcik, 'tip-in açığı (' + tipinAcik.toFixed(1) + ' puan) eklendi');
ok('tip: smaç', pct(say['t:smac']), 5 * K, 7 * K);
ok('tip: floater', pct(say['t:floater']), 8 * K, 10 * K);
ok('tip: jumper (orta mesafe)', pct(say['t:jumper']), 14 * K, 18 * K);
ok('tip: kanca', pct(say['t:kanca']), 1.5 * K, 3 * K);
/* Hızlı hücum */
ok('hızlı hücum payı', pct(fb), 14, 18);
ok('hızlı hücumun üçlükle bitişi', fb ? 100 * fb3 / fb : 0, 0, 20);
/* §10: pozisyon kilidi — bozulmayı yakalar, bir şey "düzeltmez". */
const uT = Object.values(uc3Poz).reduce((a, b) => a + b, 0) || 1;
const aT = Object.values(astPoz).reduce((a, b) => a + b, 0) || 1;
ok('üçlüklerin C payı', 100 * (uc3Poz.C || 0) / uT, 0, 2);
ok('üçlüklerin PF payı', 100 * (uc3Poz.PF || 0) / uT, 0, 14);
ok('üçlüklerin PG+SG+SF payı', 100 * ((uc3Poz.PG || 0) + (uc3Poz.SG || 0) + (uc3Poz.SF || 0)) / uT, 85, 100);
ok('asistlerin PG+SG payı', 100 * ((astPoz.PG || 0) + (astPoz.SG || 0)) / aT, 45, 100);
ok('asistlerin C payı', 100 * (astPoz.C || 0) / aT, 0, 15);

console.log('\n' + '='.repeat(74));
console.log(`ŞUT COĞRAFYASI VE TİP DAĞILIMI — ${MAC} maç · ${sut} şut`);
console.log('='.repeat(74));
console.log(`  üçlük DENEME payı ${f(say['t:uc'])} (sonuç matematiği — §1 gereği sabit) · iki sayılık pay ${ikiPay.toFixed(1)}% · ölçek ×${K.toFixed(2)}`);
let dusen = 0;
H.forEach(h => {
  const gec = h.deger >= h.alt - 0.05 && h.deger <= h.ust + 0.05;
  if (!gec) dusen++;
  console.log('  ' + (gec ? '✓' : '✗') + ' ' + h.ad.padEnd(30) + (h.deger.toFixed(1) + '%').padStart(8) +
    '   hedef %' + h.alt.toFixed(1) + ' - %' + h.ust.toFixed(1) + (h.not ? '  (' + h.not + ')' : ''));
});
console.log('\n  bilgi: üçlük pozisyon dağılımı ' + JSON.stringify(uc3Poz) + ' · asist ' + JSON.stringify(astPoz));
console.log('  bilgi: tip-in %' + pct(say['t:tipin']).toFixed(1) +
  ' — hücum ribaundu sıklığı sonuç matematiğindedir, sunumdan artırılamaz (§1).');
console.log('='.repeat(74));
console.log(dusen ? `✗ ${dusen} hedef düştü` : '✓ şut dağılımı hedef bantlarında');
process.exit(dusen ? 1 : 0);
