#!/usr/bin/env node
/* ── FAZ 59 DENETÇİSİ ─────────────────────────────────────────────────────────────────
   `tools/iz-kaydet.js` kaydını (olcum/iz-<etiket>.json) okur. FAZ 59'un dört maddesini
   ölçer ve FAZ 58'in geçen satırlarını GERİLEME KONTROLÜ olarak tekrar basar.
   Tarayıcı AÇMAZ — kayıt bir kez alınır, bu araç defalarca koşturulur.

     1  uçan top DONUYOR       (mod 'pass'/'shot' ama konum değişmiyor) + pas süresi p99
     2  sahipsiz top           (canlı 'loose', yerde, tören dışı)
     3  taşıyıcı rolü          (orta çizgiyi TOPLA geçen oyuncunun rolü)
     4  savunma mesafesi       (hücumcunun en yakın savunmacıya uzaklığı)
     R  FAZ 58 gerileme satırları

   ⚠ ÖLÇÜM NOTU (CLAUDE.md, FAZ 40/47): `iz-kaydet` rAF geri çağrısında örnek alır;
     yavaş bir karede birden çok sim alt adımı (33 ms) TEK kare gibi görünür. Sıçrama
     eşikleri bu yüzden kare süresiyle ölçeklenir. Kayıt `saat>0` ile dilimlenir —
     maç saati başlamadan önceki kurulum kareleri (pivot ↔ slot takası) meşru
     "sıçrama" gösterir.

   Kullanım:  node tools/faz59-check.js olcum/iz-<etiket>.json
   ──────────────────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');

const PX_M = 29.5429;
const CRT_X0 = 56.4, CRT_X1 = 883.6, CRT_Y0 = 28.43, CRT_Y1 = 471.57;
const MID = (CRT_X0 + CRT_X1) / 2;

const dosya = process.argv[2] || 'olcum/iz-faz59.json';
if (!fs.existsSync(dosya)) { console.error('kayıt yok: ' + dosya); process.exit(2); }
const H = JSON.parse(fs.readFileSync(dosya, 'utf8'));
let K = H.kare || [];
{ const k0 = K.findIndex(k => k && k.saat > 0); if (k0 > 0) K = K.slice(k0); }
if (K.length < 100) { console.error('kare yetersiz: ' + K.length); process.exit(2); }

const takim = i => (i < 5 ? 'h' : 'a');
const ad = i => takim(i) + '/' + ((K[0].p[i] && K[0].p[i][3]) || '?');
const rol = (k, i) => (k.p[i] && k.p[i][3]) || '?';
const sure = K[K.length - 1].t - K[0].t;
const tasiyan = k => { for (let i = 0; i < 10; i++) if (k.p[i] && k.p[i][4] === 1) return i; return -1; };
const R = [];
const bas = (etiket, deger, kapi, gecti, ek) => R.push({ etiket, deger, kapi, gecti, ek: ek || '' });
const p99 = (arr) => { if (!arr.length) return 0; const q = arr.slice().sort((a, b) => a - b); return q[Math.min(q.length - 1, Math.floor(0.99 * q.length))]; };

/* ═══ 1) UÇAN TOP DONUYOR ═════════════════════════════════════════════════════════════
   Mod 'pass' ya da 'shot' ama top kımıldamıyor. Ölçüldü v102: 642 sn'de 10 olay,
   toplam 38,9 sn (maçın %6,1'i) ve konumlar rastgele DEĞİL — üç sabit nokta, hepsi
   yan çizginin 2 px içinde (saha sınırı ağının kırptığı nokta). */
{
  const olay = []; let cur = null, kareDon = 0, kareUcus = 0;
  for (let f = 1; f < K.length; f++) {
    const a = K[f - 1], b = K[f];
    const m = b.b[2];
    if (m !== 'pass' && m !== 'shot') { if (cur) { cur.sure = b.t - cur.t; olay.push(cur); cur = null; } continue; }
    kareUcus++;
    const hareket = Math.hypot(b.b[0] - a.b[0], b.b[1] - a.b[1]);
    if (hareket < 0.5 && a.b[2] === m) {
      kareDon++;
      let en = 1e9, ei = -1;
      for (let i = 0; i < 10; i++) { const d = Math.hypot(b.p[i][0] - b.b[0], b.p[i][1] - b.b[1]); if (d < en) { en = d; ei = i; } }
      if (!cur) cur = { t: b.t, x: b.b[0], y: b.b[1], mod: m, yakin: en / PX_M, i: ei };
    } else if (cur) { cur.sure = b.t - cur.t; olay.push(cur); cur = null; }
  }
  if (cur) { cur.sure = K[K.length - 1].t - cur.t; olay.push(cur); }
  const uzun = olay.filter(o => o.sure > 0.35).sort((a, b) => b.sure - a.sure);
  const toplam = uzun.reduce((s, o) => s + o.sure, 0);
  bas('1 · donan uçuş (>0,35 sn)', uzun.length + ' olay · ' + toplam.toFixed(1) + ' sn (%' + (100 * toplam / sure).toFixed(1) + ')', '0', uzun.length === 0,
      uzun.slice(0, 6).map(o => `t=${o.t.toFixed(1)} ${o.sure.toFixed(1)} sn (${o.x.toFixed(0)},${o.y.toFixed(0)}) [${o.mod}] en yakın ${ad(o.i)} ${o.yakin.toFixed(1)} m`).join(' · '));

  /* pas süresi: 'held'→'pass' geçişinden modun 'pass' olmaktan çıkışına kadar */
  const sureler = [];
  for (let f = 1; f < K.length; f++) {
    if (K[f - 1].b[2] !== 'pass' && K[f].b[2] === 'pass') {
      for (let g = f + 1; g < K.length; g++) {
        if (K[g].b[2] !== 'pass') { sureler.push(K[g].t - K[f].t); break; }
        if (K[g].t - K[f].t > 25) { sureler.push(K[g].t - K[f].t); break; }
      }
    }
  }
  const pp = p99(sureler), ort = sureler.length ? sureler.reduce((a, b) => a + b, 0) / sureler.length : 0;
  bas('1 · pas süresi p99', pp.toFixed(2) + ' sn', '≤ 1,5 sn', pp <= 1.5,
      'n=' + sureler.length + ' · ortalama ' + ort.toFixed(2) + ' sn · en uzun ' + (sureler.length ? Math.max.apply(null, sureler).toFixed(1) : '0') + ' sn');
}

/* ═══ 1b) RAKİBE GİDEN PAS (FAZ 58 ölçütü — donma bunun da kaynağıydı) ═══════════════ */
{
  const paslar = [];
  for (let f = 1; f < K.length; f++) {
    const a = K[f - 1], b = K[f];
    if (a.b[2] !== 'held' || b.b[2] !== 'pass') continue;
    const veren = tasiyan(a); if (veren < 0) continue;
    let alan = -1, serbest = 0, hakem = false;
    for (let g = f + 1; g < K.length && (K[g].t - b.t) <= 3.0; g++) {
      const m = K[g].b[2];
      if (m === 'loose' || m === 'dead' || m === 'rim') serbest++;
      if (m === 'held' && tasiyan(K[g]) < 0) { hakem = true; break; }   /* hakem aracılı el değişimi — pas değil */
      const c = tasiyan(K[g]);
      if (c >= 0) { alan = c; break; }
    }
    if (alan < 0 || serbest > 5 || hakem) continue;
    paslar.push({ t: +b.t.toFixed(1), veren, alan, tip: a.tip });
  }
  const rakibe = paslar.filter(p => takim(p.veren) !== takim(p.alan) && p.tip !== 'start' && p.tip !== 'steal' && p.t > 3);
  bas('1b · rakibe giden pas', rakibe.length + ' / ' + paslar.length + ' pas', '0', rakibe.length === 0,
      rakibe.slice(0, 6).map(p => `t=${p.t} ${ad(p.veren)}→${ad(p.alan)} [${p.tip}]`).join(' · '));
}

/* ═══ 2) SAHİPSİZ TOP ═════════════════════════════════════════════════════════════════
   Kusur olan yalnız CANLI ('loose') topun YERDE (h ≤ 8 px) durup kimsenin almamasıdır.
   Çemberden/fileden inen top henüz alınamaz (`_topAlinabilir`), 'dead' modu düdüktür,
   hakem/serbest atış töreni muaftır (FAZ 58 dersi). */
{
  const hamBos = k => {
    if (k.hk === 1) return false;
    const m = k.b[2];
    if (m === 'shot' || m === 'rim' || m === 'pass') return false;
    return tasiyan(k) < 0;
  };
  const canli = k => hamBos(k) && k.b[2] === 'loose' && k.b[3] <= 8 && k.ft !== 1 && k.tip !== 'free';
  const ep = (test) => {
    const o = []; let c = null, kb = 0;
    for (const k of K) {
      if (test(k)) {
        kb++;
        if (!c) { let en = 1e9; for (let i = 0; i < 10; i++) { const d = Math.hypot(k.p[i][0] - k.b[0], k.p[i][1] - k.b[1]); if (d < en) en = d; } c = { t: k.t, tip: k.tip, yakin: en / PX_M }; }
      } else if (c) { c.sure = k.t - c.t; o.push(c); c = null; }
    }
    if (c) { c.sure = K[K.length - 1].t - c.t; o.push(c); }
    return { o: o.sort((a, b) => b.sure - a.sure), kb };
  };
  const g = ep(canli), h = ep(hamBos);
  const enUzun = g.o.length ? g.o[0].sure : 0;
  bas('2 · canlı sahipsiz top en uzun', enUzun.toFixed(2) + ' sn', '< 2,0 sn', enUzun < 2.0,
      g.o.slice(0, 6).map(o => `t=${o.t.toFixed(1)} ${o.sure.toFixed(2)} sn [${o.tip}] en yakın ${o.yakin.toFixed(1)} m`).join(' · '));
  bas('2 · ham sahipsiz kare payı', (100 * h.kb / K.length).toFixed(2) + '%', 'bilgi', true,
      'canlı yerde %' + (100 * g.kb / K.length).toFixed(2) + ' · ham en uzun ' + (h.o.length ? h.o[0].sure.toFixed(2) : '0') + ' sn');
}

/* ═══ 3) TAŞIYICI ROLÜ ════════════════════════════════════════════════════════════════
   Orta çizgiyi TOPU ELİNDE TUTARAK geçen oyuncunun rolü. Sayaç, aynı taşıyıcının
   çizgiyi geçtiği kareyi sayar (ileri-geri titremede çift saymamak için taşıyıcı
   değişimi sayacı sıfırlar). */
{
  const say = {}; let n = 0, prev = null, prevC = -1;
  const olay = [];
  for (const k of K) {
    const c = tasiyan(k);
    if (c < 0 || k.b[2] !== 'held') { prev = null; prevC = c; continue; }
    const x = k.p[c][0];
    if (prev != null && prevC === c && ((prev < MID) !== (x < MID))) {
      const r = rol(k, c); say[r] = (say[r] || 0) + 1; n++; olay.push({ t: k.t, r });
    }
    prev = x; prevC = c;
  }
  const pay = r => n ? 100 * (say[r] || 0) / n : 0;
  bas('3 · orta çizgiyi geçen PG payı', pay('PG').toFixed(0) + '%', '≥ %50', pay('PG') >= 50,
      'n=' + n + ' · ' + JSON.stringify(say));
  bas('3 · orta çizgiyi geçen C payı', pay('C').toFixed(0) + '%', '≤ %4', pay('C') <= 4, '');
  bas('3 · geçiş örneklemi', String(n), '≥ 25', n >= 25, '');
}

/* ═══ 4) SAVUNMA MESAFESİ ═════════════════════════════════════════════════════════════
   Hücumcunun en yakın savunmacıya uzaklığı; ön sahada (top yarısında) ölçülür. */
{
  let uzak = 0, top = 0, toplam = 0;
  for (const k of K) {
    const c = tasiyan(k); if (c < 0) continue;
    const off = [], def = [];
    for (let i = 0; i < 10; i++) (k.p[i][2] === 1 ? off : def).push(k.p[i]);
    if (off.length !== 5 || def.length !== 5) continue;
    for (const o of off) {
      let en = 1e9;
      for (const d of def) { const dd = Math.hypot(d[0] - o[0], d[1] - o[1]); if (dd < en) en = dd; }
      const m = en / PX_M; toplam += m; top++;
      if (m > 4) uzak++;
    }
  }
  const oran = top ? 100 * uzak / top : 0;
  /* ⚠ KAPI DEĞİL BİLGİ: bu satırın gerçek-veri karşılığı `tools/sahne-olcum.js`in
     "savunmadan >4 m %" satırıdır ve o araç kendi (dar) tanımıyla ölçer — hücumun
     ÖN SAHADA olduğu kareler, tam hassasiyetli konum. Buradaki sayı taşıyıcı olan HER
     kareyi (geçiş dahil) sayar, dolayısıyla sistematik olarak yüksektir (aynı koşuda
     26,0 ↔ sahne-olcum 17,9). İki farklı tanımı aynı eşikle yargılamak, FAZ 39'un
     "eşik elle yazılmaz, ölçülür" dersinin ihlalidir — kapı sahne-olcum'dadır. */
  bas('4 · savunmadan > 4 m (geniş tanım)', oran.toFixed(1) + '%', 'bilgi', true,
      'ortalama ' + (top ? (toplam / top).toFixed(2) : '0') + ' m · n=' + top + ' — KAPI: sahne-olcum "savunmadan >4 m %" (≤ %20, gerçek %15,6)');
}

/* ═══ R) FAZ 58 GERİLEME SATIRLARI ════════════════════════════════════════════════════ */
{
  const disari = p => (p[0] < CRT_X0 || p[0] > CRT_X1 || p[1] < CRT_Y0 || p[1] > CRT_Y1);
  let izinsiz = 0, kareT = 0, topDisi = 0, hayalet = 0;
  for (const k of K) {
    for (let i = 0; i < 10; i++) { kareT++; if (disari(k.p[i]) && k.p[i][11] !== 1) izinsiz++; }
    if (k.b[0] < CRT_X0 || k.b[0] > CRT_X1 || k.b[1] < CRT_Y0 || k.b[1] > CRT_Y1) topDisi++;
    if (k.b[2] === 'held' && tasiyan(k) < 0 && k.hk !== 1) hayalet++;
  }
  bas('R · izinsiz saha dışı oyuncu', (100 * izinsiz / kareT).toFixed(2) + '%', '%0,00', izinsiz === 0, '');
  bas('R · top saha dışı', (100 * topDisi / K.length).toFixed(2) + '%', '%0,00', topDisi === 0, '');
  bas('R · hayalet held', (K.length ? (sure * hayalet / K.length) : 0).toFixed(2) + ' sn', '≤ 0,5 sn', (sure * hayalet / K.length) <= 0.5, '');

  /* jeton ve top sıçraması — eşik kare süresine göre ölçeklenir */
  let jSic = 0, jMax = 0, tSic = 0, tMax = 0;
  for (let f = 1; f < K.length; f++) {
    const dt = K[f].t - K[f - 1].t; if (dt <= 0 || dt > 0.5) continue;
    const kat = Math.max(1, dt / 0.0167);
    for (let i = 0; i < 10; i++) {
      const m = Math.hypot(K[f].p[i][0] - K[f - 1].p[i][0], K[f].p[i][1] - K[f - 1].p[i][1]) / PX_M / kat;
      if (m > jMax) jMax = m;
      if (m > 0.45) jSic++;
    }
    const m0 = K[f - 1].b[2], m1 = K[f].b[2];
    if (m0 === m1 && (m1 === 'loose' || m1 === 'held' || m1 === 'dead')) {
      const m = Math.hypot(K[f].b[0] - K[f - 1].b[0], K[f].b[1] - K[f - 1].b[1]) / PX_M / kat;
      if (m > tMax) tMax = m;
      if (m > 1.0) tSic++;
    }
  }
  bas('R · 0,45 m üstü jeton sıçraması', jSic + ' (maks ' + jMax.toFixed(2) + ' m)', '0', jSic === 0, '');
  bas('R · 1,0 m üstü top sıçraması', tSic + ' (maks ' + tMax.toFixed(2) + ' m)', '0', tSic === 0, '');

  /* jetonlar iç içe — ÇİZİLEN konumda 26 px altı çift, 1,2 sn'den uzun */
  const olay = []; let akt = null;
  for (const k of K) {
    let en = 1e9, key = '';
    for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) {
      const a = k.p[i], b = k.p[j];
      const d = Math.hypot((b[0] + (b[14] || 0)) - (a[0] + (a[14] || 0)), (b[1] + (b[15] || 0)) - (a[1] + (a[15] || 0)));
      if (d < en) { en = d; key = i + '-' + j; }
    }
    if (en < 26) { if (!akt || akt.key !== key) { if (akt) { akt.sure = k.t - akt.t; olay.push(akt); } akt = { t: k.t, key }; } }
    else if (akt) { akt.sure = k.t - akt.t; olay.push(akt); akt = null; }
  }
  if (akt) { akt.sure = K[K.length - 1].t - akt.t; olay.push(akt); }
  const ic = olay.filter(o => o.sure > 1.2);
  bas('R · jeton iç içe (>1,2 sn)', String(ic.length), '0', ic.length === 0,
      'en uzun ' + (olay.length ? Math.max.apply(null, olay.map(o => o.sure)).toFixed(2) : '0') + ' sn');

  /* ⚠ İVME BU ARAÇTA ÖLÇÜLMEZ (FAZ 55 dersi): `iz-kaydet` konumu 0,1 px'e yuvarlar ve
     dt=16,7 ms'de bu 0,2 m/sn sahte hız, yani ~12 m/sn² sahte ivme demektir — ham float
     yörünge aynı matematikle yuvarlanınca ">8 payı" %0,37'den %45'e fırlıyor. Kare-kare
     türev alan ölçüm tam hassasiyet ister: ivme satırı `tools/sahne-olcum.js`ten okunur
     (mState._sim'den ham float, 0,2 sn pencereli). Burada yalnız ORTALAMA HIZ basılır —
     ortalama, yuvarlama gürültüsüne karşı dayanıklıdır. */
  /* ortalama hız TÜM jetonlarda (klip dahil) — duvar (ekran) ölçeği */
  const hz2 = [];
  for (let f = 1; f < K.length; f++) {
    const dt = K[f].t - K[f - 1].t; if (dt <= 0 || dt > 0.05) continue;
    for (let i = 0; i < 10; i++) hz2.push(Math.hypot(K[f].p[i][0] - K[f - 1].p[i][0], K[f].p[i][1] - K[f - 1].p[i][1]) / dt / PX_M);
  }
  const ortH = hz2.length ? hz2.reduce((a, b) => a + b, 0) / hz2.length : 0;
  bas('R · ortalama oyuncu hızı (duvar)', ortH.toFixed(2) + ' m/sn', '1,70 – 2,00', ortH >= 1.70 && ortH <= 2.00,
      '7,5+ payı %' + (hz2.length ? (100 * hz2.filter(x => x > 7.5).length / hz2.length).toFixed(2) : '0'));
}

/* ── ÇIKTI ────────────────────────────────────────────────────────────────────────── */
const L = [];
L.push('FAZ 59 — uçan topun donması · sahipsiz top · taşıyıcı rolü · savunma mesafesi');
L.push('kayıt: ' + path.basename(dosya) + ' · ' + K.length + ' kare · ' + sure.toFixed(1) + ' sn · örnekleme ' + (1000 * sure / (K.length - 1)).toFixed(1) + ' ms');
L.push('');
for (const r of R) {
  L.push((r.gecti ? ' ✓ ' : ' ✗ ') + r.etiket.padEnd(32) + String(r.deger).padStart(26) + '   kapı ' + r.kapi);
  if (r.ek) L.push('      ' + r.ek);
}
const dusen = R.filter(r => !r.gecti && r.kapi !== 'bilgi').length;
L.push('');
L.push(dusen ? `DÜŞEN KAPI: ${dusen}` : 'TÜM KAPILAR GEÇTİ');
console.log(L.join('\n'));
process.exit(dusen ? 1 : 0);
