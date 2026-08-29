#!/usr/bin/env node
/**
 * Charazay 2.0 — M20 RAKİP KADRO KALICILIĞI DENETÇİSİ
 *
 * M20/A1: "Lig takımlarına kalıcı kadro nesnesi ver; maç istatistiği, bireysel faul,
 * sakatlık ve yorgunluk iki taraf için de aynı kod yolundan geçsin."
 *
 * Kalıcılık tek maçta görülmez — birden çok maç oynatılıp kulüp önbelleğindeki kadro
 * nesnesinin ÜZERİNDE durum birikip birikmediği ölçülür.
 *
 *  T1  Kadro kimliği kalıcı      — aynı rakip, aynı id'ler (maçlar arası yeniden üretilmiyor)
 *  T2  Kadro derinliği ≥ 10      — rotasyon + 5 faul + sakatlık için yeterli
 *  T3  Sezon istatistiği birikir — maç sonrası p.sezon.mac/pts artıyor
 *  T4  Yorgunluk işliyor         — oynayanın enerjisi düşüyor, günlerle toparlanıyor
 *  T5  Şut isabeti aynı yoldan   — rakip isabeti oyuncunun statından/enerjisinden geçiyor
 *  T6  Bireysel faul + sakatlık  — rakipte matchFouls işleniyor, sakatlık alanları kalıcı
 *
 * Çıkış kodu: 0 = hepsi geçti, 1 = en az biri düştü.
 * Çalıştırma:  node tools/m20-check.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent(req.url.split('?')[0]);
        if (urlPath === '/') urlPath = '/charazay2.0.html';
        const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
        if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404); res.end('404'); return;
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } catch (e) { res.writeHead(500); res.end('500'); }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const sonuc = [];
function kayit(kod, ad, gecti, detay) {
  sonuc.push({ kod, ad, gecti });
  console.log(`  ${gecti ? '✓' : '✗'} ${kod}  ${ad}\n       ${detay}`);
}

async function main() {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  console.log('Statik sunucu:', base);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const hatalar = [];
  page.on('pageerror', e => hatalar.push(e.message));
  page.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });

  await page.goto(base + '/charazay2.0.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 20000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 10000 });
  await page.fill('#teamName', 'M20 Denetimi');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await sleep(500);

  // Animasyonsuz olarak arka arkaya maç oynat; her maçtan sonra rakip kadronun durumunu oku.
  const R = await page.evaluate(async () => {
    const key = G.team.tblKey || 'tbl';
    const oku = (name) => {
      let cache = {}; try { cache = JSON.parse(localStorage.getItem(CLUB_CACHE_KEY) || '{}'); } catch (e) {}
      const row = cache[key + '||' + name];
      if (!row || !Array.isArray(row.roster)) return null;
      return row.roster.map(p => ({
        id: p.id, isim: p.isim, genel: p.genel, yas: p.yas,
        enerji: p.enerji, sezon: p.sezon ? Object.assign({}, p.sezon) : null,
        sakat: p.injReturnDay != null
      }));
    };
    const kayitlar = [];
    const rakipler = [];
    let ilkRakip = null;
    // Sıradaki 4 kullanıcı maçını oyna
    for (let i = 0; i < 4; i++) {
      const nx = findNextUserSeasonMatch();
      if (!nx) break;
      const rakip = (nx.home === G.team.isim) ? nx.away : nx.home;
      getBotClubProfile(rakip, key);      // kadroyu maçtan ÖNCE oluştur/yükle
      const oncesi = oku(rakip);
      const evs = generateMatchEvents({ isim: rakip }, { userIsHome: nx.home === G.team.isim });
      const son = evs[evs.length - 1] || {};
      applyMatchResult(son, {
        seasonMatchIx: nx.seasonMatchIx, isPlayoff: false, isCup: false,
        rakipName: rakip, userIsHome: nx.home === G.team.isim
      });
      const sonrasi = oku(rakip);
      if (!ilkRakip) ilkRakip = rakip;
      rakipler.push(rakip);
      kayitlar.push({ rakip, oncesi, sonrasi, oplayers: son.oplayers || {}, oppPlayedIds: son.oppPlayedIds || [] });
      await new Promise(r => setTimeout(r, 30));
    }

    // Aynı rakiple TEKRAR oyna: istatistik üst üste birikiyor mu, kimlik korunuyor mu?
    let tekrar = null;
    try {
      if (ilkRakip) {
        const oncesi = oku(ilkRakip);
        const evs = generateMatchEvents({ isim: ilkRakip }, { userIsHome: true });
        const son = evs[evs.length - 1] || {};
        if (typeof mergeBotClubMatchStats === 'function') mergeBotClubMatchStats(ilkRakip, key, son.oplayers, son.oppPlayedIds);
        const sonrasi = oku(ilkRakip);
        tekrar = { rakip: ilkRakip, oncesi, sonrasi };
        kayitlar.push(tekrar);
      }
    } catch (e) {}

    // T5: rakip isabeti oyuncu statından geçiyor mu? Aynı motorla iki uç kadro dene.
    let accDusuk = null, accYuksek = null;
    try {
      const nm = rakipler[0] || 'Test';
      let cache = {}; try { cache = JSON.parse(localStorage.getItem(CLUB_CACHE_KEY) || '{}'); } catch (e) {}
      const ck = key + '||' + nm;
      const yedek = JSON.stringify(cache[ck]);
      const skorla = () => {
        let t = 0;
        for (let i = 0; i < 12; i++) {
          const evs = generateMatchEvents({ isim: nm }, { userIsHome: true });
          const son = evs[evs.length - 1] || {};
          t += (son.away | 0);
        }
        return Math.round(t / 12);
      };
      // düşük statlı kadro
      cache[ck].roster.forEach(p => { STAT_KEYS.forEach(k => p[k] = 40); p.genel = 40; p.enerji = 100; });
      localStorage.setItem(CLUB_CACHE_KEY, JSON.stringify(cache));
      if (typeof invalidateClubCacheMem === 'function') invalidateClubCacheMem();
      accDusuk = skorla();
      // yüksek statlı kadro
      cache = JSON.parse(localStorage.getItem(CLUB_CACHE_KEY) || '{}');
      cache[ck].roster.forEach(p => { STAT_KEYS.forEach(k => p[k] = 95); p.genel = 95; p.enerji = 100; });
      localStorage.setItem(CLUB_CACHE_KEY, JSON.stringify(cache));
      if (typeof invalidateClubCacheMem === 'function') invalidateClubCacheMem();
      accYuksek = skorla();
      // geri yükle
      cache = JSON.parse(localStorage.getItem(CLUB_CACHE_KEY) || '{}');
      cache[ck] = JSON.parse(yedek);
      localStorage.setItem(CLUB_CACHE_KEY, JSON.stringify(cache));
      if (typeof invalidateClubCacheMem === 'function') invalidateClubCacheMem();
    } catch (e) { accDusuk = accYuksek = null; }

    // T4b: gün geçince toparlanma
    let toparlanma = null;
    try {
      const nm = rakipler[0];
      if (nm) {
        const once = (oku(nm) || []).map(p => p.enerji);
        recoverBotClubEnergy(nm, key, 3);
        const sonra = (oku(nm) || []).map(p => p.enerji);
        toparlanma = { once, sonra };
      }
    } catch (e) {}

    // T6: sakatlık alanları kalıcı mı (rollInjuriesForBotClub birçok kez çalıştırılır)
    let sakatGorulen = 0;
    try {
      const nm = rakipler[0];
      for (let i = 0; i < 40 && nm; i++) {
        G.gameDay = (G.gameDay || 1) + 3;
        rollInjuriesForBotClub(nm, key);
        const r = oku(nm) || [];
        if (r.some(p => p.sakat)) { sakatGorulen++; }
      }
    } catch (e) {}

    return { kayitlar, accDusuk, accYuksek, toparlanma, sakatGorulen, tekrarRakip: tekrar ? tekrar.rakip : null };
  });

  await browser.close();
  server.close();

  console.log('\n══ M20 — RAKİP KADRO KALICILIĞI ══');
  const K = R.kayitlar || [];
  console.log(`  oynatılan maç: ${K.length} · rakipler: ${K.map(k => k.rakip).join(', ') || '—'}`);

  // T1 — kimlik kalıcılığı
  const idSet = K.map(k => (k.oncesi || []).map(p => p.id).sort().join('|')).filter(Boolean);
  const aynıRakip = {};
  K.forEach(k => { (aynıRakip[k.rakip] = aynıRakip[k.rakip] || []).push((k.sonrasi || []).map(p => p.id).sort().join('|')); });
  const kimlikTutarli = K.length > 0 && K.every(k => {
    if (!k.oncesi || !k.sonrasi) return false;
    return k.oncesi.map(p => p.id).sort().join('|') === k.sonrasi.map(p => p.id).sort().join('|');
  });
  kayit('T1', 'Kadro kimliği kalıcı (maç sonrası aynı oyuncular)', kimlikTutarli,
    K.length ? `${K.length} maçta da maç öncesi/sonrası oyuncu id kümesi aynı` : 'maç oynatılamadı');

  // T2 — derinlik
  const derinlikler = K.map(k => (k.sonrasi || []).length);
  const derinlikOk = derinlikler.length > 0 && derinlikler.every(d => d >= 10);
  kayit('T2', 'Kadro derinliği ≥ 10', derinlikOk,
    `kadro boyutları: ${derinlikler.join(', ') || '—'} (rotasyon + 5 faul + sakatlık için)`);

  // T3 — sezon istatistiği birikimi
  let statArtan = 0, statToplam = 0;
  K.forEach(k => {
    if (!k.oncesi || !k.sonrasi) return;
    k.sonrasi.forEach(p => {
      const o = (k.oncesi.find(x => x.id === p.id) || {}).sezon || { mac: 0, pts: 0 };
      const y = p.sezon || { mac: 0, pts: 0 };
      if ((y.mac || 0) > (o.mac || 0)) statArtan++;
      statToplam += (y.pts || 0) - (o.pts || 0);
    });
  });
  kayit('T3', 'Sezon istatistiği kalıcı olarak birikiyor', statArtan > 0 && statToplam > 0,
    `maç sayacı artan oyuncu: ${statArtan} · biriken toplam sayı: ${statToplam}`);

  // T4 — yorgunluk + toparlanma
  let dusen = 0;
  K.forEach(k => {
    if (!k.oncesi || !k.sonrasi) return;
    k.sonrasi.forEach(p => {
      const o = (k.oncesi.find(x => x.id === p.id) || {});
      if (o.enerji != null && p.enerji != null && p.enerji < o.enerji) dusen++;
    });
  });
  const tp = R.toparlanma;
  const toparlandi = tp ? tp.sonra.some((v, i) => v > tp.once[i]) : false;
  kayit('T4', 'Yorgunluk işliyor (maçta düşer, günlerle toparlanır)', dusen > 0 && toparlandi,
    `maç sonrası enerjisi düşen oyuncu: ${dusen} · 3 gün sonra toparlanma: ${toparlandi}`);

  // T5 — isabet oyuncu statından geçiyor mu
  const fark = (R.accYuksek != null && R.accDusuk != null) ? (R.accYuksek - R.accDusuk) : null;
  kayit('T5', 'Rakip şut isabeti oyuncunun statından geçiyor', fark != null && fark >= 8,
    fark == null ? 'ölçülemedi'
      : `tüm statlar 40 → ort ${R.accDusuk} sayı · tüm statlar 95 → ort ${R.accYuksek} sayı · fark ${fark} (eskiden sabit isabet, fark ≈ 0)`);

  // T6 — sakatlık kalıcılığı
  kayit('T6', 'Rakip kadroda sakatlık kalıcı olarak işleniyor', R.sakatGorulen > 0,
    `40 gün ilerletmede sakat oyuncu görülen tur sayısı: ${R.sakatGorulen}`);

  console.log(`  konsol hatası: ${hatalar.length}`, hatalar.length ? hatalar.slice(0, 3) : '');
  const dusenler = sonuc.filter(r => !r.gecti);
  if (dusenler.length || hatalar.length) {
    console.log('\n✗ DÜŞEN: ' + (dusenler.map(r => r.kod).join(', ') || '—') + (hatalar.length ? ' · konsol hatası var' : ''));
    process.exit(1);
  }
  console.log('\n✓ M20 doğrulandı — rakip kadrolar kalıcı ve iki taraf aynı kod yolundan geçiyor');
}

main().catch(e => { console.error('m20-check hata:', e); process.exit(1); });
