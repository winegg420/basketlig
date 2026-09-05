/* Pozisyon değişimi başına orta çizgi geçişi: node gecis-analiz.js <iz.json>
   Pozisyon = `os` (hücum yönü) bayrağının değiştiği aralık. Her pozisyonda topun orta çizgiyi
   hangi modda geçtiği (held/pass/shot/hiç) ve pozisyonun olay tipleri listelenir. */
const fs = require('fs');
const K = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).kare;
const ORTA = 470;
const seg = [];
let bas = 0;
for (let i = 1; i <= K.length; i++) {
  if (i === K.length || K[i].os !== K[bas].os) {
    const s = { t0: K[bas].t, t1: K[i - 1].t, os: K[bas].os, tipler: [], gecisMod: null, gecisT: null, bitisX: K[i - 1].b[0] };
    let sonTip = null;
    for (let j = bas; j < i; j++) {
      const k = K[j];
      if (k.tip !== sonTip) { s.tipler.push(k.tip); sonTip = k.tip; }
      if (j > bas && !s.gecisMod) {
        const x0 = K[j - 1].b[0], x1 = k.b[0];
        const hedefSag = s.os ? false : true;   /* os=1: sol potaya hücum → top sağdan sola geçer */
        const gecti = s.os ? (x0 >= ORTA && x1 < ORTA) : (x0 <= ORTA && x1 > ORTA);
        if (gecti) { s.gecisMod = k.b[2]; s.gecisT = k.t; }
      }
    }
    seg.push(s); bas = i;
  }
}
const uzun = seg.filter(s => s.t1 - s.t0 > 2);
const held = uzun.filter(s => s.gecisMod === 'held').length;
console.log(`pozisyon (>2 sn): ${uzun.length} · held geçiş: ${held} (${(100 * held / uzun.length).toFixed(0)}%) · pass: ${uzun.filter(s => s.gecisMod === 'pass').length} · shot: ${uzun.filter(s => s.gecisMod === 'shot').length} · hiç: ${uzun.filter(s => !s.gecisMod).length}`);
uzun.filter(s => s.gecisMod !== 'held').forEach(s => console.log(`  ${s.t0}-${s.t1}s os=${s.os} geçiş=${s.gecisMod || 'YOK'}${s.gecisT ? '@' + s.gecisT : ''} bitişX=${s.bitisX} tipler=${s.tipler.join('>')}`));
