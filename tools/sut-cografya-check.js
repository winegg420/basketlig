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
const G = require('./_lib/gercek-bant.js');

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

/* ── FAZ 39 §3.4: EŞİKLER GERÇEK VERİDEN ────────────────────────────────────────
   Eski sürüm hedefleri BRİFTEN alıyor, sonra motorun üçlük payına ÖLÇEKLİYORDU
   (K / Ku katsayıları). O ölçekleme tahmini bir tabloyu motorun kendi davranışına
   uydurma girişimiydi ve kapıyı gerçeğe değil MOTORA bağlıyordu. Artık paylar
   3 sezonluk NBA şut detayından (655.446 şut · 90 takım-sezon) doğrudan okunuyor;
   toplamları zaten %100, ölçeklemeye gerek yok.
   ⚠ NBA bölge sözlüğünde 'Above the Break 3' KANAT ve TEPE üçlüğünü BİRLİKTE sayar;
     motorun ayrı tuttuğu wing3 + top3 bu yüzden TOPLANARAK karşılaştırılır. */
const H = [];
G.kapi(H, 'bölge: çember (rim)', pct(say['z:rim']), 'sutBolgesi.cember');
G.kapi(H, 'bölge: boya (çember dışı)', pct(say['z:paint']), 'sutBolgesi.boya');
G.kapi(H, 'bölge: orta mesafe', pct(say['z:midrange']), 'sutBolgesi.ortaMesafe');
G.kapi(H, 'bölge: köşe üçlüğü', pct(say['z:corner3']), 'sutBolgesi.kose3');
G.kapi(H, 'bölge: kanat + tepe üçlüğü', pct(say['z:wing3']) + pct(say['z:top3']), 'sutBolgesi.kanatVeTepe3');
/* Tip — gerçek veride ACTION_TYPE metninden sınıflandırıldı (Dunk / Layup / Float /
   Hook / Tip / Jump). 'jumper' burada YALNIZ iki sayılık jump shot'tır. */
G.kapi(H, 'tip: turnike', pct(say['t:turnike']), 'sutTipi.turnike');
G.kapi(H, 'tip: smaç', pct(say['t:smac']), 'sutTipi.smac');
G.kapi(H, 'tip: floater', pct(say['t:floater']), 'sutTipi.floater');
G.kapi(H, 'tip: jumper (2 sayılık)', pct(say['t:jumper']), 'sutTipi.jumper');
G.kapi(H, 'tip: kanca', pct(say['t:kanca']), 'sutTipi.kanca');
G.kapi(H, 'tip: tip-in', pct(say['t:tipin']), 'sutTipi.tipin');
G.kapi(H, 'tip: üçlük', pct(say['t:uc']), 'sutTipi.uc');
/* Hızlı hücum: motorun `fb` bayrağı gerçek verinin GEÇİŞ tanımından dardır
   (tempo-check'teki aynı ayrım) — kapı orada, burada bilgi. */
H.push({ ad: 'hızlı hücum payı (motorun dar tanımı)', deger: pct(fb), alt: null, ust: null,
  neden: 'gerçek karşılığı GEÇİŞ payıdır; tempo-check ölçer' });
/* Eski kapı 'hızlı hücum üçlükle bitmesin, ≤%20' diyordu — bu ELLE YAZILMIŞ bir
   tahmindi ve gerçek veri TERSİNİ söylüyor: geçiş pozisyonlarının %30,1'i üçlükle
   bitiyor (köşe %8,28 + kanat/tepe %21,85). Bant (±sd) çıkarılamadığı için kapı
   kurulmuyor, gerçek değer bilgi olarak basılıyor (§3.4). */
{ const bb = G.ham('gecisHucumu.bitisBolgesi.gecis');
  const ucGercek = bb ? (bb.paylar.kose3 + bb.paylar.kanatVeTepe3) : null;
  H.push({ ad: 'hızlı hücumun üçlükle bitişi', deger: fb ? 100 * fb3 / fb : 0,
    alt: null, ust: null, gercek: ucGercek,
    neden: 'gerçek geçiş bitiş bölgesinden okunur; takım-sezon bandı yok' }); }
/* §10: pozisyon kilidi — GERÇEKLİK bandı değil, BOZULMA dedektörü. Gerçek veride
   oyuncu pozisyonu (PG/SG/SF/PF/C) yok; elle yazılı kalmaları bilinçlidir ve
   gerçekçilik iddiası TAŞIMAZLAR. */
const uT = Object.values(uc3Poz).reduce((a, b) => a + b, 0) || 1;
const aT = Object.values(astPoz).reduce((a, b) => a + b, 0) || 1;
const kilit = (ad, deger, alt, ust) => H.push({ ad, deger, alt, ust, birim: '%' });
kilit('üçlüklerin C payı [kilit]', 100 * (uc3Poz.C || 0) / uT, 0, 2);
kilit('üçlüklerin PF payı [kilit]', 100 * (uc3Poz.PF || 0) / uT, 0, 14);
kilit('üçlüklerin PG+SG+SF payı [kilit]', 100 * ((uc3Poz.PG || 0) + (uc3Poz.SG || 0) + (uc3Poz.SF || 0)) / uT, 85, 100);
kilit('asistlerin PG+SG payı [kilit]', 100 * ((astPoz.PG || 0) + (astPoz.SG || 0)) / aT, 45, 100);
kilit('asistlerin C payı [kilit]', 100 * (astPoz.C || 0) / aT, 0, 15);

console.log('');
console.log(`ŞUT COĞRAFYASI VE TİP DAĞILIMI — ${MAC} maç · ${sut} şut`);
const gecti = G.bas(H, 'ŞUT COĞRAFYASI — gerçek bantlara karşı');
{ const bb = G.ham('gecisHucumu.bitisBolgesi.gecis'), bs = G.ham('gecisHucumu.bitisBolgesi.set');
  if (bb) console.log('  bilgi: gerçek GEÇİŞ pozisyonu bitiş bölgesi ' + JSON.stringify(bb.paylar) + ' (n=' + bb.n + ')');
  if (bs) console.log('  bilgi: gerçek SET pozisyonu bitiş bölgesi   ' + JSON.stringify(bs.paylar) + ' (n=' + bs.n + ')'); }
console.log('  bilgi: üçlük pozisyon dağılımı ' + JSON.stringify(uc3Poz) + ' · asist ' + JSON.stringify(astPoz));
console.log(gecti ? '✓ şut dağılımı gerçek bantlarda' : '✗ şut dağılımı bandın dışında');
process.exit(gecti ? 0 : 1);
