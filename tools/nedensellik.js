#!/usr/bin/env node
/* ── NEDENSELLİK DENETÇİSİ ────────────────────────────────────────────────────────────
   Basketbolda her şeyin bir SEBEBİ vardır. Top bir oyuncudan diğerine sebepsiz geçmez,
   hücum yönü sebepsiz dönmez, oyuncu sebepsiz ışınlanmaz. Bu araç kaydı okur ve
   NEDENSELLİK ZİNCİRİNİ doğrular; zincirde kopukluk varsa istatistik ne derse desin
   HATADIR.

   NEDEN GEREKLİ (FAZ 64): FAZ 39'dan beri bütün ölçüler DAĞILIM ölçüyor — hız, aralık,
   savunma mesafesi, tutma süresi, yayılım. Hepsi gerçek NBA verisiyle eşleşiyor ve oyun
   izlerken hâlâ saçma duruyor. Çünkü bir pozisyon istatistiksel olarak kusursuz ve
   anlatı olarak tamamen tutarsız olabilir: doğru dağılımda, yanlış sırayla. Dağılım
   ölçen hiçbir kapı bunu göremez. Bu araç dağılıma HİÇ bakmaz.

   Kontroller
     N1  Top sebepsiz el değiştirdi (arada pas/serbest/şut/ölü top evresi YOK)
     N2  Top sebepsiz TAKIM değiştirdi (çalma/ribaunt/top kaybı/ölü top olayı yok)
     N3  Hücum yönü sebepsiz döndü (pozisyon bitiren olay olmadan `offP` değişti)
     N4  Motorun şutörü ile sahnede topu tutan farklı
     N5  Motorun güvenlik ağları tetikleniyor (ağın çalışması = kusurun HÂLÂ üretildiği)
     N6  Taşıyıcı topun yanında değil (havadan pas koşulu)
     N7  Ters yön: hücum kendi potasına doğru ilerliyor

   Kullanım:  node tools/nedensellik.js olcum/iz-<etiket>.json [--tam]
   ──────────────────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');

const PX_M = 29.5429;
const CRT_X0 = 56.4, CRT_X1 = 883.6;
const MID = (CRT_X0 + CRT_X1) / 2;
const RIM_L = 102.9, RIM_R = 830.9;

const dosya = process.argv[2] || '';
const TAM = process.argv.includes('--tam');
if (!dosya || !fs.existsSync(dosya)) { console.error('kullanım: node tools/nedensellik.js olcum/iz-<etiket>.json'); process.exit(2); }
const H = JSON.parse(fs.readFileSync(dosya, 'utf8'));
let K = H.kare || [];
{ const k0 = K.findIndex(k => k && k.saat > 0); if (k0 > 0) K = K.slice(k0); }
if (K.length < 100) { console.error('kare yetersiz'); process.exit(2); }
const SURE = K[K.length - 1].t - K[0].t;

const AD = (k, i) => (i < 5 ? 'h' : 'a') + '/' + ((k.p[i] && k.p[i][3]) || '?');
const tasiyan = k => { for (let i = 0; i < 10; i++) if (k.p[i] && k.p[i][4] === 1) return i; return -1; };
const takim = i => (i < 5 ? 'h' : 'a');

const B = [];
const ekle = (tur, agirlik, satir) => B.push({ tur, agirlik, satir });

/* Pozisyonu bitiren / topu meşru biçimde el değiştiren olay türleri */
const SEBEP = ['steal', 'reb', 'tac', 'ihlal', 'hucumFaulu', 'ihlal24', 'foul', 'free', 'score2', 'score3',
               'miss2', 'miss3', 'start', 'quarter_start', 'mola', 'sub', 'sakatlikMac', 'teknik'];

/* ═══ N1 + N2 + N6: TOPUN EL DEĞİŞTİRME ZİNCİRİ ══════════════════════════════════════ */
{
  const olay = [];
  let onceki = -1, oncekiF = 0;
  for (let f = 0; f < K.length; f++) {
    const c = tasiyan(K[f]);
    if (c < 0) continue;
    if (onceki >= 0 && c !== onceki) {
      /* arada geçen evreler */
      let serbest = 0, pas = 0, sut = 0, olu = 0, hakem = 0;
      for (let g = oncekiF + 1; g < f; g++) {
        const m = K[g].b[2];
        if (m === 'pass') pas++;
        else if (m === 'loose' || m === 'rim') serbest++;
        else if (m === 'shot') sut++;
        else if (m === 'dead') olu++;
        if (K[g].hk === 1) hakem++;
      }
      const bosluk = f - oncekiF - 1;
      const sebepVar = (pas > 0 || serbest > 0 || sut > 0 || olu > 0 || hakem > 0);
      const ayniTakim = (takim(onceki) === takim(c));
      /* ⚠ HAVA ATIŞI MUAF: sıçrayan pivotun tapı meşru olarak RAKİP takıma gider —
         basketbolun kuralı budur. Maçın ilk 3 saniyesi ve 'start' damgası hariç tutulur;
         yoksa denetçi her maçın açılışını "rakibe pas" diye sayar (FAZ 65'te ölçüldü:
         kapı kaldırılıp tap uçar hâle gelince tam olarak bu oldu). */
      if (K[f].t <= 3 || K[f].tip === 'start' || K[oncekiF].tip === 'start') { onceki = c; oncekiF = f; continue; }
      /* ⚠ ELDEN ELE VERİŞ MEŞRUDUR: basketbolda iki oyuncu yan yanayken top pas evresi
         OLMADAN el değiştirir (dribble hand-off). Kural mesafededir — bitişik olmayan
         iki oyuncu arasında ara evresiz geçiş İMKÂNSIZDIR. Ölçüldü: FAZ 64'te yakalanan
         gerçek kusurlarda oyuncular 2,6-2,8 m aradaydı; kalan iki olayda 0,6-1,1 m,
         yani gerçek bir veriş. Eşik 1,5 m. */
      const _cd = Math.hypot(K[f].p[onceki][0] - K[f].p[c][0], K[f].p[onceki][1] - K[f].p[c][1]) / PX_M;
      if (!sebepVar && _cd > 1.5) {
        /* N1: top hiçbir ara evre olmadan UZAKTAN el değiştirdi */
        olay.push({ tur: 'N1', t: K[f].t, s: `t=${K[f].t.toFixed(1)} ${AD(K[f], onceki)} → ${AD(K[f], c)} · arada HİÇBİR evre yok, oyuncular ${_cd.toFixed(1)} m ayrı (${bosluk} kare) [${K[f].tip}]${ayniTakim ? '' : ' · TAKIM DEĞİŞTİ'}` });
      } else if (!ayniTakim) {
        /* N2: takım değişimi — sebebi ya serbest top (ribaunt/çalma) ya ölü top olmalı.
           Yalnız PAS varsa bu bir "rakibe pas"tır: meşru sebebi yoktur. */
        if (pas > 0 && serbest === 0 && sut === 0 && olu === 0 && hakem === 0) {
          olay.push({ tur: 'N2', t: K[f].t, s: `t=${K[f].t.toFixed(1)} ${AD(K[f], onceki)} → ${AD(K[f], c)} · arada YALNIZ pas var, takım değişti (rakibe pas) [${K[f].tip}]` });
        }
      }
    }
    onceki = c; oncekiF = f;
  }
  const n1 = olay.filter(o => o.tur === 'N1'), n2 = olay.filter(o => o.tur === 'N2');
  ekle('N1 top sebepsiz el değiştirdi', n1.length * 3, `${n1.length} olay`);
  n1.slice(0, TAM ? 999 : 6).forEach(o => ekle('N1 top sebepsiz el değiştirdi', 0, '   ' + o.s));
  ekle('N2 rakibe pas (arada yalnız pas)', n2.length * 8, `${n2.length} olay`);
  n2.slice(0, TAM ? 999 : 6).forEach(o => ekle('N2 rakibe pas (arada yalnız pas)', 0, '   ' + o.s));
}

/* ═══ N3: HÜCUM YÖNÜ SEBEPSİZ DÖNDÜ ═════════════════════════════════════════════════ */
{
  const olay = [];
  let onceki = null, oncekiT = 0, oncekiTip = '-';
  for (const k of K) {
    const off = (k.os2 !== undefined) ? k.os2 : null;
    if (off == null || off === '?') continue;
    if (onceki !== null && off !== onceki) {
      /* değişim anında geçerli bir sebep olayı var mı (son 1,5 sn içinde) */
      if (SEBEP.indexOf(k.tip) < 0 && SEBEP.indexOf(oncekiTip) < 0) {
        olay.push(`t=${k.t.toFixed(1)} hücum ${onceki} → ${off} · sebep olayı yok (tip ${oncekiTip} → ${k.tip})`);
      }
    }
    onceki = off; oncekiT = k.t; oncekiTip = k.tip;
  }
  ekle('N3 hücum yönü sebepsiz döndü', olay.length * 6, `${olay.length} olay`);
  olay.slice(0, TAM ? 999 : 6).forEach(s => ekle('N3 hücum yönü sebepsiz döndü', 0, '   ' + s));
}

/* ═══ N4: MOTORUN ŞUTÖRÜ ↔ SAHNEDE ŞUTU ATAN ════════════════════════════════════════ */
{
  const olay = [];
  for (let f = 1; f < K.length; f++) {
    if (K[f].b[2] !== 'shot' || K[f - 1].b[2] === 'shot') continue;
    const sut = K[f].sut;                                   /* motorun şutörü */
    if (!sut || sut === '-') continue;
    /* şuttan hemen önce topu tutan */
    let tut = -1;
    for (let g = f - 1; g >= 0 && f - g < 40; g--) { const c = tasiyan(K[g]); if (c >= 0) { tut = c; break; } }
    if (tut < 0) continue;
    const sahne = AD(K[f], tut);
    if (sahne !== sut) olay.push(`t=${K[f].t.toFixed(1)} motor ${sut} attı diyor, sahnede topu ${sahne} tutuyordu [${K[f].tip}]`);
  }
  ekle('N4 şutör motor ↔ sahne uyuşmuyor', olay.length * 5, `${olay.length} olay`);
  olay.slice(0, TAM ? 999 : 6).forEach(s => ekle('N4 şutör motor ↔ sahne uyuşmuyor', 0, '   ' + s));
}

/* ═══ N5: MOTORUN GÜVENLİK AĞLARI ═══════════════════════════════════════════════════
   Bir ağın TETİKLENMESİ, o kusurun HÂLÂ üretildiğinin kanıtıdır — ağ yalnız sonucu gizler. */
{
  const ilk = K.find(k => k.sy), son = [...K].reverse().find(k => k.sy);
  if (ilk && son) {
    /* ⚠ FAZ 65: 'top hız kırpma' KUSUR DEĞİLDİR — kimlik sayacı boş çıktı ve sayının
       tamamının pas dalındaki HEDEF TAKİP kırpmasından geldiği görüldü (pas uçarken hedef
       hareket eder; FAZ 40 §A1 tasarımı). Sayaç ikiye ayrıldı, buradaki artık yalnız
       _ballStep sonundaki güvenlik ağını sayar ve önem hesabına girer. */
    const ad = ['havadan pas', 'donan uçuş', 'hayalet held', 'top kurtarma', 'top hız kırpma', 'top saha dışı', 'rakibe pas kapısı', 'yetişme ışınlaması'];
    const fark = son.sy.map((v, i) => v - ilk.sy[i]);
    const satir = fark.map((v, i) => `${ad[i]}=${v}`).join(' · ');
    const agir = fark[0] * 6 + fark[1] * 4 + fark[2] * 6 + fark[3] * 2 + fark[4] * 4 + fark[6] * 8;   /* FAZ 65: ag kirpmasi artik gercek kusur, tartiya girer */
    ekle('N5 güvenlik ağı tetiklendi (kusur hâlâ üretiliyor)', agir, satir);
  } else ekle('N5 güvenlik ağı tetiklendi (kusur hâlâ üretiliyor)', 0, 'eski kayıt — sayaç alanı yok');
}

/* ═══ N6: TAŞIYICI TOPUN YANINDA DEĞİL ══════════════════════════════════════════════ */
{
  const olay = [];
  for (const k of K) {
    const c = tasiyan(k); if (c < 0 || k.b[2] !== 'held') continue;
    const d = Math.hypot(k.p[c][0] - k.b[0], k.p[c][1] - k.b[1]) / PX_M;
    if (d > 2.0) olay.push({ t: k.t, d, s: `t=${k.t.toFixed(1)} ${AD(k, c)} topu "tutuyor" ama ${d.toFixed(1)} m uzakta [${k.tip}${k.p[c][16] ? ' · klip' : ''}]` });
  }
  /* ardışık kareleri tek olaya indir */
  const ep = []; let cur = null;
  for (const o of olay) { if (!cur || o.t - cur.son > 0.3) { if (cur) ep.push(cur); cur = { t: o.t, son: o.t, maks: o.d, s: o.s }; } else { cur.son = o.t; if (o.d > cur.maks) { cur.maks = o.d; cur.s = o.s; } } }
  if (cur) ep.push(cur);
  ep.sort((a, b) => b.maks - a.maks);
  ekle('N6 taşıyıcı topun yanında değil', ep.length * 4, `${ep.length} epizot · en uzak ${ep.length ? ep[0].maks.toFixed(1) : 0} m`);
  ep.slice(0, TAM ? 999 : 6).forEach(o => ekle('N6 taşıyıcı topun yanında değil', 0, '   ' + o.s));
}

/* ═══ N7: TERS YÖN — hücum kendi potasına ilerliyor ═════════════════════════════════ */
{
  const olay = []; let cur = null;
  for (const k of K) {
    const c = tasiyan(k);
    if (c < 0 || k.b[2] !== 'held' || k.ft === 1 || k.inb === 1 || k.hk === 1) { cur = null; continue; }
    const rim = (k.os === 1) ? RIM_L : RIM_R;      /* saldırılan pota */
    const kendi = (k.os === 1) ? RIM_R : RIM_L;
    if (!cur) { cur = { t: k.t, x0: k.p[c][0], i: c }; continue; }
    if (cur.i !== c) { cur = { t: k.t, x0: k.p[c][0], i: c }; continue; }
    const ilerleme = Math.abs(cur.x0 - rim) - Math.abs(k.p[c][0] - rim);
    if (k.t - cur.t >= 2.5) {
      if (ilerleme < -4 * PX_M) olay.push(`t=${cur.t.toFixed(1)} ${AD(k, c)} ${(k.t - cur.t).toFixed(1)} sn boyunca KENDİ potasına doğru ${(-ilerleme / PX_M).toFixed(1)} m ilerledi [${k.tip}]`);
      cur = { t: k.t, x0: k.p[c][0], i: c };
    }
  }
  ekle('N7 ters yön (kendi potasına)', olay.length * 5, `${olay.length} olay`);
  olay.slice(0, TAM ? 999 : 6).forEach(s => ekle('N7 ters yön (kendi potasına)', 0, '   ' + s));
}

/* ── ÇIKTI ────────────────────────────────────────────────────────────────────────── */
const grup = new Map();
for (const b of B) { if (!grup.has(b.tur)) grup.set(b.tur, { agirlik: 0, satir: [] }); const g = grup.get(b.tur); g.agirlik += b.agirlik; g.satir.push(b.satir); }
const sirali = [...grup.entries()].sort((a, b) => b[1].agirlik - a[1].agirlik);
const L = [];
L.push('NEDENSELLİK DENETÇİSİ — dağılıma BAKMAZ, sebep zincirini doğrular');
L.push('kayıt: ' + path.basename(dosya) + ' · ' + K.length + ' kare · ' + SURE.toFixed(1) + ' sn');
L.push('='.repeat(78));
for (const [t, g] of sirali) { L.push(''); L.push('▌ ' + t + (g.agirlik ? `   [önem ${g.agirlik}]` : '   [temiz]')); g.satir.forEach(s => L.push('   ' + s)); }
L.push('');
L.push('='.repeat(78));
const toplam = sirali.reduce((s, x) => s + x[1].agirlik, 0);
L.push(toplam ? ('TOPLAM ÖNEM: ' + toplam + ' — sıfır olmalı') : 'NEDENSELLİK ZİNCİRİ TEMİZ');
console.log(L.join('\n'));
process.exit(toplam ? 1 : 0);
