#!/usr/bin/env node
/**
 * Charazay 2.0 — CANLI SAHNE İZ KAYDEDİCİ (FAZ 40 · İŞ 0)
 *
 * Topun ve 10 jetonun konumunu her animasyon karesinde kaydeder, sonra hız/eğrilik
 * ölçütlerini çıkarır. `sahne-check.js` açılış kodunu (yerel sunucu, tohumlama, kariyer
 * kurma, startMatch) aynen kullanır.
 *
 * ⚠ ÖLÇÜM KURALI: hız 100 ms'lik pencerede hesaplanır, kare-kare DEĞİL. 60 fps'te tek
 *   karelik 1 px titreşim 1,8 m/sn'lik sahte hız üretir.
 *
 * ⚠ SAHNE SAATİ ≠ MAÇ SAATİ (CLAUDE.md, F15 dersi): sahne maç saatini sıkıştırarak
 *   oynatır. Araç bu oranı AYNI KOŞUDA ölçer (`mState._clkNow` ↔ duvar saati) ve her hızı
 *   İKİ ÖLÇEKTE birden raporlar. Gerçek basketbolla kıyaslanacak olan MAÇ ölçeğidir.
 *
 * Kullanım:
 *   node tools/iz-kaydet.js [--secs=80] [--seed=987654321] [--rate=1] [--etiket=temel]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'olcum');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? parseFloat(a.split('=')[1]) : d; };
const str = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const SEED = num('seed', 987654321);
const SECS = num('secs', 80);
const RATE = num('rate', 1);
const ETIKET = str("etiket", str("yeniden","temel"));

/* FAZ 42-B: Math.max.apply 480 sn kayıtta (270 bin örnek) yığını taşırıyordu. */
const enB = (a) => { let m = -Infinity; for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; return m === -Infinity ? 0 : m; };
const PX_M = 29.5429;            /* motorun kendi ölçeği: 29,5429 px = 1 m */
const PENCERE_MS = 100;          /* hız penceresi */

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
  fs.mkdirSync(OUT, { recursive: true });
  /* --yeniden: kaydedilmiş izi tarayıcı açmadan YENİDEN çözümle (ölçüt değişince). */
  const yen = str('yeniden', null);
  if (yen) {
    const d = JSON.parse(fs.readFileSync(path.join(OUT, `iz-${yen}.json`), 'utf8'));
    const R = analiz(d.kare, d.balon, d.adlar); R.dil = (d.meta && d.meta.dil) || '?'; R.konsolHata = 0; R.startErr = null;
    fs.writeFileSync(path.join(OUT, `iz-${yen}-ozet.json`), JSON.stringify(R, null, 2));
    bas(R, path.join(OUT, `iz-${yen}.json`));
    return;
  }
  const srv = await sunucu();
  const port = srv.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const hatalar = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });
  page.on('pageerror', e => hatalar.push(e.message));
  await page.addInitScript('(' + TOHUM.toString() + ')(' + SEED + ');');
  /* FAZ 47: --yavas=N — CPU N kat yavaşlatılır (kullanıcının makinesi gibi); ışınlanma/kare
     takılması bu koşulda ölçülür. */
  { const YAVAS = num('yavas', 1); if (YAVAS > 1) { try { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: YAVAS }); console.log('CPU yavaşlatma: ' + YAVAS + '×'); } catch (e) { console.log('CPU yavaşlatma kurulamadı: ' + e); } } }
  /* FAZ 42-B: DİL TÜRKÇE'YE SABİTLENİR. Headless Chrome `navigator.language` olarak en-US
     bildirir ve i18n ilk açılışta buna göre İngilizceye düşer — anlatım ölçümü (E1/E2/E3)
     bu durumda test artefaktı ölçer. Kilit oyun betiklerinden ÖNCE kurulur. */
  await page.addInitScript("try{localStorage.setItem('charazay_lang','tr');}catch(e){}");
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Iz FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await page.evaluate(() => { try { showPage('mac'); } catch (e) {} });
  await bekle(300);

  /* Kaydedici — startMatch'ten ÖNCE kurulur. */
  await page.evaluate(() => {
    window.__IZ = { kare: [] };
    const t0 = performance.now();
    const tick = () => {
      try {
        const S = mState && mState._sim;
        if (S && S.ball && (S.players || []).length >= 10) {
          const b = S.ball;
          window.__IZ.kare.push({
            t: +((performance.now() - t0) / 1000).toFixed(3),
            saat: +(mState._clkNow || 0).toFixed(1),
            q: mState.quarter || 1,
            tip: S.curType || '-',
            idx: mState.idx | 0,
            b: [+b.x.toFixed(1), +b.y.toFixed(1), b.mode, +(b.h || 0).toFixed(1)],   /* FAZ 44: [3] yükseklik (px) */
            /* Teşhis: donmanın SEBEBİNİ ayırt etmek için (set mi, kilit mi, kademe mi). */
            cs: S.canliSet ? 1 : 0,
            /* FAZ 41: OLU TOP ayrimi — serbest atis dizilisi / kenardan sokma. Bu
               karelerde duran jeton NORMALDIR (dizilim olculerek ayarlandi, F14-7). */
            ft: S._ftAktif ? 1 : 0,
            inb: S.inb ? 1 : 0,
            /* FAZ 42-B: sekme gizli mi (C) · hücum yönü sol pota mı (D) · perde aktif mi (D, perde
               anı ikili mesafe ölçütünden muaf) · aktif takip var mı (B) */
            hid: (typeof document !== 'undefined' && document.hidden) ? 1 : 0,
            os: S.offSide ? 1 : 0,
            perde: (S._perde && S._perde.evre < 3 && (S.time - S._perde.t) < 1.6) ? 1 : 0,
            ch: S.chase ? 1 : 0,
            p: (S.players || []).map(p => [
              +p.x.toFixed(1), +p.y.toFixed(1),
              (S.offP || []).indexOf(p) >= 0 ? 1 : 0,
              (p.pl && p.pl.poz) || '?',
              (b.carrier === p) ? 1 : 0,
              p.urg | 0,                                        /* 5: acele kademesi */
              +Math.hypot(p.x - p.tx, p.y - p.ty).toFixed(0),   /* 6: hedefe uzaklık */
              ((p._lock || 0) > S.time) ? 1 : 0,                /* 7: koreografi kilidi */
              ((p._swayT || 0) > S.time) ? 1 : 0,               /* 8: salınım penceresi */
              +(p._nudgeOfs != null ? p._nudgeOfs : -99).toFixed(0), /* 9: sürüklenme ofseti */
              (p._nudgeN | 0),                                 /* 10: salınım atama sayacı */
              (p._oob || p._oobDonus) ? 1 : 0,                 /* 11: çizgi dışı izni + dönüş (A4 muafiyeti) */
              +(p.tx || 0).toFixed(0), +(p.ty || 0).toFixed(0)  /* 12-13 (FAZ 45): hedef — "nereye gidiyor" teşhisi */
            ])
          });
        }
      } catch (e) {}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.evaluate((r) => { try { startMatch(); setMatchRate(r); } catch (e) { window.__startErr = String(e); } }, RATE);
  await bekle(SECS * 1000);

  const veri = await page.evaluate(() => ({
    kare: window.__IZ.kare, startErr: window.__startErr || null,
    /* FAZ 42-B: RENDER EDİLMİŞ anlatım balonları (E1/E2/E3). Balonlar listenin BAŞINA
       eklenir; kronolojik sıra için ters çevrilir. */
    balon: (() => { try {
      const el = Array.from(document.querySelectorAll('#commentary .ci'));
      return el.reverse().map(e => ({ cls: e.className, txt: (e.textContent || '').replace(/\s+/g, ' ').trim() }));
    } catch (e) { return []; } })(),
    adlar: (() => { try {
      const a = [];
      (G.players || []).forEach(p => a.push(p.isim));
      const S = mState && mState._sim; (S && S.players || []).forEach(p => { if (p.pl && p.pl.isim) a.push(p.pl.isim); });
      a.push(G.team && G.team.isim, mState && mState.rakipName);
      return a.filter(Boolean);
    } catch (e) { return []; } })(),
    dil: (typeof getLang === 'function') ? getLang() : '?'
  }));
  await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
  await browser.close(); srv.close();

  const izDosya = path.join(OUT, `iz-${ETIKET}.json`);
  fs.writeFileSync(izDosya, JSON.stringify({ meta: { etiket: ETIKET, seed: SEED, secs: SECS, rate: RATE, pxM: PX_M, dil: veri.dil }, kare: veri.kare, balon: veri.balon, adlar: veri.adlar }));

  const R = analiz(veri.kare, veri.balon, veri.adlar);
  R.dil = veri.dil;
  R.konsolHata = hatalar.length;
  R.startErr = veri.startErr;
  fs.writeFileSync(path.join(OUT, `iz-${ETIKET}-ozet.json`), JSON.stringify(R, null, 2));
  bas(R, izDosya);
  if (hatalar.length) hatalar.slice(0, 4).forEach(e => console.log('   ! ' + e));
}

/* ── ANALİZ ────────────────────────────────────────────────────────────────────────── */
function analiz(K, BAL, ADLAR) {
  /* FAZ 47: maç saati başlamadan önceki kareler (saat=0, kurulum) atılır — aksi hâlde çeyrek
     net saati 0 çıkıp sahne↔maç oranı 1'e düşüyor ve kurulum yerleşimi "90 m/sn sıçrama" oluyordu. */
  { const k0 = K.findIndex(k => k && k.saat > 0); if (k0 > 0) K = K.slice(k0); }
  if (K.length < 10) return { hata: 'kare yok', kare: K.length };
  BAL = BAL || []; ADLAR = ADLAR || [];

  /* -- FAZ 41 yardimcilari ---------------------------------------------------------- */
  const medyan = (arr) => { if (!arr.length) return 0; const q = arr.slice().sort((a, b) => a - b);
    const m = q.length >> 1; return q.length % 2 ? q[m] : (q[m - 1] + q[m]) / 2; };
  /* OLU TOP: jetonun durmasi MESRU olan kareler. Brif bu kareleri donma olcutunden
     haric tutmayi sart kosuyor ve gerekcesi dogru — serbest atis ve kenardan sokma
     dizilimleri OLCULEREK ayarlandi (F14-7), sut UCUSU sirasinda da oyuncular
     ribaunt yerini almis bekler. Ceyrek arasi/mola karelerinde sahne hic akmaz. */
  const oluTop = (k) => (k.ft === 1) || (k.inb === 1) ||
    (k.b && (k.b[2] === 'shoot' || k.b[2] === 'rim' || k.b[2] === 'idle'));

  /* Sahne ↔ maç saati oranı: `_clkNow` GERİYE sayar (kalan saniye).
     ⚠ Kare-kare farkları TOPLANAMAZ — saat animasyonlu aktığı için küçük ileri-geri
     salınım yapar ve düşüşlerin toplamı NET düşüşün katı çıkar (ölçüldü: 10,5× vs 1,45×).
     Doğru ölçü ÇEYREK BAŞINA NET geçen maç saatidir. */
  let macSn = 0, duvarSn = 0;
  let bq = K[0].q, bi = 0;
  for (let i = 1; i <= K.length; i++) {
    if (i === K.length || K[i].q !== bq) {
      const net = K[bi].saat - K[i - 1].saat, dt = K[i - 1].t - K[bi].t;
      if (net > 0 && dt > 0) { macSn += net; duvarSn += dt; }
      if (i < K.length) { bq = K[i].q; bi = i; }
    }
  }
  /* 1 duvar (sahne) saniyesi kaç MAÇ saniyesine denk gelir. >1 ise sahne hızlandırılmış
     oynatılıyordur ve ekranda görülen hız, gerçek basketbolun bu katıdır:
        maç ölçeğindeki hız = sahne hızı / sahneKat */
  const sahneKat = duvarSn > 0 ? macSn / duvarSn : 1;

  /* Hız: 100 ms pencere. */
  const pencere = (idx, al) => {
    const out = [];
    for (let i = 0; i < K.length; i++) {
      let j = i;
      while (j + 1 < K.length && (K[j + 1].t - K[i].t) * 1000 < PENCERE_MS) j++;
      const dt = K[j].t - K[i].t;
      if (dt < 0.05 || dt > 0.4) continue;
      const a = al(K[i], idx), b = al(K[j], idx);
      if (!a || !b) continue;
      out.push({ i, t: K[i].t, v: Math.hypot(b[0] - a[0], b[1] - a[1]) / dt / PX_M, idx: K[i].idx, idxJ: idx });
    }
    return out;
  };
  const topAl = (k) => k.b;
  const oyAl = (k, i) => (k.p && k.p[i]) ? k.p[i] : null;

  const topHiz = pencere(0, topAl);
  const oyHiz = [];
  for (let i = 0; i < 10; i++) oyHiz.push(pencere(i, oyAl));
  const tumOy = [].concat.apply([], oyHiz);
  /* FAZ 41: CANLI TOP orneklemi — olu top kareleri disarida. Donma olcutu bunun
     uzerinden okunur; brifin "olu topta duran jeton normaldir" sarti budur. */
  const canliOy = tumOy.filter(x => !oluTop(K[x.i]));
  const donKova = {};
  for (const x of canliOy) {
    if (x.v / sahneKat >= 0.5) continue;
    const k = K[x.i]; const q = k.p && k.p[x.idxJ];
    if (!q) continue;
    const ad = (q[2] ? "HUC" : "SAV") + (q[4] ? "/top" : "") + (k.cs ? "/set" : "/gecis") + (q[6] != null ? (q[6] < 20 ? "/yerinde" : "/uzak") : "") + (q[5] != null ? "/u" + q[5] : "") + "/" + (k.b ? k.b[2] : "?");
    donKova[ad] = (donKova[ad] || 0) + 1;
  }
  const donToplam = Object.keys(donKova).reduce((a, k) => a + donKova[k], 0) || 1;
  const donKovaListe = Object.keys(donKova).sort((a, b) => donKova[b] - donKova[a]).slice(0, 10).map(k => k + " %" + (100 * donKova[k] / donToplam).toFixed(1));

  /* Kare-kare top sıçraması (ışınlanma tespiti — pencere yumuşatması ışınlanmayı gizler,
     bu yüzden ışınlanma AYRI ölçülür: tek karede kat edilen mesafe / kare süresi). */
  const sicrama = [];
  for (let i = 1; i < K.length; i++) {
    const dt = K[i].t - K[i - 1].t;
    if (dt <= 0 || dt > 0.2) continue;
    const d = Math.hypot(K[i].b[0] - K[i - 1].b[0], K[i].b[1] - K[i - 1].b[1]) / PX_M;
    sicrama.push({ v: d / dt, t: K[i].t, mod: K[i].b[2], idx: K[i].idx });
  }
  const isin = sicrama.filter(x => x.v > 25);
  const isinListe = isin.map(x => ({ t: x.t, mod: x.mod, tip: (K.find(k => k.t === x.t) || {}).tip, v: +x.v.toFixed(1) }));

  /* Pozisyon sayısı: idx'in değiştiği kare sayısı değil, benzersiz olay sayısı. */
  const pozSet = new Set(K.map(k => k.idx));
  const pozN = Math.max(1, pozSet.size);

  /* Gerçek pas platoları: top 'pass' modunda ve hız 8-20 m/sn. */
  const pasKare = sicrama.filter(x => x.mod === 'pass');
  const pasPlato = topHiz.filter((x, i) => K[x.i].b[2] === 'pass' && x.v >= 8 && x.v <= 20).length;
  /* pas olayı sayısı: mod 'pass'a GİRİŞ sayısı */
  let pasOlay = 0;
  for (let i = 1; i < K.length; i++) if (K[i].b[2] === 'pass' && K[i - 1].b[2] !== 'pass') pasOlay++;

  /* Eğrilik: 0,25 sn arayla üç nokta → dönüş açısı. Yalnız hareket eden jeton sayılır. */
  const aci = [];
  const KESKIN = 90;
  for (let i = 0; i < 10; i++) {
    let a = 0;
    while (a < K.length) {
      let b = a, c;
      while (b + 1 < K.length && (K[b + 1].t - K[a].t) < 0.25) b++;
      c = b;
      while (c + 1 < K.length && (K[c + 1].t - K[b].t) < 0.25) c++;
      if (c >= K.length || c === b) break;
      const p0 = K[a].p[i], p1 = K[b].p[i], p2 = K[c].p[i];
      if (p0 && p1 && p2) {
        const v1 = [p1[0] - p0[0], p1[1] - p0[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
        const l1 = Math.hypot(v1[0], v1[1]), l2 = Math.hypot(v2[0], v2[1]);
        /* Anlamlı hareket şartı: iki bacak da ≥ 0,4 m (12 px) */
        if (l1 > 12 && l2 > 12) {
          const cos = Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)));
          aci.push({ a: Math.acos(cos) * 180 / Math.PI, idx: K[b].idx });
        }
      }
      a = b;
    }
  }
  const keskin = aci.filter(x => x.a > KESKIN);

  /* -- FAZ 41: YON TERSLEMESI (>150 derece, 0,1 sn adimlarla) -------------------------
     Brifin kabul olcutu. 0,25 sn / 90 derece olcusu (yukarida) YOL EGRILIGINI olcer; bu
     olcu TITREMEYI olcer: yerinde salinan jeton her 0,1 sn'de yon cevirir ama yol kat
     etmez. Bu yuzden asgari bacak uzunlugu sarti YOKTUR (koyulursa titreme elenip
     gorunmez olur) ve terslemelerin MEDYAN BACAK UZUNLUGU ayrica raporlanir —
     kucuk medyan = titreme. Olu top kareleri haric. */
  const ters = [];
  const TERS_ACI = 150, ADIM_SN = 0.1;
  for (let i = 0; i < 10; i++) {
    let a = 0;
    while (a < K.length - 2) {
      let b = a, c;
      while (b + 1 < K.length && (K[b + 1].t - K[a].t) < ADIM_SN) b++;
      c = b;
      while (c + 1 < K.length && (K[c + 1].t - K[b].t) < ADIM_SN) c++;
      if (c >= K.length || c === b || b === a) break;
      const p0 = K[a].p[i], p1 = K[b].p[i], p2 = K[c].p[i];
      if (p0 && p1 && p2 && !oluTop(K[b])) {
        const v1 = [p1[0] - p0[0], p1[1] - p0[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
        const l1 = Math.hypot(v1[0], v1[1]), l2 = Math.hypot(v2[0], v2[1]);
        if (l1 > 0.5 && l2 > 0.5) {
          const cos = Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)));
          const ac = Math.acos(cos) * 180 / Math.PI;
          if (ac > TERS_ACI) ters.push({ adim: Math.min(l1, l2) / PX_M, t: K[b].t });
        }
      }
      a = b;
    }
  }
  /* Saniye basina: olcum 10 jeton uzerinde yapildi, oran JETON BASINA saniyeye indirilir. */
  const izlenenSn = (K[K.length - 1].t - K[0].t) || 1;
  const tersSn = ters.length / izlenenSn / 10;
  const tersMedyan = ters.length ? medyan(ters.map(x => x.adim)) : 0;

  /* Tam sahayı tek düz çizgide geçen jeton: 700 px+ yer değiştirme, yol/kirişte sapma < %5 */
  let duzCapraz = 0; const duzListe = [];
  for (let i = 0; i < 10; i++) {
    let a = 0;
    while (a < K.length - 2) {
      let b = a, yol = 0;
      while (b + 1 < K.length && (K[b + 1].t - K[a].t) < 4.0) {
        const q = K[b].p[i], r = K[b + 1].p[i];
        if (q && r) yol += Math.hypot(r[0] - q[0], r[1] - q[1]);
        b++;
      }
      const p0 = K[a].p[i], p1 = K[b].p[i];
      if (p0 && p1) {
        const kiris = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        if (kiris > 700 && yol > 0 && (yol - kiris) / kiris < 0.05) { duzCapraz++; duzListe.push({ t: K[a].t, tip: K[a].tip, tipSon: K[b].tip, poz: p0[3], huc: p0[2], y0: Math.round(p0[1]), y1: Math.round(p1[1]) }); }
      }
      a = b > a ? b : a + 1;
    }
  }

  const yuzde = (arr, f) => arr.length ? 100 * arr.filter(f).length / arr.length : 0;
  const ort = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const pct = (arr, p) => { if (!arr.length) return 0; const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

  const oyV = tumOy.map(x => x.v);
  const topV = topHiz.map(x => x.v);

  /* ── FAZ 42-B: A4 · B · D · E ölçütleri ──────────────────────────────────────────────
     Kayıt eski biçimdeyse (alan yok) ilgili ölçüt null döner — kapı KURULMAZ. */
  const X0 = 56.4, X1 = 883.6, Y0 = 28.43, Y1 = 471.57, ORTA = 470;
  const yeniBicim = !!(K[0].p && K[0].p[0] && K[0].p[0].length >= 12);
  const sayac = (o, k) => { o[k] = (o[k] || 0) + 1; };
  const enBuyukler = (o, n) => Object.keys(o).sort((a, b) => o[b] - o[a]).slice(0, n).map(k => k + ':' + o[k]).join(' · ');
  /* A4 — saha çizgisi dışına taşan oyuncu (`_oob` izni olan sokucu muaf) */
  let disKare = 0, disMax = 0; const disTip = {};
  /* B — sahipsiz top: taşıyıcı yok, top uçmuyor (shot/rim/pass değil), en yakın oyuncu > 2 m */
  let sahipsizKare = 0; const sahTip = {}, sahMod = {}, sahChase = { takipVar: 0, takipYok: 0 };
  /* D — hücumcular arası en küçük ikili mesafe (< 2 m) ve set hücumunda arka sahada kalan hücumcu */
  let setKare = 0, yakinKare = 0, arkaKare = 0, arkaOyuncuToplam = 0; const yakinTip = {}, arkaTip = {}, arkaPoz = {};
  let hidKare = 0; let _onSahaBas = -1, _onSahaOnce = false;
  for (const k of K) {
    if (k.hid === 1) hidKare++;
    const P = k.p || [];
    let dis = false, dmax = 0;
    for (const q of P) {
      if (!q || (yeniBicim && q[11] === 1)) continue;
      const ox = Math.max(0, X0 - q[0], q[0] - X1), oy = Math.max(0, Y0 - q[1], q[1] - Y1);
      const o = Math.max(ox, oy);
      if (o > 0.5) { dis = true; if (o > dmax) dmax = o; }
    }
    if (dis) { disKare++; if (dmax > disMax) disMax = dmax; sayac(disTip, k.tip); }
    const mod = k.b && k.b[2];
    const tasiyan = P.some(q => q && q[4] === 1);
    if (!tasiyan && mod !== 'shot' && mod !== 'rim' && mod !== 'pass') {
      let ed = 1e9; for (const q of P) { if (q) { const d = Math.hypot(q[0] - k.b[0], q[1] - k.b[1]); if (d < ed) ed = d; } }
      if (ed > 2 * PX_M) { sahipsizKare++; sayac(sahTip, k.tip); sayac(sahMod, mod); if (k.ch === 1) sahChase.takipVar++; else sahChase.takipYok++; }
    }
    const _topOnSaha = k.b && (k.os === 1 ? k.b[0] < ORTA : k.b[0] > ORTA);
    if (_topOnSaha && !_onSahaOnce) _onSahaBas = k.t; _onSahaOnce = !!_topOnSaha;
    const _setKuruldu = _topOnSaha && (k.t - _onSahaBas) >= 1.0;
    /* CANLI SET: sokucu (_oob) sahadayken top elde olsa da ÖLÜ TOPTUR (foul/ihlal dalları S.inb kurmaz, sokucuyu doğrudan görevlendirir). */
    const _sokucuVar = yeniBicim && P.some(q => q && q[11] === 1);
    if (k.cs === 1 && (mod === "held" || mod === "pass") && k.ft !== 1 && k.inb !== 1 && !_sokucuVar && _setKuruldu) {
      setKare++;
      const off = P.filter(q => q && q[2] === 1 && !(yeniBicim && q[11] === 1));
      let mn = 1e9;
      for (let i = 0; i < off.length; i++) for (let j = i + 1; j < off.length; j++) mn = Math.min(mn, Math.hypot(off[i][0] - off[j][0], off[i][1] - off[j][1]));
      if (mn < 2 * PX_M && k.perde !== 1) { yakinKare++; sayac(yakinTip, k.tip); }
      if (k.os != null) {
        /* orta çizgiye ±12 px (0,4 m) — çizginin üstündeki oyuncu 'geride' sayılmaz; kodla aynı tolerans */
        const arka = off.filter(q => k.os === 1 ? q[0] > ORTA + 12 : q[0] < ORTA - 12).length;
        if (arka > 0) { arkaKare++; arkaOyuncuToplam += arka; sayac(arkaTip, k.tip); off.filter(q => k.os === 1 ? q[0] > ORTA + 12 : q[0] < ORTA - 12).forEach(q => sayac(arkaPoz, q[3] + (q[5] != null ? "/u" + q[5] : ""))); }
      }
    }
  }
  /* E — anlatım (render edilmiş balon) */
  const TRH = /[çğıöşüÇĞİÖŞÜ]/;
  /* İngilizce sözcük — kesme işaretli Türkçe ek (Collins'in, Olympia'da) EŞLEŞMEZ (ölçüldü: yanlış pozitif) */
  const ENW = /(^|[\s,.;:!?—-])(the|and|with|from|for|of|in|on|at|by|off|shot|rebound|foul|steal|points?|three|misses?|makes?|hits?|scores?|goes|gets|takes|pass|drives?|turnover|timeout|quarter|end|start)(?=[\s,.;:!?—-]|$)/i;
  const govde = (t) => t.replace(/^\s*(\d+P|Q\d+|U\d+|OT\d+)\s+\d+:\d\d\s*/, '');
  let trSatir = 0, enSatir = 0; const enOrnek = [];
  let sonucSatir = 0, oznesiz = 0; const oznesizOrnek = [];
  let noktalama = 0; const noktalamaOrnek = [];
  const kucukAdlar = new Set(); ADLAR.forEach(a => String(a).split(/\s+/).forEach(w => { if (/^[a-zçğıöşü]/.test(w)) kucukAdlar.add(w.replace(/[.,!?]+$/, '')); }));
  for (const b of BAL) {
    const g = govde(b.txt || '');
    if (!g) continue;
    if (ENW.test(g) && !TRH.test(g)) { enSatir++; if (enOrnek.length < 4) enOrnek.push(g.slice(0, 70)); } else trSatir++;
    const cls = b.cls || '';
    if (/ci-score|ci-foul/.test(cls) && !/ci-tactic|ci-hl/.test(cls)) {
      sonucSatir++;
      /* Öznesiz: gövde küçük harfle başlıyor ve içinde büyük harfle başlayan (ad) sözcük yok. */
      const ozneVar = /(^|[\s—(])[A-ZÇĞİÖŞÜ][a-zçğıöşüA-ZÇĞİÖŞÜ'’.-]+/.test(g);
      if (/^[a-zçğıöşü]/.test(g) && !ozneVar) { oznesiz++; if (oznesizOrnek.length < 4) oznesizOrnek.push(g.slice(0, 70)); }
    }
    /* Noktalama: nokta + boşluk + küçük harf; rakam sonrası nokta (sıra eki) ve küçük harfli özel ad muaf. */
    const re = /(^|[^0-9])\.\s+([a-zçğıöşü][^\s.,;!?]*)/g; let m;
    while ((m = re.exec(g))) { if (!kucukAdlar.has(m[2])) { noktalama++; if (noktalamaOrnek.length < 4) noktalamaOrnek.push(g.slice(Math.max(0, m.index - 20), m.index + 30)); break; } }
  }
  /* ── FAZ 43: İŞ 1 · İŞ 2 · İŞ 4 · İŞ 8 ölçütleri ─────────────────────────────────────
     Kayıt biçimi değişmedi; hepsi mevcut alanlardan türer (`--yeniden` ile eski kayıt da çözülür). */
  const _ucus = (m) => (m === 'shot' || m === 'rim');
  const _tasiyanIx = (k) => { const P = k.p || []; for (let i = 0; i < P.length; i++) if (P[i] && P[i][4] === 1) return i; return -1; };
  /* İŞ 1 — çember çıkışı: top {shot,rim} modundan {loose,held,pass} moduna geçtiği kare.
     Ele geçiş = ilk 'held' karesi (taşıyıcı işaretli) YA DA topun bir hedefe 'pass' olarak
     gönderildiği ilk kare — ikincisi "kimse dokunmadan uçan top" kusurudur ve ayrıca sayılır. */
  const cikis = [];
  for (let i = 1; i < K.length; i++) {
    const m0 = K[i - 1].b[2], m1 = K[i].b[2];
    if (!_ucus(m0) || _ucus(m1)) continue;
    const tC = K[i - 1].t, bx = K[i - 1].b[0], by = K[i - 1].b[1];
    let j = i, ele = -1, eleMod = null;
    for (; j < K.length && (K[j].t - tC) < 6; j++) {
      const m = K[j].b[2];
      if (m === 'held' && _tasiyanIx(K[j]) >= 0) { ele = j; eleMod = 'held'; break; }
      if (m === 'pass') { ele = j; eleMod = 'pass'; break; }
      if (_ucus(m)) break;   /* yeni şut başladı (ele geçmeden) */
    }
    let alanIx = -1, mesafe = null, alan = null;
    if (ele >= 0) {
      if (eleMod === 'held') alanIx = _tasiyanIx(K[ele]);
      else { /* pas: hedef, pasın bittiği karedeki taşıyıcı */
        let e = ele; while (e < K.length && K[e].b[2] === 'pass') e++;
        if (e < K.length) alanIx = _tasiyanIx(K[e]);
      }
      if (alanIx >= 0 && K[i - 1].p && K[i - 1].p[alanIx]) {
        const q = K[i - 1].p[alanIx];
        mesafe = Math.hypot(q[0] - bx, q[1] - by) / PX_M;
        alan = (q[2] ? 'HUC' : 'SAV') + '/' + q[3];
      }
    }
    cikis.push({ t: tC, from: m0, to: m1, tip: K[i - 1].tip, ele: ele >= 0 ? +(K[ele].t - tC).toFixed(2) : null, eleMod, mesafe: mesafe != null ? +mesafe.toFixed(2) : null, alan, dogrudan: (m1 === 'held' || m1 === 'pass') });
  }
  const cikisIhlal = cikis.filter(c => c.dogrudan || (c.ele != null && c.ele < 0.6) || (c.mesafe != null && c.mesafe > 2.5) || c.eleMod === 'pass');
  /* İŞ 2 — pas uzunluğu: 'pass' moduna giriş karesi ile çıkış karesi arasındaki mesafe */
  const paslar = [];
  for (let i = 1; i < K.length; i++) {
    if (K[i].b[2] !== 'pass' || K[i - 1].b[2] === 'pass') continue;
    let j = i; while (j + 1 < K.length && K[j + 1].b[2] === 'pass') j++;
    const uz = Math.hypot(K[j].b[0] - K[i - 1].b[0], K[j].b[1] - K[i - 1].b[1]) / PX_M;
    const ver = _tasiyanIx(K[i - 1]);
    const vq = ver >= 0 && K[i - 1].p ? K[i - 1].p[ver] : null;
    const sokma = !!(K[i - 1].inb === 1 || (vq && yeniBicim && vq[11] === 1));
    paslar.push({ t: K[i].t, uz: +uz.toFixed(1), sokma, tip: K[i].tip, veren: vq ? (vq[2] ? 'HUC' : 'SAV') + '/' + vq[3] : '?', onceMod: K[i - 1].b[2] });
  }
  const pas159 = paslar.filter(p => p.uz > 15.9), pas20 = paslar.filter(p => p.uz > 20);
  /* İŞ 8 — sahipsiz epizotlar (pass/shot/rim hariç; taşıyıcı yok; en yakın > 2 m) */
  const epizot = [];
  { let bas = -1;
    for (let i = 0; i <= K.length; i++) {
      let s = false;
      if (i < K.length) {
        const k = K[i], P = k.p || [], mod = k.b[2];
        if (!P.some(q => q && q[4] === 1) && mod !== 'shot' && mod !== 'rim' && mod !== 'pass') {
          let ed = 1e9; for (const q of P) if (q) { const d = Math.hypot(q[0] - k.b[0], q[1] - k.b[1]); if (d < ed) ed = d; }
          s = ed > 2 * PX_M;
        }
      }
      if (s && bas < 0) bas = i;
      if (!s && bas >= 0) { const a = K[bas], z = K[i - 1]; epizot.push({ t: a.t, sure: +(z.t - a.t + 0.016).toFixed(2), tip: a.tip, mod: a.b[2], ch: a.ch | 0, idx: a.idx }); bas = -1; }
    }
  }
  const epizotUzun = epizot.filter(e => e.sure > 1.0);
  const epizotBaglam = {}; epizot.forEach(e => { const kk = e.tip + '/' + e.mod; epizotBaglam[kk] = (epizotBaglam[kk] || 0) + e.sure; });
  /* İŞ 4 — orta çizgiyi TOPLA geçen oyuncu ve rolü; PF/C geçişinde topu kaç sn'dir tuttuğu */
  const gecisler = [];
  { let sonYari = null, sonTas = -1, tasBas = 0;
    for (let i = 0; i < K.length; i++) {
      const k = K[i], ti = _tasiyanIx(k);
      if (ti < 0) { sonTas = -1; continue; }
      if (ti !== sonTas) { sonTas = ti; tasBas = k.t; }
      const q = k.p[ti], yari = q[0] < ORTA ? 'L' : 'R';
      if (sonYari && yari !== sonYari && k.b[2] === 'held') gecisler.push({ t: k.t, poz: q[3], huc: q[2], tutma: +(k.t - tasBas).toFixed(2), tip: k.tip });
      sonYari = yari;
    }
  }
  const gecisUzun = gecisler.filter(g => g.poz === 'PF' || g.poz === 'C');
  const gecisIyi = gecisler.length - gecisUzun.length;
  const ek43 = {
    cikis: { n: cikis.length, dogrudan: cikis.filter(c => c.dogrudan).length, pasIle: cikis.filter(c => c.eleMod === 'pass').length, eleYok: cikis.filter(c => c.ele == null).length,
      eleMin: cikis.filter(c => c.ele != null).length ? Math.min.apply(null, cikis.filter(c => c.ele != null).map(c => c.ele)) : null,
      mesafeMax: cikis.filter(c => c.mesafe != null).length ? Math.max.apply(null, cikis.filter(c => c.mesafe != null).map(c => c.mesafe)) : null,
      ihlal: cikisIhlal, liste: cikis },
    pas: { n: paslar.length, ust159: pas159.length, ust159Oran: paslar.length ? +(100 * pas159.length / paslar.length).toFixed(1) : 0, ust20: pas20.length, uzunlar: pas159, sokmaN: paslar.filter(p => p.sokma).length, sokmaMax: paslar.filter(p => p.sokma).length ? Math.max.apply(null, paslar.filter(p => p.sokma).map(p => p.uz)) : 0 },
    epizot: { n: epizot.length, uzun: epizotUzun, toplamSn: +epizot.reduce((a, e) => a + e.sure, 0).toFixed(1), baglam: Object.keys(epizotBaglam).sort((a, b) => epizotBaglam[b] - epizotBaglam[a]).slice(0, 5).map(k => k + ':' + epizotBaglam[k].toFixed(1) + 's') },
    gecis: { n: gecisler.length, iyi: gecisIyi, iyiOran: gecisler.length ? +(100 * gecisIyi / gecisler.length).toFixed(0) : null, uzunlar: gecisUzun, dagilim: (() => { const o = {}; gecisler.forEach(g => o[g.poz] = (o[g.poz] || 0) + 1); return o; })() }
  };

  /* ── FAZ 44: HAVA ATIŞI + SOKMA YERLEŞİMİ ───────────────────────────────────────────
     Hava atışı: kayıt başından topun KAZANILMASINA (loose sonrası ilk 'held') kadar.
       · top 'idle' süresi (≤ 0,3 sn) · tepe yüksekliği (b[3], 9,84 px/m; ≥ 2 m)
       · toss anında çemberin 1,8 m'si içindeki oyuncu (= 2) · kazanılana kadar hiçbir yarı
         sahada 8'den fazla oyuncu yok · düdük→kazanma 1,5–2,5 sn.
     Sokma epizodu: top SAHA ÇİZGİSİ DIŞINDA ve bir oyuncunun elinde olduğu bitişik kareler.
       Pas anında (epizodun son karesi): sokucunun 15 m'si içindeki TAKIM ARKADAŞI ≥ 3,
       karşı yarı sahaya geçmiş oyuncu ≤ 4/10, ilk pas ≤ 14 m. Her epizot damgayla listelenir. */
  const ek44 = (() => {
    try {
      const CX = 470, CY = 250, PXH = 9.84;   /* yükseklik ölçeği: çember h=30 px ↔ 3,05 m */
      const t0 = K[0].t;
      let iIdle = -1, iLoose = -1, iTap = -1, iWon = -1;
      for (let i = 0; i < K.length && (K[i].t - t0) < 8; i++) {
        const m = K[i].b[2];
        if (iIdle < 0 && m !== 'idle') iIdle = i;
        if (iLoose < 0 && m === 'loose') iLoose = i;
        if (iLoose >= 0 && iTap < 0 && i > iLoose && m === 'pass') iTap = i;
        if (iLoose >= 0 && iWon < 0 && i > iLoose && m === 'held') { iWon = i; break; }
      }
      const hVar = K[0].b.length >= 4;
      const win = K.slice(0, (iWon >= 0 ? iWon : Math.min(K.length - 1, 360)) + 1);
      let hMax = 0; if (hVar) for (const k of win) if (k.b[3] > hMax) hMax = k.b[3];
      const tossK = iLoose >= 0 ? K[iLoose] : K[0];
      const cember = (tossK.p || []).map((q, ix) => ({ ix, d: Math.hypot(q[0] - CX, q[1] - CY) / PX_M, poz: q[3] })).filter(o => o.d <= 1.8);
      let maxYari = 0, maxYariT = null, tossDenge = null;
      for (const k of win) {
        let Ls = 0; for (const q of (k.p || [])) if (q[0] < ORTA) Ls++;
        const Rs = (k.p || []).length - Ls, mx = Math.max(Ls, Rs);
        if (mx > maxYari) { maxYari = mx; maxYariT = k.t; }
        if (k === tossK) tossDenge = Ls + '-' + Rs;
      }
      const hava = {
        idleSure: iIdle >= 0 ? +(K[iIdle].t - t0).toFixed(2) : null,
        tossT: iLoose >= 0 ? +(K[iLoose].t - t0).toFixed(2) : null,
        tapT: (iTap >= 0 && iLoose >= 0) ? +(K[iTap].t - K[iLoose].t).toFixed(2) : null,
        kazanmaT: (iWon >= 0 && iLoose >= 0) ? +(K[iWon].t - K[iLoose].t).toFixed(2) : null,
        hMax: hVar ? +(hMax / PXH).toFixed(2) : null,
        cemberde: cember.length,
        cemberListe: cember.map(c => (c.ix < 5 ? 'EV' : 'DEP') + '/' + c.poz + '@' + c.d.toFixed(2) + 'm'),
        cemberIkiTakim: cember.some(c => c.ix < 5) && cember.some(c => c.ix >= 5),
        tossDenge, maxYari, maxYariT
      };
      const havaIhlal = [];
      if (hava.idleSure == null || hava.idleSure > 0.3) havaIhlal.push('idle ' + hava.idleSure + ' sn');
      if (hava.hMax != null && hava.hMax < 2) havaIhlal.push('tepe ' + hava.hMax + ' m');
      if (hava.cemberde !== 2 || !hava.cemberIkiTakim) havaIhlal.push('çemberde ' + hava.cemberde);
      if (hava.maxYari > 8) havaIhlal.push('yarı saha ' + hava.maxYari);
      if (hava.kazanmaT == null || hava.kazanmaT < 1.5 || hava.kazanmaT > 2.5) havaIhlal.push('kazanma ' + hava.kazanmaT + ' sn');
      hava.ihlal = havaIhlal;

      const disarida = (k) => (k.b[0] < X0 || k.b[0] > X1 || k.b[1] < Y0 || k.b[1] > Y1);
      const olc = (k, ti) => {
        const q = k.p[ti]; let yakin = 0, yakinHepsi = 0, karsi = 0; const farL = q[0] >= ORTA;
        k.p.forEach((r, j) => {
          if (j === ti) return;
          const d = Math.hypot(r[0] - q[0], r[1] - q[1]);
          if (d <= 15 * PX_M) { yakinHepsi++; if (r[2] === q[2]) yakin++; }
          if (farL ? (r[0] < ORTA) : (r[0] > ORTA)) karsi++;
        });
        return { yakin, yakinHepsi, karsi };
      };
      const sokma = [];
      { let bas = -1;
        for (let i = 0; i <= K.length; i++) {
          let s = false;
          if (i < K.length) { const k = K[i]; s = k.b[2] === 'held' && _tasiyanIx(k) >= 0 && disarida(k); }
          if (s && bas < 0) bas = i;
          if (!s && bas >= 0) {
            const son = K[i - 1], ti = _tasiyanIx(son), q = son.p[ti];
            const o = olc(son, ti);
            let minYakin = 99;
            for (let j = bas; j < i; j++) { const tj = _tasiyanIx(K[j]); if (tj >= 0) { const oj = olc(K[j], tj); if (oj.yakin < minYakin) minYakin = oj.yakin; } }
            const pas = paslar.find(p => p.t >= son.t && p.t <= son.t + 1.2);
            sokma.push({ t: son.t, sure: +(son.t - K[bas].t + 0.016).toFixed(2), tip: son.tip, sokucu: (q[2] ? 'HUC' : 'SAV') + '/' + q[3],
              yakin: o.yakin, minYakin, yakinHepsi: o.yakinHepsi, karsi: o.karsi, ilkPas: pas ? pas.uz : null, bitis: i < K.length ? K[i].b[2] : '-' });
            bas = -1;
          }
        }
      }
      const sokmaKisa = sokma.filter(s => s.sure >= 0.25);   /* çizgiden içeri adım atarken 1-2 karelik dış kare epizot değildir */
      const sIhlal = (s) => s.yakin < 3 || s.karsi > 4 || (s.ilkPas != null && s.ilkPas > 14);
      return {
        hava,
        sokma: { n: sokmaKisa.length, ihlalN: sokmaKisa.filter(sIhlal).length,
          ortYakin: sokmaKisa.length ? +(sokmaKisa.reduce((a, s) => a + s.yakin, 0) / sokmaKisa.length).toFixed(2) : null,
          ortYakinHepsi: sokmaKisa.length ? +(sokmaKisa.reduce((a, s) => a + s.yakinHepsi, 0) / sokmaKisa.length).toFixed(2) : null,
          ortKarsi: sokmaKisa.length ? +(sokmaKisa.reduce((a, s) => a + s.karsi, 0) / sokmaKisa.length).toFixed(2) : null,
          liste: sokmaKisa.map(s => Object.assign({ ihlal: sIhlal(s) }, s)) }
      };
    } catch (e) { return { hata: String(e) }; }
  })();

  const ek42 = {
    yeniBicim,
    sahaDisi: yeniBicim ? { kareOran: +(100 * disKare / K.length).toFixed(2), kare: disKare, maxPx: +disMax.toFixed(1), baglam: enBuyukler(disTip, 3) } : null,
    sahipsiz: { kareOran: +(100 * sahipsizKare / K.length).toFixed(2), kare: sahipsizKare, tip: enBuyukler(sahTip, 4), mod: enBuyukler(sahMod, 3), takip: sahChase },
    hucumYakin: setKare ? { kareOran: +(100 * yakinKare / setKare).toFixed(2), setKare, baglam: enBuyukler(yakinTip, 3) } : null,
    arkaSaha: (setKare && K[0].os != null) ? { kareOran: +(100 * arkaKare / setKare).toFixed(2), kare: arkaKare, ortOyuncu: arkaKare ? +(arkaOyuncuToplam / arkaKare).toFixed(2) : 0, baglam: enBuyukler(arkaTip, 4), kim: enBuyukler(arkaPoz, 5) } : null,
    gizliKare: hidKare,
    anlatim: BAL.length ? { satir: BAL.length, tr: trSatir, en: enSatir, enOrnek, sonucSatir, oznesiz, oznesizOrnek, noktalama, noktalamaOrnek } : null
  };

  return {
    kare: K.length, sure: +(K[K.length - 1].t - K[0].t).toFixed(1),
    sahneKat: +sahneKat.toFixed(3),
    poz: pozN,
    top: {
      enYuksek: +enB(topV.concat([0])).toFixed(1),
      enYuksekSicrama: +enB(sicrama.map(x => x.v).concat([0])).toFixed(1),
      isinlanma: isin.length,
      isinlanmaPozBasi: +(isin.length / pozN).toFixed(2),
      isinModlar: (() => { const o = {}; isin.forEach(x => o[x.mod] = (o[x.mod] || 0) + 1); return o; })(),
      pasOlay: pasOlay,
      pasPlatoKare: pasPlato,
      ort: +ort(topV).toFixed(2)
    },
    oyuncu: {
      ort: +ort(oyV).toFixed(2),
      ortMac: +(ort(oyV) / sahneKat).toFixed(2),
      p50: +pct(oyV, 0.50).toFixed(2), p90: +pct(oyV, 0.90).toFixed(2), p99: +pct(oyV, 0.99).toFixed(2),
      p50m: +(pct(oyV, 0.50) / sahneKat).toFixed(2), p90m: +(pct(oyV, 0.90) / sahneKat).toFixed(2), p99m: +(pct(oyV, 0.99) / sahneKat).toFixed(2),
      enYuksek: +enB(oyV.concat([0])).toFixed(2),
      enYuksekMac: +(enB(oyV.concat([0])) / sahneKat).toFixed(2),
      /* Eşikler MAÇ ölçeğindedir; sahne hızı sahneKat ile bölünerek karşılaştırılır. */
      ust75mac: +yuzde(tumOy, x => x.v / sahneKat > 7.5).toFixed(1),
      ust65mac: +yuzde(tumOy, x => x.v / sahneKat > 6.5).toFixed(1),
      alt05mac: +yuzde(tumOy, x => x.v / sahneKat < 0.5).toFixed(1),
      ust8: +yuzde(tumOy, x => x.v > 8).toFixed(1),
      alt05: +yuzde(tumOy, x => x.v < 0.5).toFixed(1),
      /* Olu top haric donma (FAZ 41 kabul olcutu) */
      alt05macCanli: +yuzde(canliOy, x => x.v / sahneKat < 0.5).toFixed(1),
      canliOrnek: canliOy.length,
      ortMacCanli: +(ort(canliOy.map(x => x.v)) / sahneKat).toFixed(2),
      ornek: oyV.length,
      donKova: donKovaListe
    },
    egrilik: {
      olcum: aci.length,
      ortAci: +ort(aci.map(x => x.a)).toFixed(1),
      keskin90: keskin.length,
      keskinPozBasi: +(keskin.length / pozN).toFixed(2),
      /* FAZ 41: titreme olcutu */
      ters150: ters.length,
      ters150Sn: +tersSn.toFixed(3),
      ters150Medyan: +tersMedyan.toFixed(2),
      duzCapraz,
      duzListe,
      isinListe
    },
    ek42,
    ek43,
    ek44
  };
}

function bas(R, dosya) {
  const L = [];
  L.push('\n' + '='.repeat(78));
  L.push(`İZ ÖLÇÜMÜ — ${ETIKET} · ${R.kare} kare · ${R.sure} sn · ${R.poz} pozisyon · seed=${SEED} · rate=${RATE}`);
  L.push('='.repeat(78));
  L.push(`  sahne→maç sıkıştırma      1 duvar sn = ${R.sahneKat} maç sn`);
  L.push('');
  L.push('  ── TOP ──                            ölçülen           hedef');
  L.push(`  en yüksek hız (100 ms)         ${String(R.top.enYuksek + ' m/sn').padStart(16)}    ≤ 22`);
  L.push(`  en yüksek kare sıçraması       ${String(R.top.enYuksekSicrama + ' m/sn').padStart(16)}    ≤ 25`);
  L.push(`  ışınlanma (>25 m/sn) olayı     ${String(R.top.isinlanma + ' (' + R.top.isinlanmaPozBasi + '/poz)').padStart(16)}    0`);
  L.push(`     ışınlanma modları           ${JSON.stringify(R.top.isinModlar)}`);
  L.push(`  pas olayı / 8-20 m/sn platosu  ${String(R.top.pasOlay + ' / ' + R.top.pasPlatoKare).padStart(16)}    korunmalı`);
  L.push('');
  L.push('  ── OYUNCU ── (MAÇ ölçeği = sahne / ' + R.sahneKat + ')');
  L.push(`  ortalama hız              maç ${String(R.oyuncu.ortMac + ' m/sn').padStart(11)}    1,8 – 2,6   [sahne ${R.oyuncu.ort}]`);
  L.push(`  medyan / p90 / p99        maç ${String(R.oyuncu.p50m + ' / ' + R.oyuncu.p90m + ' / ' + R.oyuncu.p99m).padStart(11)}                [sahne ${R.oyuncu.p50} / ${R.oyuncu.p90} / ${R.oyuncu.p99}]`);
  L.push(`  en yüksek                 maç ${String(R.oyuncu.enYuksekMac + ' m/sn').padStart(11)}    ≤ 8,5       [sahne ${R.oyuncu.enYuksek}]`);
  L.push(`  > 7,5 m/sn (maç) oranı        ${String(R.oyuncu.ust75mac + '%').padStart(11)}    ≤ 1%`);
  L.push(`  > 6,5 m/sn (maç) oranı        ${String(R.oyuncu.ust65mac + '%').padStart(11)}    ≤ 5%`);
  L.push(`  < 0,5 m/sn — OLU TOP HARIC   ${String(R.oyuncu.alt05macCanli + '%').padStart(18)}    <= 12%      [n=${R.oyuncu.canliOrnek}]`);
  L.push(`  canli top ortalama hizi   maç ${String(R.oyuncu.ortMacCanli + ' m/sn').padStart(11)}    1,8 - 2,6`);
  if (R.oyuncu.donKova && R.oyuncu.donKova.length) L.push('     donma kovaları: ' + R.oyuncu.donKova.join(' · '));
  L.push(`  < 0,5 m/sn (maç) oranı        ${String(R.oyuncu.alt05mac + '%').padStart(11)}    ≤ 12%       [sahne ${R.oyuncu.alt05}%]`);
  L.push('');
  L.push('  ── YOL EĞRİLİĞİ ──');
  L.push(`  ortalama dönüş açısı (0,25 sn) ${String(R.egrilik.ortAci + '°').padStart(16)}    (n=${R.egrilik.olcum})`);
  L.push(`  > 150° yön terslemesi (0,1 sn) ${String(R.egrilik.ters150Sn + '/sn').padStart(13)}    <= 0,15/sn  [n=${R.egrilik.ters150}]`);
  L.push(`  terslemelerin medyan adımı    ${String(R.egrilik.ters150Medyan + ' m').padStart(14)}    >= 0,5 m`);
  L.push(`  > 90° keskin dönüş             ${String(R.egrilik.keskin90 + ' (' + R.egrilik.keskinPozBasi + '/poz)').padStart(16)}    ≤ 2/poz`);
  L.push(`  tam sahayı düz geçen jeton     ${String(R.egrilik.duzCapraz).padStart(16)}    0`);
  if (R.egrilik.duzListe && R.egrilik.duzListe.length) L.push('     düz geçenler: ' + R.egrilik.duzListe.map(x => x.t + 's ' + (x.huc ? 'HUC' : 'SAV') + '/' + x.poz + ' ' + x.tip + '→' + x.tipSon + ' y' + x.y0 + '→' + x.y1).join(' | '));
  if (R.egrilik.isinListe && R.egrilik.isinListe.length) L.push('     ışınlanmalar: ' + R.egrilik.isinListe.map(x => x.t + 's ' + x.mod + '/' + x.tip + ' ' + x.v + ' m/sn').join(' | '));
  L.push('');
  if (R.ek42) {
    const E = R.ek42;
    L.push('  ── FAZ 42-B: A4 · B · D · E ──');
    if (E.sahaDisi) L.push(`  saha dışı oyuncu (_oob hariç)  ${String(E.sahaDisi.kareOran + '% kare').padStart(16)}    0    [maks ${E.sahaDisi.maxPx} px · ${E.sahaDisi.baglam || '-'}]`);
    else L.push('  saha dışı oyuncu               (eski kayıt — _oob alanı yok, ölçülemedi)');
    L.push(`  sahipsiz top karesi            ${String(E.sahipsiz.kareOran + '%').padStart(16)}    ≤ 2%   [tip: ${E.sahipsiz.tip || '-'} · mod: ${E.sahipsiz.mod || '-'} · takip var/yok ${E.sahipsiz.takip.takipVar}/${E.sahipsiz.takip.takipYok}]`);
    if (E.hucumYakin) L.push(`  hücumcu ikili < 2 m (set, perde hariç) ${String(E.hucumYakin.kareOran + '%').padStart(8)}    ≤ 5%   [set karesi ${E.hucumYakin.setKare} · ${E.hucumYakin.baglam || '-'}]`);
    if (E.arkaSaha) L.push(`  set hücumunda arka sahada hücumcu ${String(E.arkaSaha.kareOran + '% kare').padStart(13)}    0      [ort ${E.arkaSaha.ortOyuncu} oyuncu · ${E.arkaSaha.baglam} · kim: ${E.arkaSaha.kim}]`);
    else L.push('  set hücumunda arka sahada hücumcu (eski kayıt — os alanı yok, ölçülemedi)');
    L.push(`  gizli sekme karesi             ${String(E.gizliKare).padStart(16)}    (C — 0 beklenir, kayıt ön planda)`);
    if (E.anlatim) {
      const A = E.anlatim;
      L.push(`  anlatım dili (oyun: ${R.dil || '?'})        TR ${A.tr} · EN ${A.en}    EN = 0` + (A.en ? '   ör: ' + A.enOrnek.join(' | ') : ''));
      L.push(`  öznesiz sonuç satırı           ${String(A.oznesiz + ' / ' + A.sonucSatir).padStart(16)}    0` + (A.oznesiz ? '   ör: ' + A.oznesizOrnek.join(' | ') : ''));
      L.push(`  nokta + küçük harf (balon)     ${String(A.noktalama + ' / ' + A.satir).padStart(16)}    0` + (A.noktalama ? '   ör: ' + A.noktalamaOrnek.join(' | ') : ''));
    } else L.push('  anlatım                        (balon kaydı yok)');
    L.push('');
  }
  if (R.ek43) {
    const F = R.ek43;
    L.push('  ── FAZ 43: İŞ 1 · İŞ 2 · İŞ 4 · İŞ 8 ──');
    L.push(`  çember çıkışı (shot/rim → yer)  ${String(F.cikis.n).padStart(15)}    [doğrudan held/pass: ${F.cikis.dogrudan} · pasla ele: ${F.cikis.pasIle} · ele geçmeyen: ${F.cikis.eleYok}]`);
    L.push(`     çıkış→ele en kısa süre      ${String((F.cikis.eleMin != null ? F.cikis.eleMin : '-') + ' sn').padStart(15)}    ≥ 0,6 sn (her vaka)`);
    L.push(`     alanın çıkış anı mesafesi   ${String((F.cikis.mesafeMax != null ? F.cikis.mesafeMax : '-') + ' m').padStart(15)}    ≤ 2,5 m (her vaka)`);
    if (F.cikis.ihlal.length) L.push('     İHLAL: ' + F.cikis.ihlal.map(c => `${c.t}s ${c.from}→${c.to}${c.dogrudan ? '(DOĞRUDAN)' : ''} ${c.tip} ele=${c.ele != null ? c.ele + 's' : '-'}${c.eleMod === 'pass' ? '(PAS)' : ''} ${c.mesafe != null ? c.mesafe + 'm' : ''} ${c.alan || ''}`).join(' | '));
    L.push(`  pas > 15,9 m oranı             ${String(F.pas.ust159Oran + '% (' + F.pas.ust159 + '/' + F.pas.n + ')').padStart(16)}    ≤ 4%   [sokma pası ${F.pas.sokmaN} · en uzun sokma ${F.pas.sokmaMax} m]`);
    L.push(`  pas > 20 m                     ${String(F.pas.ust20).padStart(16)}    ≤ 1 / maç`);
    if (F.pas.uzunlar.length) L.push('     uzun paslar: ' + F.pas.uzunlar.map(p => `${p.t}s ${p.uz}m ${p.sokma ? 'SOKMA' : p.onceMod} ${p.veren} ${p.tip}`).join(' | '));
    L.push(`  sahipsiz epizot                ${String(F.epizot.n + ' (' + F.epizot.toplamSn + ' sn)').padStart(16)}    1 sn üstü = 0   [${F.epizot.baglam.join(' · ')}]`);
    if (F.epizot.uzun.length) L.push('     1 sn ÜSTÜ: ' + F.epizot.uzun.map(e => `${e.t}s ${e.sure}sn ${e.tip}/${e.mod}${e.ch ? '/takip' : ''}`).join(' | '));
    L.push(`  yarı sahayı topla geçen PG/SG/SF ${String((F.gecis.iyiOran != null ? F.gecis.iyiOran : '-') + '% (' + F.gecis.iyi + '/' + F.gecis.n + ')').padStart(14)}    ≥ 90%   ${JSON.stringify(F.gecis.dagilim)}`);
    if (F.gecis.uzunlar.length) L.push('     PF/C geçişleri: ' + F.gecis.uzunlar.map(g => `${g.t}s ${g.poz} tutma=${g.tutma}s ${g.tip}`).join(' | '));
    L.push('');
  }
  if (R.ek44 && !R.ek44.hata) {
    const H = R.ek44.hava, Sk = R.ek44.sokma;
    const f = (v, ek) => (v == null ? '-' : v + (ek || ''));
    L.push('  ── FAZ 44: HAVA ATIŞI · SOKMA YERLEŞİMİ ──');
    L.push(`  hava atışı: top idle süresi    ${String(f(H.idleSure, ' sn')).padStart(16)}    ≤ 0,3 sn   [toss t=${f(H.tossT)}]`);
    L.push(`     toss→tap / toss→kazanma     ${String(f(H.tapT) + ' / ' + f(H.kazanmaT, ' sn')).padStart(15)}    kazanma 1,5–2,5 sn`);
    L.push(`     top tepe yüksekliği         ${String(f(H.hMax, ' m')).padStart(15)}    ≥ 2 m${H.hMax == null ? ' (kayıtta yükseklik yok)' : ''}`);
    L.push(`     toss anında çemberde        ${String(H.cemberde).padStart(15)}    = 2 (iki takım)   [${H.cemberListe.join(' · ')}]`);
    L.push(`     saha dengesi (toss / en çok) ${String(f(H.tossDenge) + ' / ' + H.maxYari).padStart(14)}    ≤ 8 tek yarıda   [en kalabalık t=${f(H.maxYariT)}]`);
    L.push(`     ${H.ihlal.length ? '✗ İHLAL: ' + H.ihlal.join(' · ') : '✓ hava atışı kapıları'}`);
    L.push(`  sokma epizodu (top çizgi dışı) ${String(Sk.n + ' · ihlal ' + Sk.ihlalN).padStart(16)}    her epizot: takım arkadaşı(15 m) ≥ 3 · karşı yarı ≤ 4 · ilk pas ≤ 14 m`);
    L.push(`     ortalama: yakın takım arkadaşı ${f(Sk.ortYakin)} · yakın herkes ${f(Sk.ortYakinHepsi)}/9 · karşı yarıda ${f(Sk.ortKarsi)}/9`);
    Sk.liste.forEach(s => L.push(`     ${s.ihlal ? '✗' : '✓'} t=${s.t}s ${s.tip} ${s.sokucu} süre=${s.sure}s yakın=${s.yakin}(min ${s.minYakin}, herkes ${s.yakinHepsi}) karşı=${s.karsi} ilkPas=${f(s.ilkPas, ' m')} → ${s.bitis}`));
    L.push('');
  } else if (R.ek44 && R.ek44.hata) L.push('  FAZ 44 çözümleme hatası: ' + R.ek44.hata);
  L.push(`  konsol hatası: ${R.konsolHata}` + (R.startErr ? ' · startMatch: ' + R.startErr : ''));
  L.push(`  iz: ${path.relative(ROOT, dosya)}`);
  console.log(L.join('\n'));
}

main().catch(e => { console.error(e); process.exit(1); });
