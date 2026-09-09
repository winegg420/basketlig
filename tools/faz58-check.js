#!/usr/bin/env node
/* ── FAZ 58 DENETÇİSİ ─────────────────────────────────────────────────────────────────
   `tools/iz-kaydet.js` kaydını (olcum/iz-<etiket>.json) okur ve FAZ 58 brifinin altı
   maddesini ölçer. Tarayıcı AÇMAZ — kayıt bir kez alınır, bu araç defalarca koşturulur.

     A  rakibe giden pas          (pas başlangıcındaki taşıyıcı ↔ pası alan oyuncu takımı)
     B1 izinsiz saha dışı · B2 sokma izni sızıntısı (izin var ama 4,5 sn+ dışarıda)
     C  tek karede jeton sıçraması  (> 0,45 m)
     D  sahipsiz top epizodu       (en uzun < 2,0 sn)
     E  tek karede top sıçraması    (loose/held, > 1,0 m)
     F  ÇİZİLEN konumda 26 px'ten yakın jeton çifti payı

   ⚠ ÖLÇÜM NOTU (CLAUDE.md, FAZ 40): `iz-kaydet` kendi rAF geri çağrısında örnek alır;
     yavaş bir karede birden çok sim alt adımı (33 ms) TEK kare gibi görünür. Bu yüzden
     C ve E'de eşik, o karenin GERÇEK süresine göre ölçeklenir (kare 16,7 ms'den uzunsa
     izin de o oranda büyür) — yoksa araç kendi örnekleme jitter'ini "ışınlanma" sayar.

   Kullanım:  node tools/faz58-check.js olcum/iz-<etiket>.json
   ──────────────────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');

const PX_M = 29.5429;
const CRT_X0 = 56.4, CRT_X1 = 883.6, CRT_Y0 = 28.43, CRT_Y1 = 471.57;

const dosya = process.argv[2] || 'olcum/iz-faz58.json';
if (!fs.existsSync(dosya)) { console.error('kayıt yok: ' + dosya); process.exit(2); }
const H = JSON.parse(fs.readFileSync(dosya, 'utf8'));
let K = H.kare || [];
{ const k0 = K.findIndex(k => k && k.saat > 0); if (k0 > 0) K = K.slice(k0); }
if (K.length < 100) { console.error('kare yetersiz: ' + K.length); process.exit(2); }

const takim = i => (i < 5 ? 'h' : 'a');
const ad = i => takim(i) + '/' + ((K[0].p[i] && K[0].p[i][3]) || '?');
const sure = K[K.length - 1].t - K[0].t;
const dtOrt = sure / (K.length - 1);
const R = [];
const bas = (etiket, deger, kapi, gecti, ek) =>
  R.push({ etiket, deger, kapi, gecti, ek: ek || '' });

/* ── A) RAKİBE GİDEN PAS ──────────────────────────────────────────────────────────────
   Pas başlangıcı: mod 'held' → 'pass' geçişi; veren = önceki karedeki taşıyıcı.
   Alan = pas bittikten sonra taşıyıcı olan İLK oyuncu (arada 'loose' geçebilir; pas
   sonrası 2,0 sn içinde kimse almazsa olay "alan yok" sayılır ve paydaya girmez). */
{
  const paslar = [];
  const tasiyan = k => { for (let i = 0; i < 10; i++) if (k.p[i] && k.p[i][4] === 1) return i; return -1; };
  for (let f = 1; f < K.length; f++) {
    const a = K[f - 1], b = K[f];
    if (a.b[2] === 'held' && b.b[2] === 'pass') {
      const veren = tasiyan(a);
      if (veren < 0) continue;                       /* hakem/ghost taşıyıcı — pas değil */
      /* Alan = pas BİTİNCE topu tutan oyuncu. ⚠ Arada top yere düşüp serbest kalırsa (kaçan
         pas · çemberden dönen top) topu kimin topladığı bir PAS KARARI DEĞİLDİR — rakibin
         yerdeki topu alması normaldir. Bu yüzden pas ile alış arasında 5 kareden uzun bir
         serbest/ölü evre varsa olay "pas" sayılmaz. */
      /* ⚠ HAKEM ARADAYSA PAS DEĞİLDİR: FAZ 51'den beri düdükte top hakeme atılır, hakem de
         sokucuya verir (`oamTopHakeme`). Hakem `S.players` içinde olmadığı için arada
         "taşıyıcısı olmayan 'held' karesi" görünür — bu iki ayrı el değişimidir, tek pas
         değil. Sayılırsa "a/SF → h/PF" gibi sahte bir rakibe-pas üretir (iki koşuda da
         çıktı ve kod incelemesinde meşru olduğu görüldü). */
      let alan = -1, tAl = 0, serbest = 0, hakem = false;
      for (let g = f + 1; g < K.length && (K[g].t - b.t) <= 2.0; g++) {
        const m = K[g].b[2];
        if (m === 'loose' || m === 'dead' || m === 'rim') serbest++;
        if (m === 'held' && tasiyan(K[g]) < 0) { hakem = true; break; }
        const c = tasiyan(K[g]);
        if (c >= 0) { alan = c; tAl = K[g].t; break; }
      }
      if (alan < 0 || serbest > 5 || hakem) continue;
      const d = Math.hypot(K[f].b[0] - a.b[0], K[f].b[1] - a.b[1]);
      paslar.push({ t: +b.t.toFixed(1), veren, alan, tip: a.tip, hk: a.hk | 0,
                    m: +(Math.hypot(K[Math.max(0, f - 1)].p[veren][0] - K[Math.min(K.length - 1, f + 1)].p[alan][0],
                                    K[Math.max(0, f - 1)].p[veren][1] - K[Math.min(K.length - 1, f + 1)].p[alan][1]) / PX_M).toFixed(1) });
    }
  }
  /* MEŞRU takım değişimleri sayılmaz: hava atışı (tap rakibe düşebilir — maçın ilk 3 sn'si
     ve 'start' damgası) ve damgalı çalma ('steal' — top gerçekten elden alınır). */
  const rakibe = paslar.filter(p => takim(p.veren) !== takim(p.alan)
    && p.tip !== 'start' && p.tip !== 'steal' && p.t > 3);
  bas('A · rakibe giden pas', rakibe.length + ' / ' + paslar.length + ' pas', '0', rakibe.length === 0,
      rakibe.slice(0, 8).map(p => `t=${p.t} ${ad(p.veren)}→${ad(p.alan)} ${p.m} m [${p.tip}]`).join(' · '));
  bas('A · toplanan pas', String(paslar.length), '≥ 60', paslar.length >= 60, '');
}

/* ── B) SAHA DIŞINDA DURAN OYUNCU ────────────────────────────────────────────────────
   İki ayrı ölçüt (brifin tek satırı bunları karıştırıyordu):
     B1  İZİNSİZ dışarı — ne `_oob` (sokma izni) ne `_oobDonus` (dönüş) var. Kapı 0.
     B2  İZİN SIZINTISI — izin var ama oyuncu 4,5 sn'den uzun süre dışarıda. Meşru sokma
         töreninin tasarım tavanı 3,4 sn'dir; üstü, temizlenmeyi atlayan bir yolun kalıntısıdır.
   İki epizot dizisi de topu sokan oyuncuyu MEŞRU sayar, kusuru saymaz. */
{
  const disari = (p) => (p[0] < CRT_X0 || p[0] > CRT_X1 || p[1] < CRT_Y0 || p[1] > CRT_Y1);
  const kosu = (test) => {
    const olay = [], akt = new Array(10).fill(null);
    let kareD = 0, kareT = 0;
    for (const k of K) for (let i = 0; i < 10; i++) {
      const p = k.p[i]; if (!p) continue;
      kareT++;
      const d = test(p);
      if (d) kareD++;
      if (d && !akt[i]) akt[i] = { t: k.t, i, x: p[0], y: p[1], klip: p[16] | 0 };
      else if (!d && akt[i]) { akt[i].sure = k.t - akt[i].t; olay.push(akt[i]); akt[i] = null; }
    }
    for (let i = 0; i < 10; i++) if (akt[i]) { akt[i].sure = K[K.length - 1].t - akt[i].t; olay.push(akt[i]); }
    return { olay: olay.sort((a, b) => b.sure - a.sure), kareD, kareT };
  };
  const yaz = o => `t=${o.t.toFixed(1)} ${ad(o.i)} ${o.sure.toFixed(1)} sn (${o.x.toFixed(0)},${o.y.toFixed(0)})${o.klip ? ' klip' : ''}`;

  const b1 = kosu(p => disari(p) && p[11] !== 1);
  const b1u = b1.olay.filter(o => o.sure > 0.3);
  bas('B1 · izinsiz saha dışı payı', (100 * b1.kareD / b1.kareT).toFixed(2) + '%', '0,00%', b1.kareD === 0, '');
  bas('B1 · 0,3 sn üstü olay', String(b1u.length), '0', b1u.length === 0, b1u.slice(0, 8).map(yaz).join(' · '));

  const izinli = p => ((p.length > 17) ? p[17] === 1 : p[11] === 1);
  const b2 = kosu(p => disari(p) && izinli(p));
  /* Eşik 4,5 sn: MEŞRU sokma töreni tasarım gereği 3,4 sn'ye kadar sürebilir (FAZ 53 —
     hakem, on oyuncunun kulvarına yerleşmesini bekler) + sokucunun çizgiye varış süresi.
     Ölçüldü (620 sn, düzeltme sonrası): 20 sokmanın medyanı 1,27 · p90 3,77 · maks 3,77 sn;
     4,5 sn üstü SIFIR. Düzeltme öncesinde maks 8,15 sn ve iki olay 6 sn'yi aşıyordu. */
  const b2u = b2.olay.filter(o => o.sure > 4.5);
  bas('B2 · izin sızıntısı (>4,5 sn)', String(b2u.length), '0', b2u.length === 0,
      b2u.slice(0, 8).map(yaz).join(' · ') || ('en uzun meşru sokma ' + (b2.olay.length ? b2.olay[0].sure.toFixed(1) : '0') + ' sn'));
}

/* ── C) JETON SIÇRAMASI (tek kare) ────────────────────────────────────────────────── */
{
  const olay = [];
  for (let f = 1; f < K.length; f++) {
    const dt = K[f].t - K[f - 1].t; if (dt <= 0 || dt > 0.5) continue;
    const kat = Math.max(1, dt / 0.0167);            /* örnekleme jitter'i: eşik kare süresiyle ölçeklenir */
    for (let i = 0; i < 10; i++) {
      const a = K[f - 1].p[i], b = K[f].p[i]; if (!a || !b) continue;
      const m = Math.hypot(b[0] - a[0], b[1] - a[1]) / PX_M;
      if (m > 0.45 * kat) olay.push({ t: K[f].t, i, m, klip: b[16] | 0, dt });
    }
  }
  olay.sort((a, b) => b.m - a.m);
  bas('C · 0,45 m üstü jeton sıçraması', String(olay.length), '0', olay.length === 0,
      olay.slice(0, 8).map(o => `t=${o.t.toFixed(1)} ${ad(o.i)} ${o.m.toFixed(2)} m (dt ${(o.dt * 1000).toFixed(0)} ms${o.klip ? ', klip' : ''})`).join(' · '));
}

/* ── D) SAHİPSİZ TOP ──────────────────────────────────────────────────────────────── */
{
  /* İki ölçüt. HAM: taşıyıcısı olmayan her kare (bilgi). GERÇEK KUSUR: top YERDE duruyor ve
     kimse almıyor — çemberden/fileden inen top (h > 8 px) henüz alınabilir DEĞİLDİR
     (`_topAlinabilir`: h ≤ 2 m ve düşüyor), ölü top töreni (hakem · serbest atış) de muaftır.
     Ham sayacı kapı yapmak, topun fileden düşme süresini "kusur" saymaktı. */
  const hamBos = k => {
    if (k.hk === 1) return false;                     /* hakemde: ölü top töreni */
    const m = k.b[2];
    if (m === 'shot' || m === 'rim' || m === 'pass') return false;
    for (let i = 0; i < 10; i++) if (k.p[i] && k.p[i][4] === 1) return false;
    return true;
  };
  /* ⚠ `dead` MODU DA MUAFTIR: FAZ 54 A4 sözleşmesinde 'dead' "düdük çaldı, top oyun dışı"
     demektir — hakemin/sokucunun topu alması beklenen ölü toptur, ekranda kusur değildir.
     Kusur, CANLI topun ('loose') yerde durup kimsenin almamasıdır. Ölü top epizotları
     ayrıca bilgi olarak basılır. */
  const gercekBos = k => hamBos(k) && k.b[2] === 'loose' && (k.b[3] <= 8) && k.ft !== 1 && k.tip !== 'free';
  const epizot = (test) => {
    const olay = []; let cur = null, kb = 0;
    for (const k of K) {
      if (test(k)) { kb++; if (!cur) cur = { t: k.t, mod: k.b[2], tip: k.tip }; }
      else if (cur) { cur.sure = k.t - cur.t; olay.push(cur); cur = null; }
    }
    if (cur) { cur.sure = K[K.length - 1].t - cur.t; olay.push(cur); }
    return { olay: olay.sort((a, b) => b.sure - a.sure), kb };
  };
  const g = epizot(gercekBos), h = epizot(hamBos);
  const olu = epizot(k => hamBos(k) && k.b[2] === 'dead');
  const enUzun = g.olay.length ? g.olay[0].sure : 0;
  bas('D · ölü top (düdük) en uzun', (olu.olay.length ? olu.olay[0].sure.toFixed(2) : '0.00') + ' sn', 'bilgi', true,
      olu.olay.slice(0, 4).map(o => `t=${o.t.toFixed(1)} ${o.sure.toFixed(2)} sn [${o.tip}]`).join(' · '));
  bas('D · CANLI yerde sahipsiz en uzun', enUzun.toFixed(2) + ' sn', '< 2,0 sn', enUzun < 2.0,
      g.olay.slice(0, 6).map(o => `t=${o.t.toFixed(1)} ${o.sure.toFixed(2)} sn [${o.mod}/${o.tip}]`).join(' · '));
  bas('D · ham sahipsiz kare payı', (100 * h.kb / K.length).toFixed(2) + '%', 'bilgi', true,
      'yerde: ' + (100 * g.kb / K.length).toFixed(2) + '% · ham en uzun ' + (h.olay.length ? h.olay[0].sure.toFixed(2) : '0') + ' sn (çemberden inen top + tören dahil)');
}

/* ── E) TOP SIÇRAMASI (loose/held/dead) ───────────────────────────────────────────── */
{
  const olay = [];
  for (let f = 1; f < K.length; f++) {
    const dt = K[f].t - K[f - 1].t; if (dt <= 0 || dt > 0.5) continue;
    const kat = Math.max(1, dt / 0.0167);
    const m0 = K[f - 1].b[2], m1 = K[f].b[2];
    if (!(m0 === m1 && (m1 === 'loose' || m1 === 'held' || m1 === 'dead'))) continue;
    const m = Math.hypot(K[f].b[0] - K[f - 1].b[0], K[f].b[1] - K[f - 1].b[1]) / PX_M;
    if (m > 1.0 * kat) olay.push({ t: K[f].t, m, mod: m1, dt });
  }
  olay.sort((a, b) => b.m - a.m);
  bas('E · 1,0 m üstü top sıçraması', String(olay.length), '0', olay.length === 0,
      olay.slice(0, 6).map(o => `t=${o.t.toFixed(1)} ${o.m.toFixed(2)} m [${o.mod}] dt ${(o.dt * 1000).toFixed(0)} ms`).join(' · '));
}

/* ── F) ÇİZİLEN KONUMDA İÇ İÇE JETON ──────────────────────────────────────────────── */
{
  let ciz = 0, sim = 0, top = 0;
  const olay = [], akt = new Map();
  for (const k of K) {
    top++;
    let enCiz = 1e9, enSim = 1e9, ei = -1, ej = -1;
    for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) {
      const a = k.p[i], b = k.p[j]; if (!a || !b) continue;
      const ds = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dc = Math.hypot((b[0] + (b[14] || 0)) - (a[0] + (a[14] || 0)),
                            (b[1] + (b[15] || 0)) - (a[1] + (a[15] || 0)));
      if (ds < enSim) enSim = ds;
      if (dc < enCiz) { enCiz = dc; ei = i; ej = j; }
    }
    if (enCiz < 26) ciz++;
    if (enSim < 26) sim++;
    const key = ei + '-' + ej;
    if (enCiz < 26) { if (!akt.has(key)) akt.set(key, { t: k.t, key, d: enCiz }); }
    for (const [kk, v] of Array.from(akt)) if (kk !== key || enCiz >= 26) { v.sure = k.t - v.t; olay.push(v); akt.delete(kk); }
  }
  olay.sort((a, b) => b.sure - a.sure);
  const oran = 100 * ciz / top;
  bas('F · çizimde < 26 px çift payı', oran.toFixed(2) + '%', '< 3%', oran < 3,
      'simülasyon payı ' + (100 * sim / top).toFixed(2) + '% (klip kaydı — DEĞİŞMEMELİ)');
  bas('F · en uzun iç içe epizot', (olay.length ? olay[0].sure : 0).toFixed(2) + ' sn', 'bilgi', true, '');
}

/* ── ÇIKTI ────────────────────────────────────────────────────────────────────────── */
const L = [];
L.push('FAZ 58 — canlı sahne kusur denetimi');
L.push('kayıt: ' + path.basename(dosya) + ' · ' + K.length + ' kare · ' + sure.toFixed(1) + ' sn · örnekleme ' + (dtOrt * 1000).toFixed(1) + ' ms');
L.push('');
for (const r of R) {
  L.push((r.gecti ? ' ✓ ' : ' ✗ ') + r.etiket.padEnd(34) + String(r.deger).padStart(18) + '   kapı ' + r.kapi);
  if (r.ek) L.push('      ' + r.ek);
}
const dusen = R.filter(r => !r.gecti && r.kapi !== 'bilgi').length;
L.push('');
L.push(dusen ? `DÜŞEN KAPI: ${dusen}` : 'TÜM KAPILAR GEÇTİ');
const out = L.join('\n');
console.log(out);
process.exit(dusen ? 1 : 0);
