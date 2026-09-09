#!/usr/bin/env node
/* ── ANOMALİ AVCISI ───────────────────────────────────────────────────────────────────
   `tools/iz-kaydet.js` kaydının TAMAMINI (saniyede 60 kare) tarar ve basketbolda
   olmaması gereken ne varsa bulup sıralar. Diğer denetçilerden farkı: ÖNCEDEN VERİLMİŞ
   BİR KAPI LİSTESİ YOKTUR. Bu araç "şu oranı tuttur" demez; "şu anda şu oyuncu şunu
   yapıyor, bu basketbol değil" der ve zaman damgasıyla gösterir.

   Gerekçe (FAZ 60): FAZ 58-59'da bütün kapılar yeşildi ve oyun hâlâ bozuk izleniyordu.
   Kapılar yalnız SORULAN soruyu yanıtlar; sorulmayan kusur görünmez. Bu araç soruyu
   tersine çevirir — aykırı olanı arar.

   Kullanım:  node tools/anomali.js olcum/iz-<etiket>.json [--tam]
              --tam : her bulgunun tüm örneklerini bas (varsayılan: en kötü 8)
   ──────────────────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');

const PX_M = 29.5429;
const CRT_X0 = 56.4, CRT_X1 = 883.6, CRT_Y0 = 28.43, CRT_Y1 = 471.57;
const MID = (CRT_X0 + CRT_X1) / 2;
const RIM_L = 102.9, RIM_R = 830.9;                 /* pota merkezleri (1,575 m dip çizgiden) */
const PAINT_YARIM = 2.45 * PX_M;                    /* boya yarı genişliği (4,9 m) */
const FT_X = 227.75;                                /* serbest atış çizgisi (5,80 m) */

const dosya = process.argv[2] || '';
const TAM = process.argv.includes('--tam');
if (!dosya || !fs.existsSync(dosya)) { console.error('kullanım: node tools/anomali.js olcum/iz-<etiket>.json'); process.exit(2); }
const H = JSON.parse(fs.readFileSync(dosya, 'utf8'));
let K = H.kare || [];
{ const k0 = K.findIndex(k => k && k.saat > 0); if (k0 > 0) K = K.slice(k0); }
if (K.length < 100) { console.error('kare yetersiz'); process.exit(2); }
const SURE = K[K.length - 1].t - K[0].t;

const AD = i => (i < 5 ? 'h' : 'a') + '/' + ((K[0].p[i] && K[0].p[i][3]) || '?');
const rolAd = (k, i) => (i < 5 ? 'h' : 'a') + '/' + (k.p[i][3] || '?');
const m = px => px / PX_M;
const tasiyan = k => { for (let i = 0; i < 10; i++) if (k.p[i][4] === 1) return i; return -1; };
/* Ölü top / tören karesi: bu karelerde durmak, dizilmek, beklemek NORMALDİR. */
const oluTop = k => (k.ft === 1 || k.hk === 1 || k.b[2] === 'dead' || k.tip === 'free' || k.tip === 'mola' ||
                     k.tip === 'quarter_start' || k.tip === 'quarter_end' || k.tip === 'start' || k.tip === 'end' ||
                     k.oam === 'toren' || k.inb === 1);
/* Hücumun saldırdığı pota (offSide: 1 = sol) */
const hedefPota = k => (k.os === 1 ? RIM_L : RIM_R);

const BULGU = [];
const ekle = (tur, agirlik, satir, t, sure) => BULGU.push({ tur, agirlik, satir, t, sure: sure || 0 });

/* ══════════════════════════════════════════════════════════════════════════════════════
   A) OYUNCU DAVRANIŞI
   ══════════════════════════════════════════════════════════════════════════════════ */

/* A1 — CANLI OYUNDA KIPIRDAMAYAN OYUNCU (3 sn'de 0,6 m'den az yol) */
{
  const PENCERE = 3.0, ESIK = 0.6 * PX_M;
  const ep = new Array(10).fill(null), out = [];
  for (let f = 0; f < K.length; f++) {
    const k = K[f];
    for (let i = 0; i < 10; i++) {
      if (oluTop(k)) { ep[i] = null; continue; }
      if (!ep[i]) { ep[i] = { t: k.t, x: k.p[i][0], y: k.p[i][1], maxD: 0 }; continue; }
      const d = Math.hypot(k.p[i][0] - ep[i].x, k.p[i][1] - ep[i].y);
      if (d > ep[i].maxD) ep[i].maxD = d;
      if (ep[i].maxD > ESIK) { ep[i] = { t: k.t, x: k.p[i][0], y: k.p[i][1], maxD: 0 }; continue; }
      const sur = k.t - ep[i].t;
      if (sur >= PENCERE) {
        out.push({ t: ep[i].t, i, sure: sur, x: k.p[i][0], y: k.p[i][1], tip: k.tip, klip: k.p[i][16] | 0 });
        ep[i] = null;
      }
    }
  }
  /* aynı oyuncunun ardışık epizotlarını birleştir */
  /* ⚠ KLİP JETONU = GERÇEK NBA KAYDI. Gerçek veride oyuncu zamanın %18,8'inde durağandır
     (FAZ 54); klip karesinde duran oyuncu KUSUR DEĞİLDİR. Önem yalnız FİZİK jetonundan gelir. */
  const fizik = out.filter(o => !o.klip);
  out.sort((a, b) => b.sure - a.sure);
  fizik.sort((a, b) => b.sure - a.sure);
  fizik.slice(0, TAM ? 999 : 8).forEach(o => ekle('A1 canlı oyunda kıpırdamayan oyuncu', o.sure * 2,
    `t=${o.t.toFixed(1)} ${AD(o.i)} ${o.sure.toFixed(1)} sn boyunca 0,6 m'den az hareket (${o.x.toFixed(0)},${o.y.toFixed(0)}) [${o.tip}${o.klip ? ' · klip' : ''}]`, o.t, o.sure));
  if (out.length) ekle('A1 ÖZET', 0, `toplam ${out.length} epizot (fizik ${fizik.length} · klip ${out.length - fizik.length} = gerçek kayıt, kusur değil) · en uzun ${out[0].sure.toFixed(1)} sn`, 0, 0);
}

/* A2 — HEDEFİNE VARAMAYAN OYUNCU (uzaklık 4 sn boyunca azalmıyor ve > 1,5 m) */
{
  const ep = new Array(10).fill(null), out = [];
  for (const k of K) {
    for (let i = 0; i < 10; i++) {
      const d = Math.hypot(k.p[i][0] - k.p[i][12], k.p[i][1] - k.p[i][13]);
      if (d < 1.5 * PX_M || oluTop(k)) { ep[i] = null; continue; }
      /* ⚠ FAZ 60: HEDEF DEĞİŞİMİ EPİZODU SIFIRLAR. İlk sürüm bunu yapmıyordu ve
         "hedefe 22,8 m, 4 sn ilerleme yok" diyordu; oysa oyuncu 1,6 m'lik eski hedefindeyken
         sahanın öbür ucuna (26 m) YENİ hedef almış ve koşmaya başlamıştı. Çapraz koşuda
         düz mesafe yavaş kapanır; ölçüt "ilerliyor mu", "düz mesafe azalıyor mu" değildir. */
      if (!ep[i] || ep[i].hx !== k.p[i][12] || ep[i].hy !== k.p[i][13]) { ep[i] = { t: k.t, min: d, hx: k.p[i][12], hy: k.p[i][13] }; continue; }
      if (d < ep[i].min - 6) { ep[i] = { t: k.t, min: d, hx: k.p[i][12], hy: k.p[i][13] }; continue; }   /* ilerliyor */
      const sur = k.t - ep[i].t;
      if (sur >= 4.0) {
        out.push({ t: ep[i].t, i, sure: sur, d: m(d), hx: k.p[i][12], hy: k.p[i][13], tip: k.tip });
        ep[i] = null;
      }
    }
  }
  out.sort((a, b) => b.sure - a.sure);
  out.slice(0, TAM ? 999 : 6).forEach(o => ekle('A2 hedefine varamayan oyuncu', o.sure * 1.5,
    `t=${o.t.toFixed(1)} ${AD(o.i)} ${o.sure.toFixed(1)} sn boyunca hedefe yaklaşamıyor (kalan ${o.d.toFixed(1)} m, hedef ${o.hx},${o.hy}) [${o.tip}]`, o.t, o.sure));
  if (out.length) ekle('A2 ÖZET', 0, `toplam ${out.length} epizot`, 0, 0);
}

/* A3 — HÜCUM BAŞLADIĞI HÂLDE ARKA SAHADA KALAN HÜCUMCU */
{
  const ep = new Array(10).fill(null), out = [];
  for (const k of K) {
    const c = tasiyan(k); if (c < 0 || oluTop(k)) { ep.fill(null); continue; }
    const solaMi = k.os === 1;
    const topOn = solaMi ? (k.b[0] < MID) : (k.b[0] > MID);
    if (!topOn) { ep.fill(null); continue; }
    for (let i = 0; i < 10; i++) {
      if (k.p[i][2] !== 1) { ep[i] = null; continue; }                    /* yalnız hücumcu */
      const arkada = solaMi ? (k.p[i][0] > MID + 30) : (k.p[i][0] < MID - 30);
      if (!arkada) { ep[i] = null; continue; }
      if (!ep[i]) ep[i] = { t: k.t };
      const sur = k.t - ep[i].t;
      if (sur >= 6.0) { out.push({ t: ep[i].t, i, sure: sur, tip: k.tip }); ep[i] = null; }
    }
  }
  out.sort((a, b) => b.sure - a.sure);
  out.slice(0, TAM ? 999 : 6).forEach(o => ekle('A3 hücum ön sahadayken arkada kalan hücumcu', o.sure,
    `t=${o.t.toFixed(1)} ${AD(o.i)} ${o.sure.toFixed(1)} sn arka sahada [${o.tip}]`, o.t, o.sure));
  if (out.length) ekle('A3 ÖZET', 0, `toplam ${out.length} epizot`, 0, 0);
}

/* A4 — HİÇ KİMSEYİ TUTMAYAN SAVUNMACI (her hücumcudan 6 m+ uzak, 3 sn) */
{
  const ep = new Array(10).fill(null), out = [];
  for (const k of K) {
    if (oluTop(k)) { ep.fill(null); continue; }
    const off = [], def = [];
    for (let i = 0; i < 10; i++) (k.p[i][2] === 1 ? off : def).push(i);
    if (off.length !== 5 || def.length !== 5) { ep.fill(null); continue; }
    /* ⚠ FAZ 60: HÜCUMA GEÇEN OYUNCUNUN EPİZODU SIFIRLANIR. İlk sürüm yalnız `def` listesini
       geziyordu; top el değiştirince oyuncu `off`a geçiyor, epizodu SİLİNMİYOR ve pozisyon
       değişimlerinin üstünden atlayarak "10,9 sn kimseyi tutmadı" gibi sahte bir bulgu
       üretiyordu (ölçüldü: o 10,9 saniyenin ortasında oyuncu ZATEN hücumdaydı). */
    for (const i of off) ep[i] = null;
    for (const i of def) {
      let en = 1e9;
      for (const j of off) { const d = Math.hypot(k.p[i][0] - k.p[j][0], k.p[i][1] - k.p[j][1]); if (d < en) en = d; }
      if (en < 6 * PX_M) { ep[i] = null; continue; }
      if (!ep[i]) ep[i] = { t: k.t, en };
      const sur = k.t - ep[i].t;
      if (sur >= 3.0) { out.push({ t: ep[i].t, i, sure: sur, d: m(en), tip: k.tip, klip: k.p[i][16] | 0 }); ep[i] = null; }
    }
  }
  const fizik4 = out.filter(o => !o.klip);   /* klip = gerçek NBA geçiş anı, kusur değil */
  out.sort((a, b) => b.sure - a.sure); fizik4.sort((a, b) => b.sure - a.sure);
  fizik4.slice(0, TAM ? 999 : 6).forEach(o => ekle('A4 kimseyi tutmayan savunmacı', o.sure,
    `t=${o.t.toFixed(1)} ${AD(o.i)} ${o.sure.toFixed(1)} sn boyunca en yakın hücumcu ${o.d.toFixed(1)} m [${o.tip}]`, o.t, o.sure));
  if (out.length) ekle('A4 ÖZET', 0, `toplam ${out.length} epizot (fizik ${fizik4.length} · klip ${out.length - fizik4.length} = gerçek kayıt)`, 0, 0);
}

/* A5 — YIĞILMA: 3+ oyuncu 1,5 m yarıçapta, 1,5 sn */
{
  let ep = null; const out = [];
  for (const k of K) {
    if (oluTop(k)) { ep = null; continue; }
    let bulundu = null;
    for (let i = 0; i < 10 && !bulundu; i++) {
      const grup = [i];
      for (let j = 0; j < 10; j++) if (j !== i && Math.hypot(k.p[j][0] - k.p[i][0], k.p[j][1] - k.p[i][1]) < 1.5 * PX_M) grup.push(j);
      if (grup.length >= 3) bulundu = grup;
    }
    if (!bulundu) { ep = null; continue; }
    if (!ep) ep = { t: k.t, grup: bulundu };
    const sur = k.t - ep.t;
    if (sur >= 1.5) { out.push({ t: ep.t, sure: sur, grup: ep.grup, tip: k.tip, klip: ep.grup.every(i => k.p[i][16] === 1) }); ep = null; }
  }
  const fizik5 = out.filter(o => !o.klip);
  out.sort((a, b) => b.sure - a.sure); fizik5.sort((a, b) => b.sure - a.sure);
  fizik5.slice(0, TAM ? 999 : 6).forEach(o => ekle('A5 üç oyuncu aynı noktada yığılıyor', o.sure * 1.5,
    `t=${o.t.toFixed(1)} ${o.sure.toFixed(1)} sn · ${o.grup.map(AD).join(' + ')} 1,5 m yarıçapta [${o.tip}]`, o.t, o.sure));
  if (out.length) ekle('A5 ÖZET', 0, `toplam ${out.length} epizot (fizik ${fizik5.length} · klip ${out.length - fizik5.length} = gerçek kayıt)`, 0, 0);
}

/* A6 — TİTREME: 2 sn içinde 4+ kez 150°'den keskin yön değişimi */
{
  const out = [];
  const N = K.length;
  const yon = (f, i) => { const a = K[f - 1].p[i], b = K[f].p[i]; return [b[0] - a[0], b[1] - a[1]]; };
  for (let i = 0; i < 10; i++) {
    let dizi = [];
    for (let f = 2; f < N; f++) {
      if (oluTop(K[f])) { dizi = []; continue; }
      const v1 = yon(f - 1, i), v2 = yon(f, i);
      const n1 = Math.hypot(v1[0], v1[1]), n2 = Math.hypot(v2[0], v2[1]);
      if (n1 < 0.6 || n2 < 0.6) continue;
      const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (n1 * n2);
      if (cos < -0.87) dizi.push(K[f].t);                     /* > 150° */
      while (dizi.length && K[f].t - dizi[0] > 2.0) dizi.shift();
      if (dizi.length >= 4) { out.push({ t: dizi[0], i, n: dizi.length, tip: K[f].tip, klip: K[f].p[i][16] | 0 }); dizi = []; }
    }
  }
  out.sort((a, b) => b.n - a.n);
  out.slice(0, TAM ? 999 : 6).forEach(o => ekle('A6 jeton titriyor (ileri-geri)', 3,
    `t=${o.t.toFixed(1)} ${AD(o.i)} 2 sn'de ${o.n} kez 150°+ yön değişimi [${o.tip}${o.klip ? ' · klip' : ''}]`, o.t, 2));
  if (out.length) ekle('A6 ÖZET', 0, `toplam ${out.length} epizot`, 0, 0);
}

/* ══════════════════════════════════════════════════════════════════════════════════════
   B) SERBEST ATIŞ YERLEŞİMİ — kullanıcı: "oyuncular faul çizgisine bile yanlış yerleşiyor"
   ══════════════════════════════════════════════════════════════════════════════════ */
{
  /* Serbest atış epizotları: ft===1 ya da tip==='free'. Atış anı: epizodun SONU. */
  const ep = []; let cur = null;
  for (const k of K) {
    const ftK = (k.ft === 1 || k.tip === 'free');
    if (ftK) { if (!cur) cur = { t0: k.t, kare: [] }; cur.kare.push(k); }
    else if (cur) { cur.t1 = cur.kare[cur.kare.length - 1].t; ep.push(cur); cur = null; }
  }
  if (cur) { cur.t1 = cur.kare[cur.kare.length - 1].t; ep.push(cur); }

  const rapor = [];
  for (const e of ep) {
    if (e.kare.length < 20) continue;
    /* ⚠ FAZ 60: ÖRNEK ANI ATIŞ ANIDIR, EPİZODUN %85'İ DEĞİL. `S._ftAktif` atışlar
       bittikten sonra da bir süre açık kalır (FAZ 40 dersi); epizodun sonundan örnek almak
       oyun YENİDEN CANLIYKEN ölçüp "kulvar boş" diyordu. Ölçüldü: bu bölüm düzeltme
       öncesi ve sonrası AYNI sayıyı verdi (3,4 oyuncu) oysa `sunum-check` F14-7 aynı
       değişiklikte 7,7/10 → 9,3/10 yükseldi. Örnek artık topun 'shot' moduna GEÇTİĞİ
       ilk kareden hemen ÖNCEKİ karedir; yoksa epizodun ilk üçte biri (tören sürüyor). */
    let ix = -1;
    for (let q = 1; q < e.kare.length; q++) if (e.kare[q].b[2] === 'shot' && e.kare[q - 1].b[2] !== 'shot') { ix = q - 1; break; }
    if (ix < 0) ix = Math.floor(e.kare.length * 0.33);
    const k = e.kare[ix];
    const solaMi = k.os === 1;
    const rim = solaMi ? RIM_L : RIM_R;
    const dip = solaMi ? CRT_X0 : CRT_X1;
    const yon = solaMi ? 1 : -1;                              /* dip çizgiden sahaya doğru */
    const mesafe = p => Math.abs(p[0] - dip);                 /* dip çizgiden uzaklık (px) */
    const kulvarda = p => Math.abs(Math.abs(p[1] - 250) - PAINT_YARIM) < 26 && mesafe(p) < 5.5 * PX_M;
    /* şutör: serbest atış çizgisinin 1 m'si içinde, ortada */
    let sut = -1, sd = 1e9;
    for (let i = 0; i < 10; i++) {
      const d = Math.hypot(k.p[i][0] - (dip + yon * FT_X * 0 + (solaMi ? FT_X : CRT_X1 - (FT_X - CRT_X0))), k.p[i][1] - 250);
      const dx = Math.abs(mesafe(k.p[i]) - (FT_X - CRT_X0)), dy = Math.abs(k.p[i][1] - 250);
      const dd = Math.hypot(dx, dy);
      if (dd < sd) { sd = dd; sut = i; }
    }
    const kulvarOyuncu = [];
    for (let i = 0; i < 10; i++) if (i !== sut && kulvarda(k.p[i])) kulvarOyuncu.push(i);
    /* en dipteki iki kulvar yeri SAVUNMANIN olmalı (gerçek kural) */
    const sirali = kulvarOyuncu.slice().sort((a, b) => mesafe(k.p[a]) - mesafe(k.p[b]));
    const ilkIki = sirali.slice(0, 2);
    const dipSavunma = ilkIki.length === 2 && ilkIki.every(i => k.p[i][2] !== 1);
    /* şutör gerçekten çizgide mi */
    const sutCizgi = sd;
    rapor.push({ t: e.t0, sure: e.t1 - e.t0, kulvar: kulvarOyuncu.length, dipSavunma,
                 sut: sut, sutSapma: m(sutCizgi),
                 dizilim: kulvarOyuncu.map(i => `${rolAd(k, i)}${k.p[i][2] === 1 ? '(H)' : '(S)'}@${m(mesafe(k.p[i])).toFixed(1)}m`).join(' ') });
  }
  if (rapor.length) {
    const kotu = rapor.filter(r => r.kulvar < 4 || !r.dipSavunma || r.sutSapma > 1.0);
    ekle('B SERBEST ATIŞ ÖZET', 0,
      `${rapor.length} serbest atış epizodu · kulvarda ortalama ${(rapor.reduce((s, r) => s + r.kulvar, 0) / rapor.length).toFixed(1)} oyuncu (gerçek 4-6) · dipteki iki yer savunmanın: ${rapor.filter(r => r.dipSavunma).length}/${rapor.length} · şutörün çizgiye sapması ort ${(rapor.reduce((s, r) => s + r.sutSapma, 0) / rapor.length).toFixed(2)} m`, 0, 0);
    kotu.slice(0, TAM ? 999 : 8).forEach(r => ekle('B serbest atış yerleşimi bozuk', 6,
      `t=${r.t.toFixed(1)} kulvarda ${r.kulvar} oyuncu · dipte savunma: ${r.dipSavunma ? 'evet' : 'HAYIR'} · şutör çizgiden ${r.sutSapma.toFixed(2)} m · [${r.dizilim || 'kulvar BOŞ'}]`, r.t, r.sure));
  } else ekle('B SERBEST ATIŞ ÖZET', 0, 'kayıtta serbest atış epizodu bulunamadı', 0, 0);
}

/* ══════════════════════════════════════════════════════════════════════════════════════
   C) TOP
   ══════════════════════════════════════════════════════════════════════════════════ */

/* C1 — topun mantıksız yön değiştirmesi: 'held' modda taşıyıcı değişmeden 0,5 sn içinde
        150°+ dönen top (sürme titremesi) */
/* C2 — pas mesafesi ve yönü */
{
  const paslar = [];
  for (let f = 1; f < K.length; f++) {
    if (K[f - 1].b[2] === 'held' && K[f].b[2] === 'pass') {
      const veren = tasiyan(K[f - 1]);
      /* FAZ 60: HAKEM ARACILI el değişimi ve SERBEST TOP toplama PAS DEĞİLDİR (FAZ 58/59
         dersi): düdükte top hakeme atılır, hakem sokucuya verir; aradaki "taşıyıcısız 'held'
         karesi" iki ayrı el değişimidir. Arada 5 kareden uzun serbest/ölü evre varsa da topu
         kimin topladığı bir PAS KARARI değildir. */
      let alan = -1, g2 = f, hakem = false, serbest = 0;
      for (let g = f + 1; g < K.length && K[g].t - K[f].t < 3; g++) {
        const md = K[g].b[2];
        if (md === 'loose' || md === 'dead' || md === 'rim') serbest++;
        if (md === 'held' && tasiyan(K[g]) < 0) { hakem = true; break; }
        const c = tasiyan(K[g]); if (c >= 0) { alan = c; g2 = g; break; }
      }
      if (veren < 0 || hakem || serbest > 5) continue;
      const d = m(Math.hypot(K[g2].b[0] - K[f].b[0], K[g2].b[1] - K[f].b[1]));
      const rim = hedefPota(K[f]);
      const geri = Math.abs(K[g2].b[0] - rim) - Math.abs(K[f].b[0] - rim);
      /* FAZ 60: 2 m altı top hareketi PAS DEĞİLDİR — el değişimidir (motor da 2 m altını
         `_ballTut` ile işler, FAZ 55 A3). Sayarsak ortalama pas mesafesi sahte biçimde
         düşer (ölçüldü: 2,9 m ↔ `sahne-olcum` aynı koşuda 5,22 m). */
      if (d >= 2.0) paslar.push({ t: K[f].t, veren, alan, d, geri: m(geri), sure: K[g2].t - K[f].t, tip: K[f].tip });
    }
  }
  const uzun = paslar.filter(p => p.d > 12).sort((a, b) => b.d - a.d);
  const geri = paslar.filter(p => p.geri > 6).sort((a, b) => b.geri - a.geri);
  const rakip = paslar.filter(p => p.alan >= 0 && (p.veren < 5) !== (p.alan < 5) && p.tip !== 'steal' && p.tip !== 'start' && p.t > 3);
  ekle('C PAS ÖZET', 0, `${paslar.length} pas · ortalama ${(paslar.reduce((s, p) => s + p.d, 0) / (paslar.length || 1)).toFixed(1)} m (gerçek 5-6) · 12 m üstü ${uzun.length} · 6 m geri giden ${geri.length} · rakibe ${rakip.length}`, 0, 0);
  uzun.slice(0, TAM ? 999 : 5).forEach(p => ekle('C uzun pas', 2, `t=${p.t.toFixed(1)} ${AD(p.veren)}→${p.alan >= 0 ? AD(p.alan) : '?'} ${p.d.toFixed(1)} m [${p.tip}]`, p.t, 0));
  geri.slice(0, TAM ? 999 : 5).forEach(p => ekle('C potadan uzaklaşan pas', 2, `t=${p.t.toFixed(1)} ${AD(p.veren)}→${p.alan >= 0 ? AD(p.alan) : '?'} ${p.geri.toFixed(1)} m geri [${p.tip}]`, p.t, 0));
  rakip.slice(0, TAM ? 999 : 5).forEach(p => ekle('C rakibe pas', 8, `t=${p.t.toFixed(1)} ${AD(p.veren)}→${AD(p.alan)} ${p.d.toFixed(1)} m [${p.tip}]`, p.t, 0));
}

/* C3 — TOPU TUTMA SÜRESİ — GERÇEK VERİNİN TANIMIYLA ÖLÇÜLÜR
   ⚠ FAZ 60: ilk sürüm `b.carrier` ile ölçüyordu ve "bir oyuncu topu 12,3 sn tuttu,
   ortalama 2,00 sn (gerçek 1,47)" diyordu. `b.carrier` HISTEREZİSLİDİR (taşıyıcı ancak
   top 1,71 m uzaklaşınca değişir), oysa `tools/gercek-hareket/cikar.js` gerçeği "topa
   ≤ 1,2 m + 0,5 sn köprü" ile ölçer. AYNI tanım bizim kaydımıza uygulanınca ortalama
   1,47 sn çıktı — gerçekle BİREBİR. Yani ortada kusur YOKTU, tanım farkı vardı
   (FAZ 48 dersi: iki taraf farklı tanımla ölçülürse fark TANIMIN kendisidir). */
{
  const tut = []; let cur = null, bosT = 0;
  for (const k of K) {
    if (k.b[2] === 'shot' || k.b[2] === 'rim') { if (cur) { tut.push(cur); cur = null; } bosT = 0; continue; }
    let en = -1, ed = 1e9;
    for (let i2 = 0; i2 < 10; i2++) { const d = Math.hypot(k.p[i2][0] - k.b[0], k.p[i2][1] - k.b[1]); if (d < ed) { ed = d; en = i2; } }
    const yakin = (ed <= 1.2 * PX_M);
    if (yakin && cur && cur.i === en) { cur.son = k.t; bosT = 0; }
    else if (yakin) { if (cur) tut.push(cur); cur = { i: en, t: k.t, son: k.t, tip: k.tip }; bosT = 0; }
    else { bosT += 0.0167; if (bosT > 0.5 && cur) { tut.push(cur); cur = null; } }
  }
  if (cur) tut.push(cur);
  const s2 = tut.map(t => ({ ...t, sure: t.son - t.t })).filter(t => t.sure > 0.15);
  const ort = s2.length ? s2.reduce((a, b) => a + b.sure, 0) / s2.length : 0;
  const uzun = s2.filter(t => t.sure > 8).sort((a, b) => b.sure - a.sure);
  ekle('C TUTMA ÖZET', 0, s2.length + ' tutma · ortalama ' + ort.toFixed(2) + ' sn (GERÇEK 1,465 — aynı tanım) · 8 sn üstü ' + uzun.length, 0, 0);
  uzun.slice(0, TAM ? 999 : 4).forEach(o => ekle('C topu çok uzun tutan oyuncu', o.sure / 2,
    `t=${o.t.toFixed(1)} ${AD(o.i)} ${o.sure.toFixed(1)} sn topa en yakın [${o.tip}]`, o.t, o.sure));
}

/* ══════════════════════════════════════════════════════════════════════════════════════
   D) DİZİLİM / AKIŞ
   ══════════════════════════════════════════════════════════════════════════════════ */

/* D1 — BOYADA 3 SANİYE (hücumcu) */
{
  const ep = new Array(10).fill(null), out = [];
  for (const k of K) {
    if (oluTop(k)) { ep.fill(null); continue; }
    const solaMi = k.os === 1;
    const dip = solaMi ? CRT_X0 : CRT_X1;
    for (let i = 0; i < 10; i++) {
      if (k.p[i][2] !== 1) { ep[i] = null; continue; }
      /* ⚠ KLİP JETONU MUAF: klip gerçek NBA kaydıdır ve o pozisyonda ihlal çalmamışlardır;
         bizim boya/hücum-yönü çıkarımımız geçiş anlarında yanılabilir. Kusur, kendi
         koreografimizin (fizik jetonu) boyada takılı kalmasıdır. */
      const boyada = k.p[i][16] !== 1 && Math.abs(k.p[i][1] - 250) < PAINT_YARIM && Math.abs(k.p[i][0] - dip) < 5.8 * PX_M;
      if (!boyada) { ep[i] = null; continue; }
      if (!ep[i]) ep[i] = { t: k.t };
      const sur = k.t - ep[i].t;
      if (sur >= 3.2) { out.push({ t: ep[i].t, i, sure: sur, tip: k.tip }); ep[i] = null; }
    }
  }
  out.sort((a, b) => b.sure - a.sure);
  out.slice(0, TAM ? 999 : 5).forEach(o => ekle('D boyada 3 saniye ihlali', o.sure,
    `t=${o.t.toFixed(1)} ${AD(o.i)} ${o.sure.toFixed(1)} sn boyada [${o.tip}]`, o.t, o.sure));
  if (out.length) ekle('D1 ÖZET', 0, `toplam ${out.length} ihlal`, 0, 0);
}

/* D2 — HÜCUM YAYILIMI: beş hücumcunun birbirine ortalama uzaklığı (set hücumu) */
{
  const yay = [];
  for (const k of K) {
    if (oluTop(k)) continue;
    const c = tasiyan(k); if (c < 0) continue;
    const off = []; for (let i = 0; i < 10; i++) if (k.p[i][2] === 1) off.push(i);
    if (off.length !== 5) continue;
    const solaMi = k.os === 1;
    const onSaha = solaMi ? off.every(i => k.p[i][0] < MID + 40) : off.every(i => k.p[i][0] > MID - 40);
    if (!onSaha) continue;
    let s = 0, n = 0;
    for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) { s += Math.hypot(k.p[off[a]][0] - k.p[off[b]][0], k.p[off[a]][1] - k.p[off[b]][1]); n++; }
    yay.push(m(s / n));
  }
  if (yay.length) {
    const ort = yay.reduce((a, b) => a + b, 0) / yay.length;
    const dar = yay.filter(v => v < 4.5).length;
    ekle('D YAYILIM ÖZET', dar / yay.length > 0.25 ? 5 : 0,
      `set hücumunda ikili ortalama mesafe ${ort.toFixed(2)} m (gerçek ~6,4) · 4,5 m altı kare payı %${(100 * dar / yay.length).toFixed(1)}`, 0, 0);
  }
}

/* D3 — POZİSYON SÜRESİ (olay indeksi değişimleri) */
{
  const poz = []; let cur = null;
  for (const k of K) {
    if (!cur || cur.idx !== k.idx) { if (cur) poz.push(cur); cur = { idx: k.idx, t: k.t, sure: 0, tip: k.tip }; }
    cur.sure = k.t - cur.t;
  }
  if (cur) poz.push(cur);
  const uzun = poz.filter(p => p.sure > 12).sort((a, b) => b.sure - a.sure);
  const ort = poz.length ? poz.reduce((s, p) => s + p.sure, 0) / poz.length : 0;
  ekle('D POZİSYON ÖZET', 0, `${poz.length} olay · duvar saatinde ortalama ${ort.toFixed(2)} sn · 12 sn üstü ${uzun.length}`, 0, 0);
  uzun.slice(0, TAM ? 999 : 5).forEach(p => ekle('D olay çok uzun sürüyor', p.sure / 2,
    `t=${p.t.toFixed(1)} idx=${p.idx} ${p.sure.toFixed(1)} sn [${p.tip}]`, p.t, p.sure));
}

/* D4 — ON OYUNCU BİRDEN DURUYOR (canlı oyunda) */
{
  let ep = null; const out = [];
  for (let f = 1; f < K.length; f++) {
    const k = K[f];
    if (oluTop(k)) { ep = null; continue; }
    let toplam = 0;
    for (let i = 0; i < 10; i++) toplam += Math.hypot(k.p[i][0] - K[f - 1].p[i][0], k.p[i][1] - K[f - 1].p[i][1]);
    const dt = k.t - K[f - 1].t; if (dt <= 0) continue;
    const hiz = toplam / dt / PX_M / 10;                      /* ortalama m/sn */
    if (hiz > 0.35) { ep = null; continue; }
    if (!ep) ep = { t: k.t };
    const sur = k.t - ep.t;
    if (sur >= 1.5) { out.push({ t: ep.t, sure: sur, tip: k.tip }); ep = null; }
  }
  out.sort((a, b) => b.sure - a.sure);
  out.slice(0, TAM ? 999 : 5).forEach(o => ekle('D on oyuncu birden duruyor', o.sure * 3,
    `t=${o.t.toFixed(1)} ${o.sure.toFixed(1)} sn boyunca sahadaki ortalama hız < 0,35 m/sn [${o.tip}]`, o.t, o.sure));
  if (out.length) ekle('D4 ÖZET', 0, `toplam ${out.length} epizot`, 0, 0);
}

/* ── ÇIKTI: türe göre grupla, ağırlığa göre sırala ─────────────────────────────────── */
const gruplar = new Map();
for (const b of BULGU) {
  const g = b.tur.replace(/ ÖZET$/, '');
  if (!gruplar.has(g)) gruplar.set(g, { ozet: [], olay: [], agirlik: 0 });
  const t = gruplar.get(g);
  if (/ÖZET/.test(b.tur)) t.ozet.push(b.satir); else { t.olay.push(b); t.agirlik += b.agirlik; }
}
const sirali = Array.from(gruplar.entries()).sort((a, b) => b[1].agirlik - a[1].agirlik);

const L = [];
L.push('ANOMALİ AVCISI — kapı listesi YOK, aykırı davranış aranır');
L.push('⚠ KONTROL GRUBU AYNI KAYITTADIR: klip jetonları GERÇEK NBA kaydıdır (js/klip-data.js).');
L.push('  Bir davranış klip jetonlarında da görülüyorsa KUSUR DEĞİLDİR — gerçek basketbol öyledir.');
L.push('  Önem sıralaması yalnız FİZİK (kendi koreografimiz) jetonlarından hesaplanır.');
L.push('kayıt: ' + path.basename(dosya) + ' · ' + K.length + ' kare · ' + SURE.toFixed(1) + ' sn');
L.push('='.repeat(78));
for (const [g, t] of sirali) {
  if (!t.olay.length && !t.ozet.length) continue;
  L.push('');
  L.push('▌ ' + g + (t.agirlik ? `   [önem ${t.agirlik.toFixed(0)}]` : ''));
  t.ozet.forEach(o => L.push('   · ' + o));
  t.olay.forEach(o => L.push('   ' + o.satir));
}
L.push('');
L.push('='.repeat(78));
L.push('Not: bu araç KAPI DEĞİLDİR. Her satır, kayıttan çıkarılmış tekil bir gözlemdir;');
L.push('hangisinin gerçekten kusur olduğu kareye bakılarak (tools/kontak-goruntu.js) karara bağlanır.');
console.log(L.join('\n'));
