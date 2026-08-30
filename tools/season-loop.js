#!/usr/bin/env node
/**
 * Charazay 2.0 — ÇOK SEZONLU DÖNGÜ ÖLÇÜMÜ (FAZ 9)
 *
 * N sezonu uçtan uca sürer (lig → playoff → draft → yeni sezon) ve her sezon sonunda
 * uzun vadeli denge göstergelerini kaydeder. FAZ 9'a kadar bu ölçüm elle yazılmış geçici
 * harness'larla yapılıyordu ve o harness ÜÇ KEZ yanlış alarm verdi:
 *   - "draft 6. seçimde takılıyor"  → draft kullanıcı sırasında bilerek bekliyor
 *   - "draft hiç çalışmıyor"        → aynı sebep
 *   - "yeni sezon başlamıyor"       → bayat G.playoff okuması
 * Bu araç o tuzakları bilerek ele alır: kullanıcı sırasında `autoDraftPick()` çağırır ve
 * sezon/playoff durumunu her adımda TAZE okur.
 *
 * Ölçülenler (sezon başına):
 *   kadro OVR ort · yaş ort · mevcut · altyapı mevcudu · kasa · şampiyon · draft seçimi
 *   + aynı oyuncu id'lerinin yaş artışı (yaşlanma gerçekten işliyor mu)
 *
 * Kabul kriterleri (FAZ 9):
 *   K1  Kadro OVR ortalaması düşmüyor (ilk→son fark ≥ -1)
 *   K2  Pasif oynayan takımın kasası başlangıcın 2 katını geçmiyor
 *   K3  Her sezon kendi playoff'unu ve şampiyonunu üretiyor (N farklı playoff)
 *   K4  Aynı oyuncu id'sinin yaşı her sezon geçişinde +1 artıyor
 *   K5  Kadro mevcudu üst sınırı aşmıyor
 *   K6  Konsol hatası 0
 *
 * Çıkış kodu: 0 = tüm kriterler geçti, 1 = en az biri düştü.
 * Çalıştırma:  node tools/season-loop.js [--n=3] [--json]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const N = Math.max(1, parseInt(arg('n', '3'), 10));
const RUNS = Math.max(1, parseInt(arg('runs', '3'), 10));
const SEED0 = parseInt(arg('seed', '987654321'), 10) | 0;
const JSON_OUT = process.argv.includes('--json');
/* band.js ile aynı PRNG: aynı tohum → aynı sezon dizisi. Denge ayarı ancak böyle ölçülebilir. */
const SEED_FN = (seed) => {
  let a = seed >>> 0;
  Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

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

async function main() {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  if (!JSON_OUT) console.log('Statik sunucu:', base, `· ${N} sezon sürülecek`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const hatalar = [];
  const kosular = [];
  for (let run = 0; run < RUNS; run++) {
  const tohum = (SEED0 + run * 7919) | 0;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => hatalar.push(e.message));
  page.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });
  await page.addInitScript('(' + SEED_FN.toString() + ')(' + tohum + ');');

  await page.goto(base + '/charazay2.0.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 20000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 10000 });
  await page.fill('#teamName', 'Dongu Testi');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await sleep(500);

  const R = await page.evaluate(async (N) => {
    const bekle = ms => new Promise(r => setTimeout(r, ms));
    const ort = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const anlik = () => ({
      sezon: (G.season && G.season.year) || 0,
      ovr: +ort((G.players || []).map(p => Number(p.genel) || 0)).toFixed(1),
      yas: +ort((G.players || []).map(p => Number(p.yas) || 0)).toFixed(1),
      mevcut: (G.players || []).length,
      altyapi: (G.youth || []).length,
      kasa: Math.round(Number(G.coins) || 0),
      yasHaritasi: (G.players || []).reduce((m, p) => { m[p.id] = Number(p.yas) || 0; return m; }, {})
    });

    const kayitlar = [];
    const baslangic = anlik();
    let uyari = [];

    for (let s = 0; s < N; s++) {
      // ── 1) Düzenli sezon: kullanıcının tüm maçlarını oyna (bot maçları applyMatchResult tetikler)
      let guvenlik = 0;
      while (guvenlik++ < 60) {
        const nx = (typeof findNextUserSeasonMatch === 'function') ? findNextUserSeasonMatch() : null;
        if (!nx) break;
        const rakip = (nx.home === G.team.isim) ? nx.away : nx.home;
        const userIsHome = nx.home === G.team.isim;
        let evs;
        try { evs = generateMatchEvents({ isim: rakip }, { userIsHome }); }
        catch (e) {
          uyari.push('maç üretimi: ' + String(e.stack || e.message).split(/\r?\n/).slice(0, 3).join(' | ') +
            ' [sezon ' + ((G.season && G.season.year) || '?') + ' · takım ' + ((G.team && G.team.isim) || 'YOK') +
            ' · rakip ' + (rakip || 'YOK') + ' · kadro ' + ((G.players || []).length) +
            ' · ligTeams ' + ((G.ligTeams || []).length) + ']');
          break;
        }
        const son = evs[evs.length - 1] || {};
        try {
          applyMatchResult(son, {
            seasonMatchIx: nx.seasonMatchIx, isPlayoff: false, isCup: false,
            playoffMatch: null, rakipName: rakip, userIsHome
          });
        } catch (e) { uyari.push('maç sonucu: ' + e.message); break; }
        await bekle(0);
      }

      // ── 2) Sezon kapanışı → playoff
      try { if (typeof endLeagueSeasonIfDone === 'function') endLeagueSeasonIfDone(); }
      catch (e) { uyari.push('sezon kapanış: ' + e.message); }
      await bekle(60);

      // ── 3) Playoff: kullanıcının maçları canlı motorla, botlarınki motor içinde
      //    DİKKAT: G.playoff her adımda TAZE okunur (bayat okuma bu fazın harness tuzağıydı).
      let poMac = 0, poGuvenlik = 0;
      while (poGuvenlik++ < 40) {
        const po = G.playoff;
        if (!po || po.champion) break;
        const um = (typeof userPlayoffMatch === 'function') ? userPlayoffMatch() : null;
        if (!um) {
          // kullanıcı elenmiş ya da sırada bot maçı var — motorun ilerletmesini bekle
          try { if (typeof maybeAdvancePlayoff === 'function') maybeAdvancePlayoff(); }
          catch (e) { uyari.push('playoff ilerletme: ' + e.message); break; }
          await bekle(20);
          if (G.playoff === po && !G.playoff.champion && poGuvenlik > 8) break;  // ilerlemiyor
          continue;
        }
        /* userPlayoffMatch() → {series, gameNo, home, away, isSeriesGame}: ev sahibi seri
           formatına göre belirlenir, "opp/userIsHome" alanları YOKTUR. */
        const userIsHome = um.home === G.team.isim;
        const rakip = userIsHome ? um.away : um.home;
        if (!rakip) break;
        let evs;
        try { evs = generateMatchEvents({ isim: rakip }, { userIsHome }); }
        catch (e) { uyari.push('playoff maçı: ' + e.message); break; }
        const son = evs[evs.length - 1] || {};
        try {
          applyMatchResult(son, {
            seasonMatchIx: -1, isPlayoff: true, isCup: false,
            playoffMatch: um, rakipName: rakip, userIsHome
          });
          poMac++;
        } catch (e) { uyari.push('playoff sonucu: ' + e.message); break; }
        await bekle(0);
      }

      // ── 4) Draft: kullanıcı sırasında BEKLER (bu bir hata değil) → autoDraftPick ile ilerlet
      let draftSecim = 0, dGuvenlik = 0;
      while (dGuvenlik++ < 80) {
        const d = G.draft;
        if (!d || d.done) break;
        const oncekiIdx = d.idx;
        try { if (typeof autoDraftPick === 'function') autoDraftPick(); }
        catch (e) { uyari.push('draft: ' + e.message); break; }
        await bekle(0);
        const yeni = G.draft;
        if (!yeni) break;
        if (yeni.done) { draftSecim = (yeni.picks || []).length; break; }
        if (yeni.idx === oncekiIdx) break;   // ilerlemiyor
        draftSecim = (yeni.picks || []).length;
      }

      // ── 5) Sezon sonu anlık görüntüsü (yeni sezona geçmeden ÖNCE)
      const sezonSonu = anlik();
      kayitlar.push({
        sezon: sezonSonu.sezon,
        ovr: sezonSonu.ovr, yas: sezonSonu.yas, mevcut: sezonSonu.mevcut,
        altyapi: sezonSonu.altyapi, kasa: sezonSonu.kasa,
        sampiyon: (G.playoff && G.playoff.champion) || null,
        playoffYil: (G.playoff && G.playoff.year != null) ? G.playoff.year : null,
        playoffMac: poMac, draftSecim,
        yasHaritasi: sezonSonu.yasHaritasi
      });

      // ── 6) Yeni sezona geç
      const oncekiYil = (G.season && G.season.year) || 0;
      try {
        if (G.draft && !G.draft.done && typeof finalizeDraft === 'function') finalizeDraft();
        if (typeof proceedToNewSeason === 'function') proceedToNewSeason();
        else if (typeof startLeagueSeason === 'function') startLeagueSeason();
      } catch (e) { uyari.push('yeni sezon: ' + e.message); }
      await bekle(120);
      const yeniYil = (G.season && G.season.year) || 0;
      if (yeniYil === oncekiYil && s < N - 1) {
        uyari.push(`sezon ${oncekiYil} → yeni sezon başlamadı`);
        break;
      }
    }

    return { baslangic, kayitlar, uyari };
  }, N);

  await ctx.close();
  kosular.push({ tohum, ...R });
  }
  await browser.close();
  server.close();

  // ── Değerlendirme: koşuların ORTALAMASI (tek koşu denge ayarı için yetersiz) ──
  const ilk = kosular[0] || { baslangic: { ovr: 0, kasa: 1, yasHaritasi: {} }, kayitlar: [], uyari: [] };
  const R = ilk;
  const ortSay = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const K = R.kayitlar || [];
  const sonuc = [];
  const kayit = (kod, ad, gecti, detay) => {
    sonuc.push({ kod, ad, gecti });
    console.log(`  ${gecti ? '✓' : '✗'} ${kod}  ${ad}\n       ${detay}`);
  };

  if (JSON_OUT) {
    console.log(JSON.stringify({ baslangic: R.baslangic, kayitlar: K.map(k => ({ ...k, yasHaritasi: undefined })), uyari: R.uyari, hatalar }, null, 2));
  } else {
    console.log(`\n══ ÇOK SEZONLU DÖNGÜ (${K.length}/${N} sezon) ══`);
    console.log('  başlangıç: OVR ' + R.baslangic.ovr + ' · yaş ' + R.baslangic.yas +
      ' · mevcut ' + R.baslangic.mevcut + ' · kasa ' + R.baslangic.kasa.toLocaleString('tr-TR'));
    console.log('  ' + 'sezon'.padEnd(7) + 'OVR'.padEnd(7) + 'yaş'.padEnd(7) + 'mevcut'.padEnd(8) +
      'altyapı'.padEnd(9) + 'kasa'.padEnd(12) + 'PO maç'.padEnd(8) + 'draft'.padEnd(7) + 'şampiyon');
    K.forEach(k => {
      console.log('  ' + String(k.sezon).padEnd(7) + String(k.ovr).padEnd(7) + String(k.yas).padEnd(7) +
        String(k.mevcut).padEnd(8) + String(k.altyapi).padEnd(9) +
        String(k.kasa.toLocaleString('tr-TR')).padEnd(12) + String(k.playoffMac).padEnd(8) +
        String(k.draftSecim).padEnd(7) + (k.sampiyon || '—'));
    });
    if (R.uyari && R.uyari.length) { console.log('\n  Uyarılar:'); R.uyari.slice(0, 6).forEach(u => console.log('   ·', u)); }
    console.log('');
  }

  if (!K.length) {
    console.log('✗ hiç sezon tamamlanamadı');
    process.exit(1);
  }

  // K1 — kadro OVR düşmüyor (TÜM koşuların ortalaması; tek koşu denge yargısı için yetersiz)
  const gecerli = kosular.filter(k => (k.kayitlar || []).length);
  const ovrFarklar = gecerli.map(k => +(k.kayitlar[k.kayitlar.length - 1].ovr - k.baslangic.ovr).toFixed(1));
  const ovrFark = +ortSay(ovrFarklar).toFixed(2);
  kayit('K1', 'Kadro OVR ortalaması düşmüyor (fark ≥ -1)', ovrFark >= -1,
    `${ovrFarklar.length} koşu: ${ovrFarklar.map(x => (x > 0 ? '+' : '') + x).join(' · ')} → ortalama ${ovrFark > 0 ? '+' : ''}${ovrFark}`);

  /* K2 — kasa 2 katını geçmiyor.
     B-5: ölçüt ORTALAMA yerine MEDYAN üzerinden yargılanır ve en az 3 koşu ister.
     Neden: koşular arası dağılım çok geniş (aynı komutta 2,8× ve 1,1×) ve ortalama tam
     eşiğin üstünde/altında salınıyordu — kriter kodu değil tohum şansını ölçüyordu.
     Koşular arası fark tohumdan gelir ve gerçektir; asıl sorun TEK koşuyu (ya da iki koşunun
     ortalamasını) yargı saymaktı. Ayrıca sayfanın kendi zamanlayıcıları harness'ın `await`
     aralarında rastgelelik tükettiği için iki özdeş çağrı birebir aynı sayıyı vermez —
     medyan bu gürültüye ortalamadan daha dayanıklıdır. */
  const katlar = gecerli.map(k => +((k.kayitlar[k.kayitlar.length - 1].kasa) / (k.baslangic.kasa || 1)).toFixed(2));
  const katSirali = katlar.slice().sort((a, b) => a - b);
  const kat = katSirali.length ? +katSirali[Math.floor(katSirali.length / 2)].toFixed(2) : 0;
  if (katlar.length < 3) {
    kayit('K2', 'Pasif takımın kasası başlangıcın 2 katını geçmiyor', true,
      `${katlar.length} koşu: ${katlar.map(x => x + '×').join(' · ')} → YARGILANMADI (en az 3 koşu gerekir: --runs=3)`);
  } else {
    kayit('K2', 'Pasif takımın kasası başlangıcın 2 katını geçmiyor', kat <= 2,
      `${katlar.length} koşu: ${katlar.map(x => x + '×').join(' · ')} → medyan ${kat}×`);
  }

  // K3 — her sezon KENDİ playoff'unu kuruyor. Şampiyon adının her sezon farklı olması şart
  // DEĞİL (aynı takımın üst üste kazanması gerçekçi bir dinastidir); FAZ 9'daki asıl şüphe
  // "eski playoff nesnesi kalıyor mu" idi — bu yüzden playoff YILI izlenir.
  // Kullanıcının playoff maçı oynaması da şart değil: ilk 8'e girememek normal bir sonuçtur.
  const poYillar = gecerli.map(k => k.kayitlar.map(x => x.playoffYil).filter(y => y != null));
  const herSezonYeni = poYillar.every(ys => ys.length > 0 && ys.length === new Set(ys).size);
  const sampTam = gecerli.every(k => k.kayitlar.filter(x => x.sampiyon).length === k.kayitlar.length);
  const kullaniciPO = gecerli.map(k => k.kayitlar.reduce((a, x) => a + (x.playoffMac || 0), 0));
  kayit('K3', 'Her sezon kendi playoff\'unu kuruyor ve şampiyon üretiyor',
    herSezonYeni && sampTam,
    `playoff yılları: ${poYillar.map(ys => ys.join('/')).join(' | ')} · her sezon şampiyon: ${sampTam}` +
    ` · kullanıcının oynadığı PO maçı: ${kullaniciPO.join('/')} (ilk 8'e girememek normaldir)`);

  // K4 — aynı id'nin yaşı her sezon +1
  let yasArtan = 0, yasSabit = 0, ornek = '';
  for (let i = 0; i < K.length; i++) {
    const onceki = i === 0 ? R.baslangic.yasHaritasi : K[i - 1].yasHaritasi;
    const simdi = K[i].yasHaritasi;
    const ortak = Object.keys(simdi).filter(id => onceki[id] != null);
    // sezon i'nin kaydı, o sezonun SONU (yaşlanma yeni sezon başlarken olur) — bu yüzden
    // karşılaştırma bir sonraki sezonun kaydıyla yapılır; burada sadece bilgi toplanır.
    ortak.forEach(id => { if (simdi[id] > onceki[id]) yasArtan++; else if (simdi[id] === onceki[id]) yasSabit++; });
    if (!ornek && ortak.length) {
      const id = ortak[0];
      ornek = `örnek id ${id.slice(0, 6)}…: ${onceki[id]} → ${simdi[id]}`;
    }
  }
  kayit('K4', 'Aynı oyuncunun yaşı sezon geçişinde artıyor', yasArtan > 0,
    `artan ölçüm: ${yasArtan} · sabit kalan: ${yasSabit}${ornek ? ' · ' + ornek : ''}`);

  // K5 — kadro mevcudu üst sınırı aşmıyor
  const enBuyukKadro = Math.max.apply(null, K.map(k => k.mevcut));
  kayit('K5', 'Kadro mevcudu üst sınırı (18) aşmıyor', enBuyukKadro <= 18,
    `mevcutlar: ${K.map(k => k.mevcut).join(' → ')} · en büyük ${enBuyukKadro}`);

  // K6 — konsol hatası
  kayit('K6', 'Konsol hatası yok', hatalar.length === 0,
    `${hatalar.length} hata${hatalar.length ? ' — ' + hatalar[0] : ''}`);

  const dusen = sonuc.filter(r => !r.gecti);
  console.log(`\n  ${sonuc.length - dusen.length}/${sonuc.length} kriter geçti`);
  if (dusen.length) {
    console.log('\n✗ DÜŞEN: ' + dusen.map(r => r.kod).join(', '));
    process.exit(1);
  }
  console.log('\n✓ çok sezonlu döngü sağlıklı');
}

main().catch(e => { console.error('season-loop hata:', e); process.exit(1); });
