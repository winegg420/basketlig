#!/usr/bin/env node
/* FAZ 50 — GERÇEK POZİSYON KLİPLERİ (SportVU → js/klip-data.js)
 *
 * Canlı sahne artık elle yazılmış koreografi yerine GERÇEK maç kaydı oynatır: motor şutu kimin,
 * nereden, ne sonuçla attığına karar verir; sahne o şuta uyan gerçek bir pozisyonun 10 oyuncu +
 * top yörüngesini (SportVU 2015-16, 25 kare/sn) oynatır. Bu araç ham veriden şutla biten
 * pozisyon kliplerini çıkarır.
 *
 * Klip = pozisyonun başlangıcı (hücum eden takım topu aldığı an) → şutun elden çıktığı kare.
 *   · hücum yönü SOLA normalize edilir (x ← 94-x), y olduğu gibi (oynatıcı rastgele aynalar)
 *   · 25 kare/sn (kaynağın kendi hızı), 0,01 ft çözünürlük
 *   · ⚠ NİCEMLEME KARE HIZIYLA BİRLİKTE SIKILAŞMALI (FAZ 56, ölçüldü): 0,1 ft = 3 cm, 40 ms'de
 *     0,76 m/sn'lik sahte hız farkı, yani ~19 m/sn²'lik sahte ivme demektir — 5 kare/sn'de
 *     (200 ms) görünmeyen bu gürültü 25 kare/sn'de ölçümü tek başına dolduruyordu. Ham SportVU
 *     verisi float'tır; nicemleme bizim seçimimizdi. Delta kodlamada 0,01 ft bedavadır.
 *   · KODLAMA (FAZ 56): klip başına ilk kare Int16 mutlak (little-endian), sonraki kareler
 *     komşu farkı Int8 (delta). 40 ms'de bir oyuncu en çok ~11 birim (0,1 ft) hareket eder;
 *     ±127 birim = ±3,9 m fazlasıyla yeter. Taşma kaçışı: delta = -128 ise sonraki iki bayt
 *     o değerin Int16 mutlak hâlidir (top şut sırasında hızlanır). Bayt sayısı yarıya iner —
 *     5 kat zaman çözünürlüğü bugünkü dosya boyutunun altında taşınır.
 *   · kare düzeni: [bx,by,bz, o0x,o0y … o4x,o4y, d0x,d0y … d4x,d4y] (23 sayı)
 *   · hücum/savunma oyuncuları sınıf sırasıyla (G,G,F,F,C → PG,SG,SF,PF,C eşlemesi), sınıf
 *     içinde playerid'ye göre — deterministik
 *   · meta: bas (sokma|ribaund|gecis|onsaha: topun klip başındaki yeri), sure, sx/sy (şut noktası,
 *     ft), si (şutörün hücum dizisindeki yeri), sc (şutör sınıfı), oc/dc (sınıf dizgileri),
 *     made, pas (takım içi el değişimi), ofs (Int16 dizisinde kare başlangıcı), n (kare sayısı),
 *     r (elden çıkış karesi; sonraki ~1 sn şut sonrası hareket)
 *
 * Kullanım: node tools/gercek-hareket/klip-cikar.js [--n=99] [--max=900] [--cikti=js/klip-data.js]
 * Ham veri `_ham/` (gitignore). Tanımlar cikar.js ile aynı (tutan: ≤ 1,2 m + 0,5 sn köprü).
 */
const fs = require('fs');
const path = require('path');
const HAM = path.join(__dirname, '_ham');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? +a.split('=')[1] : d; };
const str = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const N = num('n', 99), MAX = num('max', 900);
/* FAZ 56: dosya boyutu bayt bütçesiyle sınırlıdır — 25 kare/sn'de bütün klipler 5,2 MB eder.
   Klipler TEMİZLİK skoruna göre seçilir (izleme boşluğu · tepe hız · süre) ve toplam kare
   sayısı bu bütçeyi aşmaz. 82.000 kare × 23 bayt ≈ 1,9 MB ham → ~2,5 MB base64 + meta. */
const BUTCE = num('kare', 82000);
const OLCEK = num('olcek', 100);   /* birim = 1/OLCEK ft (100 → 0,01 ft). Int16 mutlak tavanı 94 ft × 100 = 9.400 ✓ */
/* SPortVU 25 Hz optik izlemesinin kendi gürültüsü (birkaç cm) 40 ms'lik düğümlerde ivmeye
   dönüşür. Süzgeç ÇIKARMA ANINDA ve SİMETRİK (1-2-1, faz kaydırmaz) uygulanır — yani düzeltilen
   şey YÖRÜNGENİN KENDİSİDİR, jeton onu birebir izler. FAZ 54/55'te elenen denemelerden yapısal
   farkı budur: orada jeton yörüngeden GECİKTİRİLİYOR, gecikme sonraki karede kapanmak zorunda
   kalıyor ve hız patlıyordu. Ölçülen (60 fps, 320 klip): kare-kare ivme tepe 597 → 24 m/sn²,
   >8 payı %9,65 → %0,25; yörünge sapması ortalama 0,6 cm. Top kanalı daha az süzülür (şut ve
   pas gerçekten hızlıdır). */
const SUZ_OY = num('suz', 6), SUZ_TOP = num('suztop', 2);
const CIKTI = path.resolve(str('cikti', path.join(__dirname, '..', '..', 'js', 'klip-data.js')));
const FT = 0.3048, HZ = 25, FPS = num('fps', 25);   /* FAZ 56: 5 → 25 (kaynağın kendi hızı) */

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
    (out[g] = out[g] || []).push({ period: +c[iP], clock, made: t === 1, oyuncu: +c[iP1], takim: +(c[iTm] || 0) });
  }
  return out;
}
const sinif = (s) => { s = String(s || ''); if (s[0] === 'C') return 'C'; if (s[0] === 'G') return 'G'; if (s[0] === 'F') return 'F'; return 'F'; };
const RANK = { G: 0, F: 1, C: 2 };

const klipler = []; const veri = []; let ofs = 0;
const say = { sut: 0, kareYok: 0, tutanYok: 0, kisa: 0, eksik: 0, ok: 0 };

function macIsle(dosya, pbp, gi) {
  const G = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  const gid = G.gameid; const sutlar = pbp[gid] || [];
  const poz = {};
  (G.events || []).slice(0, 5).forEach(ev => [ev.home, ev.visitor].forEach(t => (t.players || []).forEach(p => { poz[p.playerid] = p.position || ''; })));
  const seen = new Set(); const K = [];
  for (const ev of (G.events || [])) for (const m of (ev.moments || [])) {
    const key = m[0] + ':' + m[1]; if (seen.has(key)) continue; seen.add(key);
    if (!m[5] || m[5].length < 11) continue;
    K.push({ q: m[0], clock: m[2], top: m[5][0], oy: m[5].slice(1, 11) });
  }
  K.sort((a, b) => (a.q - b.q) || (b.clock - a.clock));
  const holder = (k) => { const b = k.top; if (b[4] > 8.0) return null; let en = null, ed = 1e9; k.oy.forEach(p => { const d = Math.hypot(p[2] - b[2], p[3] - b[3]) * FT; if (d < ed) { ed = d; en = p; } }); return (ed <= 1.2) ? en : null; };
  for (const s of sutlar) {
    say.sut++;
    let en = null, ed = 1e9;
    for (let i = 0; i < K.length; i++) { const k = K[i]; if (k.q !== s.period) continue; const d = Math.abs(k.clock - s.clock); if (d < ed) { ed = d; en = i; } }
    if (en == null || ed > 1.0) { say.kareYok++; continue; }
    /* şutörün topu tuttuğu kare (geriye ≤ 3 sn) */
    let hold = -1;
    for (let j = en; j >= Math.max(0, en - 75); j--) { const k = K[j]; if (k.q !== s.period) break; const at = k.oy.find(p => p[1] === s.oyuncu); if (!at) break; const d = Math.hypot(at[2] - k.top[2], at[3] - k.top[3]) * FT; if (d <= 0.9 && k.top[4] <= 7) { hold = j; break; } }
    if (hold < 0) { say.tutanYok++; continue; }
    /* elden çıkış: tutuş bozulana kadar ileri */
    let R = hold;
    while (R + 1 < K.length && K[R + 1].q === s.period) { const k = K[R + 1]; const at = k.oy.find(p => p[1] === s.oyuncu); if (!at) break; const d = Math.hypot(at[2] - k.top[2], at[3] - k.top[3]) * FT; if (d > 1.0 || k.top[4] > 8) break; R++; }
    const shooterTeam = (K[R].oy.find(p => p[1] === s.oyuncu) || [])[0]; if (shooterTeam == null) { say.eksik++; continue; }
    /* pozisyon başı: geriye yürü — rakip ≥ 0,32 sn tutarsa, saat ≥ 0,5 sn durursa, kare boşluğu varsa, 24 sn'de dur */
    let S0 = hold; let rakipN = 0, donukN = 0;
    for (let j = hold - 1; j >= 0; j--) {
      const k = K[j], k1 = K[j + 1];
      if (k.q !== s.period) { S0 = j + 1; break; }
      if (k.clock - k1.clock > 0.5) { S0 = j + 1; break; }          /* kayıt boşluğu */
      if (K[hold].clock - k.clock > 24) { S0 = j + 1; break; }
      if (Math.abs(k.clock - k1.clock) < 0.001) { donukN++; if (donukN >= 12) { S0 = j + 12; break; } } else donukN = 0;
      const h = holder(k);
      if (h && h[0] !== shooterTeam) { rakipN++; if (rakipN >= 8) { S0 = j + 8; break; } } else rakipN = 0;
      S0 = j;
    }
    const sure = K[S0].clock - K[R].clock;
    if (!(sure >= 1.5) || sure > 24.5) { say.kisa++; continue; }
    /* kadro sabit mi (aynı 10 oyuncu) */
    const ids0 = K[S0].oy.map(p => p[1]).sort().join(','), idsR = K[R].oy.map(p => p[1]).sort().join(',');
    if (ids0 !== idsR) { say.eksik++; continue; }
    const ayna = K[R].top[2] > 47;
    const X = (x) => ayna ? (94 - x) : x;
    const of = K[R].oy.filter(p => p[0] === shooterTeam), df = K[R].oy.filter(p => p[0] !== shooterTeam);
    if (of.length !== 5 || df.length !== 5) { say.eksik++; continue; }
    const sirala = (arr) => arr.map(p => ({ id: p[1], c: sinif(poz[p[1]]) })).sort((a, b) => (RANK[a.c] - RANK[b.c]) || (a.id - b.id));
    const oS = sirala(of), dS = sirala(df);
    const si = oS.findIndex(o => o.id === s.oyuncu); if (si < 0) { say.eksik++; continue; }
    /* FPS kare/sn örnekleme (saatle doğrusal ara değer) — FAZ 56'da 25, yani kaynağın kendi
       hızı: düğüm aralığı 200 ms → 40 ms, ara değerin uydurduğu mesafe 1,5-2 m → 25-33 cm. */
    /* şuttan sonra 1,0 sn daha (ribaunt/geri dönüş hareketi; oynatıcı topu elden çıkışta motora devreder) */
    let R2 = R; while (R2 + 1 < K.length && K[R2 + 1].q === s.period && K[R].clock - K[R2 + 1].clock <= 1.0 && K[R2].clock - K[R2 + 1].clock < 0.5 && K[R2 + 1].oy.length === 10) R2++;
    const kare = []; let j = S0; let pasN = 0, sonTutan = null; let bozuk = false; let rIx = -1;
    for (let t = K[S0].clock; t >= K[R2].clock - 1e-6; t -= 1 / FPS) {
      if (rIx < 0 && t <= K[R].clock + 1e-6) rIx = kare.length;
      while (j + 1 <= R2 && K[j + 1].clock > t) j++;
      const a = K[j], b = K[Math.min(R2, j + 1)];
      const w = (a.clock === b.clock) ? 0 : Math.max(0, Math.min(1, (a.clock - t) / (a.clock - b.clock)));
      const lerp = (u, v) => u + (v - u) * w;
      const f = [X(lerp(a.top[2], b.top[2])), lerp(a.top[3], b.top[3]), lerp(a.top[4], b.top[4])];
      for (const L of [oS, dS]) for (const o of L) { const pa = a.oy.find(p => p[1] === o.id), pb = b.oy.find(p => p[1] === o.id); if (!pa || !pb) { bozuk = true; break; } f.push(X(lerp(pa[2], pb[2])), lerp(pa[3], pb[3])); }
      if (bozuk) break;
      kare.push(f);
      const h = holder(a); if (j <= R && h && h[0] === shooterTeam) { if (sonTutan != null && sonTutan !== h[1]) pasN++; sonTutan = h[1]; }
    }
    if (bozuk || kare.length < 6 || rIx < 3) { say.eksik++; continue; }
    /* SportVU izleme sıçraması (oyuncu kimliği karışması): 0,2 sn'de oyuncu > 2,5 m ya da top > 8 m → klip elenir
       (ölçüldü: 769 klibin 73'ünde 3-20 m'lik tek kare sıçrama; sahnede jeton 3 m/kare "spazm" yapıyordu) */
    /* ⚠ FAZ 56: eşik KARE BAŞINA değil HIZ cinsinden yazılır — 5 kare/sn'deki "0,2 sn'de 2,5 m"
       (12,5 m/sn) 25 kare/sn'de 0,5 m'ye karşılık gelir; kare eşiğini olduğu gibi bırakmak
       süzgeci beş kat gevşetir ve sıçramalı klipler havuza sızar. */
    let vmax = 0, tmax = 0;
    { let sicrama = false;
      for (let i = 1; i < kare.length; i++) { const a = kare[i - 1], b = kare[i];
        const tv = Math.hypot(b[0] - a[0], b[1] - a[1]) * FT * FPS; if (tv > tmax) tmax = tv;
        for (let j = 0; j < 10; j++) { const v = Math.hypot(b[3 + j * 2] - a[3 + j * 2], b[4 + j * 2] - a[4 + j * 2]) * FT * FPS; if (v > vmax) vmax = v; } }
      if (vmax > 12.5 || tmax > 40) sicrama = true;
      if (sicrama) { say.sicrama = (say.sicrama || 0) + 1; continue; } }
    /* TEMİZLİK SKORU (düşük = temiz): izleme boşluğu · tepe hız · süre. Süre cezası aynı zamanda
       BOYUT cezasıdır (uzun klip daha çok kare) ve klipSec zaten 4 sn altını / 13 sn üstünü
       cezalandırıyor — sweet spot 4-9 sn. */
    let bosluk = 0; for (let q = S0; q < R2; q++) bosluk = Math.max(bosluk, K[q].clock - K[q + 1].clock);
    const skor = Math.max(0, bosluk - 0.05) * 12 + Math.max(0, vmax - 7) * 1.0
      + (sure < 4 ? (4 - sure) * 1.5 : 0) + (sure > 9 ? (sure - 9) * 0.35 : 0);
    /* simetrik 1-2-1 (uçlar korunur) — kanal kanal */
    { const suz = (j, gecis) => { if (!gecis) return; const a = kare.map(f => f[j]);
        for (let g = 0; g < gecis; g++) { const b = a.slice(); for (let i = 1; i < a.length - 1; i++) a[i] = (b[i - 1] + 2 * b[i] + b[i + 1]) * 0.25; }
        for (let i = 0; i < kare.length; i++) kare[i][j] = a[i]; };
      for (let j = 0; j < 3; j++) suz(j, SUZ_TOP);
      for (let j = 3; j < 23; j++) suz(j, SUZ_OY); }
    const bx0 = kare[0][0], by0 = kare[0][1];
    const bas = bx0 > 90 ? 'sokma' : bx0 > 78 ? 'ribaund' : bx0 > 47 ? 'gecis' : 'onsaha';
    klipler.push({ skor: +skor.toFixed(3), vmax: +vmax.toFixed(2), bosluk: +bosluk.toFixed(3), g: gi, q: s.period, bas, sure: +sure.toFixed(2), sx: +X(K[R].top[2]).toFixed(2), sy: +K[R].top[3].toFixed(2), si, sc: oS[si].c, oc: oS.map(o => o.c).join(''), dc: dS.map(o => o.c).join(''), made: s.made ? 1 : 0, pas: pasN, ofs, n: kare.length, r: rIx });
    for (const f of kare) for (const v of f) veri.push(Math.round(v * OLCEK));
    ofs += kare.length * 23; say.ok++;
  }
}

(function () {
  const pbp = pbpOku();
  const dosyalar = fs.readdirSync(HAM).filter(f => f.endsWith('.json')).slice(0, N);
  dosyalar.forEach((f, gi) => { process.stdout.write(f + ' … '); try { macIsle(path.join(HAM, f), pbp, gi); console.log('ok · toplam ' + klipler.length); } catch (e) { console.log('HATA ' + e.message); } });
  /* FAZ 56 · SEÇİM: eşit aralık (adayların gelişigüzel bir dilimi) yerine TEMİZLİK SIRASI +
     KARE BÜTÇESİ. Gruplar (bas: sokma/ribaund/gecis/onsaha) aday havuzundaki oranlarıyla
     korunur — klipSec başlangıç durumuna göre eleme yaptığı için bir grubu boşaltmak seçimi
     bozar. Deterministik: skor eşitliğinde ofs'e göre. */
  let sec = klipler;
  {
    const gr = {}; klipler.forEach(k => { (gr[k.bas] = gr[k.bas] || []).push(k); });
    const adlar = Object.keys(gr).sort();
    adlar.forEach(a => gr[a].sort((x, y) => (x.skor - y.skor) || (x.ofs - y.ofs)));
    const ix = {}; adlar.forEach(a => ix[a] = 0);
    sec = []; let kareT = 0, devam = true;
    while (devam && sec.length < MAX && kareT < BUTCE) {
      devam = false;
      for (const a of adlar) {
        const payAdim = Math.max(1, Math.round(gr[a].length / klipler.length * 10));
        for (let t = 0; t < payAdim && ix[a] < gr[a].length; t++) {
          const k = gr[a][ix[a]];
          if (kareT + k.n > BUTCE || sec.length >= MAX) { ix[a] = gr[a].length; break; }
          sec.push(k); kareT += k.n; ix[a]++; devam = true;
        }
      }
    }
    sec.sort((x, y) => x.ofs - y.ofs);
  }
  const out = []; let o2 = 0;
  for (const k of sec) { const a = veri.slice(k.ofs, k.ofs + k.n * 23); k.ofs = o2; for (const v of a) out.push(v); o2 += a.length; }
  /* FAZ 56 · Int8 DELTA: klip başına ilk kare Int16 mutlak, sonraki kareler komşu farkı Int8.
     -128 kaçış değeridir: ardından o değerin Int16 mutlak hâli gelir. Çözücü js/sahne-klip.js
     içindeki _klipCoz — iki taraf birlikte değişmeli. */
  const bytes = [];
  const yazI16 = (v) => { const x = Math.max(-32768, Math.min(32767, v | 0)); bytes.push(x & 255, (x >> 8) & 255); };
  let tasma = 0;
  for (const k of sec) {
    const a = out.slice(k.ofs, k.ofs + k.n * 23);
    k.bo = bytes.length;
    for (let j = 0; j < 23; j++) yazI16(a[j]);
    for (let i = 1; i < k.n; i++) for (let j = 0; j < 23; j++) {
      const d = a[i * 23 + j] - a[(i - 1) * 23 + j];
      if (d >= -127 && d <= 127) bytes.push(d & 255);
      else { bytes.push(128); yazI16(a[i * 23 + j]); tasma++; }
    }
  }
  const b64 = Buffer.from(bytes).toString('base64');
  const meta = sec.map(k => ({ b: k.bas, s: k.sure, x: k.sx, y: k.sy, i: k.si, c: k.sc, oc: k.oc, dc: k.dc, m: k.made, p: k.pas, o: k.ofs, bo: k.bo, n: k.n, r: k.r, g: k.g, q: k.q }));
  const ozet = {}; sec.forEach(k => { ozet[k.bas] = (ozet[k.bas] || 0) + 1; });
  const js = '/* FAZ 50 — GERÇEK POZİSYON KLİPLERİ (SportVU 2015-16 · üretici: tools/gercek-hareket/klip-cikar.js · ' + new Date().toISOString().slice(0, 10) + ')\n' +
    '   ' + sec.length + ' klip · ' + (out.length / 23) + ' kare · ' + FPS + ' kare/sn · ' + (1 / OLCEK) + ' ft · hücum sola · kare = [bx,by,bz, o0..o4 (x,y), d0..d4 (x,y)]\n' +
    '   KODLAMA: ilk kare Int16 mutlak (LE), sonrasi Int8 delta (-128 = kacis, ardindan Int16). Cozucu: js/sahne-klip.js _klipCoz.\n' +
    '   SUZGEC: simetrik 1-2-1 · oyuncu ' + SUZ_OY + ' gecis · top ' + SUZ_TOP + ' gecis (optik izleme gurultusu; yorunge sapmasi ~0,6 cm)\n' +
    '   ELLE DÜZENLEME — çıkarıcı üretir. */\n' +
    'const KLIP_VERI={fps:' + FPS + ',olcek:' + OLCEK + ',n:' + sec.length + ',klip:' + JSON.stringify(meta) + ',b64:"' + b64 + '"};\n';
  fs.writeFileSync(CIKTI, js);
  console.log('yazıldı: ' + path.relative(process.cwd(), CIKTI) + ' · ' + sec.length + ' klip (aday ' + klipler.length + ') · ' + (out.length / 23) + ' kare · ' + (js.length / 1048576).toFixed(2) + ' MB');
  console.log('bayt ' + (bytes.length / 1048576).toFixed(2) + ' MB · taşma ' + tasma + ' · ort skor ' + (sec.reduce((s, k) => s + k.skor, 0) / sec.length).toFixed(2) + ' · ort tepe hız ' + (sec.reduce((s, k) => s + k.vmax, 0) / sec.length).toFixed(2) + ' m/sn');
  console.log('sayım', JSON.stringify(say), 'bas', JSON.stringify(ozet), 'ort süre', (sec.reduce((s, k) => s + k.sure, 0) / sec.length).toFixed(1), 'ort pas', (sec.reduce((s, k) => s + k.pas, 0) / sec.length).toFixed(2));
})();
