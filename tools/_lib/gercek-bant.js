#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 39 §3.4: GERÇEK BANT OKUYUCU
 *
 * Check araçlarındaki eşikler artık ELLE YAZILMAZ. Hepsi `gercek-bantlar.json`
 * dosyasından okunur; o dosya `tools/gercek-veri/cikar.js` tarafından 3 sezonluk
 * gerçek NBA play-by-play verisinden üretilir.
 *
 * Neden: FAZ 34-38 arasındaki beş turda kapılar hep yeşile döndü ama oyun
 * "basketbola benzemiyor" kaldı. Sebep koddaki hata değil, HEDEFİN KENDİSİYDİ —
 * "gerçek: %14-18" tarzı bantların hiçbiri ölçülmemişti, tahmindi. Motor yanlış
 * hedefe kusursuzca ayarlanmıştı.
 *
 * Kullanım:
 *   const G = require('./_lib/gercek-bant.js');
 *   const b = G.al('kutuOranlari.faul');        // {deger, alt, ust, kaynak, n, ...}
 *   G.kapi(H, '2P%', olculen, 'isabet.ikiSayi');
 *
 * Bir ölçüt gerçek veriden çıkarılamadıysa değeri `null`dur: KAPI KURULMAZ,
 * `bilgi:` satırı olarak raporlanır (§3.4 — uydurulmuş eşik, eşiksizlikten kötüdür).
 */
const fs = require('fs');
const path = require('path');

const YOL = path.resolve(__dirname, 'gercek-bantlar.json');
let _j = null;

function veri() {
  if (_j) return _j;
  if (!fs.existsSync(YOL)) {
    throw new Error('gercek-bantlar.json yok. Önce:\n' +
      '  node tools/gercek-veri/indir.js\n' +
      '  node tools/gercek-veri/cikar.js');
  }
  _j = JSON.parse(fs.readFileSync(YOL, 'utf8'));
  return _j;
}

/** 'kutuOranlari.faul' gibi noktalı yolu çözer. Bulunamazsa/`null` ise null döner. */
function al(yol) {
  let o = veri();
  for (const p of String(yol).split('.')) {
    if (o == null || typeof o !== 'object') return null;
    o = o[p];
  }
  return (o && typeof o === 'object' && o.deger !== undefined) ? o : null;
}

/** Ham düğüm (bant olmayan dağılım nesneleri için: farkDagilimi, bitisBolgesi…). */
function ham(yol) {
  let o = veri();
  for (const p of String(yol).split('.')) {
    if (o == null || typeof o !== 'object') return null;
    o = o[p];
  }
  return o === undefined ? null : o;
}

const meta = () => veri().meta;

/**
 * Bir ölçümü gerçek banda karşı yargılar ve H listesine ekler.
 * @param {Array}  H     rapor listesi
 * @param {string} ad    ekranda görünecek ad
 * @param {number} deger ölçülen değer
 * @param {string} yol   gercek-bantlar.json içindeki yol
 * @param {object} o     {pay: bandı iki yana genişletme payı (bant genişliğinin oranı, varsayılan 0.02),
 *                        bilgi: true → kapı kurma, yalnız bilgi olarak yaz}
 */
function kapi(H, ad, deger, yol, o) {
  o = o || {};
  const b = al(yol);
  if (!b || b.alt == null || b.ust == null) {
    H.push({ ad, deger, alt: null, ust: null, bilgi: true, kaynak: b ? b.kaynak : null, gercek: b ? b.deger : null, yol,
      neden: b ? 'bant yok (yalnız lig ortalaması)' : 'gerçek veriden ÇIKARILAMADI' });
    return;
  }
  /* Pay BANT GENİŞLİĞİNE göre verilir, mutlak değil (FAZ 38 eki dersi: mutlak 0,05
     yüzde ölçeğinde doğru, oran ölçeğinde bandın yarısı kadar olup kapıyı körleştirir). */
  const pay = (b.ust - b.alt) * (o.pay == null ? 0.02 : o.pay);
  H.push({ ad, deger, alt: b.alt - pay, ust: b.ust + pay, gercek: b.deger, birim: b.birim || '',
    kaynak: b.kaynak, n: b.n, olcek: b.olcek || null, not: b.not || null, bilgi: !!o.bilgi, yol });
}

/** Rapor listesini basar; kapı düşerse `false` döner. */
function bas(H, baslik) {
  const cizgi = '='.repeat(78);
  console.log(cizgi);
  if (baslik) console.log(baslik);
  const m = meta();
  console.log('eşikler: tools/_lib/gercek-bantlar.json — ' + m.lig + ' ' + m.sezonlar.join('+') +
    ' · ' + m.mac + ' maç · ölçek ' + m.olcekKatsayisi + ' · çıkarım ' + m.cikarimTarihi);
  console.log(cizgi);
  let dusen = 0;
  const s2 = x => (x == null ? '—' : (Math.abs(x) >= 100 ? x.toFixed(1) : x.toFixed(x < 1 ? 4 : 2)));
  H.forEach(h => {
    if (h.alt == null) {
      console.log('  bilgi: ' + h.ad.padEnd(34) + s2(h.deger).padStart(9) +
        (h.gercek != null ? '   gerçek ' + s2(h.gercek) : '') + '   (' + h.neden + ')');
      return;
    }
    const ok = h.deger >= h.alt && h.deger <= h.ust;
    if (!ok && !h.bilgi) dusen++;
    console.log('  ' + (h.bilgi ? 'bilgi:' : (ok ? '✓' : '✗')) + ' ' + h.ad.padEnd(h.bilgi ? 28 : 32) +
      (s2(h.deger) + (h.birim || '')).padStart(10) +
      '   gerçek ' + s2(h.gercek) + ' [' + s2(h.alt) + ' – ' + s2(h.ust) + ']' +
      (h.n ? '  n=' + h.n : '') + (h.olcek ? ' ×' + h.olcek : ''));
  });
  const notlar = H.filter(h => h.not);
  if (notlar.length) {
    console.log('');
    notlar.forEach(h => console.log('  ⚠ ' + h.ad + ': ' + h.not));
  }
  console.log(cizgi);
  return dusen === 0;
}

module.exports = { al, ham, meta, kapi, bas, YOL };
