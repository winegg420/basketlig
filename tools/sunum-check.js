#!/usr/bin/env node
/**
 * Charazay 2.0 — CANLI SUNUM DAVRANIŞ DENETÇİSİ (M9 / M12 / M14)
 *
 * `REVIZE-PAKETI.md` içindeki üç sunum maddesinin FİİLEN çalıştığını sınar. Bu maddeler
 * maç sonucunu değiştirmediği için `band.js`/`box-band.js` onları göremez; davranış
 * yalnız canlı sahnede gözlenebilir.
 *
 *  M9   Ribaund sonrası ÇIKIŞ (outlet) pası — uzun (PF/C) topu alınca guard'a çıkarmalı,
 *       pivot topu tek başına karşı sahaya sürmemeli.
 *  M12  AND-1'de ek serbest atış canlandırılmalı — şutör çizgiye gidip atış yapmalı
 *       (eskiden tabela 3 artarken çizgide kimse yoktu).
 *  M14  Hücum ribaundunda şut saati 14'e dönmeli (24'e değil) ve gösterge boşalmamalı.
 *
 * Çıkış kodu: 0 = hepsi geçti, 1 = en az biri düştü (ya da hiç örnek toplanamadı).
 * Çalıştırma:  node tools/sunum-check.js [--ms=240000] [--rate=2]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const WATCH_MS = parseInt(arg('ms', '240000'), 10);
const RATE = parseFloat(arg('rate', '2'));

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
  console.log('Statik sunucu:', base, '· izleme', WATCH_MS + 'ms · hız', RATE + '×');

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
  await page.fill('#teamName', 'Sunum Denetimi');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await sleep(400);

  // Sahneyi her karede örnekle: top taşıyıcısının rolü, şut saati durumu, FT dizilişi.
  await page.evaluate((r) => { try { setMatchRate(r); } catch (e) {} }, RATE);
  await page.evaluate(() => {
    showPage('mac', document.querySelector('#sbNav button[data-page="mac"]'));
    startMatch();
  });
  await page.evaluate(() => {
    /* M12'yi kesin ölçmek için ek atış sahnesini kuran fonksiyonu sarmala: kaç kez
       çağrıldığı tahmine değil sayaca dayansın. */
    try{
      if(typeof _and1Sequence==='function'){
        const _o=_and1Sequence;
        window.__and1Calls=0;
        _and1Sequence=function(){ window.__and1Calls++; return _o.apply(this,arguments); };
      }
    }catch(e){}
    const P = window.__SUNUM = {
      tasiyiciDizi: [],      // {t, role} — taşıyıcı DEĞİŞTİKÇE kaydedilir
      rebAnlari: [],         // {t, rebOff, scLimit} — 'reb' olayı işlendiği an
      and1Olaylari: [],      // {t, sid} — and-1 taşıyan şut olayı
      and1Sahne: [],         // {t, ftDizilis, topSutorde, sutorCizgide}
      scOrnek: [],           // {t, limit, metin}
      sutAnlari: [],         // {t, pb} — şutlu pozisyonun canlandırılmaya başladığı an
      digerAnlar: [],        // {t, tip} — araya giren şutsuz olaylar
      outletKarar: [],       // {t, tasiyiciRol, pb, outlet, pgRol} — motorun kararı
      ftAtis: [],            // {t, yerinde, ortM, enUzakM, hiz} — F14-7: serbest atış anı
      ftSon: 0, sonMod: null,
      sonEvIx: -1
    };
    const rol = () => {
      try {
        const S = mState._sim, b = S && S.ball;
        const c = b ? (b.carrier || (b.mode === 'pass' ? b.target : null)) : null;
        return c && c.role != null ? c.role : null;
      } catch (e) { return null; }
    };
    let sonRol = null;
    const step = () => {
      const t = performance.now();
      // 1) taşıyıcı rol zinciri (M9: 3/4 → 0/1 geçişi = outlet pası)
      const r = rol();
      if (r !== null && r !== sonRol) { sonRol = r; P.tasiyiciDizi.push({ t, role: r }); }
      // 1b) motorun outlet kararı (her yeni şutlu pozisyonda bir kez damgalanır)
      try {
        const d = mState._sim && mState._sim._dbgOutlet;
        if (d) {
          const son = P.outletKarar[P.outletKarar.length - 1];
          if (!son || son.tasiyiciRol !== d.tasiyiciRol || son.outlet !== d.outlet || son.pgRol !== d.pgRol || t - son.t > 1500) {
            P.outletKarar.push({ t, tasiyiciRol: d.tasiyiciRol, pb: d.pb, outlet: d.outlet, pgRol: d.pgRol });
          }
        }
      } catch (e) {}
      // 2) şut saati göstergesi (M14)
      try {
        const el = document.getElementById('liveShotClock');
        if (el) P.scOrnek.push({ t, limit: mState._scLimit || null, metin: el.textContent || '' });
      } catch (e) {}
      // 3) yeni işlenen olayları damgala
      try {
        const ix = mState.idx - 1;
        if (ix > P.sonEvIx) {
          for (let k = P.sonEvIx + 1; k <= ix; k++) {
            const ev = mState.events[k];
            if (!ev) continue;
            if (ev.type === 'reb') P.rebAnlari.push({ t, rebOff: !!ev.rebOff, scLimit: mState._scLimit || null, putbackSonra: false });
            /* İkinci şans şutu: top zaten potanın dibinde, çıkış pası olmaz — son ribaundu işaretle. */
            if (ev.shot && ev.shot.pb && P.rebAnlari.length) P.rebAnlari[P.rebAnlari.length - 1].putbackSonra = true;
            if (ev.shot && ev.shot.and1) P.and1Olaylari.push({ t, sid: ev.shot.sid, made: !!ev.shot.and1.made });
            if (ev.shot) P.sutAnlari.push({ t, pb: !!ev.shot.pb });
            if (ev.type && ev.type !== 'reb' && !ev.shot) P.digerAnlar.push({ t, tip: ev.type });
          }
          P.sonEvIx = ix;
        }
      } catch (e) {}
      // 4) AND-1 sahnesi: serbest atış dizilişi kuruldu mu, top şutörde mi (M12)
      try {
        if (P.and1Olaylari.length) {
          const son = P.and1Olaylari[P.and1Olaylari.length - 1];
          if (t - son.t < 4000) {
            const S = mState._sim;
            const sh = S && S.shooter;
            const b = S && S.ball;
            const line = (typeof FT_LINE_X !== 'undefined' && S) ? _pt([FT_LINE_X, 250], S.offSide, false) : null;
            const cizgide = (sh && line) ? (Math.hypot(sh.x - line[0], sh.y - line[1]) < 70) : false;
            P.and1Sahne.push({
              t, dt: Math.round(t - son.t),
              defTrack: S ? !!S.defTrack : null,
              topSutorde: !!(b && sh && b.carrier === sh),
              sutorCizgide: cizgide
            });
          }
        }
      } catch (e) {}
      /* 5) F14-7: SERBEST ATIŞ, oyuncular yerleşmeden atılıyor muydu?
         Ölçüm anı, topun şutörün elinden çıktığı ilk karedir (hold → shot geçişi, ölü top
         dizilişinde). Bir seride 2.-3. atışta herkes zaten oturmuş olur; yalnız serinin
         İLK atışı ölçülür (önceki atıştan 2,5 sn'den uzun boşluk). */
      try {
        const S = mState._sim, b = S && S.ball, sh = S && S.shooter;
        const line = (typeof FT_LINE_X !== 'undefined' && S) ? _pt([FT_LINE_X, 250], S.offSide, false) : null;
        /* Ölçüm anı GERÇEKTEN serbest atış olmalı: "ölü top + şutör çizgiye yakın" ölçütü
           tek başına yetmiyordu — GEÇİŞTE serbest atış çizgisi civarından atılan normal
           orta mesafe şutu da bu koşulu sağlıyor ve koşan oyuncular "yerleşmemiş" diye
           sayılıyordu (5-6 m'lik aykırı değerler bundandı). Canlandırılan olayın kendisi
           serbest atış (ya da and-1) olmalı. */
        const _ev = (typeof mState !== 'undefined' && mState && mState.events) ? mState.events[Math.max(0, mState.idx - 1)] : null;
        const ftOlay = !!(_ev && (_ev.type === 'free' || (_ev.shot && _ev.shot.and1)));
        const ftSahne = !!(ftOlay && S && !S.defTrack && sh && line && Math.hypot(sh.x - line[0], sh.y - line[1]) < 70);
        const mod = b ? b.mode : null;
        if (ftSahne && P.sonMod === 'held' && mod === 'shot') {
          if (!P.ftSon || t - P.ftSon > 2500) {
            const hepsi = (S.offP || []).concat(S.defP || []).filter(p => p && !p._oob);
            const d = hepsi.map(p => Math.hypot(p.x - p.tx, p.y - p.ty));
            const v = hepsi.map(p => Math.hypot(p.vx || 0, p.vy || 0));
            if (hepsi.length) P.ftAtis.push({
              t, n: hepsi.length,
              yerinde: d.filter(x => x <= 8.86).length,             /* 0,30 m = 8,86 px */
              ortM: d.reduce((a, c) => a + c, 0) / d.length / 29.5429,
              enUzakM: Math.max.apply(null, d) / 29.5429,
              hiz: v.reduce((a, c) => a + c, 0) / v.length,
            });
          }
          P.ftSon = t;
        }
        P.sonMod = mod;
      } catch (e) {}
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  await sleep(WATCH_MS);

  const R = await page.evaluate(() => {
    const P = window.__SUNUM;
    // M9: ribaund anından sonraki 3,5 sn içinde uzun(3/4) → guard(0/1) taşıyıcı geçişi
    let outletVar = 0, uzunAldi = 0, atlanan = 0;
    P.rebAnlari.forEach(rb => {
      if (rb.putbackSonra) { atlanan++; return; }   // ikinci şans — outlet tasarımca yok
      /* Ribaunddan SONRAKİ ilk şutlu pozisyon bulunur. Araya şutsuz bir olay (top kaybı,
         faul, taktik) girerse hücum hiç kurulmaz ve outlet beklenmez — o vaka sayılmaz. */
      const sut = P.sutAnlari.find(x => x.t > rb.t);
      const araya = P.digerAnlar.find(x => x.t > rb.t && (!sut || x.t < sut.t));
      if (!sut || araya) { atlanan++; return; }
      if (sut.pb) { atlanan++; return; }             // ikinci şans
      /* B-2 ÖLÇÜ DÜZELTMESİ. Eski hâli iki yerde yanılıyordu ve M9'u haksız yere düşürüyordu
         (motorun kendi damgası çıkış pasının hedefini %100 guard gösterirken araç %71 diyordu):
           1) Pencere şutun 3 sn SONRASINA kadar uzanıyordu; o aralıkta gelen NORMAL POST
              GİRİŞİ (topun set hücumda pivota girmesi) "uzun topu aldı" sayılıyor, arkasından
              guard'a dönmediği için ÇIKIŞ PASI KAÇTI diye işaretleniyordu. Oysa post girişi
              basketbolun kendisidir, çıkış pasıyla ilgisi yoktur.
           2) "Sonraki taşıyıcılardan HERHANGİ BİRİ guard" ölçütü gevşekti; uzun topu kanada
              verip kanat guard'a verse de geçiyordu.
         Yeni ölçüt dar ve sıkı: ribaunddan sonraki 2 sn içinde topu uzun aldıysa, BİR SONRAKİ
         taşıyıcı guard olmalı. */
      const pencere = P.tasiyiciDizi.filter(x => x.t >= rb.t - 400 && x.t <= sut.t + 3000);
      const uzunIx = pencere.findIndex(x => (x.role === 3 || x.role === 4) && x.t <= rb.t + 2000);
      if (uzunIx < 0) { atlanan++; return; }         // ribaundu guard aldı — outlet gerekmiyor
      uzunAldi++;
      const sonraki = pencere[uzunIx + 1];
      if (sonraki && (sonraki.role === 0 || sonraki.role === 1)) outletVar++;
    });
    // M12: and-1 olaylarının kaçında serbest atış sahnesi kuruldu
    let and1Sahneli = 0;
    P.and1Olaylari.forEach(a => {
      const kareler = P.and1Sahne.filter(x => Math.abs(x.t - a.t) < 4000);
      if (kareler.some(x => x.sutorCizgide && x.topSutorde)) and1Sahneli++;
    });
    // M14: hücum ribaundunda limit 14 mü; gösterge boş kaldı mı
    const hucumReb = P.rebAnlari.filter(r => r.rebOff);
    const hucumReb14 = hucumReb.filter(r => r.scLimit === 14).length;
    const bosGosterge = P.scOrnek.filter(x => !x.metin).length;
    return {
      and1Cagri: window.__and1Calls || 0,
      /* Motorun kararı: taşıyıcı uzunken (3/4) ve ikinci şans değilken outlet kurulmalı. */
      kararUzun: P.outletKarar.filter(x => !x.pb && (x.tasiyiciRol === 3 || x.tasiyiciRol === 4)).length,
      kararUzunOutlet: P.outletKarar.filter(x => !x.pb && (x.tasiyiciRol === 3 || x.tasiyiciRol === 4) && x.outlet).length,
      /* B-2: çıkış pası KURULUYOR ama KİME? Hedef guard (0/1) değilse `sunum-check` M9
         ölçütü haklı olarak düşer — motorun niyeti ile sonucu ayrı ayrı görünmeli. */
      kararHedefGuard: P.outletKarar.filter(x => x.outlet && (x.pgRol === 0 || x.pgRol === 1)).length,
      kararHedefDagilim: (() => { const d = {}; P.outletKarar.filter(x => x.outlet).forEach(x => { d[x.pgRol] = (d[x.pgRol] || 0) + 1; }); return d; })(),
      kararOrnek: P.outletKarar.slice(0, 12),
      rebSayisi: P.rebAnlari.length, uzunAldi, outletVar, atlanan,
      and1Sayisi: P.and1Olaylari.length, and1Sahneli,
      hucumRebSayisi: hucumReb.length, hucumReb14,
      scOrnek: P.scOrnek.length, bosGosterge,
      tasiyiciDegisim: P.tasiyiciDizi.length,
      /* F14-7 */
      ftOrnek: P.ftAtis.length,
      ftYerinde: P.ftAtis.length ? P.ftAtis.reduce((a, c) => a + c.yerinde, 0) / P.ftAtis.length : null,
      ftOrtM: P.ftAtis.length ? P.ftAtis.reduce((a, c) => a + c.ortM, 0) / P.ftAtis.length : null,
      ftEnUzakM: P.ftAtis.length ? Math.max.apply(null, P.ftAtis.map(x => x.enUzakM)) : null,
      ftHiz: P.ftAtis.length ? P.ftAtis.reduce((a, c) => a + c.hiz, 0) / P.ftAtis.length : null,
    };
  });

  await browser.close();
  server.close();

  console.log('\n══ CANLI SUNUM DAVRANIŞ DENETİMİ ══');
  console.log(`  ribaund olayı: ${R.rebSayisi} (uzun aldı: ${R.uzunAldi}) · and-1: ${R.and1Sayisi} · hücum ribaundu: ${R.hucumRebSayisi}`);

  const sonuc = [];
  const kayit = (kod, ad, gecti, detay) => {
    sonuc.push({ kod, gecti });
    console.log(`  ${gecti ? '✓' : '✗'} ${kod}  ${ad}\n       ${detay}`);
  };

  console.log(`  motor kararı: taşıyıcı uzun olan pozisyon ${R.kararUzun}, outlet kurulan ${R.kararUzunOutlet} · outlet hedefi guard olan ${R.kararHedefGuard} · hedef rol dağılımı ${JSON.stringify(R.kararHedefDagilim)}`);
  // M9 — uzun ribaundu aldıysa topu guard'a çıkarmalı
  if (R.uzunAldi === 0) {
    kayit('M9', 'Ribaund sonrası çıkış (outlet) pası', false,
      'ÖRNEK YOK — bu pencerede uzun oyuncu hiç ribaund almadı; --ms değerini artır');
  } else {
    const oran = R.outletVar / R.uzunAldi;
    kayit('M9', 'Ribaund sonrası çıkış (outlet) pası', oran >= 0.8,
      `uzun ribaundu ${R.uzunAldi} kez aldı ve hücum kuruldu → ${R.outletVar} kez topu guard'a çıkardı (%${Math.round(oran * 100)}, hedef ≥ %80) · kapsam dışı vaka: ${R.atlanan}`);
  }

  // M12 — and-1'de ek atış sahnesi
  if (R.and1Sayisi === 0) {
    kayit('M12', 'AND-1 ek serbest atışı canlandırılıyor', false,
      'ÖRNEK YOK — bu pencerede hiç and-1 olmadı (olasılık %8,5); --ms değerini artır');
  } else {
    /* Kesin ölçüt: her and-1 için ek atış sahnesi KURULMUŞ olmalı (çağrı sayacı).
       Görsel doğrulama (şutör çizgide + top elinde) en az bir örnekte görülmeli — her
       karede yakalanması örnekleme hızına bağlı olduğu için tek tek şart koşulmaz. */
    kayit('M12', 'AND-1 ek serbest atışı canlandırılıyor',
      R.and1Cagri === R.and1Sayisi && R.and1Sahneli > 0,
      `${R.and1Sayisi} and-1 · ek atış sahnesi kurulan: ${R.and1Cagri} · şutör çizgide+top elinde görülen: ${R.and1Sahneli}`);
  }

  // M14 — hücum ribaundunda 14 + gösterge boşalmıyor
  const m14Limit = R.hucumRebSayisi === 0 ? null : (R.hucumReb14 === R.hucumRebSayisi);
  const gostergeTam = R.scOrnek > 0 && R.bosGosterge === 0;
  if (m14Limit === null) {
    kayit('M14', 'Hücum ribaundunda şut saati 14 · gösterge boşalmıyor', gostergeTam,
      `hücum ribaundu örneği yok (limit sınanamadı) · gösterge boş kare: ${R.bosGosterge}/${R.scOrnek}`);
  } else {
    kayit('M14', 'Hücum ribaundunda şut saati 14 · gösterge boşalmıyor', m14Limit && gostergeTam,
      `hücum ribaundu ${R.hucumRebSayisi}, saat 14'e döndü: ${R.hucumReb14} · gösterge boş kare: ${R.bosGosterge}/${R.scOrnek}`);
  }

  // F14-7 — serbest atış, on oyuncu da yerine oturduktan sonra atılmalı
  if (!R.ftOrnek) {
    kayit('F14-7', 'Serbest atışta oyuncular yerleşiyor', false,
      'ÖRNEK YOK — bu pencerede hiç serbest atış anı yakalanmadı; --ms değerini artır');
  } else {
    kayit('F14-7', 'Serbest atışta oyuncular yerleşiyor',
      R.ftYerinde >= 9 && R.ftHiz < 15,
      `${R.ftOrnek} seri · atış anında yerinde ${R.ftYerinde.toFixed(1)}/10 (hedef ≥ 9) · ` +
      `ortalama uzaklık ${R.ftOrtM.toFixed(2)} m · en uzak ${R.ftEnUzakM.toFixed(2)} m · ` +
      `jeton hızı ${R.ftHiz.toFixed(0)} px/sn (hedef < 15)`);
  }

  console.log(`  konsol hatası: ${hatalar.length}`, hatalar.length ? hatalar.slice(0, 3) : '');

  const dusen = sonuc.filter(r => !r.gecti);
  if (dusen.length || hatalar.length) {
    console.log('\n✗ DÜŞEN: ' + (dusen.map(r => r.kod).join(', ') || '—') + (hatalar.length ? ' · konsol hatası var' : ''));
    process.exit(1);
  }
  console.log('\n✓ tüm sunum maddeleri doğrulandı');
}

main().catch(e => { console.error('sunum-check hata:', e); process.exit(1); });
