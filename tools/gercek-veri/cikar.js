#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 39 §3.3.2: GERÇEK VERİDEN BANT ÇIKARIMI
 *
 * `_ham/` altındaki NBA play-by-play + şut detayı dosyalarını okur ve TEK çıktı üretir:
 *   tools/_lib/gercek-bantlar.json     ← commit edilir (ham veri EDİLMEZ)
 *
 * ── TASARIM KARARLARI ───────────────────────────────────────────────────────────
 *
 * 1. NBA → FIBA ÖLÇEKLEME (§3.2). Maç 48 dk yerine 40 dk.
 *    · ORAN ve DAĞILIM ölçütleri (yüzdeler, paylar, süre histogramı) DOĞRUDAN taşınır.
 *    · SAYIM ölçütleri (sayı, FGA, ribaunt, faul, pozisyon) `OLCEK = 40/48 = 0,8333`
 *      ile çarpılır. Ölçeklenen her kayıtta `olcek` alanı görünür.
 *    · Üçlük yayı farkı (FIBA 6,75 m / NBA 7,24 m) ÖLÇEKLENMEZ — uydurma olurdu.
 *      Bilinen yön `not` alanında belgelenir.
 *
 * 2. BANT GENİŞLİĞİ. Brif "±1 standart sapma" diyor; asıl soru hangi dağılımın sapması
 *    olduğu. Tek maçların sapması bir LİG ORTALAMASINI yargılamak için çok geniştir
 *    (kapılar 240 maçlık ortalamayı ölçer, tek maçı değil). Bu yüzden bant
 *    **takım-sezon** değerlerinin dağılımından kurulur: 30 takım × 3 sezon = 90 gözlem,
 *    "gerçek takımlar birbirinden ne kadar farklı" sorusunun cevabı. Her ölçütte
 *    `n` = kaç takım-sezon, `kaynak` = hangi dosya + hangi alan.
 *
 * 3. ÇIKARILAMAYAN ÖLÇÜT `null` KALIR. Uydurulmuş eşik, eşiksizlikten kötüdür (§3.4).
 *
 * ── VERİ KÜMELERİNİN İNCELİKLERİ (ölçülerek bulundu) ────────────────────────────
 *
 * · `pbpstats` dosyasında bir pozisyon BİRDEN ÇOK SATIRDIR: pozisyon alanları (STARTTIME,
 *   ENDTIME, STARTTYPE…) her olay satırında tekrar eder, yalnız DESCRIPTION/URL değişir.
 *   Ham satır sayısı maç başına 392,8 idi — gerçek pozisyon sayısının iki katı. Tekilleme
 *   olmadan bütün tempo ölçümü ikiye katlanıyordu. Anahtar: GAMEID|PERIOD|STARTTIME|
 *   ENDTIME|OPPONENT. Tekillenmiş: maç başına 198,2 pozisyon = takım başına 99,1 (NBA
 *   yayımlanmış pace ~99 — doğrulandı).
 *
 * · `pbpstats.STARTTYPE` pozisyonun NASIL başladığını söyler ("Off Steal", "Off At Rim
 *   Miss", "Off Timeout"…). Geçiş hücumu payı buradan gelir; motorun `fromTrans`
 *   ('steal' / 'reb' / null) ayrımının gerçek karşılığı budur.
 *
 * · `shotdetail` SERBEST ATIŞ İÇERMEZ — yalnız saha şutu. FT oranları `nbastats`ten.
 *
 * · `nbastats` açıklama metni oyuncunun O ANKİ TOPLAM SAYISINI taşır: "(12 PTS)".
 *   Oyuncu sayısı bu değerin maç içindeki en büyüğüdür — ayrı bir kutu skor dosyası
 *   indirmeye gerek kalmıyor.
 *
 * · İlk beş / yedek ayrımı DEĞİŞİKLİK KAYDINDAN çıkar: bir oyuncu ilk göründüğü
 *   değişiklikte ÇIKAN taraftaysa (ya da hiç değişikliğe girmediyse) ilk beştir; ilk
 *   göründüğü yer GİREN taraf ise yedektir. Ayrı bir "starters" dosyası gerekmiyor.
 *
 * Kullanım: node tools/gercek-veri/cikar.js [--sezon=2022,2023,2024]
 */
const fs = require('fs');
const path = require('path');
const { satirlar } = require('./_csv.js');

const HAM = path.resolve(__dirname, '_ham');
const CIKTI = path.resolve(__dirname, '..', '_lib', 'gercek-bantlar.json');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const SEZONLAR = arg('sezon', '2022,2023,2024').split(',').map(s => s.trim()).filter(Boolean);

const OLCEK = 40 / 48;                       /* FIBA 4×10 dk ÷ NBA 4×12 dk */
const KAYNAK_URL = 'https://github.com/shufinskiy/nba_data';

/* ── küçük istatistik yardımcıları ──────────────────────────────────────────── */
const ort = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const sap = a => { const m = ort(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / Math.max(1, a.length)); };
const yuv = (x, b) => { const p = Math.pow(10, b == null ? 3 : b); return Math.round(x * p) / p; };

/**
 * Takım-sezon değerlerinden bir bant kaydı üretir.
 * @param {number[]} degerler takım-sezon başına bir gözlem
 * @param {object} o {kaynak, birim, olcekli, bas, not}
 */
function bant(degerler, o) {
  o = o || {};
  const d = degerler.filter(x => isFinite(x));
  if (!d.length) return null;
  const k = o.olcekli ? OLCEK : 1;
  const m = ort(d) * k, s = sap(d) * k;
  const r = {
    deger: yuv(m, o.bas), alt: yuv(m - s, o.bas), ust: yuv(m + s, o.bas),
    kaynak: o.kaynak || null, n: d.length
  };
  if (o.birim) r.birim = o.birim;
  if (o.olcekli) r.olcek = yuv(OLCEK, 4);
  if (o.not) r.not = o.not;
  return r;
}

/* ── sayaç kabı ─────────────────────────────────────────────────────────────── */
const A = () => Object.create(null);
const ek = (o, k, v) => { o[k] = (o[k] || 0) + (v === undefined ? 1 : v); };

const sn = s => { const m = String(s || '').trim().match(/^(\d+):(\d+)$/); return m ? (+m[1] * 60 + +m[2]) : null; };
const dosya = (tur, sz) => path.join(HAM, tur + '_' + sz + '.csv');

/* ══════════════════════════════════════════════════════════════════════════════
   1) pbpstats — POZİSYON düzeyi: tempo, süre dağılımı, geçiş hücumu
   ══════════════════════════════════════════════════════════════════════════════ */
/* ── TAKIM KİMLİĞİ TEK ANAHTARDA ─────────────────────────────────────────────
   Üç dosya üç ayrı anahtar kullanır: nbastats TEAM_ID (1610612738), pbpstats
   OPPONENT kısaltması (BOS), shotdetail TEAM_NAME ("Boston Celtics"). Bunları
   birleştirmeden FTA/FGA gibi ÇAPRAZ oranlar ve pozisyon başına ölçütler
   hesaplanamaz (ilk sürümde `ftaFgaOrani` bu yüzden bantsız kalmıştı).
   Harita nbastats'ten kurulur: her satır PLAYER*_TEAM_ID ile birlikte
   ABBREVIATION ve CITY+NICKNAME taşır. */
const TAKIM = { abbr: Object.create(null), ad: Object.create(null) };   /* kısaltma/ad → TEAM_ID */
function takimKaydet(id, abbr, sehir, takma) {
  if (!id || id === '0') return;
  if (abbr) TAKIM.abbr[abbr] = id;
  if (sehir && takma) TAKIM.ad[(sehir + ' ' + takma).trim()] = id;
}
/** Takım olayı (mola, şut saati ihlali, takım faulü) oyuncuya değil TAKIMA yazılır:
    PLAYER1_TEAM_ID boş gelir, TEAM_ID ise PLAYER1_ID alanındadır (PERSON1TYPE 2/3).
    Bu ayrım yapılmadan `sutSaatiIhlali` sıfır çıkıyordu — ölçüldü. */
function olayTakimi(r) {
  if (r.PLAYER1_TEAM_ID && r.PLAYER1_TEAM_ID !== '0') return r.PLAYER1_TEAM_ID;
  const t = r.PERSON1TYPE;
  if ((t === '2' || t === '3') && r.PLAYER1_ID && r.PLAYER1_ID !== '0') return r.PLAYER1_ID;
  return null;
}

const SURE_AD = ['0-4', '5-7', '8-10', '11-13', '14-16', '17-19', '20-24', '25+'];
function kovaAdi(d) {
  if (d <= 4) return '0-4';
  if (d <= 7) return '5-7';
  if (d <= 10) return '8-10';
  if (d <= 13) return '11-13';
  if (d <= 16) return '14-16';
  if (d <= 19) return '17-19';
  if (d <= 24) return '20-24';
  return '25+';
}

/** STARTTYPE → motorun tanıdığı başlangıç sınıfı. */
function baslangicSinifi(st) {
  const s = String(st || '');
  if (/Steal/i.test(s)) return 'calma';
  if (/Block/i.test(s)) return 'blok';
  if (/Timeout/i.test(s)) return 'mola';
  if (/Dead ?Ball/i.test(s)) return 'oluTop';
  if (/Miss/i.test(s)) return 'ribaund';            /* kaçan şut → savunma ribaundu */
  if (/Make/i.test(s)) return 'sayiSonrasi';        /* ölü top — kenardan sokma */
  if (/Rebound/i.test(s)) return 'ribaund';
  return 'diger';
}
/** Geçiş (canlı top) mı? Motorun `fromTrans` bayrağının gerçek karşılığı. */
const gecisMi = s => (s === 'calma' || s === 'blok' || s === 'ribaund');

async function pbpOku() {
  const TS = A();                  /* takım-sezon (savunan taraf = OPPONENT) → sayaçlar */
  const ts = k => TS[k] || (TS[k] = { poz: 0, mac: new Set(), sure: 0, kova: A(), sinif: A(), gecisSure: 0, gecisPoz: 0, to: 0, orb: 0 });
  const bitisIstek = new Map();    /* 'sz|gid|per|kalanSn' → 'gecis' | 'set' */
  const gecisBitis = A();          /* 'gecis'|'set' → {bolge: sayı}, shotdetail geçişinde dolar */
  let toplamPoz = 0, negatif = 0;
  const macSet = new Set();

  for (const sz of SEZONLAR) {
    const f = dosya('pbpstats', sz);
    if (!fs.existsSync(f)) { console.log('  ! yok: ' + path.basename(f)); continue; }
    const gorulen = new Set();
    await satirlar(f, r => {
      const anahtar = r.GAMEID + '|' + r.PERIOD + '|' + r.STARTTIME + '|' + r.ENDTIME + '|' + r.OPPONENT;
      if (gorulen.has(anahtar)) return;      /* ⚠ satırlar pozisyon başına TEKRAR EDER */
      gorulen.add(anahtar);
      const a = sn(r.STARTTIME), b = sn(r.ENDTIME);
      if (a == null || b == null) return;
      const d = a - b;
      if (d < 0) { negatif++; return; }
      if (d > 40) return;                    /* çeyrek sınırı / veri artığı */
      const tid = TAKIM.abbr[r.OPPONENT] || ('abbr:' + (r.OPPONENT || '?'));
      const T = ts(sz + '|' + tid);
      T.poz++; T.mac.add(r.GAMEID); T.sure += d;
      ek(T.kova, kovaAdi(d));
      const sinif = baslangicSinifi(r.STARTTYPE);
      ek(T.sinif, sinif);
      if (gecisMi(sinif)) { T.gecisPoz++; T.gecisSure += d; }
      T.to += Number(r.TURNOVERS) || 0;
      T.orb += Number(r.OFFENSIVEREBOUNDS) || 0;
      toplamPoz++; macSet.add(sz + r.GAMEID);
      bitisIstek.set(sz + '|' + r.GAMEID + '|' + r.PERIOD + '|' + b, gecisMi(sinif) ? 'gecis' : 'set');
    });
    console.log('  · pbpstats_' + sz + ' — tekil pozisyon toplamı ' + toplamPoz);
  }
  return { TS, toplamPoz, negatif, mac: macSet.size, bitisIstek, gecisBitis };
}

/* ══════════════════════════════════════════════════════════════════════════════
   2) shotdetail — ŞUT COĞRAFYASI, İSABET, ŞUT TİPİ
   ══════════════════════════════════════════════════════════════════════════════ */
const BOLGELER = ['cember', 'boya', 'ortaMesafe', 'kose3', 'kanatVeTepe3'];
function BOLGE(z) {
  if (z === 'Restricted Area') return 'cember';
  if (z === 'In The Paint (Non-RA)') return 'boya';
  if (z === 'Mid-Range') return 'ortaMesafe';
  if (z === 'Left Corner 3' || z === 'Right Corner 3') return 'kose3';
  if (z === 'Above the Break 3') return 'kanatVeTepe3';
  if (z === 'Backcourt') return 'gerisaha';
  return 'diger';
}
/** ACTION_TYPE → oyunun şut tipi sözlüğü (js/match-engine.js `shot.sut`). */
function sutTipi(at, ucluk) {
  const s = String(at || '');
  if (/Tip/i.test(s)) return 'tipin';
  if (ucluk) return 'uc';
  if (/Dunk/i.test(s)) return 'smac';
  if (/Float/i.test(s)) return 'floater';
  if (/Hook/i.test(s)) return 'kanca';
  if (/Layup|Finger Roll|Alley Oop/i.test(s)) return 'turnike';
  if (/Jump|Fadeaway|Bank|Shot/i.test(s)) return 'jumper';
  return 'diger';
}
const SUT_TIPLERI = ['smac', 'turnike', 'floater', 'kanca', 'tipin', 'jumper', 'uc'];

async function sutOku(bitisIstek, gecisBitis) {
  const TS = A();
  const ts = k => TS[k] || (TS[k] = { fga: 0, fgm: 0, bolge: A(), bolgeM: A(), tip: A(), tpa: 0, tpm: 0, mac: new Set() });
  let n = 0;
  for (const sz of SEZONLAR) {
    const f = dosya('shotdetail', sz);
    if (!fs.existsSync(f)) { console.log('  ! yok: ' + path.basename(f)); continue; }
    await satirlar(f, r => {
      n++;
      const T = ts(sz + '|' + (TAKIM.ad[r.TEAM_NAME] || ('ad:' + (r.TEAM_NAME || '?'))));
      const uc = r.SHOT_TYPE === '3PT Field Goal';
      const isabet = r.SHOT_MADE_FLAG === '1';
      const b = BOLGE(r.SHOT_ZONE_BASIC);
      T.fga++; if (isabet) T.fgm++;
      if (uc) { T.tpa++; if (isabet) T.tpm++; }
      ek(T.bolge, b); if (isabet) ek(T.bolgeM, b);
      ek(T.tip, sutTipi(r.ACTION_TYPE, uc));
      T.mac.add(r.GAME_ID);
      const kalan = (Number(r.MINUTES_REMAINING) || 0) * 60 + (Number(r.SECONDS_REMAINING) || 0);
      const ist = bitisIstek.get(sz + '|' + r.GAME_ID + '|' + r.PERIOD + '|' + kalan);
      if (ist) { if (!gecisBitis[ist]) gecisBitis[ist] = A(); ek(gecisBitis[ist], b); }
    });
    console.log('  · shotdetail_' + sz + ' — kümülatif şut ' + n);
  }
  return { TS, n };
}

/* ══════════════════════════════════════════════════════════════════════════════
   3) nbastats — KURAL OLAYLARI, ROTASYON, MAÇ SONU, KUTU ORANLARI
   ══════════════════════════════════════════════════════════════════════════════ */
/* EVENTMSGTYPE: 1 sayı · 2 kaçan · 3 serbest atış · 4 ribaunt · 5 top kaybı ·
   6 faul · 7 ihlal · 8 değişiklik · 9 mola · 10 hava atışı · 12/13 periyot. */
function TO_TUR(act, desc) {
  const a = String(act), d = String(desc || '');
  if (a === '11') return 'sutSaati';
  if (a === '37') return 'hucumFaulu';
  if (a === '45' || a === '40' || a === '39') return 'tac';
  if (a === '4' || a === '6') return 'adimCiftSurme';
  if (a === '1') return 'kotuPas';
  if (a === '2') return 'topKaptirma';
  if (a === '8' || a === '9' || a === '10' || a === '13') return 'sureIhlali';
  if (/Out of Bounds/i.test(d)) return 'tac';
  return 'diger';
}
/* teknik / sportmenlik dışı / flagrant alt türleri (EVENTMSGACTIONTYPE) */
const TEKNIK_ACT = { '11': 1, '12': 1, '13': 1, '16': 1, '18': 1, '19': 1, '25': 1, '30': 1 };

async function nbaOku() {
  const TS = A();
  const ts = k => TS[k] || (TS[k] = {
    macSay: 0, foul: 0, fta: 0, ftm: 0, to: A(), sub: 0, teknik: 0, mola: 0,
    reb: 0, ast: 0, fgm: 0, stl: 0, blk: 0, pts: 0, oynayan: 0, yedekPts: 0, enSkorerPay: 0
  });
  const MAC = [];
  let n = 0;

  for (const sz of SEZONLAR) {
    const f = dosya('nbastats', sz);
    if (!fs.existsSync(f)) { console.log('  ! yok: ' + path.basename(f)); continue; }
    let gid = null, M = null;
    const kapat = () => {
      if (!M) return;
      MAC.push({ sz, per: M.maxPer, fark: Math.abs(M.ev - M.dep), toplam: M.ev + M.dep });
      Object.keys(M.tak).forEach(tid => {
        if (tid === '0' || tid === '') return;               /* takımsız (hakem/nötr) satırlar */
        const t = M.tak[tid], T = ts(sz + '|' + tid);
        T.macSay++;
        T.foul += t.foul; T.fta += t.fta; T.ftm += t.ftm; T.sub += t.sub; T.teknik += t.teknik; T.mola += t.mola;
        T.reb += t.reb; T.ast += t.ast; T.fgm += t.fgm; T.stl += t.stl; T.blk += t.blk;
        Object.keys(t.to).forEach(k2 => ek(T.to, k2, t.to[k2]));
        const pidler = Object.keys(t.oyuncu);
        const puanlar = pidler.map(p => t.oyuncu[p].pts || 0);
        const takimPts = puanlar.reduce((s, x) => s + x, 0);
        T.oynayan += pidler.filter(p => t.oyuncu[p].gorundu).length;
        T.pts += takimPts;
        T.yedekPts += pidler.filter(p => t.oyuncu[p].yedek === true).reduce((s, p) => s + (t.oyuncu[p].pts || 0), 0);
        T.enSkorerPay += takimPts ? Math.max.apply(null, puanlar) / takimPts : 0;
      });
      M = null;
    };
    await satirlar(f, r => {
      n++;
      if (r.GAME_ID !== gid) { kapat(); gid = r.GAME_ID; M = { gid, maxPer: 1, ev: 0, dep: 0, tak: A() }; }
      const per = Number(r.PERIOD) || 1;
      if (per > M.maxPer) M.maxPer = per;
      const tip = r.EVENTMSGTYPE, act = r.EVENTMSGACTIONTYPE;
      const t1 = r.PLAYER1_TEAM_ID, t2 = r.PLAYER2_TEAM_ID, t3 = r.PLAYER3_TEAM_ID;
      const tak = tid => M.tak[tid] || (M.tak[tid] = { foul: 0, fta: 0, ftm: 0, to: A(), sub: 0, teknik: 0, mola: 0, reb: 0, ast: 0, fgm: 0, stl: 0, blk: 0, oyuncu: A() });
      const oy = (tid, pid) => { const T = tak(tid); return T.oyuncu[pid] || (T.oyuncu[pid] = { pts: 0, gorundu: false, yedek: null }); };
      takimKaydet(r.PLAYER1_TEAM_ID, r.PLAYER1_TEAM_ABBREVIATION, r.PLAYER1_TEAM_CITY, r.PLAYER1_TEAM_NICKNAME);
      takimKaydet(r.PLAYER2_TEAM_ID, r.PLAYER2_TEAM_ABBREVIATION, r.PLAYER2_TEAM_CITY, r.PLAYER2_TEAM_NICKNAME);
      takimKaydet(r.PLAYER3_TEAM_ID, r.PLAYER3_TEAM_ABBREVIATION, r.PLAYER3_TEAM_CITY, r.PLAYER3_TEAM_NICKNAME);
      const desc = (r.HOMEDESCRIPTION || '') + ' ' + (r.VISITORDESCRIPTION || '') + ' ' + (r.NEUTRALDESCRIPTION || '');

      /* SCORE sütunu NBA'de "DEPLASMAN - EV" biçimindedir. */
      if (r.SCORE) { const m = r.SCORE.match(/(\d+)\s*-\s*(\d+)/); if (m) { M.dep = +m[1]; M.ev = +m[2]; } }
      /* "(N PTS)" = o oyuncunun O ANKİ toplamı → maç sonu sayısı bunun en büyüğü */
      const pm = desc.match(/\((\d+) PTS\)/);
      if (pm && t1) { const o = oy(t1, r.PLAYER1_ID); const v = +pm[1]; if (v > o.pts) o.pts = v; }

      if (tip === '1' || tip === '2') {
        if (t1) oy(t1, r.PLAYER1_ID).gorundu = true;
        if (tip === '1') {
          if (t1) tak(t1).fgm++;
          if (t2 && r.PLAYER2_ID && r.PLAYER2_ID !== '0') { tak(t2).ast++; oy(t2, r.PLAYER2_ID).gorundu = true; }
        } else if (t3 && r.PLAYER3_ID && r.PLAYER3_ID !== '0') { tak(t3).blk++; oy(t3, r.PLAYER3_ID).gorundu = true; }
      } else if (tip === '3') {
        if (t1) { const T = tak(t1); T.fta++; if (!/MISS/i.test(desc)) T.ftm++; oy(t1, r.PLAYER1_ID).gorundu = true; }
      } else if (tip === '4') {
        if (t1) { tak(t1).reb++; if (r.PLAYER1_ID && r.PLAYER1_ID !== '0') oy(t1, r.PLAYER1_ID).gorundu = true; }
      } else if (tip === '5') {
        const tto = olayTakimi(r);          /* takım top kaybı (şut saati, 8 sn, 24 sn) dahil */
        if (tto) { ek(tak(tto).to, TO_TUR(act, desc)); if (t1 && r.PLAYER1_ID && r.PLAYER1_ID !== '0') oy(t1, r.PLAYER1_ID).gorundu = true; }
        if (t2 && r.PLAYER2_ID && r.PLAYER2_ID !== '0') { tak(t2).stl++; oy(t2, r.PLAYER2_ID).gorundu = true; }
      } else if (tip === '6') {
        const tf = olayTakimi(r);           /* takım teknik faulü de (3 sn savunma vb.) sayılsın */
        if (tf) { const T = tak(tf); T.foul++; if (TEKNIK_ACT[act]) T.teknik++; if (t1 && r.PLAYER1_ID && r.PLAYER1_ID !== '0') oy(t1, r.PLAYER1_ID).gorundu = true; }
      } else if (tip === '8') {
        /* PLAYER1 = çıkan, PLAYER2 = giren. İlk beş/yedek ayrımı İLK görülen rolden. */
        if (t1) {
          tak(t1).sub++;
          const o1 = oy(t1, r.PLAYER1_ID); o1.gorundu = true; if (o1.yedek === null) o1.yedek = false;
          const o2 = oy(t1, r.PLAYER2_ID); o2.gorundu = true; if (o2.yedek === null) o2.yedek = true;
        }
      } else if (tip === '9') {
        const tid = olayTakimi(r);
        if (tid) tak(tid).mola++;
      } else if (tip === '10') {
        if (t1) oy(t1, r.PLAYER1_ID).gorundu = true;
        if (t2) oy(t2, r.PLAYER2_ID).gorundu = true;
      }
    });
    kapat();
    console.log('  · nbastats_' + sz + ' — kümülatif olay ' + n);
  }
  return { TS, MAC, n };
}

/* ══════════════════════════════════════════════════════════════════════════════ */
(async () => {
  try {
    console.log('FAZ 39 — gerçek veriden bant çıkarımı');
    console.log('sezonlar: ' + SEZONLAR.join(', ') + '   ölçek (FIBA/NBA süre): ' + yuv(OLCEK, 4));
    console.log('');
    /* ⚠ SIRA ÖNEMLİ: takım kimliği haritasını `nbastats` kurar; diğer iki dosya
       kendi anahtarlarını (kısaltma / tam ad) ona çevirerek okur. */
    console.log('[1/3] nbastats — kural olayları / rotasyon / maç sonu (+ takım haritası)');
    const N = await nbaOku();
    console.log('[2/3] pbpstats — pozisyon düzeyi');
    const P = await pbpOku();
    console.log('[3/3] shotdetail — şut coğrafyası');
    const S = await sutOku(P.bitisIstek, P.gecisBitis);
    console.log('');

    const pTS = Object.keys(P.TS), sTS = Object.keys(S.TS), nTS = Object.keys(N.TS);
    const KP = 'pbpstats (' + SEZONLAR.join('+') + ')';
    const KS = 'shotdetail (' + SEZONLAR.join('+') + ')';
    const KN = 'nbastats (' + SEZONLAR.join('+') + ')';
    const mS = k => Math.max(1, N.TS[k].macSay);

    /* ── pozisyon süresi ── */
    const histogram = {};
    SURE_AD.forEach(ad => {
      histogram[ad] = bant(pTS.map(k => 100 * (P.TS[k].kova[ad] || 0) / P.TS[k].poz), { kaynak: KP, birim: '%', bas: 2 });
    });

    /* ── geçiş hücumu ── */
    const baslangic = {};
    ['calma', 'blok', 'ribaund', 'sayiSonrasi', 'mola', 'oluTop', 'diger'].forEach(s => {
      baslangic[s] = bant(pTS.map(k => 100 * (P.TS[k].sinif[s] || 0) / P.TS[k].poz), { kaynak: KP + ' · STARTTYPE', birim: '%', bas: 2 });
    });
    const bitisBolge = {};
    ['gecis', 'set'].forEach(g => {
      const h = P.gecisBitis[g];
      if (!h) { bitisBolge[g] = null; return; }
      const tp = Object.keys(h).reduce((s, x) => s + h[x], 0);
      const o = {};
      BOLGELER.forEach(b => { o[b] = yuv(100 * (h[b] || 0) / tp, 2); });
      bitisBolge[g] = { paylar: o, birim: '%', kaynak: KP + ' ↔ ' + KS + ' (pozisyon bitiş anı ↔ şut saati eşleşmesi)', n: tp };
    });

    /* ── şut bölgesi + isabet + tip ── */
    const sutBolge = {}, bolgeIsabet = {}, sutTip = {};
    BOLGELER.forEach(b => {
      sutBolge[b] = bant(sTS.map(k => 100 * (S.TS[k].bolge[b] || 0) / S.TS[k].fga), { kaynak: KS + ' · SHOT_ZONE_BASIC', birim: '%', bas: 2 });
      bolgeIsabet[b] = bant(sTS.map(k => 100 * (S.TS[k].bolgeM[b] || 0) / Math.max(1, S.TS[k].bolge[b] || 0)), { kaynak: KS, birim: '%', bas: 2 });
    });
    SUT_TIPLERI.forEach(t => {
      sutTip[t] = bant(sTS.map(k => 100 * (S.TS[k].tip[t] || 0) / S.TS[k].fga), { kaynak: KS + ' · ACTION_TYPE', birim: '%', bas: 2 });
    });
    const YAY_NOT = 'FIBA yayı daha kısadır (6,75 m / köşe 6,60 · NBA 7,24 / 6,71): FIBA 3P% bir tık YUKARI, orta mesafe payı bir tık AŞAĞI kayar. Yön bilinir, büyüklüğü ÖLÇÜLMEDİ — bant NBA değerinin kendisidir (§3.2).';

    /* ── kural olayları ── */
    const kuralPay = tur => bant(nTS.map(k => (N.TS[k].to[tur] || 0) / mS(k)), { kaynak: KN + ' · EVENTMSGTYPE 5 / EVENTMSGACTIONTYPE', olcekli: true, bas: 3 });

    /* ── POZİSYON BAŞINA ORANLAR (asıl aktarılabilir ölçütler) ────────────────
       ⚠ BU BLOK PAKETİN EN ÖNEMLİ ÖLÇÜMÜ. §3.2'nin "sayım ölçütlerini 40/48 ile
       ölçekle" kuralı SÜREYİ düzeltir ama VERİMİ düzeltmez: NBA takımı 48 dakikada
       114 sayı atar, ölçeklenmiş hâli 95 sayı/40 dk'dır — oysa gerçek FIBA maçı
       ~78-82 sayıdır. Fark tempodan değil, pozisyon BAŞINA verimden gelir
       (NBA ~1,15 sayı/pozisyon, FIBA ~1,05-1,10).
       Bu yüzden sayım ölçütlerinin YANINDA pozisyon başına oranları da yazıyoruz:
       bunlar saf oranlardır, süreden ve tempodan BAĞIMSIZ olarak taşınır ve
       motorun kendi pozisyon sayısıyla çarpılarak kullanılır. Bir kapı "sayı 95
       olsun" derse FIBA'yı değil NBA'yı taklit ettirir; "sayı/pozisyon 1,15 olsun"
       derse gerçek verimi ölçer. Ölçekleme UYGULANMAZ — oran zaten süresizdir. */
    const pozLig = ort(pTS.map(k => P.TS[k].poz / P.TS[k].mac.size));   /* takım başına maç başına, ölçeksiz */
    const pozTakim = A();
    pTS.forEach(k => { pozTakim[k] = P.TS[k].poz / P.TS[k].mac.size; });
    /** nbastats sayacını o takımın KENDİ pozisyon sayısına böler; takım eşleşmesi
        kurulamayan (harita dışı) takım-sezonlar lig ortalamasına düşer. */
    const pozBasina = (fn, o) => bant(nTS.map(k => {
      const pz = pozTakim[k] || pozLig;
      return fn(k) / Math.max(1, N.TS[k].macSay) / pz;
    }), o);
    const pozBasinaBlok = {
      _aciklama: 'Pozisyon başına oran — süreden ve tempodan BAĞIMSIZ. Bir ölçütü gerçeğe oturtmanın doğru yolu budur: motorun kendi pozisyon sayısıyla çarpılır. Ölçek UYGULANMAZ.',
      sayi: pozBasina(k => N.TS[k].pts, { kaynak: KN + ' + ' + KP, bas: 4 }),
      fga: bant(sTS.filter(k => pozTakim[k]).map(k => S.TS[k].fga / S.TS[k].mac.size / pozTakim[k]), { kaynak: KS + ' + ' + KP, bas: 4 }),
      fta: pozBasina(k => N.TS[k].fta, { kaynak: KN + ' + ' + KP, bas: 4 }),
      ribaunt: pozBasina(k => N.TS[k].reb, { kaynak: KN + ' + ' + KP, bas: 4 }),
      asist: pozBasina(k => N.TS[k].ast, { kaynak: KN + ' + ' + KP, bas: 4 }),
      topKaybi: pozBasina(k => Object.keys(N.TS[k].to).reduce((s2, x) => s2 + N.TS[k].to[x], 0), { kaynak: KN + ' + ' + KP, bas: 4 }),
      calma: pozBasina(k => N.TS[k].stl, { kaynak: KN + ' + ' + KP, bas: 4 }),
      blok: pozBasina(k => N.TS[k].blk, { kaynak: KN + ' + ' + KP, bas: 4 }),
      faul: pozBasina(k => N.TS[k].foul, { kaynak: KN + ' + ' + KP, bas: 4 }),
      oyuncuDegisikligi: pozBasina(k => N.TS[k].sub, { kaynak: KN + ' + ' + KP, bas: 4 }),
      sutSaatiIhlali: pozBasina(k => N.TS[k].to.sutSaati || 0, { kaynak: KN + ' + ' + KP, bas: 5 }),
      hucumFaulu: pozBasina(k => N.TS[k].to.hucumFaulu || 0, { kaynak: KN + ' + ' + KP, bas: 5 }),
      tac: pozBasina(k => N.TS[k].to.tac || 0, { kaynak: KN + ' + ' + KP, bas: 5 }),
      adimCiftSurme: pozBasina(k => N.TS[k].to.adimCiftSurme || 0, { kaynak: KN + ' + ' + KP, bas: 5 }),
      teknikFaul: pozBasina(k => N.TS[k].teknik, { kaynak: KN + ' + ' + KP, bas: 5 }),
      mola: pozBasina(k => N.TS[k].mola, { kaynak: KN + ' + ' + KP, bas: 5 })
    };

    /* ── maç sonu ── */
    const uzatma = 100 * N.MAC.filter(m => m.per > 4).length / Math.max(1, N.MAC.length);
    const sezonUz = SEZONLAR.map(sz => {
      const g = N.MAC.filter(m => m.sz === sz);
      return g.length ? 100 * g.filter(m => m.per > 4).length / g.length : NaN;
    }).filter(isFinite);
    const uzAlt = sezonUz.length ? Math.min.apply(null, sezonUz) : uzatma;
    const uzUst = sezonUz.length ? Math.max.apply(null, sezonUz) : uzatma;
    /* ⚠ Fark dağılımı ÖLÇEKLİ farktan hesaplanır: 40 dakikalık maçta aynı güç farkı
       daha küçük sayı farkı üretir. Ölçeksiz bırakılırsa "20+ fark %18,6" gibi bir
       kapı motoru 48 dakikalık NBA maçına ayarlar. */
    const farklar = N.MAC.map(m => m.fark * OLCEK);
    const fOrt = ort(farklar), fSap = sap(farklar);   /* zaten ölçekli */
    const pay = f => yuv(100 * farklar.filter(f).length / farklar.length, 2);

    const cikti = {
      _aciklama: 'FAZ 39 — GERÇEK MAÇ VERİSİNDEN ÇIKARILMIŞ BANTLAR. Bu dosya TEK DOĞRULUK KAYNAĞIDIR: check araçlarındaki eşikler buradan okunur, elle YAZILMAZ. Bir eşiği değiştirmek isteyen veriyi yeniden çıkarmak zorundadır (node tools/gercek-veri/indir.js && node tools/gercek-veri/cikar.js). null = bu veriden ÇIKARILAMADI; o ölçüt için kapı KURULMAZ, bilgi satırı olarak raporlanır.',
      meta: {
        sezonlar: SEZONLAR,
        lig: 'NBA — düzenli sezon',
        mac: N.MAC.length,
        pozisyon: P.toplamPoz,
        sut: S.n,
        olay: N.n,
        takimSezon: nTS.length,
        olcekKatsayisi: yuv(OLCEK, 4),
        olcekAciklama: 'Maç süresi FIBA 4×10 = 40 dk, NBA 4×12 = 48 dk. SAYIM ölçütleri (sayı, FGA, ribaunt, faul, pozisyon, değişiklik, kural olayı) bu katsayıyla çarpıldı — `olcek` alanı taşıyan her kayıt ölçeklidir. ORAN/DAĞILIM ölçütleri (yüzde, pay, süre histogramı, isabet) ölçeklenmedi.',
        bantAciklama: 'alt/ust = TAKIM-SEZON ortalamalarının ±1 standart sapması, yani "gerçek takımlar birbirinden ne kadar farklı". Tek maç sapması DEĞİL: kapılar yüzlerce maçlık lig ortalamasını ölçer, tek maçı değil.',
        ucSayiYayi: 'FIBA 6,75 m (köşe 6,60) · NBA 7,24 m (köşe 6,71). Mesafe farkı ÖLÇEKLENMEDİ; etkilenen ölçütlerde `not` alanı var.',
        kaynak: KAYNAK_URL,
        lisans: 'Apache-2.0',
        cikarimTarihi: new Date().toISOString().slice(0, 10)
      },

      pozisyonSuresi: {
        birim: 'sn',
        ortalama: bant(pTS.map(k => P.TS[k].sure / P.TS[k].poz), { kaynak: KP + ' · STARTTIME−ENDTIME', birim: 'sn', bas: 2 }),
        histogram
      },

      pozisyonSayisi: bant(pTS.map(k => P.TS[k].poz / P.TS[k].mac.size), {
        kaynak: KP + ' · tekilleştirilmiş pozisyon / maç (takım başına)', olcekli: true, bas: 2,
        not: 'NBA gerçeği takım başına ~99 pozisyon / 48 dk; süreyle ölçeklenmiş hâli 40 dakikalık maçın ÜST sınırıdır. Yayımlanmış FIBA tempoları (~72-78) daha düşüktür, çünkü FIBA dakika başına da daha yavaş oynanır. Bu ek fark ÖLÇÜLMEDİ ve uydurulmadı.'
      }),

      gecisHucumu: {
        pay: bant(pTS.map(k => 100 * P.TS[k].gecisPoz / P.TS[k].poz), { kaynak: KP + ' · STARTTYPE (çalma/blok/ribaunt = canlı top)', birim: '%', bas: 2 }),
        ortalamaSure: bant(pTS.map(k => P.TS[k].gecisSure / Math.max(1, P.TS[k].gecisPoz)), { kaynak: KP, birim: 'sn', bas: 2 }),
        setOrtalamaSure: bant(pTS.map(k => (P.TS[k].sure - P.TS[k].gecisSure) / Math.max(1, P.TS[k].poz - P.TS[k].gecisPoz)), { kaynak: KP, birim: 'sn', bas: 2 }),
        baslangicTuru: baslangic,
        bitisBolgesi: bitisBolge
      },

      sutBolgesi: sutBolge,

      isabet: {
        ikiSayi: bant(sTS.map(k => 100 * (S.TS[k].fgm - S.TS[k].tpm) / Math.max(1, S.TS[k].fga - S.TS[k].tpa)), { kaynak: KS, birim: '%', bas: 2, not: YAY_NOT }),
        ucSayi: bant(sTS.map(k => 100 * S.TS[k].tpm / Math.max(1, S.TS[k].tpa)), { kaynak: KS, birim: '%', bas: 2, not: YAY_NOT }),
        sahaSutu: bant(sTS.map(k => 100 * S.TS[k].fgm / Math.max(1, S.TS[k].fga)), { kaynak: KS, birim: '%', bas: 2 }),
        bolgeye: bolgeIsabet,
        serbestAtis: bant(nTS.map(k => 100 * N.TS[k].ftm / Math.max(1, N.TS[k].fta)), { kaynak: KN + ' · EVENTMSGTYPE 3', birim: '%', bas: 2 })
      },

      sutTipi: sutTip,

      kutuOranlari: {
        sayi: bant(nTS.map(k => N.TS[k].pts / mS(k)), { kaynak: KN + ' · açıklamadaki "(N PTS)" en büyüğü', olcekli: true, bas: 2 }),
        fga: bant(sTS.map(k => S.TS[k].fga / S.TS[k].mac.size), { kaynak: KS, olcekli: true, bas: 2 }),
        ucPayi: bant(sTS.map(k => 100 * S.TS[k].tpa / S.TS[k].fga), { kaynak: KS + ' · 3PA/FGA', birim: '%', bas: 2 }),
        fta: bant(nTS.map(k => N.TS[k].fta / mS(k)), { kaynak: KN, olcekli: true, bas: 2 }),
        ftaFgaOrani: null,
        asist: bant(nTS.map(k => N.TS[k].ast / mS(k)), { kaynak: KN + ' · EVENTMSGTYPE 1 PLAYER2', olcekli: true, bas: 2 }),
        asistIsabetliSutOrani: bant(nTS.map(k => N.TS[k].ast / Math.max(1, N.TS[k].fgm)), { kaynak: KN, bas: 3 }),
        ribaunt: bant(nTS.map(k => N.TS[k].reb / mS(k)), { kaynak: KN + ' · EVENTMSGTYPE 4', olcekli: true, bas: 2 }),
        topKaybi: bant(nTS.map(k => Object.keys(N.TS[k].to).reduce((s, x) => s + N.TS[k].to[x], 0) / mS(k)), { kaynak: KN + ' · EVENTMSGTYPE 5', olcekli: true, bas: 2 }),
        topKaybiPozisyonBasina: bant(pTS.map(k => P.TS[k].to / P.TS[k].poz), { kaynak: KP + ' · TURNOVERS', bas: 3 }),
        calma: bant(nTS.map(k => N.TS[k].stl / mS(k)), { kaynak: KN + ' · EVENTMSGTYPE 5 PLAYER2', olcekli: true, bas: 2 }),
        blok: bant(nTS.map(k => N.TS[k].blk / mS(k)), { kaynak: KN + ' · EVENTMSGTYPE 2 PLAYER3', olcekli: true, bas: 2 }),
        faul: bant(nTS.map(k => N.TS[k].foul / mS(k)), {
          kaynak: KN + ' · EVENTMSGTYPE 6', olcekli: true, bas: 2,
          not: 'Yalnız SÜREYE göre ölçeklenmiştir. FIBA gerçekte NBA’den daha çok faul üretir (dar boya, farklı temas yorumu); yön bilinir, büyüklüğü bu veriden ÖLÇÜLEMEZ — bant NBA’nin ölçeklenmiş hâlidir.'
        }),
        hucumRibaunduPozisyonBasina: bant(pTS.map(k => P.TS[k].orb / P.TS[k].poz), { kaynak: KP + ' · OFFENSIVEREBOUNDS', bas: 3 }),
        ORB: null,
        DRB: null
      },

      pozisyonBasina: pozBasinaBlok,

      rotasyon: {
        oynayanOyuncu: bant(nTS.map(k => N.TS[k].oynayan / mS(k)), { kaynak: KN + ' · maçta en az bir olayı olan oyuncu', bas: 2 }),
        yedekSayiPayi: bant(nTS.map(k => 100 * N.TS[k].yedekPts / Math.max(1, N.TS[k].pts)), {
          kaynak: KN + ' · değişiklik kaydından ilk beş/yedek ayrımı', birim: '%', bas: 2,
          not: 'Yedek = maçtaki İLK değişikliğinde GİREN taraf olan oyuncu. Hiç değişikliğe girmeyen oyuncu ilk beş sayılır — bu MUHAFAZAKÂR yöndür, gerçek yedek payı bu değerin biraz üstünde olabilir.'
        }),
        enSkorerPayi: bant(nTS.map(k => 100 * N.TS[k].enSkorerPay / mS(k)), { kaynak: KN, birim: '%', bas: 2 }),
        oyuncuDegisikligi: bant(nTS.map(k => N.TS[k].sub / mS(k)), {
          kaynak: KN + ' · EVENTMSGTYPE 8 (takım başına)', olcekli: true, bas: 2,
          not: 'NBA sınırsız değişiklik hakkına sahiptir ve mola/ölü top sayısı FIBA’dan fazladır; bu ölçüt kural farkından en çok etkilenen kalemlerdendir.'
        })
      },

      kuralOlaylari: {
        _birim: 'takım başına maç başına (FIBA süresine ölçekli)',
        sutSaatiIhlali: kuralPay('sutSaati'),
        hucumFaulu: kuralPay('hucumFaulu'),
        tac: kuralPay('tac'),
        adimCiftSurme: kuralPay('adimCiftSurme'),
        kotuPas: kuralPay('kotuPas'),
        topKaptirma: kuralPay('topKaptirma'),
        teknikFaul: bant(nTS.map(k => N.TS[k].teknik / mS(k)), { kaynak: KN + ' · EVENTMSGTYPE 6, teknik alt türleri', olcekli: true, bas: 3 }),
        mola: bant(nTS.map(k => N.TS[k].mola / mS(k)), {
          kaynak: KN + ' · EVENTMSGTYPE 9', olcekli: true, bas: 2,
          not: 'NBA mola kuralı FIBA’dan farklıdır (NBA 7 mola + zorunlu yayın molaları · FIBA 5). Ölçek yalnız SÜREYİ düzeltir, KURAL farkını değil — bu ölçüt FIBA için üst sınırdır.'
        })
      },

      macSonu: {
        uzatmaOrani: {
          deger: yuv(uzatma, 2), alt: yuv(uzAlt, 2), ust: yuv(uzUst, 2), birim: '%',
          kaynak: KN + ' · maçın en büyük PERIOD > 4', n: N.MAC.length,
          not: 'Bant SEZONLAR ARASI gerçek aralıktır (takım-sezon değil): uzatma maç düzeyinde bir orandır, takım başına anlamlı değildir. Süreyle ÖLÇEKLENMEZ.'
        },
        farkOrtalamasi: { deger: yuv(fOrt, 2), alt: null, ust: null, kaynak: KN + ' · |ev − deplasman| mutlak fark', n: farklar.length, olcek: yuv(OLCEK, 4) },
        farkStandartSapmasi: { deger: yuv(fSap, 2), alt: null, ust: null, kaynak: KN + ' · mutlak farkın std sapması', n: farklar.length, olcek: yuv(OLCEK, 4) },
        farkDagilimi: {
          '0-3': pay(x => x <= 3), '4-5': pay(x => x >= 4 && x <= 5), '6-10': pay(x => x >= 6 && x <= 10),
          '11-19': pay(x => x >= 11 && x <= 19), '20+': pay(x => x >= 20),
          birim: '%', kaynak: KN, n: farklar.length,
          olcek: yuv(OLCEK, 4),
          not: 'Farklar 40/48 ile ÖLÇEKLENDİKTEN SONRA kovalara ayrıldı — 40 dakikalık maçta aynı güç farkı daha küçük sayı farkı üretir. Ölçeksiz kovalanırsa kapı motoru 48 dakikalık NBA maçına ayarlar.'
        },
        ceyrekBasinaSayi: bant(nTS.map(k => N.TS[k].pts / mS(k) / 4), { kaynak: KN, olcekli: true, bas: 2 })
      }
    };

    /* FTA/FGA iki AYRI dosyadan gelir; takım kimliği haritası (TAKIM) sayesinde ikisi de
       TEAM_ID anahtarlı olduğu için takım-sezon bandı KURULABİLİYOR. */
    cikti.kutuOranlari.ftaFgaOrani = bant(
      nTS.filter(k => S.TS[k]).map(k => (N.TS[k].fta / mS(k)) / (S.TS[k].fga / S.TS[k].mac.size)),
      { kaynak: KN + ' (FTA) + ' + KS + ' (FGA), TEAM_ID ile eşleştirildi', bas: 3 });

    fs.mkdirSync(path.dirname(CIKTI), { recursive: true });
    fs.writeFileSync(CIKTI, JSON.stringify(cikti, null, 2), 'utf8');
    console.log('✓ yazıldı: ' + path.relative(process.cwd(), CIKTI));
    console.log('  maç ' + N.MAC.length + ' · pozisyon ' + P.toplamPoz + ' · şut ' + S.n + ' · olay ' + N.n + ' · takım-sezon ' + nTS.length);
    if (P.negatif) console.log('  ! negatif süreli pozisyon atlandı: ' + P.negatif);
    const bos = [];
    (function tara(o, yol) {
      Object.keys(o || {}).forEach(k => {
        if (k.charAt(0) === '_') return;
        const v = o[k];
        if (v === null) bos.push(yol + k);
        else if (v && typeof v === 'object' && !Array.isArray(v) && v.deger === undefined && v.paylar === undefined && v.birim === undefined) tara(v, yol + k + '.');
      });
    })(cikti, '');
    console.log('  null kalan ölçüt (' + bos.length + '): ' + (bos.join(', ') || 'yok'));
  } catch (e) {
    console.error('HATA: ' + (e && e.stack ? e.stack : e));
    process.exit(1);
  }
})();
