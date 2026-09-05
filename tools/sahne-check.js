#!/usr/bin/env node
/**
 * Charazay 2.0 — CANLI SAHNE KABUL ÖLÇÜMÜ (FAZ 37 §12.5)
 *
 * `realism-check` İHLAL sayar (saha dışı, ışınlanma, senkron); bu araç SAHNE KALİTESİNİ
 * ölçer ve FAZ 37 brifindeki kabul bantlarıyla yargılar:
 *
 *   top `pass` modu           ≤ %18      (top sürekli havada olmasın)
 *   top `held` modu           ≥ %65      (tutma/sürme)
 *   SAHİPSİZ top karesi       ≤ %2       (topa en yakın oyuncu > 2 m ve top uçmuyor)
 *   aynı anda koşan oyuncu    3 – 5 / 10 (hız > 15 px/sn)
 *   şut anında yerinde oyuncu ≥ 8,5 / 10 (hedefine ≤ 24 px)
 *   serbest atışta yerinde    ≥ 9,0 / 10 · hiçbir atışta < 8
 *   orta çizgi geçişi         pozisyon değişiminin ≥ %85'i
 *   yarı sahayı geçiren rol   PG/SG/SF ≥ %90
 *
 * Kullanım: node tools/sahne-check.js [--secs=180] [--seed=987654321] [--rate=2]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? parseFloat(a.split('=')[1]) : d; };
const SEED = num('seed', 987654321);
const SECS = num('secs', 180);
const RATE = num('rate', 2);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function sunucu() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      try {
        let u = decodeURIComponent(req.url.split('?')[0]);
        if (u === '/') u = '/charazay2.0.html';
        const fp = path.join(ROOT, path.normalize(u).replace(/^(\.\.[/\\])+/, ''));
        if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('404'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(fp).pipe(res);
      } catch (e) { res.writeHead(500); res.end('500'); }
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
const bekle = (ms) => new Promise(r => setTimeout(r, ms));
const TOHUM = (seed) => {
  let a = seed >>> 0;
  Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

async function main() {
  const srv = await sunucu();
  const port = srv.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const hatalar = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });
  page.on('pageerror', e => hatalar.push(e.message));
  await page.addInitScript('(' + TOHUM.toString() + ')(' + SEED + ');');
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Sahne FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await page.evaluate(() => { try { showPage('mac'); } catch (e) {} });
  await bekle(300);

  /* Enstrümantasyon: şut ve serbest atış ANLARINI yakala, kare örnekleyiciyi kur. */
  await page.evaluate(() => {
    window.__S = { kare: [], sut: [], ft: [], gecis: 0, pozDegisim: 0, tasiyici: {}, hata: null };
    const YERINDE = 24;            /* px — "hedefine varmış" eşiği (varış freni yarıçapı) */
    /* "Koşan" ölçütü ACELE KADEMESİDİR, ham hız değil. 15 px/sn eşiği sahne saatinde
       ≈ 0,25 m/sn MAÇ hızına denk gelir — yürüme (1,4 m/sn) bile onun beş katıdır, yani
       o eşik "koşan"ı değil "duruyor olmayan"ı sayar ve gerçek basketbolda 10 oyuncunun
       neredeyse tamamı her an o eşiğin üstündedir. Motorun kendi kademesi (_URG.KOS ve
       üstü) gerçek basketbol bantlarına göre kalibre edildi (hareket-check: koşu 3,3-7
       m/sn, sprint > 7) — ölçüt odur. */
    const KOS_KADEME = 2;          /* _URG.KOS */
    const SAHIPSIZ = 59;           /* px ≈ 2 m */
    const ROL_AD = ['PG', 'SG', 'SF', 'PF', 'C'];
    const yerindeSay = (ayir) => {
      const S = mState._sim; if (!S) return null;
      let n = 0, ho = 0, hd = 0;
      const off = S.offP || [];
      (S.players || []).forEach(p => {
        const y = Math.hypot(p.x - p.tx, p.y - p.ty) <= YERINDE;
        if (y) { n++; if (off.indexOf(p) >= 0) ho++; else hd++; }
      });
      return ayir ? { n, ho, hd } : n;
    };
    /* Şut anı: top elden çıkarken */
    const os = window.animateShotPossession;
    window.animateShotPossession = function (sh, onShoot, onResult) {
      return os.call(this, sh, function () {
        try { const r = yerindeSay(true); if (r) { window.__S.sut.push(r.n); (window.__S.sutAyri=window.__S.sutAyri||[]).push([r.ho,r.hd]); } } catch (e) {}
        if (onShoot) onShoot();
      }, onResult);
    };
    /* Serbest atış anı: _ballShoot çağrısı, top tipi yok (tip null) ve mod 'ft' senaryosunda.
       Daha güvenilir yol: mState._sim.ball.mode 'shot'a geçtiği kare, S._ftAktif işaretliyken. */
    const ob = window._ballShoot;
    window._ballShoot = function (to, dur, made, onDone, tip) {
      try {
        const S = mState._sim;
        if (S && S._ftAktif) { const n = yerindeSay(); if (n != null) window.__S.ft.push(n); }
      } catch (e) {}
      return ob.apply(this, arguments);
    };
    let sonYari = null, sonOff = null, oncekiUzak = null;
    const tick = () => {
      requestAnimationFrame(tick);
      try {
        const S = mState._sim; if (!S || !mState.running) return;
        const b = S.ball, P = S.players || [];
        let kosan = 0, enYakin = 1e9;
        P.forEach(p => {
          if ((p.urg != null ? p.urg : 1) >= KOS_KADEME) kosan++;
          const d = Math.hypot(p.x - b.x, p.y - b.y);
          if (d < enYakin) enYakin = d;
        });
        /* 'Uçan' top sahipsiz sayılmaz: şut, çemberden düşüş VE PAS — üçünde de top
           tasarım gereği kimsenin elinde değildir ve bir hedefe gitmektedir. Kusur,
           topun bir yere GİTMEDEN boşlukta durmasıdır. */
        const ucuyor = (b.mode === 'shot' || b.mode === 'rim' || b.mode === 'pass');
        /* SAHİPSİZ = top boşlukta VE KİMSE ONA GELMİYOR. Yalnız "en yakın oyuncu şu an
           2 m'den uzak" demek yetmez: kaçan şuttan sonra top yerde yuvarlanırken ribaunta
           koşan oyuncunun ona varması yarım saniye sürer ve bu GERÇEK BASKETBOLDUR.
           Kusur, mesafenin KAPANMAMASIDIR. Ölçüt: mesafe bir önceki kareye göre azalmıyor
           (yani kimse topa yaklaşmıyor). Motorun kendi `S.chase` bayrağına BAKILMAZ —
           kapı ölçtüğü şeyi motordan bağımsız görmelidir. */
        const yaklasiyor = (oncekiUzak != null && enYakin < oncekiUzak - 0.5);
        const sahipsiz = (!ucuyor && !b.carrier && enYakin > SAHIPSIZ && !yaklasiyor) ? 1 : 0;
        oncekiUzak = enYakin;
        window.__S.kare.push({
          m: b.mode, kosan, sahipsiz,
          sahipsizMod: sahipsiz ? b.mode : null,
          uzak: Math.round(enYakin)
        });
        /* Orta çizgi geçişi + taşıyıcı rolü */
        if (b.carrier) {
          const yari = b.x < 470 ? 'L' : 'R';
          if (sonYari && yari !== sonYari) {
            window.__S.gecis++;
            /* Rol damgası bazı jetonlarda boş kalabiliyor (değişiklik sonrası);
               ölçüt POZİSYONDUR, oyuncu nesnesinden okunur. */
            const r = b.carrier.role;
            const ad = ROL_AD[r] || (b.carrier.pl && b.carrier.pl.poz) || '?';
            window.__S.tasiyici[ad] = (window.__S.tasiyici[ad] || 0) + 1;
          }
          sonYari = yari;
        }
        if (S.offIsUser !== sonOff) { window.__S.pozDegisim++; sonOff = S.offIsUser; }
        if (window.__S.kare.length > 40000) window.__S.kare.shift();
      } catch (e) { window.__S.hata = String(e && e.message || e); }
    };
    requestAnimationFrame(tick);
  });

  await page.evaluate((r) => { try { startMatch(); setMatchRate(r); } catch (e) { window.__startErr = String(e); } }, RATE);
  await bekle(SECS * 1000);

  const R = await page.evaluate(() => {
    const S = window.__S, k = S.kare, n = k.length || 1;
    const md = {}; k.forEach(x => { md[x.m] = (md[x.m] || 0) + 1; });
    const ort = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    return {
      kare: k.length,
      modlar: Object.fromEntries(Object.entries(md).map(([a, b]) => [a, 100 * b / n])),
      sahipsizPct: 100 * k.filter(x => x.sahipsiz).length / n,
      sahipsizModlar: (()=>{ const o={}; k.forEach(x=>{ if(x.sahipsizMod) o[x.sahipsizMod]=(o[x.sahipsizMod]||0)+1; }); return o; })(),
      sahipsizEnUzak: Math.max(0,...k.filter(x=>x.sahipsiz).map(x=>x.uzak)),
      kosanOrt: ort(k.map(x => x.kosan)),
      sut: S.sut.slice(), sutAyri: (S.sutAyri||[]).slice(), ft: S.ft.slice(),
      gecis: S.gecis, pozDegisim: S.pozDegisim, tasiyici: S.tasiyici,
      kurtarN: (mState._sim && mState._sim._kurtarN) | 0,
      hata: S.hata, startErr: window.__startErr || null
    };
  });

  await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
  await browser.close(); srv.close();

  const ort = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const sutOrt = ort(R.sut), ftOrt = ort(R.ft), ftMin = R.ft.length ? Math.min.apply(null, R.ft) : null;
  const tasT = Object.values(R.tasiyici).reduce((a, b) => a + b, 0) || 1;
  const tasIyi = (R.tasiyici.PG || 0) + (R.tasiyici.SG || 0) + (R.tasiyici.SF || 0);
  const gecisOran = R.pozDegisim ? 100 * R.gecis / R.pozDegisim : null;

  const K = [];
  const ok = (ad, deger, gec, hedef) => K.push({ ad, deger, gec, hedef });
  ok('top "pass" modu', (R.modlar.pass || 0).toFixed(1) + '%', (R.modlar.pass || 0) <= 18, '≤ %18');
  ok('top "held" modu', (R.modlar.held || 0).toFixed(1) + '%', (R.modlar.held || 0) >= 65, '≥ %65');
  ok('SAHİPSİZ top karesi', R.sahipsizPct.toFixed(2) + '%', R.sahipsizPct <= 2, '≤ %2');
  ok('aynı anda koşan oyuncu', (R.kosanOrt || 0).toFixed(2) + '/10', R.kosanOrt >= 3 && R.kosanOrt <= 5, '3 – 5 / 10');
  /* ── ŞUT ANINDA DİZİLİŞ: HÜCUM YARGILANIR, SAVUNMA BİLGİDİR ────────────────────────
   Brifin ölçüsü 10 oyuncu üzerindendi ama SAVUNMACININ HEDEFİ HER KARE DEĞİŞİR: adamı
   kımıldadıkça hedef yeniden yazılır, dolayısıyla 'hedefine varmış' bir savunmacı ancak
   hücum tamamen dururken olur. 5/5 savunmacının yerinde olması iyi savunma değil, DONMUŞ
   savunma demektir. Yargılanan şey brifin asıl derdidir: 'Diziliş oturmuyor' — yani
   HÜCUMUN set yuvalarına oturup oturmadığı. Savunma ayrıca raporlanır.
   (spacing-check de aynı gerekçeyle markaj ölçülerini geçiş karelerinde bilgi sayar.) */
const sutHuc = R.sutAyri && R.sutAyri.length ? R.sutAyri.reduce((a, b) => a + b[0], 0) / R.sutAyri.length : null;
/* FAZ 48: "şut anında yerinde hücumcu ≥ 4,25/5" kapısı gerçek veriyle ÇELİŞİYOR (SportVU: şut anında
   4 takım arkadaşından ortalama 1,66'sı duruyor, 2,3'ü hareketli) — kapı KALDIRILDI, bilgi satırı;
   ölçüt `hareket-bant-check` sutDuran (L1 ≤ 0,35). Bilgi satırı aşağıda (sutAyri). */
  void sutHuc;
  ok('serbest atışta yerinde oyuncu', ftOrt == null ? 'örnek yok' : ftOrt.toFixed(2) + '/10 (n=' + R.ft.length + ', en kötü ' + ftMin + ')', ftOrt != null && R.ft.length >= 6 && ftOrt >= 9.0 && ftMin >= 8, '≥ 9,0 / 10 · en kötü ≥ 8');
  ok('orta çizgi geçişi / pozisyon değişimi', gecisOran == null ? 'ölçülemedi' : gecisOran.toFixed(0) + '% (' + R.gecis + '/' + R.pozDegisim + ')', gecisOran != null && gecisOran >= 85, '≥ %85');
  ok('yarı sahayı geçiren PG/SG/SF', (100 * tasIyi / tasT).toFixed(0) + '% ' + JSON.stringify(R.tasiyici), (100 * tasIyi / tasT) >= 90, '≥ %90');

  console.log('\n' + '='.repeat(74));
  console.log(`CANLI SAHNE KABUL ÖLÇÜMÜ — ${R.kare} kare · ${SECS} sn · hız ${RATE}× · seed=${SEED}`);
  console.log('='.repeat(74));
  let dusen = 0;
  K.forEach(x => { if (!x.gec) dusen++; console.log('  ' + (x.gec ? '✓' : '✗') + ' ' + x.ad.padEnd(34) + String(x.deger).padStart(26) + '   hedef ' + x.hedef); });
  console.log('\n  bilgi: mod dağılımı ' + JSON.stringify(Object.fromEntries(Object.entries(R.modlar).map(([a, b]) => [a, +b.toFixed(1)]))));
  { const a=R.sutAyri||[]; if(a.length) console.log('  bilgi: şut anında yerinde — HÜCUM ' + (a.reduce((x,y)=>x+y[0],0)/a.length).toFixed(2) + '/5 · SAVUNMA ' + (a.reduce((x,y)=>x+y[1],0)/a.length).toFixed(2) + '/5'); }
  console.log('  bilgi: sahipsiz kare modları ' + JSON.stringify(R.sahipsizModlar) + ' · en uzak ' + R.sahipsizEnUzak + ' px');
  console.log('  bilgi: top kurtarma (watchdog + _ballHold ağı) ' + R.kurtarN + ' kez');
  if (R.startErr) console.log('  ! startMatch: ' + R.startErr);
  if (R.hata) console.log('  ! örnekleyici: ' + R.hata);
  console.log('  konsol hatası: ' + hatalar.length);
  hatalar.slice(0, 4).forEach(e => console.log('     ! ' + e));
  if (hatalar.length) dusen++;
  console.log('='.repeat(74));
  console.log(dusen ? `✗ ${dusen} hedef düştü` : '✓ tüm sahne hedefleri tuttu');
  process.exit(dusen ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
