#!/usr/bin/env node
/**
 * Charazay 2.0 — DİZİLİM VARIŞ DENETÇİSİ (FAZ 69)
 *
 * Kusur şuydu: dizilim HEDEFLERİ doğru (sahaya yayılmış) ama oyuncular oraya HİÇ VARAMIYOR,
 * çünkü faz bütçesi yalnız sokucunun ve oyun kurucunun yolunu sayıyordu. Bütün yapısal
 * kapılar (rakibe pas, ışınlanma, hayalet held…) yeşilken oyun ekranda tek bir köşeye
 * sıkışmış hâlde oynanıyordu — hiçbir araç bunu ölçmüyordu.
 *
 * ⚠ ÖLÇÜT HEDEFE UZAKLIKTIR, HIZ DEĞİL (FAZ 40 eki dersi): "yavaş gidiyor" ile "yola hiç
 *   çıkmadı" ancak hedefe uzaklık dağılımıyla ayrılır. `iz-kaydet` hedefi FAZ 45'ten beri
 *   kaydediyor (p[12..13]); bu araç onu okur.
 *
 * ⚠ KLİP KARELERİ AYRI RAPORLANIR: klip gerçek SportVU kaydını oynatır, hedef kavramı yoktur
 *   (`p.tx=p.x`). Yayılım kıyaslaması KLİP ve FİZİK kareleri için AYRI basılır — gerçek taban
 *   3,636 / 3,754 m (tools/_lib/gercek-hareket.json).
 *
 * Pencere en az 280 sn olmalı ve kayıt GÖRÜNÜR sekmede alınmalı (meta.gizli=false).
 *
 * Kullanım: node tools/faz69-check.js olcum/iz-<etiket>.json
 */
const fs = require('fs');
const PX_M = 29.5429;
const CRT = { x0: 56.4, x1: 883.6, y0: 28.43, y1: 471.57 };

const yol = process.argv[2];
if (!yol) { console.error('kullanım: node tools/faz69-check.js olcum/iz-<etiket>.json'); process.exit(2); }
const D = JSON.parse(fs.readFileSync(yol, 'utf8'));
const K = (D.kare || []).filter(k => k.saat > 0 && k.p && k.p.length >= 10);
if (!K.length) { console.error('kayıt boş'); process.exit(2); }

const m = px => px / PX_M;
const ort = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

/* ── faz epizotları ─────────────────────────────────────────────────────────────────── */
const fazAd = k => (k.klp ? 'klip' : (k.oam || '-'));
const hedefU = k => {           /* hücumcuların hedefe uzaklığı (klip jetonu hariç) */
  const d = [];
  for (const p of k.p) { if (!p[2] || p[16]) continue; d.push(Math.hypot(p[0] - p[12], p[1] - p[13])); }
  return d;
};
const ep = [];
let cur = null;
for (const k of K) {
  const f = fazAd(k);
  if (!cur || cur.faz !== f) { if (cur) ep.push(cur); cur = { faz: f, t0: k.t, t1: k.t, ilk: hedefU(k), son: null }; }
  cur.t1 = k.t; cur.son = hedefU(k);
}
if (cur) ep.push(cur);

const fazlar = {};
for (const e of ep) {
  const f = fazlar[e.faz] || (fazlar[e.faz] = { n: 0, sure: [], iOrt: [], iMax: [], sOrt: [], sMax: [] });
  f.n++; f.sure.push(e.t1 - e.t0);
  if (e.ilk && e.ilk.length) { f.iOrt.push(ort(e.ilk)); f.iMax.push(Math.max(...e.ilk)); }
  if (e.son && e.son.length) { f.sOrt.push(ort(e.son)); f.sMax.push(Math.max(...e.son)); }
}

/* ── kutu alanı · yayılım · saha dışı hedef ─────────────────────────────────────────── */
let kutuTop = 0, kutuN = 0, kutuMin = 1e9, kutuMinT = 0, altSure = 0;
let xK = [], yK = [], xF = [], yF = [];
let hedefN = 0, hedefDis = 0; const disOrn = [];
const fazKutu = {};
for (let i = 0; i < K.length; i++) {
  const k = K[i], P = k.p;
  const dt = (i > 0) ? Math.min(0.1, Math.max(0, k.t - K[i - 1].t)) : 0;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const ox = [], oy = [];
  let klipVar = false;
  for (const p of P) {
    if (p[16]) klipVar = true;
    if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    if (p[2]) { ox.push(p[0]); oy.push(p[1]); }
    /* saha dışı HEDEF — çizgi dışı izni olan (sokucu) MUAF: o gerçekten dışarıda durur */
    if (!p[17]) {
      hedefN++;
      if (p[12] < CRT.x0 || p[12] > CRT.x1 || p[13] < CRT.y0 || p[13] > CRT.y1) {
        hedefDis++;
        if (disOrn.length < 6) disOrn.push({ t: +k.t.toFixed(1), kim: (p[2] ? 'huc' : 'sav') + '/' + p[3], hedef: [p[12], p[13]] });
      }
    }
  }
  const alan = m(x1 - x0) * m(y1 - y0);
  kutuTop += alan; kutuN++;
  if (alan < kutuMin) { kutuMin = alan; kutuMinT = k.t; }
  if (alan < 40) altSure += dt;
  { const f=fazAd(k); const v=fazKutu[f]||(fazKutu[f]={alan:[],sx:[],sy:[],sure:0});
    v.alan.push(alan); v.sure+=dt;
    if(ox.length>=5){ const mx=ort(ox),my=ort(oy);
      v.sx.push(Math.sqrt(ort(ox.map(q=>(q-mx)**2)))/PX_M); v.sy.push(Math.sqrt(ort(oy.map(q=>(q-my)**2)))/PX_M); }
    /* HEDEFLERİN yayılımı: dar ise hedefleme, geniş ise VARIŞ sorunudur */
    const hx=[],hy=[]; for(const q of P) if(q[2]&&!q[16]){ hx.push(q[12]); hy.push(q[13]); }
    if(hx.length>=5){ const mx=ort(hx),my=ort(hy);
      (v.hx||(v.hx=[])).push(Math.sqrt(ort(hx.map(q=>(q-mx)**2)))/PX_M);
      (v.hy||(v.hy=[])).push(Math.sqrt(ort(hy.map(q=>(q-my)**2)))/PX_M); } }
  if (ox.length >= 5) {
    const sx = Math.sqrt(ort(ox.map(v => (v - ort(ox)) ** 2))) / PX_M;
    const sy = Math.sqrt(ort(oy.map(v => (v - ort(oy)) ** 2))) / PX_M;
    if (klipVar) { xK.push(sx); yK.push(sy); } else { xF.push(sx); yF.push(sy); }
  }
}

/* ── çıktı ─────────────────────────────────────────────────────────────────────────── */
const L = [];
const gizli = D.meta && D.meta.gizli;
L.push('');
L.push('DİZİLİM VARIŞ DENETİMİ (FAZ 69) — ' + yol.split(/[\\/]/).pop());
L.push('  ' + K.length + ' kare · ' + (K[K.length - 1].t - K[0].t).toFixed(0) + ' sn · sekme ' +
  (gizli == null ? 'bilinmiyor (eski kayıt)' : (gizli ? '⚠ GİZLİ — ÖLÇÜM GEÇERSİZ' : 'görünür ✓')));
L.push('');
L.push('  ── FAZ EPİZOTLARI (hücumcunun kendi noktasına uzaklığı) ──');
L.push('  faz        kez    süre    başta ort/en uzak     bitişte ort/en uzak');
const sira = ['sokma', 'gecis', 'set', 'toren', '-', 'klip'];
for (const f of sira.concat(Object.keys(fazlar).filter(x => sira.indexOf(x) < 0))) {
  const v = fazlar[f]; if (!v) continue;
  const im = ort(v.iOrt), ix = ort(v.iMax), sm = ort(v.sOrt), sx = ort(v.sMax);
  L.push('  ' + f.padEnd(10) + String(v.n).padStart(4) + '  ' + ort(v.sure).toFixed(1).padStart(5) + ' sn   ' +
    (f === 'klip' ? '        (hedef yok)          ' :
      (m(im).toFixed(1) + ' m / ' + m(ix).toFixed(1) + ' m').padStart(18) + '   ' +
      (m(sm).toFixed(1) + ' m / ' + m(sx).toFixed(1) + ' m').padStart(18)));
}
L.push('');
L.push('  ── FAZ BAŞINA KUTU VE YAYILIM (nerede sıkışıyor) ──');
L.push('  faz         süre    kutu ort/en dar    KONUM X/Y      HEDEF X/Y');
for (const f of sira.concat(Object.keys(fazKutu).filter(x=>sira.indexOf(x)<0))) {
  const v=fazKutu[f]; if(!v||!v.alan.length) continue;
  L.push('  '+f.padEnd(10)+v.sure.toFixed(0).padStart(5)+' sn   '+
    (ort(v.alan).toFixed(0)+' / '+Math.min(...v.alan).toFixed(0)+' m²').padStart(16)+'   '+
    ort(v.sx).toFixed(2)+' / '+ort(v.sy).toFixed(2)+'    '+(v.hx?ort(v.hx).toFixed(2)+' / '+ort(v.hy).toFixed(2):'-'));
}
L.push('');
L.push('  ── 10 OYUNCUNUN KUTUSU ──');
L.push('  ortalama ' + (kutuTop / kutuN).toFixed(0) + ' m²  ·  en dar ' + kutuMin.toFixed(0) + ' m² (t=' + kutuMinT.toFixed(0) + ')  ·  40 m² altında ' + altSure.toFixed(1) + ' sn');
L.push('');
L.push('  ── HÜCUM YAYILIMI (std, m) — gerçek SportVU 3,636 / 3,754 ──');
L.push('  KLİP kareleri (gerçek NBA kaydı)   X ' + ort(xK).toFixed(2) + '  Y ' + ort(yK).toFixed(2) + '   (n=' + xK.length + ')');
L.push('  FİZİK kareleri (bizim koreografi)  X ' + ort(xF).toFixed(2) + '  Y ' + ort(yF).toFixed(2) + '   (n=' + xF.length + ')');
/* ── CANLI TOP fizik kareleri: serbest atış töreni HARİÇ ────────────────────────────────
   'toren' bir ÖLÜ TOP dizilimidir — oyuncular kulvara dizilir ve dar durmaları DOĞRUDUR
   (FAZ 52/53 ölçülerek ayarlandı). Fizik ortalamasına katılınca yayılımı yapay olarak
   aşağı çeker; karşılaştırma canlı toplu fazlarla yapılmalı.
   ⚠ KIYAS TABANI AYNI KOŞUDAKİ KLİP KARELERİDİR: klip gerçek SportVU kaydını birebir
   oynatır, yani bu maçın KENDİ kontrol grubudur. `gercek-hareket.json`ın 3,636/3,754
   değeri 10 TAM MAÇIN bütün fazlarından çıkarılmıştır (tam saha geçişleri dahil) ve
   yarı saha pozisyonundan tanımı gereği geniştir. */
{
  let sx=0,sy=0,n=0;
  for(const f of Object.keys(fazKutu)){
    if(f==='klip'||f==='toren') continue;
    const v=fazKutu[f]; if(!v||!v.hx||!v.hx.length) continue;
    for(let i=0;i<v.sx.length;i++){ sx+=v.sx[i]; sy+=v.sy[i]; n++; }
  }
  if(n) L.push('  CANLI TOP fizik (töreni hariç)      X ' + (sx/n).toFixed(2) + '  Y ' + (sy/n).toFixed(2) + '   (n=' + n + ')  ← kıyas: klip satırı');
}
L.push('');
L.push('  ── SAHA DIŞI HEDEF (çizgi dışı izinli sokucu hariç) ──');
L.push('  pay ' + (100 * hedefDis / (hedefN || 1)).toFixed(2) + '%  (' + hedefDis + ' / ' + hedefN + ')');
disOrn.forEach(o => L.push('      t=' + o.t + '  ' + o.kim + '  hedef (' + o.hedef[0] + ',' + o.hedef[1] + ')'));

/* ── kapılar ───────────────────────────────────────────────────────────────────────── */
let dusen = 0;
const kapi = (ad, deger, gecti, hedef) => { if (!gecti) dusen++; L.push('  ' + (gecti ? '✓' : '✗') + ' ' + ad.padEnd(40) + String(deger).padStart(10) + '   ' + hedef); };
const bit = f => fazlar[f] ? m(ort(fazlar[f].sMax)) : null;
L.push('');
L.push('  ── KAPILAR ──                                 ölçülen   hedef');
kapi('gecis bitişinde en uzak oyuncu', bit('gecis') == null ? 'örnek yok' : bit('gecis').toFixed(1) + ' m', bit('gecis') != null && bit('gecis') <= 4.0, '≤ 4,0 m');
kapi('set bitişinde en uzak oyuncu', bit('set') == null ? 'örnek yok' : bit('set').toFixed(1) + ' m', bit('set') != null && bit('set') <= 3.0, '≤ 3,0 m');
kapi('set faz süresi', fazlar.set ? ort(fazlar.set.sure).toFixed(1) + ' sn' : 'örnek yok', !!fazlar.set && ort(fazlar.set.sure) >= 3.0, '≥ 3,0 sn');
kapi('bekleme (-) bitişinde ort. uzaklık', fazlar['-'] ? m(ort(fazlar['-'].sOrt)).toFixed(1) + ' m' : 'örnek yok', !!fazlar['-'] && m(ort(fazlar['-'].sOrt)) <= 2.5, '≤ 2,5 m');
kapi('bekleme (-) bitişinde en uzak', fazlar['-'] ? m(ort(fazlar['-'].sMax)).toFixed(1) + ' m' : 'örnek yok', !!fazlar['-'] && m(ort(fazlar['-'].sMax)) <= 6.0, '≤ 6,0 m');
kapi('fizik karelerinde yayılım X', ort(xF).toFixed(2), ort(xF) >= 3.3, '≥ 3,30');
kapi('fizik karelerinde yayılım Y', ort(yF).toFixed(2), ort(yF) >= 3.4, '≥ 3,40');
kapi('kutunun en dar anı', kutuMin.toFixed(0) + ' m²', kutuMin >= 40, '≥ 40 m²');
kapi('saha dışı hedef payı', (100 * hedefDis / (hedefN || 1)).toFixed(2) + '%', hedefDis === 0, '%0,00');
L.push(dusen ? '\n✗ ' + dusen + ' kapı düştü' : '\n✓ bütün kapılar geçti');

const cikti = L.join('\n');
console.log(cikti);
try { fs.appendFileSync('olcum/FAZ69-sonuc.txt', '\n=== ' + new Date().toISOString() + ' · ' + yol + ' ===\n' + cikti + '\n'); } catch (e) {}
process.exit(dusen ? 1 : 0);
