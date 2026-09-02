#!/usr/bin/env node
/**
 * Charazay 2.0 — KUTU SKOR GERÇEKÇİLİĞİ (FAZ 38 §3)
 *
 * `band.js` skorun BANDINA bakar, `box-band.js` kutu skorun KENDİ İÇİNDE tutarlılığına.
 * Hiçbiri "2 sayılık isabet %61 gerçek mi?" diye sormuyordu — bu araç onu sorar.
 * 60 maç, takım başına maç başına ortalama, tarayıcısız (`simulateMatch`).
 *
 * ⚠ FAZ 39: EŞİKLER ARTIK ELLE YAZILMIYOR. Hepsi tools/_lib/gercek-bantlar.json
 *   dosyasından okunur (3 sezon NBA play-by-play · 3.690 maç · 90 takım-sezon).
 *   Eski FAZ 38 bantları BRİFTEN TAHMİNDİ; ölçüldüğünde bir kısmı tutmadı
 *   (ör. 3PA/FGA tahmin %33-38, gerçek %36,3-44,0).
 *
 * ⚠ SAYIM ÖLÇÜTLERİ İKİ KEZ YARGILANIR — ve asıl kapı POZİSYON BAŞINA olandır.
 *   Ham sayım (maç başına sayı, FGA, ribaunt…) TEMPOYA bağlıdır: aynı verimlilikte
 *   daha hızlı oynayan takım daha çok sayı atar. NBA verisini 40/48 ile ölçeklemek
 *   SÜREYİ düzeltir ama VERİMİ düzeltmez — ölçüldü: ölçeklenmiş NBA takımı 40
 *   dakikada 95,2 sayı atar, gerçek FIBA maçı ise ~80. Tempodan bağımsız ve
 *   dolayısıyla FIBA'ya doğrudan taşınabilen ölçüt POZİSYON BAŞINA orandır
 *   (NBA 1,155 sayı/pozisyon). Bu yüzden ham sayım BİLGİ, oran KAPIDIR.
 *
 * Kullanım: node tools/kutu-check.js [--mac=60] [--tohum=20000]
 */
const { ortamKur, kadroUret } = require('./_lib/anlatim-ornek.js');
const G = require('./_lib/gercek-bant.js');

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
let uzatma = 0, mac = 0, pozToplam = 0, hamPoz = 0;

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
  /* Pozisyon sayımı pbpstats TANIMIYLA yapılır: ardışık ve aynı takımın hücumu olan
     parçalar TEK pozisyondur (hücum ribaundu / savuşturulan top kaybı yeni pozisyon
     başlatmaz). Motorun ham pozIx sayacı bundan farklıdır — pozisyon başına oranları
     ham sayaçla bölmek gerçekle kıyaslanamaz bir büyüklük üretir. */
  { const P = new Map();
    es.forEach(e => { const d = Number(e.dtPos); if (!(d > 0) || e.pozIx == null) return;
      if (!P.has(e.pozIx)) P.set(e.pozIx, { off: e.off, q: e.q }); });
    const ks = [...P.keys()].sort((a, b) => a - b);
    let cur = null, say = 0;
    ks.forEach(k => { const v = P.get(k);
      if (cur && cur.off === v.off && cur.q === v.q) return;
      cur = v; say++; });
    pozToplam += say; hamPoz += P.size; }
}
const H = [];
const o = k => T[k] / Math.max(1, T.n);            /* takım başına maç başına */
const twoA = (T.fga - T.tpa) / Math.max(1, T.n), twoM = (T.fgm - T.tpm) / Math.max(1, T.n);
const pozTakim = pozToplam / Math.max(1, mac) / 2; /* takım başına pozisyon (pbpstats tanımı) */
const pb = k => T[k] / Math.max(1, T.n) / Math.max(0.001, pozTakim);

/* ── ORANLAR — tempodan bağımsız, doğrudan taşınır ─────────────────────────── */
G.kapi(H, 'FG%', 100 * T.fgm / Math.max(1, T.fga), 'isabet.sahaSutu');
G.kapi(H, '2P%', 100 * twoM / Math.max(0.001, twoA), 'isabet.ikiSayi');
G.kapi(H, '3P%', 100 * T.tpm / Math.max(1, T.tpa), 'isabet.ucSayi');
G.kapi(H, 'FT%', 100 * T.ftm / Math.max(1, T.fta), 'isabet.serbestAtis');
G.kapi(H, '3PA / FGA', 100 * T.tpa / Math.max(1, T.fga), 'kutuOranlari.ucPayi');
G.kapi(H, 'FTA / FGA', T.fta / Math.max(1, T.fga), 'kutuOranlari.ftaFgaOrani');
G.kapi(H, 'asist / isabetli şut', T.ast / Math.max(1, T.fgm), 'kutuOranlari.asistIsabetliSutOrani');

/* ── POZİSYON BAŞINA — asıl kapı (§3.2: oran taşınır, sayım taşınmaz) ──────── */
G.kapi(H, 'sayı / pozisyon', pb('pts'), 'pozisyonBasina.sayi');
G.kapi(H, 'FGA / pozisyon', pb('fga'), 'pozisyonBasina.fga');
G.kapi(H, 'FTA / pozisyon', pb('fta'), 'pozisyonBasina.fta');
G.kapi(H, 'ribaunt / pozisyon', pb('reb'), 'pozisyonBasina.ribaunt');
G.kapi(H, 'asist / pozisyon', pb('ast'), 'pozisyonBasina.asist');
G.kapi(H, 'top kaybı / pozisyon', pb('to'), 'pozisyonBasina.topKaybi');
G.kapi(H, 'top çalma / pozisyon', pb('stl'), 'pozisyonBasina.calma');
G.kapi(H, 'blok / pozisyon', pb('blk'), 'pozisyonBasina.blok');
G.kapi(H, 'faul / pozisyon', pb('foul'), 'pozisyonBasina.faul');

/* ── HAM SAYIM — BİLGİ. Ölçeklenmiş NBA değeri FIBA maçının üst sınırıdır ──── */
[['sayı', 'pts', 'kutuOranlari.sayi'], ['FGA', 'fga', 'kutuOranlari.fga'],
 ['FTA', 'fta', 'kutuOranlari.fta'], ['ribaunt', 'reb', 'kutuOranlari.ribaunt'],
 ['asist', 'ast', 'kutuOranlari.asist'], ['top kaybı', 'to', 'kutuOranlari.topKaybi'],
 ['top çalma', 'stl', 'kutuOranlari.calma'], ['blok', 'blk', 'kutuOranlari.blok'],
 ['faul', 'foul', 'kutuOranlari.faul']]
  .forEach(([ad, k, yol]) => G.kapi(H, ad + ' (maç başına)', o(k), yol, { bilgi: true }));

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
G.kapi(H, 'uzatmaya giden maç (denk kadro)', 100 * otD / Math.max(1, macD), 'macSonu.uzatmaOrani');
/* TEŞHİS: uzatma oranı skor FARKI dağılımının doğrudan sonucudur — beraberlik
   olasılığının aritmetik tavanı ≈ 1/(σ√2π). Kapı düştüğünde 'neden' sorusu
   okuyucuya bırakılmasın diye bu satır her koşuda basılır. */
const _fOrt = farklar.reduce((a, b) => a + b, 0) / Math.max(1, farklar.length);
const _fSd = Math.sqrt(farklar.reduce((a, b) => a + (b - _fOrt) * (b - _fOrt), 0) / Math.max(1, farklar.length));
const _tavan = 100 / (Math.max(0.001, _fSd) * Math.sqrt(2 * Math.PI));
const _gercekSd = G.al('macSonu.farkStandartSapmasi');

console.log('');
console.log(`KUTU SKOR — ${mac} maç · ${T.n} takım-maç · tohum ${TOHUM} · pozisyon/takım ${pozTakim.toFixed(1)} (ham ${(hamPoz / Math.max(1, mac) / 2).toFixed(1)})`);
const gecti = G.bas(H, 'KUTU SKOR GERÇEKÇİLİĞİ — gerçek bantlara karşı');
console.log('  bilgi: skor farkı (denk kadro) ort ' + _fOrt.toFixed(1) + ' · mutlak farkın std ' + _fSd.toFixed(1) +
  ' → beraberliğin aritmetik tavanı %' + _tavan.toFixed(1) +
  (_gercekSd ? ' · gerçek (ölçekli) ' + _gercekSd.deger : ''));
console.log(`  bilgi: 2PA ${twoA.toFixed(1)} · 2PM ${twoM.toFixed(1)}`);
console.log(gecti ? '✓ kutu skor gerçek bantlarda' : '✗ kutu skor bandın dışında');
process.exit(gecti ? 0 : 1);
