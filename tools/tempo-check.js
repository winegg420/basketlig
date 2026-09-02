#!/usr/bin/env node
/**
 * Charazay 2.0 — POZİSYON SÜRESİ / TEMPO (FAZ 38 §4 · FAZ 39 §3.4'te gerçek veriye bağlandı)
 *
 * Gerçek basketbolda pozisyon süresi DÜZGÜN DAĞILMAZ, iki tepelidir: canlı topla
 * başlayan geçiş pozisyonu kısa, kurulmuş set hücumu uzun sürer. Motorda maliyet
 * `rand(decLo,decHi)` ile düzgün dağıtılıyordu ve pozisyonun TÜRÜNDEN habersizdi.
 *
 * ⚠ FAZ 39: EŞİKLER ARTIK ELLE YAZILMIYOR. Hepsi `tools/_lib/gercek-bantlar.json`
 *   dosyasından okunur — 3 sezonluk (2022-24) NBA play-by-play, 3.690 maç, 729.559
 *   tekilleştirilmiş pozisyon. Eski `HEDEF` tablosu bir TAHMİNDİ ve ölçüldüğünde
 *   uçları tutmuyordu (0-4 sn bandı: tahmin %1-2, gerçek %7,9 · 25+ sn: tahmin %0-2,
 *   gerçek %8,5).
 *
 * ⚠ İKİ AYRI "POZİSYON" TANIMI VAR — ölçüm veriyle AYNI tanımı kullanmalı.
 *   pbpstats bir pozisyonu TOP EL DEĞİŞTİRENE KADAR sayar: hücum ribaundu, savuşturulan
 *   top kaybı ve savunma faulü pozisyonu UZATIR, yenisini başlatmaz. Motorun döngüsü ise
 *   her yeni şut denemesini ayrı bir pozIx yapar. Ölçüldü: aynı 60 maçta ham sayım
 *   176,4 pozisyon/maç, birleştirilmiş sayım 144,5 — gerçek değer (164,9) tam ikisinin
 *   arasında. Ham sayımı gerçekle kıyaslamak kapının kendi tanımını ölçmesidir
 *   (CLAUDE.md: "kapı yanlış şeyi ölçerse kusuru KENDİSİ üretir"). Bu araç birleştirir.
 *
 * ⚠ "GEÇİŞ" DE İKİ FARKLI ŞEYDİR. Gerçek veride geçiş = pozisyonun CANLI TOPLA başlaması
 *   (çalma / blok / kaçan şut ribaundu) — pozisyonların %40'ı. Motorun `fbPoz` bayrağı
 *   bundan DARDIR: gerçekten koşulan hızlı hücum. Kapı, motorun `transPoz` damgasıyla
 *   (aynı tanım) kurulur; `fbPoz` bilgi satırında kalır.
 *
 * Ölçüt `dtPos` (pozisyonun tamamı). `dt` olayın maç saati PAYIdır, karıştırma (F13-17).
 *
 * Kullanım: node tools/tempo-check.js [--mac=60] [--tohum=20000]
 */
const { ortamKur, kadroUret } = require('./_lib/anlatim-ornek.js');
const G = require('./_lib/gercek-bant.js');

const arg = (ad, v) => { const m = process.argv.find(a => a.startsWith('--' + ad + '=')); return m ? Number(m.split('=')[1]) : v; };
const MAC = arg('mac', 60);
const TOHUM = arg('tohum', 20000);

const ctx = ortamKur();
const ev = kadroUret(ctx, 0x1111), dep = kadroUret(ctx, 0x2222);

const BANT = [[0, 4], [5, 7], [8, 10], [11, 13], [14, 16], [17, 19], [20, 24], [25, 999]];
const BANT_AD = ['0-4', '5-7', '8-10', '11-13', '14-16', '17-19', '20-24', '25+'];
const say = BANT.map(() => 0), sayFb = BANT.map(() => 0);
let n = 0, nFb = 0, nTrans = 0, top = 0, topFb = 0, topTrans = 0, topSet = 0, nSet = 0, mac = 0, hamPoz = 0;

for (let i = 0; i < MAC; i++) {
  const m = ctx.__api.simulateMatch({ homeRoster: ev, awayRoster: dep, homeName: 'A', awayName: 'B', seed: TOHUM + i });
  mac++;
  /* Bir pozisyon birden çok olay üretir ve hepsi dtPos taşır; olayı pozisyon saymak
     dağılımı çok-olaylı pozisyonlar lehine çarpıtır. Motor pozisyonu damgalıyor. */
  const P = new Map();
  (m.events || []).forEach(e => {
    const d = Number(e.dtPos);
    if (!isFinite(d) || d <= 0 || e.pozIx == null) return;
    if (!P.has(e.pozIx)) P.set(e.pozIx, { d, off: e.off, q: e.q, fb: false, tr: !!e.transPoz });
    if (e.fbPoz || (e.shot && e.shot.fb)) P.get(e.pozIx).fb = true;
  });
  hamPoz += P.size;
  /* Birleştirme: aynı çeyrekte ardışık ve AYNI takımın hücumu tek pozisyondur. */
  const ks = [...P.keys()].sort((a, b) => a - b);
  let cur = null;
  const yaz = v => {
    const ix = BANT.findIndex(([a, b]) => v.d >= a && v.d <= b);
    if (ix >= 0) { say[ix]++; if (v.fb) sayFb[ix]++; }
    n++; top += v.d;
    if (v.fb) { nFb++; topFb += v.d; }
    if (v.tr) { nTrans++; topTrans += v.d; } else { nSet++; topSet += v.d; }
  };
  ks.forEach(k => {
    const v = P.get(k);
    if (cur && cur.off === v.off && cur.q === v.q) { cur.d += v.d; cur.fb = cur.fb || v.fb; return; }
    if (cur) yaz(cur);
    cur = { d: v.d, off: v.off, q: v.q, fb: v.fb, tr: v.tr };
  });
  if (cur) yaz(cur);
}
const p = (a, t) => 100 * a / Math.max(1, t);

console.log('');
console.log(`POZİSYON SÜRESİ — ${mac} maç · ${n} pozisyon (pbpstats tanımı; motorun ham sayacı ${hamPoz}) · tohum ${TOHUM}`);

const H = [];
/* Süre kovaları BİLGİdir, kapı değil: bir kovanın komşusundan pay çalması kusur
   sayılmamalı (FAZ 38 dersi). Kapı toplu ölçütlerdedir. */
BANT_AD.forEach((ad, i) => {
  G.kapi(H, 'süre ' + ad + ' sn', p(say[i], n), 'pozisyonSuresi.histogram.' + ad, { bilgi: true });
});
G.kapi(H, 'ortalama pozisyon süresi', top / Math.max(1, n), 'pozisyonSuresi.ortalama');
G.kapi(H, 'geçiş pozisyonu payı', p(nTrans, n), 'gecisHucumu.pay');
G.kapi(H, 'geçiş pozisyonu ort. süresi', topTrans / Math.max(1, nTrans), 'gecisHucumu.ortalamaSure');
G.kapi(H, 'set hücumu ort. süresi', topSet / Math.max(1, nSet), 'gecisHucumu.setOrtalamaSure');
/* pozisyonSayisi JSON'da TAKIM başınadır; motorun sayacı iki takımın toplamıdır. */
const pozT = G.al('pozisyonSayisi');
H.push({
  ad: 'pozisyon / maç (iki takım)', deger: n / Math.max(1, mac),
  alt: pozT.alt * 2, ust: pozT.ust * 2, gercek: pozT.deger * 2,
  kaynak: pozT.kaynak + ' ×2 (iki takım)', n: pozT.n, olcek: pozT.olcek, not: pozT.not
});

console.log('');
const gecti = G.bas(H, 'TEMPO — gerçek bantlara karşı');
console.log(`  bilgi: hızlı hücum (motorun dar tanımı, fbPoz) ${nFb} · %${p(nFb, n).toFixed(1)} · ort ${(topFb / Math.max(1, nFb)).toFixed(1)} sn`);
console.log(gecti ? '✓ tempo gerçek bantlarda' : '✗ tempo bandın dışında');
process.exit(gecti ? 0 : 1);
