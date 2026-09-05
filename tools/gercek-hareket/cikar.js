#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 48 GERÇEK HAREKET BANTLARI ÇIKARICI (SportVU 2015-16)
 *   node --max-old-space-size=4096 tools/gercek-hareket/cikar.js [--n=10]
 * Girdi: tools/gercek-hareket/_ham/*.json (indir.js) + 2015-16_pbp.csv
 * Çıktı: tools/_lib/gercek-hareket.json — DAĞILIMLAR (histogram), tek sayı değil.
 *
 * Tanımlar (hepsi metre, saniye; 1 ft = 0,3048 m; saha 94×50 ft):
 *  · hız: 0,2 sn penceresi (5 kare); oyuncu hız histogramı (m/sn, 0..9, 0,5 adım)
 *  · top eldeyken: topa yatay ≤ 0,9 m ve top ≤ 2,1 m yükseklikte en yakın oyuncu "tutuyor"
 *  · pozisyon: tutan takım değişince yeni pozisyon (uçuş ≤ 2 sn köprülenir)
 *  · pas: aynı takımdan bir tutandan diğerine (arada uçuş) geçiş
 *  · yayılım: hücum takımının 5 oyuncusunun x/y standart sapması (top eldeyken)
 *  · savunmacı mesafesi: topu tutana en yakın rakip (m)
 *  · koşan: hızı > 2 m/sn olan oyuncu sayısı (kare başına, 10 oyuncu)
 *  · kesme: topsuz hücumcu 1,5 sn içinde hücum ettiği potaya ≥ 3 m yaklaşır ve hızı > 3 m/sn
 *  · şut anında duran hücumcu: pbp şut olayının (EVENTMSGTYPE 1/2) saatine en yakın "atıcı topu
 *    tutuyor" son karesinde hızı < 1 m/sn olan hücumcu sayısı (atıcı hariç, 0..4)
 *  · yarı sahayı geçen: top orta çizgiyi geçerken tutan oyuncunun pozisyonu (G / F / C)
 *  Hücum edilen pota: takım × periyot için şut anlarındaki top konumundan (x < 47 → sol).
 *  NBA → FIBA: oran/dağılım doğrudan; sayım ölçütleri (pas/pozisyon) 40/48 ile ÖLÇEKLENMEZ
 *  (pozisyon başına oran zaten süreden bağımsız); saha 28,65 m ↔ 28 m farkı `notlar`da.
 */
const fs = require('fs'), path = require('path');
const HAM = path.join(__dirname, '_ham');
const CIKTI = path.join(__dirname, '..', '_lib', 'gercek-hareket.json');
const args = process.argv.slice(2);
const N = +((args.find(a => a.startsWith('--n=')) || '--n=99').split('=')[1]);
const FT = 0.3048, HZ = 25, PENCERE = 5;
const hist = (edges) => ({ edges, counts: new Array(edges.length - 1).fill(0), n: 0, toplam: 0, kare: 0 });
const ekle = (h, v) => { if (!isFinite(v)) return; h.n++; h.toplam += v; for (let i = 0; i < h.edges.length - 1; i++) { if (v >= h.edges[i] && v < h.edges[i + 1]) { h.counts[i]++; return; } } if (v >= h.edges[h.edges.length - 1]) h.counts[h.counts.length - 1]++; };
const kapat = (h) => { const s = h.counts.reduce((a, b) => a + b, 0) || 1; return { edges: h.edges, oran: h.counts.map(c => +(c / s).toFixed(4)), n: h.n, ort: h.n ? +(h.toplam / h.n).toFixed(3) : null }; };
const seq = (a, b, s) => { const r = []; for (let v = a; v <= b + 1e-9; v += s) r.push(+v.toFixed(3)); return r; };

const H = {
  hiz: hist(seq(0, 9, 0.5)), yayilimX: hist(seq(0, 12, 0.5)), yayilimY: hist(seq(0, 10, 0.5)),
  savunmaci: hist(seq(0, 6, 0.25)), pasPoz: hist(seq(0, 10, 1)), tutma: hist(seq(0, 8, 0.5)),
  kosan: hist(seq(0, 11, 1)), kesme: hist(seq(0, 6, 1)), sutDuran: hist(seq(0, 5, 1)),
  potaUzaklik: hist(seq(0, 14, 0.5)), topElde: { held: 0, ucus: 0 },
  /* FAZ 48 · 3. taş: savunmacı mesafesi ön/arka saha ayrımıyla + arka sahada tutma payı */
  savunmaciOn: hist(seq(0, 6, 0.25)), savunmaciArka: hist(seq(0, 12, 0.5)), arkaSaha: { held: 0, on: 0 }
};
const gecen = { G: 0, F: 0, C: 0 };
const notlar = [];
let macSay = 0, kareSay = 0, pozSay = 0;

/* play-by-play: GAME_ID → [{period, clock, tip, oyuncu, takim}] */
function pbpOku() {
  const p = path.join(HAM, '2015-16_pbp.csv'); if (!fs.existsSync(p)) return {};
  const satir = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  const bas = satir[0].split(','); const ix = (k) => bas.indexOf(k);
  const iT = ix('EVENTMSGTYPE'), iG = ix('GAME_ID'), iC = ix('PCTIMESTRING'), iP = ix('PERIOD'), iP1 = ix('PLAYER1_ID'), iTm = ix('PLAYER1_TEAM_ID');
  const out = {};
  for (let i = 1; i < satir.length; i++) {
    const c = satir[i].split(','); if (c.length < 10) continue;
    const t = +c[iT]; if (t !== 1 && t !== 2) continue;
    const g = c[iG]; const mmss = c[iC].split(':'); const clock = (+mmss[0]) * 60 + (+mmss[1]);
    (out[g] = out[g] || []).push({ period: +c[iP], clock, tip: t, oyuncu: +c[iP1], takim: +(c[iTm] || 0) });
  }
  return out;
}

function macIsle(dosya, pbp) {
  const G = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  const gid = G.gameid; const sutlar = pbp[gid] || [];
  /* pozisyon sözlüğü */
  const poz = {};
  (G.events || []).slice(0, 3).forEach(ev => [ev.home, ev.visitor].forEach(t => (t.players || []).forEach(p => { poz[p.playerid] = p.position || ''; })));
  const pozSinif = (pid) => { const s = poz[pid] || ''; if (s === 'C' || s === 'F-C' || s === 'C-F') return 'C'; if (s.startsWith('G')) return 'G'; if (s.startsWith('F')) return 'F'; return null; };
  /* kareleri tekilleştir (olaylar örtüşür) */
  const seen = new Set(); const K = [];
  for (const ev of (G.events || [])) {
    for (const m of (ev.moments || [])) {
      const key = m[0] + ':' + m[1]; if (seen.has(key)) continue; seen.add(key);
      if (!m[5] || m[5].length < 11) continue;
      K.push({ q: m[0], ts: m[1], clock: m[2], sc: m[3], top: m[5][0], oy: m[5].slice(1, 11) });
    }
  }
  K.sort((a, b) => (a.q - b.q) || (b.clock - a.clock) || (a.ts - b.ts));
  kareSay += K.length; macSay++;
  /* hücum edilen pota: takım×periyot → şut anındaki top x'i */
  const pota = {}; /* key team:period → 'L'|'R' */
  const sutKare = [];
  for (const s of sutlar) {
    let en = null, ed = 1e9;
    for (let i = 0; i < K.length; i++) { const k = K[i]; if (k.q !== s.period) continue; const d = Math.abs(k.clock - s.clock); if (d < ed) { ed = d; en = i; } }
    if (en == null || ed > 1.0) continue;
    const key = s.takim + ':' + s.period; const x = K[en].top[2];
    pota[key] = pota[key] || { L: 0, R: 0 }; pota[key][x < 47 ? 'L' : 'R']++;
    sutKare.push({ i: en, oyuncu: s.oyuncu, takim: s.takim });
  }
  const potaX = (team, q) => { const p = pota[team + ':' + q]; if (!p) return null; return p.L >= p.R ? 5.25 : 88.75; };
  /* hızlar (0,2 sn pencere) */
  const hiz = new Array(K.length);
  for (let i = 0; i < K.length; i++) {
    const j = i - PENCERE; const k = K[i]; const v = new Array(10).fill(0);
    if (j >= 0 && K[j].q === k.q && Math.abs((K[j].clock - k.clock) - PENCERE / HZ) < 0.06) {
      for (let a = 0; a < 10; a++) { const p = k.oy[a], p0 = K[j].oy.find(x => x[1] === p[1]); if (!p0) continue; v[a] = Math.hypot(p[2] - p0[2], p[3] - p0[3]) * FT / (PENCERE / HZ); }
    }
    hiz[i] = v;
  }
  /* tutan / pozisyon / pas */
  let tutan = null, sonTutan = null, tutanTakim = null, tutBas = 0, sonTutanTakim = null, pasN = 0, ucusBas = null, pozBas = 0, karsiSay = 0;
  let potaGecti = false;
  for (let i = 0; i < K.length; i++) {
    const k = K[i]; const b = k.top;
    let en = null, ed = 1e9;
    k.oy.forEach((p, a) => { const d = Math.hypot(p[2] - b[2], p[3] - b[3]) * FT; if (d < ed) { ed = d; en = a; } });
    /* tutan: topa ≤ 1,2 m (sürme sırasında top elden 1 m açılır) ve top ≤ 2,4 m; aynı oyuncu
       0,5 sn içinde yeniden en yakınsa aynı tutuş (sürme boşluğu köprülenir) */
    let tutuyor = (ed <= 1.2 && b[4] <= 8.0);
    let yeni = tutuyor ? k.oy[en] : null;
    if (!tutuyor && tutan && ucusBas == null) { const d2 = Math.hypot(tutan[2] - b[2], tutan[3] - b[3]) * FT; if (d2 <= 2.2 && b[4] <= 8.0) { const g = k.oy.find(p => p[1] === tutan[1]); if (g) { tutuyor = true; yeni = g; } } }
    if (tutuyor) H.topElde.held++; else H.topElde.ucus++;
    /* pozisyon değişimi: karşı takım topu ≥ 1 sn (25 kare) sürekli tutmalı — anlık sapmalar
       (deflection, karambol) pozisyon başlatmaz (ilk sürüm 727 poz/maç sayıyordu, gerçek ~200) */
    if (tutuyor) {
      if (sonTutanTakim != null && yeni[0] !== sonTutanTakim) { karsiSay++; if (karsiSay >= 25) { ekle(H.pasPoz, pasN); pozSay++; pasN = 0; pozBas = i; potaGecti = false; sonTutanTakim = yeni[0]; karsiSay = 0; } }
      else karsiSay = 0;
    }
    if (yeni && (!tutan || yeni[1] !== tutan[1])) {
      /* pas: önceki tutan (uçuş öncesi) aynı takımdan ve uçuş ≤ 2 sn */
      const onceki = tutan || sonTutan;
      if (onceki && onceki[1] !== yeni[1] && yeni[0] === onceki[0] && (ucusBas == null || (K[ucusBas].clock - k.clock) <= 2.0) && Math.hypot(yeni[2] - onceki[2], yeni[3] - onceki[3]) * FT >= 1.5) { pasN++; }
      if (tutan) ekle(H.tutma, Math.max(0, K[tutBas].clock - K[i].clock));
      /* pozisyon değişimi: karşı takım topu ≥ 1 sn (25 kare) tutmalı — anlık sapmalar (deflection,
         karambol) pozisyon başlatmaz (ilk sürüm 727 poz/maç sayıyordu, gerçek ~200) */
      tutan = yeni; sonTutan = yeni; tutanTakim = yeni[0]; if (sonTutanTakim == null) sonTutanTakim = yeni[0]; tutBas = i; ucusBas = null;
    } else if (!yeni && tutan) { if (ucusBas == null) ucusBas = i; ekle(H.tutma, Math.max(0, K[tutBas].clock - k.clock)); sonTutan = tutan; tutan = null; }
    /* hız histogramı + koşan */
    let kosan = 0; hiz[i].forEach(v => { ekle(H.hiz, v); if (v > 2.0) kosan++; }); ekle(H.kosan, kosan);
    /* top eldeyken: yayılım, savunmacı, kesme, orta çizgi geçişi */
    if (tutuyor) {
      const t = yeni[0]; const huc = k.oy.filter(p => p[0] === t), sav = k.oy.filter(p => p[0] !== t);
      if (huc.length === 5) {
        const mx = huc.reduce((s, p) => s + p[2], 0) / 5, my = huc.reduce((s, p) => s + p[3], 0) / 5;
        ekle(H.yayilimX, Math.sqrt(huc.reduce((s, p) => s + (p[2] - mx) ** 2, 0) / 5) * FT);
        ekle(H.yayilimY, Math.sqrt(huc.reduce((s, p) => s + (p[3] - my) ** 2, 0) / 5) * FT);
        const px = potaX(t, k.q);
        if (px != null) {
          ekle(H.potaUzaklik, huc.reduce((s, p) => s + Math.hypot(p[2] - px, p[3] - 25) * FT, 0) / 5);
          /* kesme: 1,5 sn önce (37 kare) potaya uzaklık farkı */
          const j = i - 37;
          if (j >= 0 && K[j].q === k.q) {
            let kes = 0;
            huc.forEach((p, a) => { if (p[1] === yeni[1]) return; const p0 = K[j].oy.find(x => x[1] === p[1]); if (!p0) return; const d0 = Math.hypot(p0[2] - px, p0[3] - 25) * FT, d1 = Math.hypot(p[2] - px, p[3] - 25) * FT; const v = hiz[i][k.oy.indexOf(p)]; if (d0 - d1 >= 3 && v > 3) kes++; });
            if (i % 37 === 0) ekle(H.kesme, kes);
          }
          /* orta çizgi geçişi: top eldeyken x 47'yi potaya doğru geçti */
          const onde = (px < 47) ? (b[2] < 47) : (b[2] > 47);
          if (onde && !potaGecti) { potaGecti = true; const s = pozSinif(yeni[1]); if (s) gecen[s]++; }
        }
      }
      if (sav.length) { let m = 1e9; sav.forEach(p => { const d = Math.hypot(p[2] - yeni[2], p[3] - yeni[3]) * FT; if (d < m) m = d; }); ekle(H.savunmaci, m);
        const px2 = potaX(t, k.q); if (px2 != null) { const arka = (px2 < 47) ? (yeni[2] > 47) : (yeni[2] < 47); if (arka) { H.arkaSaha.held++; ekle(H.savunmaciArka, m); } else { H.arkaSaha.on++; ekle(H.savunmaciOn, m); } } }
    }
  }
  /* şut anında duran hücumcu */
  for (const s of sutKare) {
    let i = s.i; let bulundu = -1;
    for (let j = i; j >= Math.max(0, i - 75); j--) { const k = K[j]; const at = k.oy.find(p => p[1] === s.oyuncu); if (!at) break; const d = Math.hypot(at[2] - k.top[2], at[3] - k.top[3]) * FT; if (d <= 0.9 && k.top[4] <= 7) { bulundu = j; break; } }
    if (bulundu < 0) continue;
    const k = K[bulundu]; let duran = 0;
    k.oy.forEach((p, a) => { if (p[0] !== s.takim || p[1] === s.oyuncu) return; if (hiz[bulundu][a] < 1.0) duran++; });
    ekle(H.sutDuran, duran);
  }
}

(async () => {
  const pbp = pbpOku();
  const dosyalar = fs.readdirSync(HAM).filter(f => f.endsWith('.json')).slice(0, N);
  for (const f of dosyalar) { process.stdout.write(f + ' … '); try { macIsle(path.join(HAM, f), pbp); console.log('ok'); } catch (e) { console.log('HATA ' + e.message); notlar.push(f + ': ' + e.message); } }
  const g = gecen.G + gecen.F + gecen.C || 1;
  const cikti = {
    kaynak: 'SportVU 2015-16 (linouk23/NBA-Player-Movements, dcayton HF) + nba-alt-awards pbp', tarih: new Date().toISOString().slice(0, 10),
    mac: macSay, kare: kareSay, pozisyon: pozSay,
    olcutler: {
      hiz: kapat(H.hiz), yayilimX: kapat(H.yayilimX), yayilimY: kapat(H.yayilimY), savunmaci: kapat(H.savunmaci),
      pasPoz: kapat(H.pasPoz), tutma: kapat(H.tutma), kosan: kapat(H.kosan), kesme: kapat(H.kesme), sutDuran: kapat(H.sutDuran),
      potaUzaklik: kapat(H.potaUzaklik),
      topElde: { heldOran: +(H.topElde.held / (H.topElde.held + H.topElde.ucus || 1)).toFixed(4) },
      savunmaciOn: kapat(H.savunmaciOn), savunmaciArka: kapat(H.savunmaciArka),
      arkaSaha: { tutmaPayi: +(H.arkaSaha.held / (H.arkaSaha.held + H.arkaSaha.on || 1)).toFixed(4) },
      gecenPozisyon: { G: +(gecen.G / g).toFixed(4), F: +(gecen.F / g).toFixed(4), C: +(gecen.C / g).toFixed(4), n: g }
    },
    cikarilamadi: { perdeSayisi: 'SportVU perde etiketi taşımıyor', sutTipi: 'yörünge verisi yok' },
    notlar: [
      'NBA sahası 28,65 × 15,24 m, FIBA 28 × 15 m: mesafe/yayılım ölçütleri ~%2 küçük olmalı (uygulanmadı, belgelendi).',
      'Hız 0,2 sn penceresi; motor ölçümü 100 ms penceresi + sahne→maç oranı ile karşılaştırılır.',
      'Tutan = topa yatay ≤ 0,9 m ve top ≤ 2,1 m; pozisyon = tutan takım değişimi; pas = takım içi el değişimi (uçuş ≤ 2 sn).',
      'Koşan = hızı > 2 m/sn; motorda KOŞ kademesi eşiği de 2 m/sn (maç ölçeği) alınır.',
      'Kesme örneği 1,5 sn\'de bir alınır (kare başına değil).'
    ].concat(notlar)
  };
  fs.mkdirSync(path.dirname(CIKTI), { recursive: true });
  fs.writeFileSync(CIKTI, JSON.stringify(cikti, null, 1));
  console.log(`yazıldı: ${path.relative(process.cwd(), CIKTI)} · ${macSay} maç · ${kareSay} kare · ${pozSay} pozisyon`);
  const o = cikti.olcutler;
  console.log(`hız ort ${o.hiz.ort} m/sn · yayılım x ${o.yayilimX.ort} y ${o.yayilimY.ort} m · savunmacı ${o.savunmaci.ort} m · pas/poz ${o.pasPoz.ort} · tutma ${o.tutma.ort} sn · koşan ${o.kosan.ort}/10 · kesme ${o.kesme.ort} · şutta duran ${o.sutDuran.ort}/4 · potaya ${o.potaUzaklik.ort} m · top elde %${(o.topElde.heldOran * 100).toFixed(1)} · geçen ${JSON.stringify(o.gecenPozisyon)}`);
})();
