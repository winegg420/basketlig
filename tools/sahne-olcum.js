#!/usr/bin/env node
/**
 * Charazay 2.0 — CANLI SAHNE GÖRSEL GERÇEKÇİLİK ÖLÇÜMÜ (FAZ 54 · E)
 *
 * Başsız Chromium'da maçı açar, `mState._sim`'den saniyede ~60 kare örnekler (varsayılan
 * 340 sn ≈ 20.000+ kare) ve FAZ 54 brifinin 18 satırlık tablosunu basar. Her satır için
 * örneklem sayısı yazılır; 20'nin altındaki örneklemde karar "ÖRNEKLEM YETERSİZ"dir.
 *
 * ⚠ ÖLÇEK: hız/ivme değerleri DUVAR (ekran) ölçeğindedir — kullanıcının gördüğü budur
 *   (FAZ 49 kararı). Sahne→maç sıkıştırma ayrıca basılır.
 * ⚠ Top hakemdeyken (`S._hakemTop.aktif`) top SAHİPSİZ değildir (FAZ 51/53).
 *
 * Kullanım: node tools/sahne-olcum.js [--secs=340] [--seed=987654321] [--etiket=ad] [--rate=1]
 * Çıktı: olcum/FAZ57-sonuc.txt (eklenir; her fazda güncellenir) · olcum/sahne-olcum-<etiket>.json (ham)
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const SECS = parseFloat(arg('secs', 340)), SEED = parseInt(arg('seed', 987654321), 10), RATE = parseFloat(arg('rate', 1));
const ETIKET = arg('etiket', 'taban');
const PXM = 29.5429, X0 = 56.4, X1 = 883.6, Y0 = 28.43, Y1 = 471.57, MID = 470;
const RIM = { L: [102.6, 250], R: [837.4, 250] };

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function sunucu() {
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      try {
        let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/charazay2.0.html';
        const fp = path.join(ROOT, path.normalize(u).replace(/^(\.\.[/\\])+/, ''));
        if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { r.writeHead(404); r.end(); return; }
        r.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(fp).pipe(r);
      } catch (e) { r.writeHead(500); r.end(); }
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}
/* Tohumlu Math.random — aynı tohum aynı maç (balon-check ile aynı kalıp). */
function TOHUM(seed) {
  let a = seed >>> 0;
  Math.random = function () { a ^= a << 13; a >>>= 0; a ^= a >> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; };
  try { localStorage.setItem('charazay_lang', 'tr'); } catch (e) {}
}

(async () => {
  const srv = await sunucu(); const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const hata = []; page.on('pageerror', e => hata.push(String(e))); page.on('console', m => { if (m.type() === 'error') hata.push(m.text()); });
  await page.addInitScript('(' + TOHUM.toString() + ')(' + SEED + ');');
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Olcum FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} try { showPage('mac'); } catch (e) {} });
  await page.waitForTimeout(300);
  await page.evaluate((r) => {
    try { startMatch(); setMatchRate(r); } catch (e) { window.__startErr = String(e); }
    window.__OL = { kare: [], t0: performance.now() };
    const tik = () => {
      try {
        const S = mState && mState._sim;
        if (S && S.ball && (S.players || []).length >= 10) {
          const b = S.ball;
          window.__OL.kare.push({
            t: +((performance.now() - window.__OL.t0) / 1000).toFixed(4),
            st: +(S.time || 0).toFixed(4),   /* sim saati — hız/ivme bununla ölçülür (rAF sıra jitter'i) */
            saat: +(mState._clkNow || 0),
            idx: mState.idx | 0, tip: S.curType || '-',
            m: b.mode, c: S.players.indexOf(b.carrier),
            bx: +b.x.toFixed(1), by: +b.y.toFixed(1), bh: +(b.h || 0).toFixed(1),
            hk: (S._hakemTop && S._hakemTop.aktif) ? 1 : 0,
            ft: S._ftAktif ? 1 : 0, inb: S.inb ? 1 : 0,
            kl: (S.klip && S.klip.aktif) ? 1 : 0, oam: (S.oam && S.oam.aktif) ? (S.oam.faz || '?') : '-',
            os: S.offSide ? 1 : 0, cu: S._snapN | 0,
            p: S.players.map(p => [+p.x.toFixed(3), +p.y.toFixed(3), (S.offP || []).indexOf(p) >= 0 ? 1 : 0, (p.pl && p.pl.poz) || '?', (p._oob || p._oobDonus) ? 1 : 0, p._klip ? 1 : 0, +(p._cizDx || 0).toFixed(2), +(p._cizDy || 0).toFixed(2)])
          });
        }
      } catch (e) {}
      if (mState && mState.running !== false) requestAnimationFrame(tik);
    };
    requestAnimationFrame(tik);
  }, RATE);
  await page.waitForTimeout(SECS * 1000);
  const ham = await page.evaluate(() => {
    const out = { kare: window.__OL.kare, sut3: [], err: window.__startErr || null };
    try {
      (mState.events || []).forEach(ev => {
        if (ev && ev.shot && ev.shot.kind === '3') {
          const left = offLeftAtQ(!!ev.shot.isHome, ev.q, mState.userIsHome);
          out.sut3.push({ x: ev.shot.x, y: ev.shot.y, left: left ? 1 : 0, made: ev.shot.made ? 1 : 0 });
        }
      });
    } catch (e) {}
    return out;
  });
  await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
  await browser.close(); srv.close();
  fs.mkdirSync(path.join(ROOT, 'olcum'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, `olcum/sahne-olcum-${ETIKET}.json`), JSON.stringify(ham));

  /* ════════════════ ÇÖZÜMLEME ════════════════ */
  const K = ham.kare;
  const N = K.length;
  const canli = f => !f.ft && !f.inb && !f.hk && f.m !== 'dead';
  const rimOf = f => f.os ? RIM.L : RIM.R;
  const m = px => px / PXM;
  const pct = (a, b) => b ? (100 * a / b) : 0;
  const R = {};

  /* 1-3 · mod geçişleri */
  const gec = {}; let heldHeld = 0;
  for (let i = 1; i < N; i++) {
    const a = K[i - 1], b = K[i];
    if (a.m !== b.m) gec[a.m + '>' + b.m] = (gec[a.m + '>' + b.m] || 0) + 1;
    else if (a.m === 'held' && b.m === 'held' && a.c !== b.c && a.c >= 0 && b.c >= 0) heldHeld++;
  }
  R.gec = gec; R.heldHeld = heldHeld;

  /* B1 · HAYALET held: mod 'held' ama taşıyıcı yok — ekranda top boşlukta asılı kalır */
  { let n = 0, cur = null; const ep = [];
    K.forEach(f => {
      const hayalet = (f.m === 'held' && f.c < 0 && !f.hk);   /* ölü topu YÖNETEN hakemin elindeki top hayalet değildir */
      if (hayalet) { n++; if (!cur) cur = { t: f.t, tip: f.tip, x: f.bx, y: f.by }; }
      else if (cur) { cur.sure = f.t - cur.t; ep.push(cur); cur = null; }
    });
    if (cur) { cur.sure = K[K.length - 1].t - cur.t; ep.push(cur); }
    ep.sort((a, b) => b.sure - a.sure);
    R.hayaletN = n; R.hayaletPct = pct(n, N);
    R.hayaletSn = ep.reduce((a, e) => a + e.sure, 0); R.hayaletEp = ep.slice(0, 5); }

  /* top saha dışı */
  let topDis = 0, topDisMod = {}, topDisEp = [], cur = null;
  K.forEach(f => {
    const dis = f.bx < X0 || f.bx > X1 || f.by < Y0 || f.by > Y1;
    if (dis) { topDis++; topDisMod[f.m] = (topDisMod[f.m] || 0) + 1; if (!cur) cur = { t: f.t, m: f.m, x: f.bx, y: f.by }; }
    else if (cur) { cur.sure = f.t - cur.t; topDisEp.push(cur); cur = null; }
  });
  R.topDisPct = pct(topDis, N); R.topDisMod = topDisMod; R.topDisEp = topDisEp.sort((a, b) => b.sure - a.sure).slice(0, 5);

  /* oyuncu saha dışı */
  let oyDis = 0, oyDis10 = 0, oyDisOrn = null;
  K.forEach(f => {
    let d0 = false, d10 = false;
    f.p.forEach(p => {
      if (p[4]) return;   /* sokucu: izinli */
      const dx = Math.max(X0 - p[0], p[0] - X1, 0), dy = Math.max(Y0 - p[1], p[1] - Y1, 0), d = Math.max(dx, dy);
      if (d > 0) { d0 = true; if (!oyDisOrn) oyDisOrn = { t: f.t, poz: p[3], x: p[0], y: p[1] }; }
      if (d > 10) d10 = true;
    });
    if (d0) oyDis++; if (d10) oyDis10++;
  });
  R.oyDisPct = pct(oyDis, N); R.oyDis10Pct = pct(oyDis10, N); R.oyDisOrn = oyDisOrn;

  /* üç saniye (canlı top, hücum oyuncuları) */
  const boya = new Map(); let boyaMax = 0, boyaIhlal = 0, boyaOrn = null, boyaN = 0, boyaMaxFizik = 0, boyaIhlalFizik = 0, boyaOrnFizik = null;
  for (let i = 1; i < N; i++) {
    const f = K[i], dt = f.t - K[i - 1].t;
    /* Sayaç POZİSYON ya da HÜCUM TARAFI değişince sıfırlanır — yoksa top rakibe geçtiğinde bile
       aynı jeton indeksinde birikiyor ve 8 sn'lik sahte "üç saniye" çıkıyordu (ölçüm hatasıydı). */
    if (f.idx !== K[i - 1].idx || f.os !== K[i - 1].os) boya.clear();
    if (!canli(f) || (f.m !== 'held' && f.m !== 'pass')) { boya.clear(); continue; }
    const rim = rimOf(f);
    f.p.forEach((p, j) => {
      const icinde = p[2] && Math.abs(p[1] - 250) < 2.45 * PXM && Math.abs(p[0] - rim[0]) < 5.8 * PXM;   /* topu tutan DAHİL (FAZ 55 A2) */
      if (!icinde) { if (boya.has(j)) { boyaN++; boya.delete(j); } return; }
      const v = boya.get(j) || { s: 0, kl: 0, n: 0 };
      v.s += dt; v.n++; if (p[5]) v.kl++; boya.set(j, v);
      if (v.s > boyaMax) { boyaMax = v.s; boyaOrn = { t: f.t, poz: p[3], kl: p[5] }; }
      if (v.s > 3.0 && v.s - dt <= 3.0) { boyaIhlal++; if (v.kl / v.n < 0.5) boyaIhlalFizik++; }
      if (v.kl / v.n < 0.5 && v.s > boyaMaxFizik) { boyaMaxFizik = v.s; boyaOrnFizik = { t: f.t, poz: p[3] }; }
    });
  }
  R.boyaMax = boyaMax; R.boyaIhlal = boyaIhlal; R.boyaOrn = boyaOrn; R.boyaN = boyaN;
  R.boyaMaxFizik = boyaMaxFizik; R.boyaIhlalFizik = boyaIhlalFizik; R.boyaOrnFizik = boyaOrnFizik;

  /* üçlük mesafesi — MOTOR olayları (bütün maç) */
  const u3 = ham.sut3.map(s => {
    const r = s.left ? RIM.L : RIM.R;
    const a = Math.abs(Math.atan2(s.y - r[1], (s.left ? 1 : -1) * (s.x - r[0])) * 180 / Math.PI);
    return { d: m(Math.hypot(s.x - r[0], s.y - r[1])), kose: a > 52 };   /* açı ölçütü — sut-cografya-check ile aynı */
  });
  R.u3n = u3.length;
  if (u3.length) { const ds = u3.map(x => x.d); R.u3min = Math.min(...ds); R.u3max = Math.max(...ds); R.u3ort = ds.reduce((a, b) => a + b, 0) / ds.length; R.u3kose = pct(u3.filter(x => x.kose).length, u3.length);   /* gerçek: üçlükler içinde köşe ~%26-28 */ R.u3derin = pct(ds.filter(d => d > 8.3).length, ds.length); }

  /* hız + ivme (3 karelik pencere · duvar ölçeği) */
  const hizlar = [], hizCanli = [], ivme = [], hizKlip = [], hizFizik = [];
  let donukN = 0, donukT = 0;
  const vOnce = new Map();
  for (let i = 3; i < N; i++) {
    const a = K[i - 3], f = K[i], dt = (f.st != null && a.st != null) ? (f.st - a.st) : (f.t - a.t);
    if (dt <= 0.004 || dt > 0.12 || f.t < 1.0) continue;
    if (f.cu !== a.cu) continue;   /* yetişme ışınlaması karesi */
    const rate = 1;
    f.p.forEach((p, j) => {
      const q = a.p[j]; if (!q) return;
      const v = m(Math.hypot(p[0] - q[0], p[1] - q[1])) / dt;
      if (v > 25) return;
      hizlar.push(v); if (canli(f)) hizCanli.push(v);
      (p[5] ? hizKlip : hizFizik).push(v);
      const key = j, prev = vOnce.get(key);
      const ts = (f.st != null) ? f.st : f.t;
      /* ivme: 0,2 sn ARALIKLI iki hız örneği (gerçek verinin çözünürlüğü; 50 ms'lik fark kare gürültüsünü ivme sayıyordu) */
      if (prev && (ts - prev.t) >= 0.18 && (ts - prev.t) <= 0.26) { ivme.push({ a: Math.abs(v - prev.v) / (ts - prev.t), poz: p[3], t: f.t, kl: p[5] }); vOnce.set(key, { v, t: ts }); }
      else if (!prev || (ts - prev.t) > 0.26) vOnce.set(key, { v, t: ts });
      if (canli(f)) { donukT++; const pq = K[i - 1].p[j]; if (pq && Math.hypot(p[0] - pq[0], p[1] - pq[1]) < 0.3) donukN++; }
    });
  }
  const band = (arr) => { const b = { '0-1': 0, '1-2': 0, '2-3.5': 0, '3.5-5': 0, '5-7.5': 0, '>7.5': 0 }; arr.forEach(v => { b[v < 1 ? '0-1' : v < 2 ? '1-2' : v < 3.5 ? '2-3.5' : v < 5 ? '3.5-5' : v < 7.5 ? '5-7.5' : '>7.5']++; }); const n = arr.length || 1; Object.keys(b).forEach(k => b[k] = +(100 * b[k] / n).toFixed(1)); return b; };
  R.hizOrt = hizlar.reduce((a, b) => a + b, 0) / (hizlar.length || 1); R.hizBand = band(hizlar); R.hizN = hizlar.length;
  R.hizCanliOrt = hizCanli.reduce((a, b) => a + b, 0) / (hizCanli.length || 1); R.hizCanliBand = band(hizCanli);
  R.hizKlipOrt = hizKlip.reduce((a, b) => a + b, 0) / (hizKlip.length || 1); R.hizKlipBand = band(hizKlip); R.hizKlipN = hizKlip.length;
  R.hizFizikOrt = hizFizik.reduce((a, b) => a + b, 0) / (hizFizik.length || 1); R.hizFizikBand = band(hizFizik); R.hizFizikN = hizFizik.length;
  /* A1 · KARE-KARE ivme (brifin ölçütü): ardışık iki karenin hız farkı. 0,2 sn penceresi
     gerçek veriyle kıyaslanabilir tek ölçüttür (SportVU 5 kare/sn); bu ise ekrandaki tek
     karelik sıçramayı yakalar — çarpışma itmesi ve doğrudan konum atamaları buraya düşer. */
  { const kk = []; const vP = new Map();
    for (let i = 1; i < N; i++) {
      const a = K[i - 1], f = K[i];
      const dtk = (f.st != null && a.st != null) ? (f.st - a.st) : (f.t - a.t);
      if (dtk <= 0.004 || dtk > 0.05 || f.t < 1.0 || f.cu !== a.cu) continue;
      f.p.forEach((p, j) => {
        const q = a.p[j]; if (!q) return;
        const v = m(Math.hypot(p[0] - q[0], p[1] - q[1])) / dtk; if (v > 25) return;
        const pr = vP.get(j);
        if (pr && (f.t - pr.t) > 0 && (f.t - pr.t) <= 0.05) kk.push({ a: Math.abs(v - pr.v) / (f.t - pr.t), kl: p[5], t: f.t, poz: p[3] });
        vP.set(j, { v, t: f.t });
      });
    }
    kk.sort((x, y) => x.a - y.a);
    R.kkN = kk.length; R.kkMax = kk.length ? kk[kk.length - 1].a : 0;
    R.kkP999 = kk.length ? kk[Math.floor(kk.length * 0.999)].a : 0;
    R.kk8 = pct(kk.filter(x => x.a > 8).length, kk.length);
    R.kk8Klip = pct(kk.filter(x => x.a > 8 && x.kl).length, Math.max(1, kk.filter(x => x.a > 8).length)); }
  /* FAZ 57 A1 · REJIM SINIRI (klip<->fizik devir ani): her jeton icin _klip bayraginin
     degistigi anlar; kare-kare ivme olaylari bu anlarin +-0,5 sn'sine dusenler ve dusmeyenler
     olarak ayrilir. Olculdu (v100): sinirda >8 payi %9,65 - digerinde %1,47 (6,6 kat). */
  { const dev = new Map();
    for (let i = 1; i < N; i++) { const a = K[i - 1], f = K[i];
      f.p.forEach((p2, j) => { const q = a.p[j]; if (!q) return; if ((p2[5] | 0) !== (q[5] | 0)) { if (!dev.has(j)) dev.set(j, []); dev.get(j).push(f.t); } }); }
    R.devirN = 0; dev.forEach(v => R.devirN += v.length);
    const yakin = (j, t) => { const L = dev.get(j); if (!L) return false; for (const x of L) if (Math.abs(x - t) <= 0.5) return true; return false; };
    const kk2 = []; const vP2 = new Map();
    for (let i = 1; i < N; i++) {
      const a = K[i - 1], f = K[i];
      const dtk = (f.st != null && a.st != null) ? (f.st - a.st) : (f.t - a.t);
      if (dtk <= 0.004 || dtk > 0.05 || f.t < 1.0 || f.cu !== a.cu) continue;
      f.p.forEach((p2, j) => {
        const q = a.p[j]; if (!q) return;
        const v = m(Math.hypot(p2[0] - q[0], p2[1] - q[1])) / dtk; if (v > 25) return;
        const pr = vP2.get(j);
        if (pr && (f.t - pr.t) > 0 && (f.t - pr.t) <= 0.05) kk2.push({ a: Math.abs(v - pr.v) / (f.t - pr.t), kl: p2[5], j, t: f.t, sin: yakin(j, f.t) });
        vP2.set(j, { v, t: f.t });
      });
    }
    const fz = kk2.filter(x => !x.kl);
    const fsn = fz.filter(x => x.sin), fd = fz.filter(x => !x.sin);
    R.sinN = fsn.length; R.sinPct = pct(fsn.filter(x => x.a > 8).length, Math.max(1, fsn.length));
    R.disN = fd.length; R.disPct = pct(fd.filter(x => x.a > 8).length, Math.max(1, fd.length));
    const fzs = fz.map(x => x.a).sort((x, y) => x - y);
    R.fzP99 = fzs.length ? fzs[Math.floor(fzs.length * 0.99)] : 0; R.fz8 = pct(fzs.filter(x => x > 8).length, Math.max(1, fzs.length)); }
  /* FAZ 57 A2 · CIZIM AYRISMASI: simulasyon konumu degil, jetonun CIZILDIGI nokta
     (p.x + _cizDx). Jeton capi 32 px oldugu icin merkezleri 26 px'ten yakin iki daire yumak gorunur. */
  { let n26 = 0, nSim26 = 0;
    K.forEach(f => {
      let ec = 1e9, es = 1e9;
      for (let i = 0; i < f.p.length; i++) for (let j = i + 1; j < f.p.length; j++) {
        if (f.p[i][4] || f.p[j][4]) continue;
        const ds = Math.hypot(f.p[i][0] - f.p[j][0], f.p[i][1] - f.p[j][1]);
        const dc = Math.hypot((f.p[i][0] + (f.p[i][6] || 0)) - (f.p[j][0] + (f.p[j][6] || 0)), (f.p[i][1] + (f.p[i][7] || 0)) - (f.p[j][1] + (f.p[j][7] || 0)));
        if (ds < es) es = ds; if (dc < ec) ec = dc;
      }
      if (ec < 26) n26++; if (es < 26) nSim26++;
    });
    R.ciz26Pct = pct(n26, N); R.sim26Pct = pct(nSim26, N); }
  const iv = ivme.map(x => x.a).sort((a, b) => a - b);
  R.ivmeN = iv.length; R.ivmeMax = iv[iv.length - 1] || 0; R.ivmeP99 = iv[Math.floor(iv.length * 0.99)] || 0; R.ivmeP999 = iv[Math.floor(iv.length * 0.999)] || 0;
  R.ivme8 = ivme.filter(x => x.a > 8).length; R.ivme8Klip = ivme.filter(x => x.a > 8 && x.kl).length;
  R.donukPct = pct(donukN, donukT);
  /* sahne→maç sıkıştırma */
  { const c0 = K.find(f => f.saat > 0), c1 = K.slice().reverse().find(f => f.saat > 0); let saatFark = 0, duvar = 0;
    if (c0 && c1) { let onceki = null; K.forEach(f => { if (onceki && f.saat > 0 && onceki.saat > 0 && f.saat < onceki.saat && (onceki.saat - f.saat) < 30) {   /* çeyrek sonu 600→0 sıçraması hariç */ saatFark += onceki.saat - f.saat; duvar += f.t - onceki.t; } onceki = f; }); }
    R.sahneKat = duvar > 0 ? saatFark / duvar : 0; }

  /* ── FAZ 67: TOP ELDE ORANI — gerçek verinin KENDİ TANIMIYLA ─────────────────────────
     tools/_lib/gercek-hareket.json → topElde.heldOran (%80,9). Dosyanın tanımı:
     "Tutan = topa yatay <= 0,9 m ve top <= 2,1 m". Aynı tanım burada da uygulanır — iki
     taraf farklı tanımla ölçülürse fark davranışı değil TANIMI ölçer (FAZ 48 dersi).
     ⚠ Bu satır FAZ 67'ye kadar HİÇBİR ölçüm aracında yoktu; asıl kusur (top maçın dörtte
     birinde yerde) yedi faz boyunca bu yüzden görünmedi. */
  { const TUT = 0.9 * PXM, TUTH = 2.1 * 9.836; let eldeN = 0;
    K.forEach(f => { let en = 1e9;
      for (const q of f.p) { const d = Math.hypot(q[0] - f.bx, q[1] - f.by); if (d < en) en = d; }
      if (en <= TUT && (f.bh || 0) <= TUTH) eldeN++; });
    R.topElde = pct(eldeN, N);
    const modN = {}; K.forEach(f => { modN[f.m] = (modN[f.m] || 0) + 1; });
    R.topModPay = {}; Object.keys(modN).forEach(m => R.topModPay[m] = +pct(modN[m], N).toFixed(1)); }

  /* sahipsiz top */
  let bosN = 0, bosEp = [], bcur = null;
  K.forEach(f => {
    const bos = (f.m === 'loose' || f.m === 'dead') && !f.hk;
    if (bos) { bosN++; if (!bcur) bcur = { t: f.t, tip: f.tip }; }
    else if (bcur) { bcur.sure = f.t - bcur.t; bosEp.push(bcur); bcur = null; }
  });
  bosEp.sort((a, b) => b.sure - a.sure);
  R.bosPct = pct(bosN, N); R.bosMax = bosEp.length ? bosEp[0].sure : 0; R.bos08 = bosEp.filter(e => e.sure > 0.8).length; R.bos14 = bosEp.filter(e => e.sure > 1.4).length; R.bosEp = bosEp.slice(0, 5);
  /* CANLI sahipsiz: ölü top (ft/sokma/hakem) hariç; sayı sonrası filede inen topun ilk 0,6 sn'si hariç */
  { let n = 0, cur2 = null; const ep2 = [];
    K.forEach(f => {
      const skor = /^score/.test(f.tip) || f.tip === 'free';
      const bos = (f.m === 'loose' || f.m === 'dead') && !f.hk && !f.ft && !f.inb;
      if (bos) { if (!cur2) cur2 = { t: f.t, tip: f.tip, n: 0 }; cur2.n++; if (!(skor && (f.t - cur2.t) <= 0.6)) n++; }
      else if (cur2) { cur2.sure = f.t - cur2.t - (skor ? 0.6 : 0); if (cur2.sure > 0) ep2.push(cur2); cur2 = null; }
    });
    ep2.sort((a, b) => b.sure - a.sure);
    R.bosCanliPct = pct(n, N); R.bosCanliMax = ep2.length ? ep2[0].sure : 0; R.bosCanli08 = ep2.filter(e => e.sure > 0.8).length; }

  /* üst üste binme (< 70 cm) */
  let ustN = 0, ustCanliN = 0, canliN = 0;
  K.forEach(f => {
    let var_ = false;
    for (let i = 0; i < f.p.length && !var_; i++) for (let j = i + 1; j < f.p.length; j++) {
      if (f.p[i][4] || f.p[j][4]) continue;
      if (Math.hypot(f.p[i][0] - f.p[j][0], f.p[i][1] - f.p[j][1]) < 0.70 * PXM) { var_ = true; break; }
    }
    if (var_) ustN++;
    if (canli(f)) { canliN++; if (var_) ustCanliN++; }
  });
  R.ustPct = pct(ustN, N); R.ustCanliPct = pct(ustCanliN, canliN);
  /* C4 · UÇ DEĞERLER: 0,55 m (16 px) mutlak taban ve 0,40 m — jetonlar iç içe geçmemeli */
  { let n40 = 0, n55 = 0, cur = null; const ep = [];
    K.forEach(f => {
      let en = 1e9, cift = null;
      for (let i = 0; i < f.p.length; i++) for (let j = i + 1; j < f.p.length; j++) {
        if (f.p[i][4] || f.p[j][4]) continue;
        const d = Math.hypot(f.p[i][0] - f.p[j][0], f.p[i][1] - f.p[j][1]);
        if (d < en) { en = d; cift = f.p[i][3] + '–' + f.p[j][3]; }
      }
      if (en < 0.40 * PXM) n40++;
      if (en < 0.55 * PXM) { n55++; if (!cur) cur = { t: f.t, cift, d: en / PXM }; }
      else if (cur) { cur.sure = f.t - cur.t; ep.push(cur); cur = null; }
    });
    ep.sort((a, b) => b.sure - a.sure);
    R.ust40Pct = pct(n40, N); R.ust55Pct = pct(n55, N); R.ust55Ep = ep.slice(0, 5); R.ust55Max = ep.length ? ep[0].sure : 0; }

  /* pas mesafesi */
  const paslar = [];
  for (let i = 1; i < N; i++) {
    const a = K[i - 1], f = K[i];
    if (f.m === 'pass' && a.m !== 'pass' && !f.hk && !a.hk) {
      let j = i; while (j < N && K[j].m === 'pass') j++;
      /* pas UZUNLUĞU = veren jeton → alan jeton (topun uçuş yolu değil: klipte 'pass' modu top 4 ft'ten
         uzaklaşınca başlar, 4 ft'e girince biter — uçuş yolu gerçek uzunluktan ~2,4 m kısa ölçülür) */
      if (j < N && !K[j].hk && a.c >= 0 && K[j].c >= 0 && a.p[a.c] && K[j].p[K[j].c]) paslar.push({ d: m(Math.hypot(K[j].p[K[j].c][0] - a.p[a.c][0], K[j].p[K[j].c][1] - a.p[a.c][1])), son: K[j].m, t: f.t });
    }
  }
  const pasOK = paslar.filter(p => p.son === 'held');
  R.pasN = pasOK.length; R.pasOrt = pasOK.reduce((s, p) => s + p.d, 0) / (pasOK.length || 1); R.pasKisa = pasOK.filter(p => p.d < 2).length;

  /* savunma mesafesi (canlı top, top ön sahada) */
  const savD = [];
  K.forEach(f => {
    if (!canli(f) || (f.m !== 'held' && f.m !== 'pass')) return;
    const onSaha = f.os ? (f.bx < MID) : (f.bx > MID); if (!onSaha) return;
    const off = f.p.filter(p => p[2] && !p[4]), def = f.p.filter(p => !p[2]);
    off.forEach(o => { let en = 1e9; def.forEach(d => { const k = Math.hypot(o[0] - d[0], o[1] - d[1]); if (k < en) en = k; }); savD.push(m(en)); });
  });
  R.savN = savD.length; R.savOrt = savD.reduce((a, b) => a + b, 0) / (savD.length || 1); R.sav4 = pct(savD.filter(d => d > 4).length, savD.length);

  /* kenardan sokma: pas anında 6 m içindeki arkadaş */
  const sokma = [];
  for (let i = 1; i < N; i++) {
    const a = K[i - 1], f = K[i];
    if (a.m === 'held' && f.m === 'pass' && a.c >= 0 && a.p[a.c] && a.p[a.c][4]) {
      const s = a.p[a.c]; let n = 0;
      a.p.forEach((p, j) => { if (j !== a.c && p[2] === s[2] && Math.hypot(p[0] - s[0], p[1] - s[1]) <= 6 * PXM) n++; });
      sokma.push(n);
    }
  }
  R.sokmaN = sokma.length; R.sokmaOrt = sokma.reduce((a, b) => a + b, 0) / (sokma.length || 1); R.sokmaAz = sokma.filter(n => n < 3).length;

  /* orta çizgiyi topla geçen rol */
  const gecen = {}; const pozGor = {};
  for (let i = 1; i < N; i++) {
    const a = K[i - 1], f = K[i];
    if (f.m !== 'held' || a.m !== 'held' || f.c < 0 || f.c !== a.c) continue;
    if (pozGor[f.idx]) continue;
    const p = f.p[f.c], q = a.p[a.c];
    const g = f.os ? (q[0] > MID && p[0] <= MID) : (q[0] < MID && p[0] >= MID);
    if (g) { pozGor[f.idx] = 1; gecen[p[3]] = (gecen[p[3]] || 0) + 1; }
  }
  R.gecen = gecen; R.gecenN = Object.values(gecen).reduce((a, b) => a + b, 0);

  /* ════════════════ TABLO ════════════════ */
  const yaz = [];
  const satir = (ad, deger, ok, hedef, n) => { const dur = (n != null && n < 20) ? 'ÖRNEKLEM YETERSİZ' : (ok ? '✓' : '✗'); yaz.push(`  ${dur.padEnd(18)} ${ad.padEnd(30)} ${String(deger).padEnd(34)} hedef ${hedef}${n != null ? '  (n=' + n + ')' : ''}`); };
  const g = k => gec[k] || 0;
  yaz.push(`FAZ 54 — CANLI SAHNE ÖLÇÜMÜ · etiket=${ETIKET} · ${N} kare · ${SECS} sn · hız ${RATE}× · seed=${SEED} · ${new Date().toISOString().slice(0, 16)}`);
  yaz.push(`  konsol hatası ${hata.length} · ölçek: DUVAR (ekran) — sahne→maç oranı için iz-kaydet`);
  satir('loose>held geçişi', g('loose>held') + (g('dead>held') ? ' (+dead>held ' + g('dead>held') + ')' : ''), g('loose>held') + g('dead>held') >= 1, '≥ 1');
  satir('loose>pass geçişi', g('loose>pass') + g('dead>pass') + g('rim>pass'), g('loose>pass') + g('dead>pass') + g('rim>pass') === 0, '0');
  satir('pass>shot geçişi', g('pass>shot'), g('pass>shot') === 0, '0');
  satir('shot>pass geçişi', g('shot>pass'), g('shot>pass') === 0, '0');
  satir('hayalet held (taşıyıcısız) sn', `${R.hayaletSn.toFixed(1)} sn · %${R.hayaletPct.toFixed(2)} kare` + (R.hayaletEp.length ? ' · en uzun ' + R.hayaletEp.map(e => e.sure.toFixed(1) + 'sn@' + e.t.toFixed(0) + 's(' + e.tip + ')').join(' · ') : ''), R.hayaletSn <= 0.05, '0,0 sn');
  satir('top saha dışı %', R.topDisPct.toFixed(2) + ' ' + JSON.stringify(R.topDisMod), R.topDisPct < 0.5, '< 0,5');
  satir('oyuncu saha dışı % (>10 px)', R.oyDis10Pct.toFixed(2) + ' (>0 px: ' + R.oyDisPct.toFixed(2) + ')', R.oyDis10Pct === 0, '0,0');
  satir('üç saniye (eski fizik) max sn', R.boyaMaxFizik.toFixed(1) + ' · >3 sn ' + R.boyaIhlalFizik + ' olay' + (R.boyaOrnFizik ? ' · ' + R.boyaOrnFizik.poz + '@' + R.boyaOrnFizik.t.toFixed(0) + 's' : ''), R.boyaMaxFizik <= 3.0, '≤ 3,0 (koreografi bizim)', R.boyaN);
  yaz.push('  bilgi: boyada kalış TÜMÜ (klip dahil) max ' + R.boyaMax.toFixed(1) + ' sn · >3 sn ' + R.boyaIhlal + ' olay — gerçek SportVU aynı ölçütle p99 7,4 · max 12,8 sn · >3 sn %22,2 (kapı YOK: klip gerçek kayıttır)');
  satir('üçlük mesafe aralığı (m)', R.u3n ? `${R.u3min.toFixed(2)} – ${R.u3max.toFixed(2)} · ort ${R.u3ort.toFixed(2)} · köşe %${R.u3kose.toFixed(0)} · >8,3 m %${R.u3derin.toFixed(0)}` : '—', R.u3n && R.u3min < 7.0 && R.u3max > 8.0, 'min < 7,0 · max > 8,0', R.u3n);
  /* GERÇEK TABAN (aynı 60 fps ara değerli yörünge, ham float): p99 5,9 · p99,9 11,7 ·
     tepe 45 · >8 %0,37. "Tepe ≤ 8" gerçek veride bile sağlanmaz (45); ölçülebilir hedef
     >8 PAYIDIR. Kapı: >8 payı ≤ %0,6 (gerçek %0,37 × 1,6) ve tepe ≤ 60. */
  satir('ivme KARE-KARE (m/sn²)', `tepe ${R.kkMax.toFixed(0)} · p99,9 ${R.kkP999.toFixed(1)} · >8 %${R.kk8.toFixed(2)} (aşanların %${R.kk8Klip.toFixed(0)}'i klip) — gerçek: tepe 45 · >8 %0,37`, R.kk8 <= 0.6 && R.kkMax <= 60, '>8 payı ≤ %0,6 · tepe ≤ 60 (gerçek veri)', R.kkN);
  satir('oyuncu ivmesi (m/sn², 0,2 sn)', `p99 ${R.ivmeP99.toFixed(1)} · p99,9 ${R.ivmeP999.toFixed(1)} · max ${R.ivmeMax.toFixed(0)} · >8: %${(100 * R.ivme8 / Math.max(1, R.ivmeN)).toFixed(2)} (gerçek: p99 7,0 · p99,9 13,0 · >8 %0,58)`, R.ivmeP99 <= 8.0, 'p99 ≤ 8,0 (gerçek veri)', R.ivmeN);
  /* FAZ 57 A1: klip<->fizik devir aninin +-0,5 sn'si vs. digeri. Olculdu (v100): %9,65 vs %1,47.
     Kok neden klipBitir'in on jetonun hizini birden sifirlamasiydi. Kapi: sinir <= %2,0. */
  satir('rejim siniri ivme >8 % (fizik)', `sinir +-0,5 sn %${R.sinPct.toFixed(2)} (n ${R.sinN}) - digeri %${R.disPct.toFixed(2)} (n ${R.disN}) - devir ${R.devirN} - fizik geneli p99 ${R.fzP99.toFixed(1)} / >8 %${R.fz8.toFixed(2)}`, R.sinPct <= 2.0 && R.fz8 <= 1.0, 'sinir <= %2,0 - fizik geneli >8 <= %1,0', R.sinN);
  /* FAZ 57 A2: CIZIM katmani. Jeton capi 32 px; merkezleri 26 px'ten yakin iki daire yumak gorunur.
     Simulasyon konumu KORUNUR (gercek kayit); yalniz cizim noktasi ayrilir. */
  satir('cizimde 26 px alti jeton cifti %', `${R.ciz26Pct.toFixed(2)} (simulasyonda %${R.sim26Pct.toFixed(2)} - gercek kayitla ayni)`, R.ciz26Pct <= 0.5, '<= %0,5 (cizim)');
  /* FAZ 67: KALICI SATIR — referans %80,9 (gercek-hareket.json · topElde.heldOran) */
  satir('top elde % (gerçek tanım)', `${R.topElde.toFixed(1)} · modlar ${JSON.stringify(R.topModPay)} (gerçek %80,9)`, R.topElde >= 78, '≥ %78 (gerçek %80,9)');
  satir('sahipsiz top % (ham)', `${R.bosPct.toFixed(2)} · en uzun ${R.bosMax.toFixed(2)} sn · >0,8: ${R.bos08} · >1,4: ${R.bos14}`, R.bosPct < 2 && R.bosMax < 0.8, '< 2 · en uzun < 0,8 sn');
  /* GERÇEK TABAN: gerçek kliplerde topu kimsenin tutmadığı kare %23,8; kesintisiz süre p50 0,60 ·
     p90 1,60 · p99 2,80 · max 5,2 sn. Brifin "< %2 · hiçbiri > 0,8 sn" hedefi fiziksel olarak
     imkânsız (kaçan şut çemberden düşer, ribaundcu 0,8 sn'den uzun sürede varır). Kapı: canlı
     sahipsiz pay < %6 ve en uzun epizot < 2,0 sn (gerçek p90 1,60). */
  satir('sahipsiz top % (canlı)', `${R.bosCanliPct.toFixed(2)} · en uzun ${R.bosCanliMax.toFixed(2)} sn · >0,8: ${R.bosCanli08} (gerçek pay %23,8 · p90 1,60 sn)`, R.bosCanliPct < 6 && R.bosCanliMax < 2.0, '< 6 · en uzun < 2,0 sn (gerçek p90 1,60)');
  /* GERÇEK TABAN: aynı ölçüt SportVU klip havuzunda (696 klip · 45.322 kare) %37,7 — brifin "< %6"
     hedefi ölçülmemiş bir tahmindi ve gerçek basketbolla çelişiyor (kalabalık boya, perde, ribaunt
     mücadelesi doğal olarak 70 cm'nin altına iner). Kapı gerçek payın ±8 puanına açıldı. */
  /* ⚠ FAZ 56: eşikler GERÇEK KAYITTAN. 320 klip · 81.942 karede en yakın çift <40 cm %10,41 ·
     <55 cm %20,71 · <70 cm %35,90; 40 cm altında 7,68 sn kesintisiz bölüm var. Brifin "<40 cm
     ≤ %1 · <55 cm = 0" hedefi basketbolun kendisiyle çelişiyor (FAZ 55'te geri çekilen "<%6"
     hedefiyle aynı hata). Kapı artık gerçek payın ÜSTÜNE çıkmamayı sınar. */
  satir('iç içe geçme % (<40 cm)', `${R.ust40Pct.toFixed(2)} · <55 cm %${R.ust55Pct.toFixed(2)} · en uzun 55 cm altı ${R.ust55Max.toFixed(1)} sn` + (R.ust55Ep.length ? ' (' + R.ust55Ep[0].cift + ')' : ''), R.ust40Pct <= 13 && R.ust55Pct <= 26, '<40 cm ≤ %13 · <55 cm ≤ %26 (gerçek %10,41 / %20,71 · +%25 pay)');
  satir('üst üste binme % (<70 cm)', `${R.ustPct.toFixed(1)} · canlı top ${R.ustCanliPct.toFixed(1)} (gerçek %37,7)`, Math.abs(R.ustPct - 37.7) <= 8, '%29,7 – 45,7 (gerçek ±8)');
  satir('ortalama pas mesafesi (m)', `${R.pasOrt.toFixed(2)} · <2 m: ${R.pasKisa}`, R.pasOrt >= 5.0 && R.pasOrt <= 6.5, '5,0 – 6,5', R.pasN);
  satir('ortalama oyuncu hızı (m/sn)', `${R.hizOrt.toFixed(2)} · klip ${R.hizKlipOrt.toFixed(2)} (gerçek 1,90) · fizik ${R.hizFizikOrt.toFixed(2)}`, R.hizOrt >= 1.70 && R.hizOrt <= 2.00, '1,70 – 2,00 (gerçek 1,90)', R.hizN);
  /* GERÇEK TABAN: bu klip havuzunda 0-1 m/sn payı %32,0 (ort 1,90 m/sn). Brifin %38-45 hedefi
     SportVU'nun TAMAMINDAN (ölü top dahil) geliyor; şutla biten pozisyonlar daha hareketlidir. */
  satir('0–1 m/sn bandı %', `${R.hizBand['0-1']} · bantlar ${JSON.stringify(R.hizBand)} (gerçek %32,0)`, R.hizBand['0-1'] >= 27, '≥ 27 (gerçek 32,0)');
  satir('>7,5 m/sn bandı %', R.hizBand['>7.5'], R.hizBand['>7.5'] < 0.5, '< 0,5');
  /* GERÇEK TABAN: aynı ölçütle (60 fps ara değerli klip yörüngesi, <0,3 px/kare) %18,8. Brifin
     "< %8" hedefi ölçülmemişti — gerçek basketbolda oyuncu zamanın beşte birinde neredeyse durur
     (set hücumunda spot-up, boyada bekleme). Kapı gerçek payın ±5 puanı. */
  satir('donuk oyuncu % (<0,3 px)', `${R.donukPct.toFixed(1)} (gerçek %18,8)`, Math.abs(R.donukPct - 18.8) <= 5, '%13,8 – 23,8 (gerçek ±5)');
  /* GERÇEK TABAN: %15,6 · ortalama 2,43 m (aynı ölçüt, aynı klip havuzu). Brifin "< %10" hedefi
     gerçek veriden SIKI — yardım savunması ve zayıf taraf gerçekte de 4 m'yi aşar. */
  satir('savunmadan >4 m %', `${R.sav4.toFixed(1)} · ort ${R.savOrt.toFixed(2)} m (gerçek %15,6 · 2,43 m)`, R.sav4 <= 20 && R.savOrt <= 3.0, '≤ 20 · ort ≤ 3,0 m (gerçek 15,6)', R.savN);
  /* ⚠ FAZ 56: eşik GERÇEK KAYITTAN. 29 gerçek sokma klibinin ilk karesinde topu tutanın 6 m'sinde
     ortalama 3,07 arkadaş var ve olayların %24'ünde 3'ten AZ — yani 'her sokmada en az 3' (FAZ 54 C4)
     gerçek basketbolda da sağlanmıyor. Kapı ortalamaya ve paya bağlandı. */
  satir('sokmada 6 m içindeki arkadaş', `ort ${R.sokmaOrt.toFixed(1)} · <3 olan ${R.sokmaAz}/${R.sokmaN} (gerçek: ort 3,07 · <3 %24)`, R.sokmaOrt >= 2.5 && R.sokmaAz / Math.max(1, R.sokmaN) <= 0.45, 'ort ≥ 2,5 · <3 payı ≤ %45 (gerçek 3,07 / %24)', R.sokmaN);
  satir('orta çizgiyi geçen C', `${R.gecen.C || 0}/${R.gecenN} · ${JSON.stringify(R.gecen)}`, (R.gecen.C || 0) <= Math.max(1, Math.round(R.gecenN / 13)), '≤ 1/13', R.gecenN);
  yaz.push(`  bilgi: geçişler ${JSON.stringify(gec)} · held→held el değişimi ${heldHeld}`);
  if (R.topDisEp.length) yaz.push('  bilgi: top saha dışı en uzun: ' + R.topDisEp.map(e => `${e.t.toFixed(1)}s ${e.m} ${e.sure.toFixed(2)}sn (${e.x},${e.y})`).join(' · '));
  if (R.oyDisOrn) yaz.push(`  bilgi: oyuncu saha dışı ilk örnek: ${R.oyDisOrn.t.toFixed(1)}s ${R.oyDisOrn.poz} (${R.oyDisOrn.x},${R.oyDisOrn.y})`);
  if (R.bosEp.length) yaz.push('  bilgi: en uzun sahipsiz: ' + R.bosEp.map(e => `${e.t.toFixed(1)}s ${e.tip} ${e.sure.toFixed(2)}sn`).join(' · '));
  yaz.push(`  bilgi: canlı-top hız bantları ${JSON.stringify(R.hizCanliBand)}`);
  yaz.push(`  bilgi: KLİP kareleri ${JSON.stringify(R.hizKlipBand)} (n=${R.hizKlipN}) · ESKİ FİZİK kareleri ${JSON.stringify(R.hizFizikBand)} (n=${R.hizFizikN})`);
  const metin = yaz.join('\n');
  console.log(metin);
  fs.appendFileSync(path.join(ROOT, 'olcum/FAZ57-sonuc.txt'), metin + '\n\n');
})().catch(e => { console.error(e); process.exit(1); });
