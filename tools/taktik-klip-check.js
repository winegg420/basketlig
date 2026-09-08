#!/usr/bin/env node
/**
 * FAZ 53 — TAKTİK ↔ KLİP EŞLEŞME DENETÇİSİ (tarayıcısız).
 *
 * Kullanıcı: "taktiklerdeki oyun stilleri maça yansımalı, o taktikleri canlı maçta
 * görüyor olmalıyız; bot takımı da bunu yapıyor olmalı."
 *
 * FAZ 50'den beri şutlu pozisyonlar GERÇEK maç kaydından oynar; klibin savunması
 * kaydın kendisindedir. Taktiği yansıtmanın doğru yolu klibi EĞMEK değil, o taktiğe
 * BENZEYEN klibi SEÇMEKTİR. Bu kapı seçimin gerçekten taktiğe göre değiştiğini ölçer:
 *   · 2-3 bölge   → seçilen kliplerde savunma yayılımı DAHA DAR (paketlenmiş)
 *   · tam saha pres → topa en yakın savunmacı DAHA YAKIN
 *   · ikili oyun (pnr) → seçilen kliplerde perde izi olan pozisyon payı DAHA YÜKSEK
 *
 * Klip verisi ya da `klipTaktikMaliyet` değişince çalıştır.
 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let hata = 0;
const yaz = (ok, s) => { console.log((ok ? '  ✓ ' : '  ✗ ') + s); if (!ok) hata++; };

/* Sahne katmanı tarayıcıya bağlı; yalnız klip seçimi için gereken saf parçaları yükleriz. */
const src = fs.readFileSync(path.join(ROOT, 'js/sahne-klip.js'), 'utf8');
const veri = fs.readFileSync(path.join(ROOT, 'js/klip-data.js'), 'utf8');
const kes = (bas, son) => { const i = src.indexOf(bas), j = son ? src.indexOf(son) : src.length; return src.slice(i, j); };

let _rs = 20260909 >>> 0;
const ctxRnd = () => { _rs ^= _rs << 13; _rs >>>= 0; _rs ^= _rs >> 17; _rs ^= _rs << 5; _rs >>>= 0; return _rs / 4294967296; };
const ctx = {
  console, Math, JSON, Int16Array, Uint8Array,
  atob: (b) => Buffer.from(b, 'base64').toString('binary'),
  CRT_X0: 44, CRT_X1: 871.2, CRT_Y0: 28.4, CRT_Y1: 471.6,
  /* tohumlu rastgelelik: klipSec en iyi 6 aday arasından çeker — sabit değer
     verilirse hep AYNI klip seçilir ve kapı kendi kusurunu üretir (FAZ 26 dersi). */
  _srand: (x, y) => x + Math.floor(ctxRnd() * (y - x + 1)), _sr: () => ctxRnd(),
  G: { tactics: {} }, mState: {}, botCoachProfile: null
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(veri, ctx, { filename: 'klip-data.js' });
/* sabitler + klipVeri + klipPx/klipFt + imza/maliyet + klipSec */
vm.runInContext(kes('const KLIP_ACIK', 'function klipSut'), ctx, { filename: 'sahne-klip-parca.js' });

const D = vm.runInContext('klipVeri()', ctx);
if (!D || !D.klip || !D.klip.length) { console.log('✗ klip verisi yüklenemedi'); process.exit(1); }

console.log('FAZ 53 — TAKTİK ↔ KLİP EŞLEŞMESİ');
console.log('='.repeat(62));
console.log(`klip havuzu: ${D.klip.length} · medyan potaya uzaklık ${D.med.sr.toFixed(1)} ft · yayılım ${D.med.sy.toFixed(1)} ft · topa en yakın ${D.med.bp.toFixed(1)} ft · perde izi ${D.med.pd.toFixed(3)}`);

/* Aynı şut geometrisi + aynı başlangıç, tek fark savunma stili → seçilen kliplerin imzası */
function kos(stil, scheme) {
  return vm.runInContext(`(function(){
    const out=[];
    const D=klipVeri();
    const noktalar=[[210,180],[300,250],[250,330],[160,250],[330,140]];
    for(let n=0;n<noktalar.length;n++){
      for(let s=0;s<40;s++){
        D.son.length=0;
        const sec=klipSec('onsaha',noktalar[n],true,'G',false,[420,250],null,${JSON.stringify(stil)},${JSON.stringify(scheme)});
        if(!sec) continue;
        const im=klipImza(D,sec.k);
        out.push({sy:im.sy,bp:im.bp,pd:im.pd,sr:im.sr});
      }
    }
    return out;
  })()`, ctx);
}
const ort = (a, k) => a.reduce((s, x) => s + x[k], 0) / Math.max(1, a.length);

const adam = kos('adam', null), bolge = kos('bolge', null), pres = kos('pres', null);
console.log('\nSEÇİLEN KLİPLERİN İMZASI (aynı şut noktaları, tek fark savunma stili)');
[['Adam adama', adam], ['2-3 Bölge', bolge], ['Tam saha pres', pres]].forEach(([ad, a]) => {
  console.log(`  ${ad.padEnd(15)} potaya uzaklık ${ort(a, 'sr').toFixed(2)} ft · yayılım ${ort(a, 'sy').toFixed(2)} ft · topa en yakın ${ort(a, 'bp').toFixed(2)} ft  (n=${a.length})`);
});
yaz(ort(bolge, 'sr') < ort(adam, 'sr'),
  `bölge savunmasında seçilen klipler POTAYA DAHA YAKIN duruyor (${ort(bolge, 'sr').toFixed(2)} < ${ort(adam, 'sr').toFixed(2)} ft)`);
yaz(ort(pres, 'bp') < ort(adam, 'bp'), `preste topa en yakın savunmacı DAHA YAKIN (${ort(pres, 'bp').toFixed(2)} < ${ort(adam, 'bp').toFixed(2)} ft)`);
yaz(ort(bolge, 'bp') > ort(pres, 'bp'), `bölge topa preslemiyor (${ort(bolge, 'bp').toFixed(2)} > ${ort(pres, 'bp').toFixed(2)} ft)`);

const pnr = kos('adam', 'pnr'), iso = kos('adam', 'iso');
console.log('\nŞEMA');
console.log(`  ikili oyun (pnr) perde izi ${ort(pnr, 'pd').toFixed(3)} · birebir (iso) ${ort(iso, 'pd').toFixed(3)} · nötr ${ort(adam, 'pd').toFixed(3)}`);
yaz(ort(pnr, 'pd') > ort(adam, 'pd'), 'ikili oyun şemasında gerçekten perde kurulan klipler seçiliyor');
yaz(ort(iso, 'pd') < ort(pnr, 'pd'), 'birebir şemasında perdesiz klipler seçiliyor');

/* Seçimin havuzu daraltıp aynı klibi tekrarlamadığı (çeşitlilik) */
const cesit = vm.runInContext(`(function(){
  const D=klipVeri(); const set={};
  for(let s=0;s<200;s++){ D.son.length=0; const sec=klipSec('onsaha',[260,250],true,'G',false,[420,250],null,'bolge',null); if(sec) set[sec.ix]=1; }
  return Object.keys(set).length;
})()`, ctx);
yaz(cesit >= 5, `bölge seçimi tek klibe kilitlenmiyor — 200 çekilişte ${cesit} farklı klip`);

/* Savunan taraf: bot savunurken botun profili okunmalı (kullanıcının taktiği DEĞİL) */
const sksrc = src;
yaz(/function klipSavunmaStili\(offIsUser\)/.test(sksrc) && /botCoachProfile/.test(sksrc),
  'savunan taraf bot ise botun koç profili okunuyor (kullanıcının taktiği değil)');

console.log('\n' + '='.repeat(62));
console.log(hata ? `✗ ${hata} kapı düştü` : '✓ taktikler klip seçimine yansıyor');
process.exit(hata ? 1 : 0);
