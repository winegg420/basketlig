#!/usr/bin/env node
/**
 * Charazay 2.0 — OYUNCU/TOP TEK KARE SIÇRAMASI (FAZ 47)
 *   node tools/isin-oyuncu.js olcum/iz-<etiket>.json [--px=30]
 * `iz-kaydet` kaydında ardışık iki karede (≤ 40 ms) `--px`ten (varsayılan 30 px ≈ 1 m) fazla yer
 * değiştiren HER jeton ve top listelenir — bağlamıyla (olay, mod, faz). 100 ms pencereli hız
 * ortalaması kısa sıçramayı yutar; kullanıcının gördüğü "ışınlanma" tam olarak tek karelik sıçramadır.
 */
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const dosya = args.find(a => !a.startsWith('--'));
if (!dosya) { console.error('kullanım: node tools/isin-oyuncu.js olcum/iz-<etiket>.json'); process.exit(2); }
const ESIK = +((args.find(a => a.startsWith('--px=')) || '--px=30').split('=')[1]);
const K = JSON.parse(fs.readFileSync(path.resolve(dosya), 'utf8')).kare;
const PX = 29.5429;
const bul = [];
for (let i = 1; i < K.length; i++) {
  const a = K[i - 1], b = K[i]; const dt = b.t - a.t; if (dt <= 0 || dt > 0.04) continue;
  b.p.forEach((q, j) => {
    const p0 = a.p[j]; if (!p0) return;
    const d = Math.hypot(q[0] - p0[0], q[1] - p0[1]);
    if (d > ESIK) bul.push({ t: +a.t.toFixed(2), kim: (q[2] ? 'HUC' : 'SAV') + '/' + q[3] + '#' + j, px: +d.toFixed(0), m: +(d / PX).toFixed(2), tip: a.tip, idx: a.idx, mod: a.b[2], cs: a.cs, ft: a.ft, inb: a.inb, oob: q[11], hedef: q[12] != null ? `(${q[12]},${q[13]})` : '' });
  });
  const db = Math.hypot(b.b[0] - a.b[0], b.b[1] - a.b[1]);
  if (db > ESIK * 1.6 && b.b[2] !== 'shot' && a.b[2] !== 'shot') bul.push({ t: +a.t.toFixed(2), kim: 'TOP', px: +db.toFixed(0), m: +(db / PX).toFixed(2), tip: a.tip, idx: a.idx, mod: a.b[2] + '→' + b.b[2], cs: a.cs, ft: a.ft, inb: a.inb });
}
const kare = K.length, sure = K[K.length - 1].t - K[0].t;
console.log(`TEK KARE SIÇRAMASI — ${path.basename(dosya)} · ${kare} kare · ${sure.toFixed(0)} sn · eşik ${ESIK} px`);
console.log(`  toplam: ${bul.length} (oyuncu ${bul.filter(x => x.kim !== 'TOP').length} · top ${bul.filter(x => x.kim === 'TOP').length})`);
const bag = {}; bul.forEach(x => { const k = x.tip + '/' + (x.mod || '') + (x.ft ? '/FT' : '') + (x.inb ? '/INB' : ''); bag[k] = (bag[k] || 0) + 1; });
console.log('  bağlam: ' + Object.keys(bag).sort((a, b) => bag[b] - bag[a]).slice(0, 8).map(k => k + ':' + bag[k]).join(' · '));
bul.slice(0, 40).forEach(x => console.log(`  ${String(x.t).padStart(7)}s ${x.kim.padEnd(10)} ${String(x.px).padStart(4)} px (${x.m} m) ${x.tip}/${x.mod}${x.ft ? ' FT' : ''}${x.inb ? ' INB' : ''}${x.oob ? ' oob' : ''} idx=${x.idx} ${x.hedef || ''}`));
