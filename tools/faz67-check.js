#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 67: TOP SAHİPLİĞİ DENETÇİSİ (tarayıcısız)
 *
 * `tools/iz-kaydet.js` kaydını okur ve topun zamanını NEREDE geçirdiğini ölçer.
 * Bu ölçüt bugüne kadar HİÇBİR araçta yoktu; asıl kusur (top maçın dörtte birinde
 * yerde) yedi faz boyunca bu yüzden görünmedi.
 *
 * Referans: tools/_lib/gercek-hareket.json → topElde.heldOran (SportVU 2015-16).
 *   Dosyanın kendi tanımı: "Tutan = topa yatay <= 0,9 m ve top <= 2,1 m"
 *   AYNI tanım burada da uygulanır — iki taraf farklı tanımla ölçülürse
 *   fark davranışı değil tanımı ölçer (FAZ 48 dersi).
 *
 * Kullanım: node tools/faz67-check.js olcum/iz-<etiket>.json
 */
const fs = require('fs');
const path = require('path');
const PX_M = 29.5429;            /* yatay: 29,5429 px = 1 m */
const PX_H = 9.836;              /* dikey: çember h=30 ↔ 3,05 m */
const TUT_PX = 0.9 * PX_M;       /* 26,6 px */
const TUT_H = 2.1 * PX_H;        /* 20,7 px */

const dosya = process.argv[2] || path.join(__dirname, '..', 'olcum', 'iz-temel.json');
if (!fs.existsSync(dosya)) { console.error('kayıt yok: ' + dosya); process.exit(2); }
const ham = JSON.parse(fs.readFileSync(dosya, 'utf8'));
const K = (ham.kare || ham).filter(k => k && k.b && (k.saat || 0) > 0);   /* maç saati başlamadan önceki kurulum kareleri atılır */
if (K.length < 3000) { console.error('kayıt kısa (' + K.length + ' kare) — en az 400 sn / 18.000 kare gerekir'); }

let GERCEK = null;
try { GERCEK = JSON.parse(fs.readFileSync(path.join(__dirname, '_lib', 'gercek-hareket.json'), 'utf8')); } catch (e) {}
const gHeld = (GERCEK && GERCEK.topElde && GERCEK.topElde.heldOran) || null;

const sure = K[K.length - 1].t - K[0].t;
const say = {};
let elde = 0;                    /* gerçek tanımla: en yakın oyuncu ≤0,9 m VE top ≤2,1 m */
let canliElde = 0, canliN = 0;   /* ölü top töreni (top hakemde) hariç */
const epi = [];                  /* loose epizotları */
let cur = null;
let prevMode = null;
const gecis = {};                /* 'pass>loose' gibi */
let pasBitis = { held: 0, loose: 0, dead: 0, shot: 0, diger: 0 };
let pasBasT = null, pasBasXY = null;

for (let i = 0; i < K.length; i++) {
  const k = K[i], b = k.b, mod = b[2];
  say[mod] = (say[mod] || 0) + 1;
  /* topElde — gerçek verinin tanımı */
  let en = 1e9;
  for (const p of (k.p || [])) { const d = Math.hypot(p[0] - b[0], p[1] - b[1]); if (d < en) en = d; }
  if (en <= TUT_PX && (b[3] || 0) <= TUT_H) elde++;
  if (!k.hk) { canliN++; if (en <= TUT_PX && (b[3] || 0) <= TUT_H) canliElde++; }

  if (mod !== prevMode) {
    if (prevMode !== null) {
      const g = prevMode + '>' + mod;
      gecis[g] = gecis[g] || { n: 0, sn: 0 };
      gecis[g].n++;
      if (prevMode === 'pass') {
        pasBitis[mod] != null ? pasBitis[mod]++ : pasBitis.diger++;
      }
    }
    if (mod === 'loose') { cur = { t0: k.t, kaynak: prevMode || '?', i0: i }; }
    else if (cur) { cur.t1 = k.t; cur.sure = cur.t1 - cur.t0; epi.push(cur); cur = null; }
    prevMode = mod;
  }
}
if (cur) { cur.t1 = K[K.length - 1].t; cur.sure = cur.t1 - cur.t0; epi.push(cur); }
for (const e of epi) { const g = e.kaynak + '>loose'; if (gecis[g]) gecis[g].sn += e.sure; }

const pct = (n) => (100 * n / K.length).toFixed(1);
const L = [];
L.push('=== FAZ 67 — TOP SAHİPLİĞİ ===');
L.push('kayıt: ' + path.basename(dosya) + ' · ' + K.length + ' kare · ' + sure.toFixed(1) + ' sn'
  + ' · document.hidden=' + (K.some(k => k.hid) ? 'TRUE (GEÇERSİZ!)' : 'false'));
L.push('');
L.push('--- top elde oranı (gerçek verinin TANIMIYLA: yatay ≤0,9 m ve top ≤2,1 m) ---');
const eldeP = 100 * elde / K.length;
L.push('  topElde %          : ' + eldeP.toFixed(1) + '   ' + (gHeld ? '(gerçek SportVU %' + (100 * gHeld).toFixed(1) + ')' : '')
  + '   kapı ≥%78 → ' + (eldeP >= 78 ? 'GEÇTİ' : 'DÜŞTÜ'));
L.push('  topElde % (ölü top töreni hariç): ' + (100 * canliElde / Math.max(1, canliN)).toFixed(1)
  + '   (olu top toreni haric / hakem SportVU verisinde izlenmez)');
L.push('');
L.push('--- topun modları ---');
for (const m of ['held', 'pass', 'shot', 'rim', 'loose', 'dead']) if (say[m]) L.push('  ' + m.padEnd(6) + ' %' + pct(say[m]));
const looseP = 100 * (say.loose || 0) / K.length;
L.push('  loose kapı ≤%6 → ' + (looseP <= 6 ? 'GEÇTİ' : 'DÜŞTÜ') + '   (gerçek ~%3)');
L.push('');
L.push('--- serbest top epizotları (nereden geldi) ---');
const grup = {};
for (const e of epi) { const g = e.kaynak; grup[g] = grup[g] || { n: 0, sn: 0, max: 0 }; grup[g].n++; grup[g].sn += e.sure; grup[g].max = Math.max(grup[g].max, e.sure); }
for (const g of Object.keys(grup).sort((a, b) => grup[b].sn - grup[a].sn)) {
  const v = grup[g];
  L.push('  ' + (g + '>loose').padEnd(12) + v.n.toString().padStart(3) + ' olay · ' + v.sn.toFixed(1).padStart(6) + ' sn · ort '
    + (v.sn / v.n).toFixed(2) + ' sn · en uzun ' + v.max.toFixed(2) + ' sn');
}
const n400 = (epi.length * 400 / sure);
L.push('  TOPLAM       ' + epi.length + ' olay · ' + epi.reduce((a, e) => a + e.sure, 0).toFixed(1) + ' sn'
  + '   → 400 sn başına ' + n400.toFixed(0) + '   kapı ≤20 → ' + (n400 <= 20 ? 'GEÇTİ' : 'DÜŞTÜ'));
L.push('');
L.push('--- kapılar ---');
const pl = (grup.pass || { n: 0 }).n, hl = (grup.held || { n: 0 }).n, rl = grup.rim || { n: 0, sn: 0, max: 0 };
L.push('  pass>loose          : ' + pl + '   kapı 0 → ' + (pl === 0 ? 'GEÇTİ' : 'DÜŞTÜ'));
L.push('  held>loose          : ' + hl + '   (sebepli/sebepsiz ayrımı için sahne sayacı S._dusurmeKim)');
const pTop = pasBitis.held + pasBitis.loose + pasBitis.dead + pasBitis.shot + pasBitis.diger;
L.push('  pas bitişi          : held ' + pasBitis.held + ' · loose ' + pasBitis.loose + ' · dead ' + pasBitis.dead
  + ' · shot ' + pasBitis.shot + ' · diğer ' + pasBitis.diger
  + '   → held payı %' + (pTop ? (100 * pasBitis.held / pTop).toFixed(1) : '-')
  + '   kapı ≥%97 → ' + (pTop && (100 * pasBitis.held / pTop) >= 97 ? 'GEÇTİ' : 'DÜŞTÜ'));
L.push('  rim>loose (ribaunt) : ' + rl.n + ' olay · ort ' + (rl.n ? (rl.sn / rl.n).toFixed(2) : '-') + ' sn (kapı ≤0,80)'
  + ' · en uzun ' + rl.max.toFixed(2) + ' sn (kapı ≤2,00) → '
  + ((rl.n && (rl.sn / rl.n) <= 0.80 && rl.max <= 2.0) ? 'GEÇTİ' : 'DÜŞTÜ'));
L.push('');
L.push('--- motorun kendi güvenlik ağı sayaçları (son kare) ---');
const sy = K[K.length - 1].sy || [];
const ad = ['havadan pas', 'donan uçuş', 'hayalet held', 'top kurtarma', 'klemp', 'dead', 'rakibe pas kapısı', 'yetişme'];
sy.forEach((v, i) => L.push('  ' + (ad[i] || ('s' + i)).padEnd(20) + v));
L.push('  _kurtarN kapı ≤2 / 400 sn → ' + (((sy[3] | 0) * 400 / sure) <= 2 ? 'GEÇTİ' : 'DÜŞTÜ'));
const f67 = K[K.length - 1].f67 || [0, 0];
L.push('  ' + 'sebepsiz held>loose'.padEnd(20) + f67[0] + '   kapı 0 → ' + ((f67[0] | 0) === 0 ? 'GEÇTİ' : 'DÜŞTÜ'));
L.push('  ' + 'boşalmayan pas kuyr.'.padEnd(20) + f67[1] + '   kapı 0 → ' + ((f67[1] | 0) === 0 ? 'GEÇTİ' : 'DÜŞTÜ'));
const dseb = K[K.length - 1].dseb;
if (dseb) L.push('  meşru düşürme sebepleri: ' + JSON.stringify(dseb));
const dkim = K[K.length - 1].dkim;
if (dkim && dkim.length) { L.push('  SEBEPSİZ DÜŞÜRME KİMLİĞİ:'); dkim.forEach(e => L.push('    t=' + e.t + ' ' + e.tip + ' ' + e.kim + '  ' + e.yol)); }
const pkim = K[K.length - 1].pkim;
if (pkim && pkim.length) { L.push('  BOŞALMAYAN PAS KUYRUĞU:'); pkim.forEach(e => L.push('    t=' + e.t + ' mod=' + e.mod + ' ' + e.tip + ' → ' + e.kime)); }
L.push('');
L.push('--- loose/dead GECISININ KAYNAGI (motor kimlik sayaci) ---');
const lk = K[K.length - 1].lkay || {};
Object.keys(lk).sort((a, b) => lk[b] - lk[a]).forEach(k => L.push('  ' + String(lk[k]).padStart(4) + '  ' + k));
L.push('');
L.push('--- serbest top epizodu KLİP sırasında mı ---');
{ let kl = 0, fz = 0; for (const e of epi) { (K[e.i0].klp ? kl++ : fz++); } L.push('  klip ' + kl + ' · fizik ' + fz); }
L.push('');
L.push('--- en uzun 10 serbest top epizodu ---');
epi.slice().sort((a, b) => b.sure - a.sure).slice(0, 10).forEach(e =>
  L.push('  t=' + e.t0.toFixed(1).padStart(6) + '  ' + e.kaynak.padEnd(5) + '>loose  ' + e.sure.toFixed(2) + ' sn'));

const out = L.join('\n');
console.log(out);
