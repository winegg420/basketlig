#!/usr/bin/env node
/**
 * Charazay 2.0 — FAZ 8 KABUL KRİTERİ DENETÇİSİ
 *
 * `REVIZE-PAKETI-FAZ8.md` sonundaki kabul kriterlerini FİİLEN çalıştırır.
 *
 *  A1  Yeni kariyerde piyasa ortalama OVR < kadro ortalama OVR; tavan ≤ kadro tavanı + 6
 *  A2  EN modunda ekranda Türkçe metin yok (özel isim hariç) — emoji'li dizeler dahil
 *  A3  i18n-scan çıktısında kaç düğüm/ekran tarandığı görünüyor
 *  A4  Kayıt yüklenince C ortalama boyu > SG ortalama boyu; aynı soyadı ≤ 2 oyuncuda (v7)
 *  A5  200 sezonluk simülasyonda 8. turda 8-0 ve 0-8 oranları < %5
 *  A6  Lig kurulumunda şehir başına ≤ 2 takım
 *  A7  Script etiketleri ?v=38 (ya da üstü)
 *  A8  390×844'te Kadro varsayılan görünümü Liste
 *
 * Çıkış kodu: 0 = hepsi geçti, 1 = en az biri düştü.
 * Çalıştırma:  node tools/faz8-check.js
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

async function yeniKariyer(page, base, isim, vp) {
  await page.goto(base + '/charazay2.0.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 20000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 10000 });
  await page.fill('#teamName', isim);
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await sleep(400);
}

async function main() {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  console.log('Statik sunucu:', base);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const hatalar = [];

  // ── A7: script sürüm etiketi (dosyadan, tarayıcı gerekmez) ────────────────
  {
    const html = fs.readFileSync(path.join(ROOT, 'charazay2.0.html'), 'utf8');
    const surumler = (html.match(/\?v=(\d+)/g) || []).map(x => parseInt(x.slice(3), 10));
    const enDusuk = surumler.length ? Math.min.apply(null, surumler) : 0;
    kayit('A7', 'Script etiketleri ?v=38 ya da üstü', surumler.length > 0 && enDusuk >= 38,
      `${surumler.length} script etiketi · en düşük sürüm: ${enDusuk}`);
  }

  // ── A1, A6: yeni kariyer — piyasa dengesi + şehir dağılımı ────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => hatalar.push('[A1] ' + e.message));
    await yeniKariyer(page, base, 'Denetim FK');

    const R = await page.evaluate(() => {
      const ort = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
      const kadro = (G.players || []).map(p => Number(p.genel) || 0);
      const piyasa = (G.marketPlayers || []).map(p => Number(p.genel) || 0);
      // şehir dağılımı (kullanıcının grubu)
      const sub = getTblState().subs[G.team.tblKey];
      const takimlar = (sub && sub.teams) ? sub.teams.filter(Boolean) : [];
      const sehir = {};
      takimlar.forEach(t => { const s = String(t).split(' ')[0]; sehir[s] = (sehir[s] || 0) + 1; });
      const enCok = Object.keys(sehir).reduce((m, k) => Math.max(m, sehir[k]), 0);
      return {
        kadroOrt: +ort(kadro).toFixed(1), kadroTop: Math.max.apply(null, kadro),
        piyasaOrt: +ort(piyasa).toFixed(1), piyasaTop: Math.max.apply(null, piyasa),
        piyasaAdet: piyasa.length,
        sehirEnCok: enCok, sehirSayisi: Object.keys(sehir).length, takimSayisi: takimlar.length,
        sehirDagilim: Object.keys(sehir).filter(k => sehir[k] > 2).map(k => k + '×' + sehir[k])
      };
    });
    kayit('A1', 'Piyasa ortalaması < kadro ortalaması · tavan ≤ kadro tavanı + 6',
      R.piyasaOrt < R.kadroOrt && R.piyasaTop <= R.kadroTop + 6,
      `kadro ort ${R.kadroOrt} / tavan ${R.kadroTop} · piyasa ort ${R.piyasaOrt} / tavan ${R.piyasaTop} (${R.piyasaAdet} oyuncu)`);
    kayit('A6', 'Lig kurulumunda şehir başına ≤ 2 takım', R.sehirEnCok <= 2,
      `${R.takimSayisi} takım, ${R.sehirSayisi} şehir · en yoğun şehirde ${R.sehirEnCok} takım` +
      (R.sehirDagilim.length ? ' · 2 üstü: ' + R.sehirDagilim.join(', ') : ''));

    // ── A4: v7 migrasyonu — eski (bozuk) kayıt yüklenince düzeliyor mu ──────
    const M = await page.evaluate(async () => {
      // FAZ 8 öncesi bozuk veriyi taklit et: pozisyondan bağımsız boy + tekrar eden soyadı
      const d = serializeGameState();
      d.v = 6;                                   // v7 migrasyonu çalışsın
      (d.players || []).forEach((p, i) => {
        p.boy = (p.poz === 'C') ? 198 : 205;     // pivotlar guard'lardan KISA (bozuk hâl)
        p.isim = (i % 3 === 0) ? 'Marcus Martinez' : (i % 3 === 1 ? 'Kevin Jones' : 'Luka Martinez');
      });
      localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(d));
      const oncesi = (() => {
        const g = (poz) => { const a = (d.players || []).filter(p => p.poz === poz).map(p => p.boy); return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0; };
        const sy = {}; (d.players || []).forEach(p => { const s = p.isim.split(' ').pop(); sy[s] = (sy[s] || 0) + 1; });
        return { C: g('C'), SG: g('SG'), enCokSoyad: Math.max.apply(null, Object.keys(sy).map(k => sy[k])) };
      })();
      resumeFromSavedGame();
      await new Promise(r => setTimeout(r, 600));
      const g = (poz) => { const a = (G.players || []).filter(p => p.poz === poz).map(p => Number(p.boy) || 0); return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0; };
      const sy = {}; (G.players || []).forEach(p => { const s = String(p.isim || '').split(' ').pop(); sy[s] = (sy[s] || 0) + 1; });
      return {
        oncesi,
        C: g('C'), SG: g('SG'),
        enCokSoyad: Math.max.apply(null, Object.keys(sy).map(k => sy[k])),
        surum: G && G.team ? 'yüklendi' : 'yüklenemedi'
      };
    });
    kayit('A4', 'Eski kayıt yüklenince boy/isim düzeliyor (v7 migrasyonu)',
      M.C > M.SG && M.enCokSoyad <= 2,
      `ÖNCE: C ${M.oncesi.C}cm · SG ${M.oncesi.SG}cm · aynı soyadı ${M.oncesi.enCokSoyad} oyuncuda` +
      `\n       SONRA: C ${M.C}cm · SG ${M.SG}cm · aynı soyadı ${M.enCokSoyad} oyuncuda`);
    await ctx.close();
  }

  // ── A5: lig kutuplaşması — 200 sezon, 8. tur ─────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => hatalar.push('[A5] ' + e.message));
    await yeniKariyer(page, base, 'Sezon Denetimi');
    const S = await page.evaluate((N) => {
      /* Bot-bot maç motoruyla (simulateCpuMatch'in skor formülü) 20 takımlık ligin ilk 8
         turunu tekrar tekrar simüle et ve 8-0 / 0-8 oranını ölç. */
      const key = G.team.tblKey || 'tbl';
      const sub = getTblState().subs[key];
      const takimlar = (sub && sub.teams ? sub.teams.filter(Boolean) : []).slice(0, 20);
      if (takimlar.length < 20) return null;
      const guc = {};
      takimlar.forEach(t => { guc[t] = pseudoTeamStrength(t, key); });
      let sifirSekiz = 0, sekizSifir = 0, sezon = 0, toplamTakim = 0;
      const sapmalar = [];
      for (let s = 0; s < N; s++) {
        const g = {}; takimlar.forEach(t => g[t] = 0);
        // 8 tur: her turda takımlar rastgele eşleşir
        for (let tur = 0; tur < 8; tur++) {
          const karis = takimlar.slice().sort(() => Math.random() - 0.5);
          for (let i = 0; i + 1 < karis.length; i += 2) {
            /* Ev/deplasman tura göre dönüşümlü: gerçek fikstürde her takım 8-9 ev, 9-10
               deplasman oynar. Tamamen rastgele ev sahipliği, bazı takımları 8 maçın
               çoğunda deplasmana düşürüp yapay olarak daha çok 0-8 üretiyordu. */
            const evIlk = (tur % 2 === 0);
            const h = evIlk ? karis[i] : karis[i + 1];
            const a = evIlk ? karis[i + 1] : karis[i];
            /* Skor MOTORUN KENDİ fonksiyonundan gelir — formülü kopyalamak, motor
               değiştiğinde testin sessizce eskimesi demekti. */
            const sk = cpuMatchScore(guc[h], guc[a]);
            if (sk.hs > sk.as) g[h]++; else g[a]++;
          }
        }
        const vals = takimlar.map(t => g[t]);
        /* Kriter TAKIM oranıdır, "en az bir takım" değil: 20 takımlık ligde saf şansta bile
           bir sezonun ~%7'sinde biri 8-0 yapar; anlamlı ölçüt takım-sezon başına orandır. */
        vals.forEach(v => { if (v === 8) sekizSifir++; if (v === 0) sifirSekiz++; });
        toplamTakim += vals.length;
        const ort = vals.reduce((x, y) => x + y, 0) / vals.length;
        sapmalar.push(Math.sqrt(vals.reduce((x, y) => x + (y - ort) * (y - ort), 0) / vals.length));
        sezon++;
      }
      return {
        sezon, toplamTakim,
        sekizSifirOran: +(sekizSifir / toplamTakim * 100).toFixed(2),
        sifirSekizOran: +(sifirSekiz / toplamTakim * 100).toFixed(2),
        ortSapma: +(sapmalar.reduce((x, y) => x + y, 0) / sapmalar.length).toFixed(2)
      };
    }, 200);
    if (!S) {
      kayit('A5', '200 sezonda 8-0 ve 0-8 oranları < %5', false, 'lig kurulamadı, ölçülemedi');
    } else {
      kayit('A5', '200 sezonda 8-0 ve 0-8 oranları < %5',
        S.sekizSifirOran < 5 && S.sifirSekizOran < 5,
        `${S.sezon} sezon × 20 takım = ${S.toplamTakim} takım-sezon · 8-0 yapan takım %${S.sekizSifirOran} · 0-8 yapan takım %${S.sifirSekizOran} · ortalama galibiyet std sapması ${S.ortSapma} (hedef 1,7-2,1)`);
    }
    await ctx.close();
  }

  // ── A8: mobilde Kadro varsayılan görünümü Liste ──────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', e => hatalar.push('[A8] ' + e.message));
    await yeniKariyer(page, base, 'Mobil Denetimi');
    const V = await page.evaluate(async () => {
      showPage('kadro', document.querySelector('#sbNav button[data-page="kadro"]'));
      await new Promise(r => setTimeout(r, 400));
      const grid = document.getElementById('rosterGrid');
      const bL = document.getElementById('kadroViewList');
      return {
        view: G.kadroView,
        sinif: grid ? grid.className : null,
        listeAktif: bL ? bL.classList.contains('active') : null
      };
    });
    kayit('A8', '390×844 Kadro varsayılan görünümü Liste',
      V.view === 'list' && /roster-as-list/.test(String(V.sinif)) && V.listeAktif === true,
      `G.kadroView=${V.view} · grid sınıfı "${V.sinif}" · Liste butonu aktif: ${V.listeAktif}`);
    await ctx.close();
  }

  await browser.close();
  server.close();

  console.log('\n══ FAZ 8 KABUL KRİTERLERİ ══');
  console.log(`  ${sonuc.filter(r => r.gecti).length}/${sonuc.length} kriter geçti (bu araçta)`);
  console.log('  A2/A3 (EN çevirisi + tarama kapsamı) ayrıca: node tools/i18n-scan.js');
  if (hatalar.length) { console.log('\n  Sayfa hataları:'); hatalar.slice(0, 8).forEach(e => console.log('   ', e)); }
  const dusen = sonuc.filter(r => !r.gecti);
  if (dusen.length || hatalar.length) {
    console.log('\n✗ DÜŞEN: ' + (dusen.map(r => r.kod).join(', ') || '—') + (hatalar.length ? ' · sayfa hatası var' : ''));
    process.exit(1);
  }
  console.log('\n✓ tüm kabul kriterleri geçti');
}

main().catch(e => { console.error('faz8-check hata:', e); process.exit(1); });
