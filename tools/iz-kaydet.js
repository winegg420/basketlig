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
    const R = analiz(d.kare); R.konsolHata = 0; R.startErr = null;
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
            b: [+b.x.toFixed(1), +b.y.toFixed(1), b.mode],
            /* Teşhis: donmanın SEBEBİNİ ayırt etmek için (set mi, kilit mi, kademe mi). */
            cs: S.canliSet ? 1 : 0,
            /* FAZ 41: OLU TOP ayrimi — serbest atis dizilisi / kenardan sokma. Bu
               karelerde duran jeton NORMALDIR (dizilim olculerek ayarlandi, F14-7). */
            ft: S._ftAktif ? 1 : 0,
            inb: S.inb ? 1 : 0,
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
              (p._nudgeN | 0)                                  /* 10: salınım atama sayacı */
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

  const veri = await page.evaluate(() => ({ kare: window.__IZ.kare, startErr: window.__startErr || null }));
  await page.evaluate(() => { try { stopMatch(); } catch (e) {} });
  await browser.close(); srv.close();

  const izDosya = path.join(OUT, `iz-${ETIKET}.json`);
  fs.writeFileSync(izDosya, JSON.stringify({ meta: { etiket: ETIKET, seed: SEED, secs: SECS, rate: RATE, pxM: PX_M }, kare: veri.kare }));

  const R = analiz(veri.kare);
  R.konsolHata = hatalar.length;
  R.startErr = veri.startErr;
  fs.writeFileSync(path.join(OUT, `iz-${ETIKET}-ozet.json`), JSON.stringify(R, null, 2));
  bas(R, izDosya);
  if (hatalar.length) hatalar.slice(0, 4).forEach(e => console.log('   ! ' + e));
}

/* ── ANALİZ ────────────────────────────────────────────────────────────────────────── */
function analiz(K) {
  if (K.length < 10) return { hata: 'kare yok', kare: K.length };

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
      out.push({ i, t: K[i].t, v: Math.hypot(b[0] - a[0], b[1] - a[1]) / dt / PX_M, idx: K[i].idx });
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
  let duzCapraz = 0;
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
        if (kiris > 700 && yol > 0 && (yol - kiris) / kiris < 0.05) duzCapraz++;
      }
      a = b > a ? b : a + 1;
    }
  }

  const yuzde = (arr, f) => arr.length ? 100 * arr.filter(f).length / arr.length : 0;
  const ort = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const pct = (arr, p) => { if (!arr.length) return 0; const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

  const oyV = tumOy.map(x => x.v);
  const topV = topHiz.map(x => x.v);

  return {
    kare: K.length, sure: +(K[K.length - 1].t - K[0].t).toFixed(1),
    sahneKat: +sahneKat.toFixed(3),
    poz: pozN,
    top: {
      enYuksek: +Math.max.apply(null, topV.concat([0])).toFixed(1),
      enYuksekSicrama: +Math.max.apply(null, sicrama.map(x => x.v).concat([0])).toFixed(1),
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
      enYuksek: +Math.max.apply(null, oyV.concat([0])).toFixed(2),
      enYuksekMac: +(Math.max.apply(null, oyV.concat([0])) / sahneKat).toFixed(2),
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
      ornek: oyV.length
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
      duzCapraz
    }
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
  L.push(`  < 0,5 m/sn (maç) oranı        ${String(R.oyuncu.alt05mac + '%').padStart(11)}    ≤ 12%       [sahne ${R.oyuncu.alt05}%]`);
  L.push('');
  L.push('  ── YOL EĞRİLİĞİ ──');
  L.push(`  ortalama dönüş açısı (0,25 sn) ${String(R.egrilik.ortAci + '°').padStart(16)}    (n=${R.egrilik.olcum})`);
  L.push(`  > 150° yön terslemesi (0,1 sn) ${String(R.egrilik.ters150Sn + '/sn').padStart(13)}    <= 0,15/sn  [n=${R.egrilik.ters150}]`);
  L.push(`  terslemelerin medyan adımı    ${String(R.egrilik.ters150Medyan + ' m').padStart(14)}    >= 0,5 m`);
  L.push(`  > 90° keskin dönüş             ${String(R.egrilik.keskin90 + ' (' + R.egrilik.keskinPozBasi + '/poz)').padStart(16)}    ≤ 2/poz`);
  L.push(`  tam sahayı düz geçen jeton     ${String(R.egrilik.duzCapraz).padStart(16)}    0`);
  L.push('');
  L.push(`  konsol hatası: ${R.konsolHata}` + (R.startErr ? ' · startMatch: ' + R.startErr : ''));
  L.push(`  iz: ${path.relative(ROOT, dosya)}`);
  console.log(L.join('\n'));
}

main().catch(e => { console.error(e); process.exit(1); });
