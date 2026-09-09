#!/usr/bin/env node
/* ── DİKİŞ GÖRÜNTÜLEYİCİ ──────────────────────────────────────────────────────────────
   Canlı maçtan 0,25 saniyelik ARDIŞIK kareler çeker ve tek PNG'de şerit hâlinde dizer —
   yani "izlemeye" en yakın şey. Sabit aralıklı kontak sayfası (2 sn) hareketi göstermez;
   bir insanın "saçma" dediği şeylerin çoğu iki kare arasındadır.

   Öncelik KLİP DİKİŞİDİR: maç boyunca ~90 kez klip biter, fizik devralır, sonra yeni bir
   klip başlar ve oyuncular yeni klipteki rollere YENİDEN EŞLENİR. Bu geçiş
   `tools/anomali.js` gibi dağılım ölçen araçların üstünden ortalama aldığı, ama izleyenin
   kopukluk olarak gördüğü yerdir.

   ⚠ NEDEN GEREKLİ (FAZ 61): klip jetonlarını "gerçek NBA kaydı = kontrol grubu" saymak
   YANILTICIDIR. Klip, gerçek bir pozisyonun BİZİM maçımıza nakledilmiş hâlidir; konumlar
   gerçek, bağlam bizimdir. Yanlış oyuncuya / yanlış yöne / yanlış olayın ardına yapıştırılmış
   gerçek bir pozisyonun her karesi "gerçekçi" ölçülür ama izlerken saçmadır. Dikişi ölçmenin
   tek yolu ardışık kareleri SIRAYLA okumaktır.

   Kullanım: node tools/dikis-goruntu.js <etiket> [--secs=180] [--adim=0.25] [--seri=12]
             --secs  : izlenecek toplam süre
             --adim  : kareler arası saniye
             --seri  : bir şeritteki kare sayısı
   Çıktı:    olcum/goruntu/<etiket>-seri-N.png  (+ <etiket>-gunluk.txt)
   ──────────────────────────────────────────────────────────────────────────────────── */
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ET = process.argv[2] || 'dikis';
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? +a.split('=')[1] : d; };
const SECS = arg('secs', 180), ADIM = arg('adim', 0.25), SERI = arg('seri', 12);
const OUT = path.join(ROOT, 'olcum', 'goruntu');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'charazay2.0.html' : u);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const br = await chromium.launch({ channel: 'chrome', headless: true });
  const pg = await br.newPage({ viewport: { width: 1440, height: 900 } });
  pg.on('pageerror', e => console.log('  ! ' + e.message));
  await pg.addInitScript("try{localStorage.setItem('charazay_lang','tr');}catch(e){}");
  await pg.goto(`http://127.0.0.1:${port}/charazay2.0.html`, { waitUntil: 'domcontentloaded' });
  await pg.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await pg.click('#loginPage button.btn-p');
  await pg.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await pg.fill('#teamName', 'Dikis');
  await pg.click('#setupPage button.btn-p');
  await pg.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await pg.evaluate(() => { try { closeAppModal(); showPage('mac'); } catch (e) {} });
  await new Promise(r => setTimeout(r, 500));
  await pg.evaluate(() => { try { startMatch(); } catch (e) {} });

  const saha = await pg.$('#courtSvg');
  if (!saha) { console.log('saha bulunamadı'); await br.close(); srv.close(); return; }

  /* Her karede sahne durumunu da oku — şeridin üstüne etiket olarak yazılır. */
  const durum = () => pg.evaluate(() => {
    try {
      const S = mState && mState._sim; if (!S) return null;
      const b = S.ball, P = S.players || [];
      const klipN = P.filter(p => p._klip).length;
      const c = b.carrier;
      return {
        t: +(S.time || 0).toFixed(2),
        tip: S.curType || '-',
        idx: (mState.idx | 0),
        mod: b.mode,
        klip: klipN,                                   /* kaç jeton klip sürüyor (0 = fizik) */
        oam: (S.oam && S.oam.aktif) ? S.oam.faz : '-',
        tas: c ? ((c.team || '?') + '/' + ((c.pl && c.pl.poz) || '?')) : '-',
        ft: S._ftAktif ? 1 : 0, inb: S.inb ? 1 : 0, hk: (S._hakemTop && S._hakemTop.aktif) ? 1 : 0
      };
    } catch (e) { return null; }
  });

  const kareler = [], gunluk = [];
  const t0 = Date.now();
  let n = 0;
  while ((Date.now() - t0) / 1000 < SECS) {
    const d = await durum();
    const buf = await saha.screenshot();
    kareler.push({ buf, d });
    if (d) gunluk.push(`${String(n).padStart(4)}  t=${d.t}  ${d.tip}  idx=${d.idx}  mod=${d.mod}  klip=${d.klip}/10  oam=${d.oam}  tas=${d.tas}${d.ft ? '  FT' : ''}${d.inb ? '  INB' : ''}${d.hk ? '  HAKEM' : ''}`);
    n++;
    await new Promise(r => setTimeout(r, Math.max(0, ADIM * 1000 - 60)));
  }
  await pg.evaluate(() => { try { stopMatch(); } catch (e) {} });

  /* Şeritleri birleştir (tarayıcıda canvas ile — ek bağımlılık yok). */
  const sayfa = await br.newPage();
  for (let s = 0; s * SERI < kareler.length; s++) {
    const dilim = kareler.slice(s * SERI, (s + 1) * SERI);
    const b64 = dilim.map(k => k.buf.toString('base64'));
    const etiket = dilim.map(k => k.d ? `${k.d.t}s ${k.d.tip} klip${k.d.klip} ${k.d.oam} ${k.d.tas}${k.d.ft ? ' FT' : ''}` : '?');
    const png = await sayfa.evaluate(async ({ b64, etiket }) => {
      const imgs = await Promise.all(b64.map(s2 => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s2; })));
      const W = 460, H = Math.round(imgs[0].height / imgs[0].width * 460), BH = 16;
      const sut = 3, sat = Math.ceil(imgs.length / sut);
      const c = document.createElement('canvas'); c.width = sut * W; c.height = sat * (H + BH);
      const g = c.getContext('2d');
      g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
      imgs.forEach((im, i) => {
        const x = (i % sut) * W, y = Math.floor(i / sut) * (H + BH);
        g.fillStyle = '#eee'; g.font = '11px monospace';
        g.fillText(etiket[i], x + 4, y + 12);
        g.drawImage(im, x, y + BH, W, H);
      });
      return c.toDataURL('image/png').split(',')[1];
    }, { b64, etiket });
    fs.writeFileSync(path.join(OUT, `${ET}-seri-${s + 1}.png`), Buffer.from(png, 'base64'));
  }
  await br.close(); srv.close();
  fs.writeFileSync(path.join(OUT, ET + '-gunluk.txt'), gunluk.join('\n'));
  console.log(gunluk.slice(0, 40).join('\n'));
  console.log(`\n${n} kare · ${Math.ceil(n / SERI)} şerit → ${OUT}`);
})();
