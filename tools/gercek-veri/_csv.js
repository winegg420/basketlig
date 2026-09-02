#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 39: akışlı CSV okuyucu (bağımlılıksız).
 *
 * ⚠ `cut -d,` ya da `split(',')` BU VERİDE ÇALIŞMAZ: `pbpstats` dosyasındaki EVENTS
 *   sütunu tırnak içinde hem virgül hem SATIR SONU taşır (ilk denemede STARTTYPE
 *   sütunu %53 boş göründü). Bu yüzden tırnak durumunu izleyen gerçek bir ayrıştırıcı
 *   gerekiyor.
 *
 * satirlar(dosya, cb) — başlığı okur, her satır için {sutun: değer} nesnesi verir.
 * Bellekte tüm dosyayı tutmaz: 130 MB'lık sezon dosyaları böyle işlenebiliyor.
 */
const fs = require('fs');

function satirlar(dosya, cb) {
  return new Promise((res, rej) => {
    const rs = fs.createReadStream(dosya, { encoding: 'utf8', highWaterMark: 1 << 20 });
    let alan = '', satir = [], tirnak = false, kacik = false;   /* kacik: tırnak içinde "" */
    let basliklar = null, n = 0;
    const satirBitti = () => {
      satir.push(alan); alan = '';
      const s = satir; satir = [];
      if (!basliklar) { basliklar = s.map(x => x.trim().replace(/^\uFEFF/, '')); return; }
      /* Sondaki boş satır (dosya sonu \n) atlanır. */
      if (s.length === 1 && s[0] === '') return;
      const o = {};
      for (let i = 0; i < basliklar.length; i++) o[basliklar[i]] = s[i] !== undefined ? s[i] : '';
      n++;
      cb(o, n);
    };
    rs.on('data', chunk => {
      for (let i = 0; i < chunk.length; i++) {
        const c = chunk[i];
        if (tirnak) {
          if (kacik) { kacik = false; if (c === '"') { alan += '"'; continue; } tirnak = false; /* düş */ }
          else if (c === '"') { kacik = true; continue; }
          else { alan += c; continue; }
        }
        if (c === '"' && alan === '') { tirnak = true; continue; }
        if (c === ',') { satir.push(alan); alan = ''; continue; }
        if (c === '\r') continue;
        if (c === '\n') { satirBitti(); continue; }
        alan += c;
      }
    });
    rs.on('end', () => { if (alan !== '' || satir.length) satirBitti(); res(n); });
    rs.on('error', rej);
  });
}

module.exports = { satirlar };
