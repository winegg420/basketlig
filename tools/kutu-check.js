#!/usr/bin/env node
/**
 * Charazay 2.0 — KUTU SKOR GERÇEKÇİLİĞİ (FAZ 38 §3)
 *
 * `band.js` skorun BANDINA bakar, `box-band.js` kutu skorun KENDİ İÇİNDE tutarlılığına.
 * Hiçbiri "2 sayılık isabet %61 gerçek mi?" diye sormuyordu — bu araç onu sorar.
 * 60 maç, takım başına maç başına ortalama, tarayıcısız (`simulateMatch`).
 *
 * Hedef bantlar FIBA / BSL gerçek değerlerinden alınmıştır; kaynak PROGRESS.md FAZ 38.
 *
 * Kullanım: node tools/kutu-check.js [--mac=60] [--tohum=20000]
 */
const { ortamKur, kadroUret } = require('./_lib/anlatim-ornek.js');

const arg = (ad, v) => { const m = process.argv.find(a => a.startsWith('--' + ad + '=')); return m ? Number(m.split('=')[1]) : v; };
/* 60 maç uzatma satırı için YETERSİZDİ: hedef %4-8 bandı 60 maçta 2,4-4,8 maç
   demektir ve tek maçlık salınım kapıyı bir koşuda %1,7'ye, ötekinde %5,0'e taşıyor.
   Örneklem güdümlü ölçüm kuralı (FAZ 30 eki) burada da geçerli. */
const MAC = arg('mac', 240);
const TOHUM = arg('tohum', 20000);

const ctx = ortamKur();
const ev = kadroUret(ctx, 0x1111), dep = kadroUret(ctx, 0x2222);

/* İki takımın kutu skorları ayrı ayrı toplanır: "takım başına maç başına" ölçü budur. */
const T = { n: 0, pts: 0, fga: 0, fgm: 0, tpa: 0, tpm: 0, fta: 0, ftm: 0, reb: 0, ast: 0, to: 0, stl: 0, blk: 0, foul: 0 };
let uzatma = 0, mac = 0, pozToplam = 0;

for (let i = 0; i < MAC; i++) {
  const m = ctx.__api.simulateMatch({ homeRoster: ev, awayRoster: dep, homeName: 'A', awayName: 'B', seed: TOHUM + i });
  const es = m.events || [];
  const son = es[es.length - 1] || {};
  const kutu = son.box || (es.slice().reverse().find(e => e.box) || {}).box;
  if (!kutu) continue;
  mac++;
  if ((son.q || 4) > 4) uzatma++;
  [kutu.h, kutu.a].forEach(b => {
    if (!b) return;
    T.n++;
    T.pts += (b.twoMade * 2 + b.thrMade * 3 + b.ftMade);
    T.fga += (b.twoAtt + b.thrAtt); T.fgm += (b.twoMade + b.thrMade);
    T.tpa += b.thrAtt; T.tpm += b.thrMade;
    T.fta += b.ftAtt; T.ftm += b.ftMade;
    T.reb += b.reb; T.ast += b.ast; T.to += b.to; T.stl += b.stl; T.blk += b.blk; T.foul += b.foul;
  });
  es.forEach(e => { if (e.shot || e.type === 'steal' || e.type === 'free') { } });
  pozToplam += es.filter(e => Number(e.dtPos) > 0).length;
}
const o = k => T[k] / Math.max(1, T.n);
const twoA = (T.fga - T.tpa) / Math.max(1, T.n), twoM = (T.fgm - T.tpm) / Math.max(1, T.n);

const H = [];
const ok = (ad, deger, alt, ust, birim) => H.push({ ad, deger, alt, ust, birim: birim || '' });
ok('sayı', o('pts'), 78, 92);
ok('FGA (saha şutu denemesi)', o('fga'), 58, 68);
ok('FG%', 100 * T.fgm / Math.max(1, T.fga), 45, 49, '%');
ok('2P%', 100 * twoM / Math.max(0.001, twoA), 51, 56, '%');
ok('3PA', o('tpa'), 20, 27);
ok('3PA / FGA', 100 * T.tpa / Math.max(1, T.fga), 33, 38, '%');
ok('3P%', 100 * T.tpm / Math.max(1, T.tpa), 34, 37, '%');
ok('FTA', o('fta'), 16, 24);
ok('FTA / FGA', T.fta / Math.max(1, T.fga), 0.24, 0.32);
ok('FT%', 100 * T.ftm / Math.max(1, T.fta), 72, 78, '%');
ok('ribaunt', o('reb'), 33, 39);
ok('asist', o('ast'), 17, 22);
ok('asist / isabetli şut', T.ast / Math.max(1, T.fgm), 0.55, 0.68);
ok('top kaybı', o('to'), 11, 14);
ok('top çalma', o('stl'), 6.5, 8.5);
ok('blok', o('blk'), 3, 4.5);
ok('faul', o('foul'), 17, 21);
/* ── UZATMA ORANI DENK KADROLARDA ÖLÇÜLÜR ────────────────────────────────────────
   Uzatma, skorun BERABERE bitmesiyle doğar; iki kadro arasında sabit bir güç farkı
   varsa (bu araçtaki ev/dep çifti ~8 sayı) beraberlik gerçek ligdekinden çok daha
   nadirdir. Oranı o çiftle ölçmek motoru değil FİKSTÜRÜ ölçer. Gerçek ligde denk
   takımlar sık karşılaşır; bu yüzden kapı AYNI kadronun kendisiyle oynadığı ayrı bir
   koşudan okunur (güç farkı sıfır). */
const evDenk = kadroUret(ctx, 0x1111), depDenk = kadroUret(ctx, 0x1111);
let otD = 0, macD = 0; const farklar = [];
/* 120 maç bu kapı için YETERSİZ: %4-8 hedefi 120 maçta 4,8-9,6 maç demektir,
   Poisson gürültüsü bandın kendisi kadar geniştir (aynı motorda ölçüldü: 120 maçta
   %1,7 · 240 maçta %4,6 · 400 maçta %5,0). Örneklem güdümlü ölçüm kuralı. */
for (let i = 0; i < 400; i++) {
  const m = ctx.__api.simulateMatch({ homeRoster: evDenk, awayRoster: depDenk, homeName: 'A', awayName: 'B', seed: 91000 + i });
  const es = m.events || []; const son = es[es.length - 1] || {};
  if (son.home == null) continue;
  macD++; if ((son.q || 4) > 4) otD++;
  farklar.push((son.home | 0) - (son.away | 0));
}
ok('uzatmaya giden maç (denk kadro)', 100 * otD / Math.max(1, macD), 4, 8, '%');
/* TEŞHİS: uzatma oranı skor FARKI dağılımının doğrudan sonucudur — beraberlik
   olasılığının aritmetik tavanı ≈ 1/(σ√2π). Kapı düştüğünde "neden" sorusu
   okuyucuya bırakılmasın diye bu satır her koşuda basılır. */
const _fOrt = farklar.reduce((a, b) => a + b, 0) / Math.max(1, farklar.length);
const _fSd = Math.sqrt(farklar.reduce((a, b) => a + (b - _fOrt) * (b - _fOrt), 0) / Math.max(1, farklar.length));
const _tavan = 100 / (Math.max(0.001, _fSd) * Math.sqrt(2 * Math.PI));

console.log('\n' + '='.repeat(70));
console.log(`KUTU SKOR GERÇEKÇİLİĞİ — ${mac} maç · ${T.n} takım-maç · tohum ${TOHUM}`);
console.log('='.repeat(70));
let dusen = 0;
H.forEach(h => {
  /* Kayan nokta payı: 9,9875 ekranda "10.0" yazılıp eşiği (10) kılpayı kaçırıyordu —
     kapı sayıyı değil YUVARLAMAYI yargılıyordu. Gösterilen basamak kadar tolerans. */
  const _eps = Math.max(1e-9, (h.ust - h.alt) * 0.02);
  const gec = h.deger >= h.alt - _eps && h.deger <= h.ust + _eps;
  if (!gec) dusen++;
  const d = h.birim === '%' ? h.deger.toFixed(1) + '%' : h.deger.toFixed(h.deger < 3 ? 3 : 1);
  const b = h.birim === '%' ? `%${h.alt} - %${h.ust}` : `${h.alt} - ${h.ust}`;
  console.log('  ' + (gec ? '✓' : '✗') + ' ' + h.ad.padEnd(26) + d.padStart(9) + '   hedef ' + b);
});
console.log('  bilgi: skor farkı (denk kadro) ort ' + _fOrt.toFixed(1) + ' · std ' + _fSd.toFixed(1) +
  ' → beraberliğin aritmetik tavanı %' + _tavan.toFixed(1) + ' (gerçek lig std ~13)');
console.log(`\n  bilgi: pozisyon/maç ${(pozToplam / Math.max(1, mac)).toFixed(0)} · 2PA ${twoA.toFixed(1)} · 2PM ${twoM.toFixed(1)}`);
console.log('='.repeat(70));
console.log(dusen ? `✗ ${dusen} satır bandın dışında` : '✓ kutu skor gerçek bantlarda');
process.exit(dusen ? 1 : 0);
