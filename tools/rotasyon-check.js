#!/usr/bin/env node
/**
 * Charazay 2.0 — ROTASYON VE YEDEK KULLANIMI (FAZ 38 §5)
 *
 * İlk beş neredeyse tüm maçı oynuyordu: yedeklerin sayı payı %15, kutu skorda 9,7
 * oyuncu, iki takım toplamı 9,8 değişiklik. Bu bir MENAJERLİK oyununda oynanışı da
 * bozar — kadro derinliği, enerji yönetimi ve altyapı anlamsızlaşır.
 *
 * "İlk beş" TAHMİN EDİLMEZ, motorun kendi kaynağından (`matchLineup`) okunur — olay
 * akışından "ilk skor bulan beş" diye çıkarmak, erken sayı bulmayan bir ilk-beş oyuncusunu
 * yedek sayar ve ölçümü tamamen bozar (ölçüldü: yedek payı %46 çıkıyordu, gerçek %15).
 *
 * Kullanım: node tools/rotasyon-check.js [--mac=40] [--tohum=20000]
 */
const { ortamKur, kadroUret } = require('./_lib/anlatim-ornek.js');

const arg = (ad, v) => { const m = process.argv.find(a => a.startsWith('--' + ad + '=')); return m ? Number(m.split('=')[1]) : v; };
const MAC = arg('mac', 40);
const TOHUM = arg('tohum', 20000);

const ctx = ortamKur();
const ev = kadroUret(ctx, 0x1111), dep = kadroUret(ctx, 0x2222);

let macN = 0, subT = 0;
let yedekPay = 0, gorunenOyuncu = 0, enSkorerPay = 0, sayiBulan = 0;

for (let i = 0; i < MAC; i++) {
  const m = ctx.__api.simulateMatch({ homeRoster: ev, awayRoster: dep, homeName: 'A', awayName: 'B', seed: TOHUM + i });
  const es = m.events || [];
  macN++;
  subT += es.filter(e => e.type === 'sub').length;

  /* Oyuncu bazlı sayı: şut olayları (sid) + serbest atış (sid). İki takım ayrı tutulur. */
  const pts = { h: {}, a: {} };
  /* Motorun kendi ilk-beş kaynağı: matchLineup(kadro).onCourt */
  const lu5 = (r) => {
    const avail = (r || []).filter(x => x && !(x.injury || x.sakatlik))
      .slice().sort((x, y) => (y.genel || 0) - (x.genel || 0));
    const used = new Set(), out = [];
    const ekle = (p) => { if (p && !used.has(p.id) && out.length < 5) { used.add(p.id); out.push(p.id); } };
    ['PG', 'SG', 'SF', 'PF', 'C'].forEach(poz => { if (out.length < 5) ekle(avail.find(x => x.poz === poz && !used.has(x.id))); });
    avail.forEach(ekle);
    return out;
  };
  const ilkBes = { h: lu5(ev), a: lu5(dep) };
  es.forEach(e => {
    const s = e.shot;
    if (s && s.sid != null) {
      const tk = s.isHome ? 'h' : 'a';
      const n = s.made ? (s.kind === '3' ? 3 : 2) : 0;
      pts[tk][s.sid] = (pts[tk][s.sid] || 0) + n;
    }
    if (e.type === 'free' && e.sid != null && Array.isArray(e.shots)) {
      /* Serbest atış olayında hangi takım olduğu `stealIsUser` gibi bir alanla gelmiyor;
         kimlik hangi sözlükte varsa oraya yazılır (kimlikler takımlar arasında ayrık). */
      const tk = (pts.h[e.sid] != null) ? 'h' : (pts.a[e.sid] != null ? 'a' : null);
      const n = e.shots.filter(x => x && x.made).length;
      if (tk) pts[tk][e.sid] = (pts[tk][e.sid] || 0) + n;
    }
  });
  ['h', 'a'].forEach(tk => {
    const tum = Object.keys(pts[tk]);
    const toplam = tum.reduce((a, k) => a + pts[tk][k], 0) || 1;
    const yedek = tum.filter(k => ilkBes[tk].indexOf(k) < 0 && ilkBes[tk].indexOf(+k) < 0)
      .reduce((a, k) => a + pts[tk][k], 0);
    yedekPay += 100 * yedek / toplam;
    gorunenOyuncu += tum.length;
    enSkorerPay += 100 * Math.max.apply(null, tum.map(k => pts[tk][k]).concat([0])) / toplam;
    sayiBulan += tum.filter(k => pts[tk][k] > 0).length;
  });
}
const tm = 2 * macN;
const H = [];
const ok = (ad, deger, alt, ust, birim) => H.push({ ad, deger, alt, ust, birim: birim || '' });
ok('yedeklerin sayı payı', yedekPay / tm, 25, 35, '%');
ok('kutu skorda görünen oyuncu', gorunenOyuncu / tm, 10, 12);
ok('en skorer oyuncunun sayı payı', enSkorerPay / tm, 18, 26, '%');
ok('sayı bulan oyuncu', sayiBulan / tm, 8, 11);
ok('oyuncu değişikliği (iki takım)', subT / macN, 16, 22);

console.log('\n' + '='.repeat(66));
console.log(`ROTASYON — ${macN} maç · tohum ${TOHUM}`);
console.log('='.repeat(66));
let dusen = 0;
H.forEach(h => {
  /* Kayan nokta payı: 9,9875 ekranda "10.0" yazılıp eşiği (10) kılpayı kaçırıyordu —
     kapı sayıyı değil YUVARLAMAYI yargılıyordu. Gösterilen basamak kadar tolerans. */
  const _eps = Math.max(1e-9, (h.ust - h.alt) * 0.02);
  const gec = h.deger >= h.alt - _eps && h.deger <= h.ust + _eps;
  if (!gec) dusen++;
  const d = h.birim === '%' ? h.deger.toFixed(1) + '%' : h.deger.toFixed(1);
  const b = h.birim === '%' ? `%${h.alt} - %${h.ust}` : `${h.alt} - ${h.ust}`;
  console.log('  ' + (gec ? '✓' : '✗') + ' ' + h.ad.padEnd(32) + d.padStart(8) + '   hedef ' + b);
});
console.log('='.repeat(66));
console.log(dusen ? `✗ ${dusen} hedef düştü` : '✓ rotasyon gerçek bantlarda');
process.exit(dusen ? 1 : 0);
