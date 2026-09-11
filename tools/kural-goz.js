#!/usr/bin/env node
/**
 * Charazay 2.0 — KURAL GÖZÜ: BASKETBOL KURALI DENETÇİSİ (FAZ 76)
 *
 * Neden var: FAZ 68-75'in bütün denetçileri GEOMETRİK ölçüyordu (çakışma, mesafe,
 * yayılım) ve o kalemlerin çoğu ölçüm düzeltilince gürültü çıktı. Kullanıcı ise
 * "basketbola özgü olmayan davranış" diyordu — hiçbir araç OYUNUN KURALLARINA
 * bakmıyordu. Bu araç o boşluğu kapatır.
 *
 * Ölçtükleri (hepsi EPİZOT ve TOPLAM SANİYE olarak raporlanır — olay sayısı DEĞİL):
 *   UCLUK_CIZGISINDE_KIMSE_YOK  hücumun en uzak oyuncusu bile potaya 209 px'ten yakın
 *   TOP_POTA_DIBINDE_SAHIPSIZ   top pota dibinde sahipsiz, en yakın oyuncu 50 px+ uzakta
 *   SAYI_SONRASI_TAC_YANLIS     sayı sonrası sokucu, sayı olan potanın dip çizgisinden uzak
 *   HAVA_ATISI_MERKEZ_DISI      maç başında top merkez daireden uzakta
 *   TOP_SICRADI                 mod değişmeden top tek karede 40 px+ yer değiştirdi
 *   BOYADA_3_HUCUMCU            aynı anda boyalı alanda 3+ hücumcu
 *
 * ⚠ setInterval(16) KULLANIR, requestAnimationFrame DEĞİL: rAF arka plan sekmesinde
 *   boğuluyor ve ölçüm sessizce duruyor (canlı oturumda yakalandı).
 *
 * Kullanım:
 *   node tools/kural-goz.js [--sn=300] [--playoff] [--seed=987654321] [--exec=/yol/chromium]
 * Ham döküm: tools/kural-goz-rapor.json
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? parseFloat(a.split('=')[1]) : d; };
const str = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const SN = num('sn', 300);
const SEED = num('seed', 987654321);
const EXEC = str('exec', null);
const PLAYOFF = args.includes('--playoff');

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

function kaydedici() {
  const G0 = window.__KG = {
    kare: 0, ep: {}, acik: {}, olay: [], sonSkor: null, hava: null,
    tacOrn: [], ucOrn: [], potaOrn: [], slotOrn: [], geriOrn: [], geri2Orn: [], rakOrn: [], f: {}
  };
  const X0 = 56.4, X1 = 883.6, Y0 = 28.43, Y1 = 471.57, MID = 470;
  const UC_R = 209;          /* üç sayı çizgisi yarıçapı (px) */
  let onceki = null, oncekiMod = null, t0 = performance.now();
  /* epizot: bir ihlal AÇIK kaldığı sürece tek epizottur; kapanınca süresi eklenir */
  const ac = (tip, saat, bilgi) => {
    if (G0.acik[tip]) return;
    G0.acik[tip] = { t: performance.now(), saat, bilgi };
    const e = G0.ep[tip] || (G0.ep[tip] = { n: 0, sn: 0 });
    e.n++;
    if (G0.olay.length < 500) G0.olay.push({ tip, saat, bilgi });
  };
  const kapa = (tip) => {
    const a = G0.acik[tip]; if (!a) return;
    G0.ep[tip].sn += (performance.now() - a.t) / 1000;
    G0.acik[tip] = null;
  };
  const tik = () => {
    try {
      const S = mState && mState._sim, P = S && S.players, b = S && S.ball;
      if (!S || !b || !P || P.length < 10) return;
      const clk = mState._clkNow || 0;
      const saat = (mState.quarter || 1) + 'P ' + Math.floor(clk / 60) + ':' + String(Math.floor(clk % 60)).padStart(2, '0');
      G0.kare++;
      /* ── hava atışı: maçın ilk ölçülebilir karesi ── */
      if (G0.hava === null && (mState.idx | 0) <= 1) {
        const d = Math.hypot(b.x - MID, b.y - 250);
        G0.hava = +d.toFixed(0);
        if (d > 45) { ac('HAVA_ATISI_MERKEZ_DISI', saat, 'top merkezden ' + d.toFixed(0) + ' px'); kapa('HAVA_ATISI_MERKEZ_DISI'); }
      }
      const offP = S.offP || [], defP = S.defP || [];
      let rim = null; try { if (S.offSide != null && typeof _rim === 'function') rim = _rim(S.offSide); } catch (e) {}
      /* ── üçlük çizgisinde kimse yok · boyada 3+ hücumcu ── */
      if (rim && offP.length >= 5 && (b.mode === 'held' || b.mode === 'pass')) {
        let enUzak = 0, boyada = 0;
        for (const q of offP) {
          if (!q || !isFinite(q.x)) continue;
          const dr = Math.hypot(q.x - rim[0], q.y - rim[1]);
          if (dr > enUzak) enUzak = dr;
          if (Math.abs(q.x - rim[0]) < 171 && Math.abs(q.y - 250) < 72) boyada++;
        }
        /* yalnız ÖN SAHA hücumunda anlamlı: top rakip yarıda ve taşıyıcı ön sahada */
        const onSaha = (S.offSide ? (b.x < MID) : (b.x > MID));
        if (onSaha && enUzak < UC_R) {
          ac('UCLUK_CIZGISINDE_KIMSE_YOK', saat, 'en uzak hücumcu ' + enUzak.toFixed(0) + ' px');
          if (G0.ucOrn.length < 10) G0.ucOrn.push(saat + ' ' + enUzak.toFixed(0) + 'px');
        } else kapa('UCLUK_CIZGISINDE_KIMSE_YOK');
        if (onSaha && boyada >= 3) ac('BOYADA_3_HUCUMCU', saat, boyada + ' hücumcu'); else kapa('BOYADA_3_HUCUMCU');
      } else { kapa('UCLUK_CIZGISINDE_KIMSE_YOK'); kapa('BOYADA_3_HUCUMCU'); }
      /* ── FAZ 77 İŞ 1: ORTA SAHA YIĞILMASI — yumak potadan orta sahaya taşınmış olabilir.
         Mevcut ölçüt "potaya uzaklık" olduğu için bunu göremiyordu. */
      { let ortaN = 0;
        for (const q of P) if (Math.abs(q.x - MID) < 120) ortaN++;
        if (ortaN >= 4) ac('ORTA_SAHA_YIGILMASI', saat, ortaN + ' oyuncu orta sahada'); else kapa('ORTA_SAHA_YIGILMASI');
        G0.ortaTop = (G0.ortaTop || 0) + ortaN; G0.ortaN = (G0.ortaN || 0) + 1; }
      /* ── FAZ 77 İŞ 2 teşhisi: pota çevresinde (150 px) kaç oyuncu var ── */
      { let rimN = 0; const _rr = [[62,250],[878,250]];
        for (const q of P) { for (const r of _rr) if (Math.hypot(q.x-r[0], q.y-r[1]) < 150) { rimN++; break; } }
        G0.rimTop = (G0.rimTop || 0) + rimN; G0.rimN = (G0.rimN || 0) + 1; }
      /* ── top potanın dibinde sahipsiz ── */
      if ((b.mode === 'loose' || b.mode === 'dead') && !(S._hakemTop && S._hakemTop.aktif)) {
        const r1 = [62, 250], r2 = [878, 250];
        const dr = Math.min(Math.hypot(b.x - r1[0], b.y - r1[1]), Math.hypot(b.x - r2[0], b.y - r2[1]));
        let en = 1e9; for (const q of P) { const d = Math.hypot(q.x - b.x, q.y - b.y); if (d < en) en = d; }
        if (dr < 130 && en > 50) {
          ac('TOP_POTA_DIBINDE_SAHIPSIZ', saat, 'pota ' + dr.toFixed(0) + ' px · en yakın oyuncu ' + en.toFixed(0) + ' px');
          if (G0.potaOrn.length < 10) G0.potaOrn.push(saat + ' oyuncu ' + en.toFixed(0) + 'px');
        } else kapa('TOP_POTA_DIBINDE_SAHIPSIZ');
      } else kapa('TOP_POTA_DIBINDE_SAHIPSIZ');
      /* ── sayı sonrası taç: skor değişti → sokucunun konumu ölçülür ── */
      const sk = (mState.score || [0, 0]).join('-');
      if (G0.sonSkor !== null && sk !== G0.sonSkor) {
        G0._tacBekle = { saat, t: performance.now() };
      }
      G0.sonSkor = sk;
      /* ── FAZ 77: SOKUCU DİP ÇİZGİYE HİÇ ÇIKTI MI ────────────────────────────────────
         Önceki sürüm pasın atıldığı TEK KAREYİ yakalamaya çalışıyordu; 16 ms örnekleme
         onu kaçırdığı için ölçüm sahte "0" veriyordu (tacHepsi dizisi boş kaldı).
         Doğru ölçüt: sokma yaşadığı sürece sokucunun dip çizgiye EN YAKIN olduğu mesafe.
         Sokucu hiç çizgiye çıkmadıysa bu minimum büyük kalır. */
      if (S.inb && S.inb.tok) {
        const inb = S.inb.tok;
        const rr = (Math.abs(S.inb.x - 62) < Math.abs(S.inb.x - 878)) ? 62 : 878;
        const d = Math.abs(inb.x - rr);
        if (!G0._tacIzle || G0._tacIzle.tok !== inb) G0._tacIzle = { tok: inb, min: d, sayi: !!G0._tacBekle, saat };
        else { if (d < G0._tacIzle.min) G0._tacIzle.min = d; if (G0._tacBekle) G0._tacIzle.sayi = true; }
      } else if (G0._tacIzle) {
        const T = G0._tacIzle; G0._tacIzle = null;
        (G0.tacHepsi = G0.tacHepsi || []).push({ min: Math.round(T.min), sayi: T.sayi });
        if (T.sayi && T.min > 100) {
          ac('SAYI_SONRASI_TAC_YANLIS_YERDE', T.saat, 'sokucu dip çizgiye en fazla ' + T.min.toFixed(0) + ' px yaklaştı');
          kapa('SAYI_SONRASI_TAC_YANLIS_YERDE');
          if (G0.tacOrn.length < 10) G0.tacOrn.push(T.saat + ' ' + T.min.toFixed(0) + 'px');
        }
        G0._tacBekle = null;
      }
      if (G0._tacBekle && performance.now() - G0._tacBekle.t > 9000) G0._tacBekle = null;
      /* ══ FAZ 78 ÖLÇÜMLERİ — KARE PAYI (ham kare sayısı DEĞİL, brif §0) ══════════════
         Her kalem KLİP ve FİZİK kareleri AYRI sayılır (FAZ 71 dersi): klip, gerçek
         SportVU kaydının birebir oynatılmasıdır ve kontrol grubudur. */
      {
        const klipKare = !!(S._klipTop) || P.some(q => q && q._klip);
        const KA = G0.f || (G0.f = {});
        /* faz etiketi: klip / OAM fazı / bekleme (OAM kapalı) — kusurun NEREDE olduğu */
        const O = S.oam;
        const fazAd = klipKare ? 'klip' : ((O && O.aktif) ? ('oam:' + (O.faz || '?')) : 'bekle');
        const say = (k, v) => { const o = KA[k] || (KA[k] = { n: 0, h: 0, k: 0, tn: 0, nk: 0, nf: 0 }); o.n++; if (klipKare) o.nk++; else o.nf++; if (v) { o.h++; if (klipKare) o.k++; else o.tn++; } };
        /* 1) AYNI SLOTTA İKİ HÜCUMCU — ayırt edici ölçüt HEDEF mesafesidir (FAZ 69) */
        if (offP.length >= 5) {
          let en = 1e9, ea = null, eb = null;
          for (let i = 0; i < offP.length; i++) for (let j = i + 1; j < offP.length; j++) {
            const a = offP[i], c = offP[j]; if (!a || !c || !isFinite(a.x) || !isFinite(c.x)) continue;
            const d = Math.hypot(a.x - c.x, a.y - c.y); if (d < en) { en = d; ea = a; eb = c; }
          }
          const cak = en < 30;
          say('AYNI_SLOTTA_IKI_HUCUMCU', cak);
          /* Kullanıcının GÖRDÜĞÜ mesafe: çizim ayrıştırması uygulanmış konum (FAZ 57) */
          { let ec = 1e9;
            for (let i = 0; i < offP.length; i++) for (let j = i + 1; j < offP.length; j++) {
              const a = offP[i], c = offP[j]; if (!a || !c || !isFinite(a.x) || !isFinite(c.x)) continue;
              const ax = a.x + (a._cizDx || 0), ay = a.y + (a._cizDy || 0), cx = c.x + (c._cizDx || 0), cy = c.y + (c._cizDy || 0);
              const d = Math.hypot(ax - cx, ay - cy); if (d < ec) ec = d;
            }
            say('CIZIMDE_IKI_HUCUMCU', ec < 26.2);
            if (ec < 26.2) { G0.cizMin = Math.min(G0.cizMin == null ? 1e9 : G0.cizMin, ec); G0.cizTop = (G0.cizTop || 0) + ec; G0.cizN = (G0.cizN || 0) + 1; } }
          if (cak && ea && eb) {
            const hd = (isFinite(ea.tx) && isFinite(eb.tx)) ? Math.hypot(ea.tx - eb.tx, ea.ty - eb.ty) : -1;
            say('AYNI_HEDEF_IKI_HUCUMCU', hd >= 0 && hd < 40);
            if (G0.slotOrn.length < 12) G0.slotOrn.push(saat + ' ' + en.toFixed(0) + 'px hedefFark=' + (hd < 0 ? '?' : hd.toFixed(0)) + (klipKare ? ' KLIP' : ' fizik'));
          } else say('AYNI_HEDEF_IKI_HUCUMCU', false);
        }
        /* 2) PERİMETRE BOŞ · 5) RAKETTE 4+ HÜCUMCU */
        if (rim && offP.length >= 5 && (b.mode === 'held' || b.mode === 'pass')) {
          const onSaha2 = (S.offSide ? (b.x < MID) : (b.x > MID));
          let eu = 0, bo = 0;
          for (const q of offP) { if (!q || !isFinite(q.x)) continue; const d = Math.hypot(q.x - rim[0], q.y - rim[1]); if (d > eu) eu = d; if (Math.abs(q.x - rim[0]) < 171 && Math.abs(q.y - 250) < 72) bo++; }
          if (onSaha2) { say('PERIMETRE_BOS', eu < UC_R); say('RAKETTE_4_HUCUMCU', bo >= 4);
            const fz = G0.fazPer || (G0.fazPer = {}); const o = fz[fazAd] || (fz[fazAd] = { n: 0, h: 0 }); o.n++; if (eu < UC_R) o.h++;
            /* AYRINTI: oam:set ihlallerinde her hücumcunun rolü · konum · HEDEF uzaklığı */
            if (eu < UC_R && fazAd === 'oam:set' && (G0.perDet = G0.perDet || []).length < 16 && performance.now() - (G0._perT || 0) > 1500) {
              G0._perT = performance.now();
              G0.perDet.push({ faz: fazAd, saat: saat, sutYakin: !!(O && O.sutYakin), donuk: !!(O && O.donuk), putback: !!(O && O.putback),
                o: offP.map(q => ({ r: q.role, d: Math.round(Math.hypot(q.x - rim[0], q.y - rim[1])),
                  t: (isFinite(q.tx) ? Math.round(Math.hypot(q.tx - rim[0], q.ty - rim[1])) : -1),
                  s: (O && O.spots && O.spots.get(q)) ? Math.round(Math.hypot(O.spots.get(q)[0] - rim[0], O.spots.get(q)[1] - rim[1])) : -1,
                  sh: !!(O && q === O.shooter), c: (b.carrier === q) })) });
            } }
        }
        /* 4) ORTA SAHA YIĞILMASI: merkez ±120 px'te 6+ oyuncu */
        { let o6 = 0; for (const q of P) if (Math.abs(q.x - MID) < 120) o6++; say('ORTA_SAHA_6', o6 >= 6);
          const fz = G0.fazOrta || (G0.fazOrta = {}); const o = fz[fazAd] || (fz[fazAd] = { n: 0, h: 0 }); o.n++; if (o6 >= 6) o.h++; }
        /* 3b) GENİŞ TANIM — TAŞIYICI DEĞİŞİMİ (klip dahil): mod geçişine bakmaz.
           `held→pass→held` dar tanımı klip oynatımındaki el değişimlerini GÖREMEZ
           (maçın ~%57'si klip karesidir). Burada topun sahibi değişiyorsa pas sayılır. */
        {
          const cr = b.carrier;
          if (b.mode !== 'held') G0._araSerbest = true;
          if (cr && cr !== G0._sonTut) {
            const ev = G0._sonTut;
            if (ev && ev !== cr) {
              G0.pasGN = (G0.pasGN | 0) + 1;
              const evX = G0._sonTutX, evOff = G0._sonTutOff;
              const rakibe = !!(ev.team && cr.team && ev.team !== cr.team);
              say('TASIYICI_RAKIBE', rakibe);
              /* KATI: arada top hiç serbest kalmadan (loose/rim/dead) rakibe geçti mi? */
              if (rakibe && !G0._araSerbest) {
                ac('RAKIBE_DOGRUDAN', saat, ((ev.pl && ev.pl.ad) || '?')); kapa('RAKIBE_DOGRUDAN');
                if (G0.rakOrn.length < 10) G0.rakOrn.push(saat + ' DOGRUDAN ' + ((ev.pl && ev.pl.ad) || '?') + '->' + ((cr.pl && cr.pl.ad) || '?') + (klipKare ? ' KLIP' : ' fizik'));
              } else if (rakibe) { G0.rakSerbest = (G0.rakSerbest | 0) + 1; }
              if (ev.team && cr.team && ev.team === cr.team && evOff != null && isFinite(evX)) {
                const onSahaBas = evOff ? (evX < MID - 8) : (evX > MID + 8);
                const arkaBit = evOff ? (cr.x > MID + 8) : (cr.x < MID - 8);
                if (onSahaBas && arkaBit) {
                  ac('GERI_SAHA_EL_DEGISTIRME', saat, ((ev.pl && ev.pl.ad) || '?')); kapa('GERI_SAHA_EL_DEGISTIRME');
                  if (G0.geri2Orn.length < 12) G0.geri2Orn.push(saat + ' ' + ((ev.pl && ev.pl.ad) || '?') + '->' + ((cr.pl && cr.pl.ad) || '?') + ' ' + evX.toFixed(0) + '->' + cr.x.toFixed(0) + (klipKare ? ' KLIP' : ' fizik'));
                }
              }
            }
            G0._sonTut = cr; G0._araSerbest = false;
          }
          if (cr) { G0._sonTutX = cr.x; G0._sonTutOff = S.offSide; }
        }
        /* 3) GERİ SAHA PASI + RAKİBE PAS: pas BAŞLANGICI ve BİTİŞİ (held→pass→held) */
        if (b.mode === 'pass' && oncekiMod !== 'pass') {
          const vrn = G0._sonTut;
          G0._pas = { x: (vrn && isFinite(vrn.x)) ? vrn.x : b.x, y: b.y, off: S.offSide, tak: (b.carrier && b.carrier.team) || (vrn && vrn.team) || null,
                      ad: (b.carrier && b.carrier.pl && b.carrier.pl.ad) || '?', saat: saat };
        }
        if (b.mode !== 'pass' && oncekiMod === 'pass' && G0._pas) {
          const pa = G0._pas; G0._pas = null; const al = b.carrier;
          G0.pasN = (G0.pasN | 0) + 1;
          if (al && pa.tak && al.team && al.team !== pa.tak && !(S._hakemTop && S._hakemTop.aktif)) {
            ac('RAKIBE_PAS', saat, pa.ad); kapa('RAKIBE_PAS');
            if (G0.rakOrn.length < 10) G0.rakOrn.push(saat + ' ' + pa.ad + '->' + ((al.pl && al.pl.ad) || '?'));
          }
          if (pa.off != null) {
            const onSahaBas = pa.off ? (pa.x < MID) : (pa.x > MID);
            const arkaBit = pa.off ? (b.x > MID + 8) : (b.x < MID - 8);
            if (onSahaBas && arkaBit) {
              ac('GERI_SAHA_PASI', saat, pa.ad); kapa('GERI_SAHA_PASI');
              if (G0.geriOrn.length < 12) G0.geriOrn.push(pa.saat + ' veren x=' + pa.x.toFixed(0) + ' -> alan x=' + b.x.toFixed(0) + (klipKare ? ' KLIP' : ' fizik') + ' mod=' + b.mode);
            }
          }
        }
      }
      /* ── top sıçraması: mod değişmeden 40 px+ ── */
      if (onceki && oncekiMod === b.mode) {
        const d = Math.hypot(b.x - onceki[0], b.y - onceki[1]);
        if (d > 40) { ac('TOP_SICRADI', saat, d.toFixed(0) + ' px · mod=' + b.mode); kapa('TOP_SICRADI'); }
      }
      onceki = [b.x, b.y]; oncekiMod = b.mode;
    } catch (e) { G0.err = String(e); }
  };
  /* ⚠ setInterval: rAF arka plan sekmesinde boğulur ve ölçüm sessizce durur */
  G0._iv = setInterval(tik, 16);
}

async function main() {
  const srv = await sunucu();
  const port = srv.address().port;
  const lo = EXEC ? { executablePath: EXEC, headless: true } : { channel: 'chrome', headless: true };
  const browser = await chromium.launch(lo);
  const hatalar = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => hatalar.push(e.message));
  await page.addInitScript('(' + TOHUM.toString() + ')(' + SEED + ');');
  await page.addInitScript("try{localStorage.setItem('charazay_lang','tr');}catch(e){}");
  await page.goto(`http://127.0.0.1:${port}/charazay2.0.html?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await page.fill('#teamName', 'Kural FK');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { try { closeAppModal(); } catch (e) {} });
  await page.evaluate(() => { try { showPage('mac'); } catch (e) {} });
  await bekle(250);
  if (PLAYOFF) {
    await page.evaluate(() => {
      try {
        if (!G.season || !G.season.active) { try { startLeagueSeason(); } catch (e) {} }
        let g = 0; while (G.season && G.season.active && g++ < 400) { const m = findNextUserSeasonMatch(); if (!m) break; simulateCpuMatch(m); }
        (G.season.matches || []).forEach(m => { if (!m.played) simulateCpuMatch(m); });
        G.season.active = false; startPlayoffs();
        if (!userPlayoffMatch() && G.playoff && G.playoff.teams) {
          const t = G.playoff.teams.slice(), ben = G.team.isim;
          if (t.indexOf(ben) < 0) {
            t[7] = ben;
            const r0 = [[0, 7], [3, 4], [1, 6], [2, 5]].map(([x, y]) => makeSeries(t[x], t[y], x, y));
            G.playoff = { active: true, year: G.season.year, teams: t, round: 0, rounds: [r0], champion: null, finalStats: {}, mvp: null };
            simPlayoffBotMatches();
          }
        }
      } catch (e) { window.__kgErr = String(e); }
    });
  }
  await page.evaluate('(' + kaydedici.toString() + ')()');
  await page.evaluate((po) => { try { if (po) startPlayoffMatch(); else startMatch(); setMatchRate(1); } catch (e) { window.__kgErr = String(e); } }, PLAYOFF);
  await bekle(SN * 1000);
  const R = await page.evaluate(() => { try { clearInterval(window.__KG._iv); } catch (e) {} Object.keys(window.__KG.acik || {}).forEach(k => { const a = window.__KG.acik[k]; if (a) window.__KG.ep[k].sn += (performance.now() - a.t) / 1000; }); const K = window.__KG; K._sonTut = null; K._pas = null; K._tacIzle = null; K._tacBekle = null; K.acik = null; return K; });
  const sayac = await page.evaluate(() => { try { const S = mState._sim; return { rakipPas: S._rakipPasN | 0, geriSaha: S._geriSahaN | 0, havadan: S._havadanN | 0, donuk: S._donukN | 0, yol: (S._rakipPasKim || []).slice(-4) }; } catch (e) { return null; } });
  const err = await page.evaluate(() => window.__kgErr || null);
  await browser.close(); srv.close();

  fs.writeFileSync(path.join(__dirname, 'kural-goz-rapor.json'), JSON.stringify(R, null, 2));
  let dusen = 0;
  const kapi = (tip, epMax, snMax) => {
    const e = R.ep[tip] || { n: 0, sn: 0 };
    const ok = e.n <= epMax && e.sn <= snMax;
    if (!ok) dusen++;
    console.log('  ' + (ok ? '✓' : '✗') + ' ' + tip.padEnd(30) + String(e.n).padStart(4) + ' epizot' + (e.sn).toFixed(1).padStart(9) + ' sn    hedef ≤' + epMax + ' / ≤' + snMax + ' sn');
  };
  console.log('\nKURAL GÖZÜ (FAZ 76) — ' + R.kare + ' örnek / ' + SN + ' sn · tohum ' + SEED + (PLAYOFF ? ' · PLAYOFF' : ' · lig'));
  if (err) console.log('  ⚠ ' + err);
  if (R.err) console.log('  ⚠ kaydedici: ' + R.err);
  console.log('  ── KURAL İHLALLERİ (epizot / toplam saniye) ──');
  kapi('UCLUK_CIZGISINDE_KIMSE_YOK', 25, 40);
  kapi('TOP_POTA_DIBINDE_SAHIPSIZ', 10, 5);
  kapi('SAYI_SONRASI_TAC_YANLIS_YERDE', 0, 0);
  kapi('HAVA_ATISI_MERKEZ_DISI', 0, 0);
  kapi('TOP_SICRADI', 5, 5);
  kapi('BOYADA_3_HUCUMCU', 40, 60);
  kapi('ORTA_SAHA_YIGILMASI', 60, 120);
  console.log('  ── FAZ 78 · KARE PAYI (brif §0: ham sayı DEĞİL) ──');
  const pay = (k, hedef) => {
    const o = (R.f || {})[k] || { n: 0, h: 0, k: 0, tn: 0 };
    const pc = o.n ? o.h / o.n * 100 : 0;
    const ok = hedef == null || pc <= hedef;
    if (hedef != null && !ok) dusen++;
    const pk = o.nk ? o.k / o.nk * 100 : 0, pf = o.nf ? o.tn / o.nf * 100 : 0;
    console.log('  ' + (hedef == null ? ' ' : (ok ? '✓' : '✗')) + ' ' + k.padEnd(26) + pc.toFixed(1).padStart(6) + '%   (' + o.h + '/' + o.n + ')   KLİP ' + pk.toFixed(1) + '% · FİZİK ' + pf.toFixed(1) + '%' + (hedef != null ? '   hedef ≤' + hedef + '%' : ''));
  };
  pay('AYNI_SLOTTA_IKI_HUCUMCU', 2);
  pay('CIZIMDE_IKI_HUCUMCU', null);
  pay('AYNI_HEDEF_IKI_HUCUMCU', null);
  pay('PERIMETRE_BOS', 3);
  pay('ORTA_SAHA_6', 4);
  pay('RAKETTE_4_HUCUMCU', null);
  kapi('GERI_SAHA_PASI', 0, 0);
  kapi('RAKIBE_PAS', 0, 0);
  kapi('GERI_SAHA_EL_DEGISTIRME', 0, 0);
  pay('TASIYICI_RAKIBE', null);
  kapi('RAKIBE_DOGRUDAN', 0, 0);
  console.log('    rakibe geçiş: serbest toptan (ribaunt/çalma, MEŞRU) ' + (R.rakSerbest | 0));
  console.log('    çizimde çakışan karede ortalama mesafe: ' + (R.cizN ? (R.cizTop / R.cizN).toFixed(1) : '-') + ' px · en yakın ' + (R.cizMin == null ? '-' : R.cizMin.toFixed(1)) + ' px');
  const dok = (ad, o2) => { if (!o2) return; console.log('    ' + ad + ': ' + Object.keys(o2).map(k => k + ' ' + (o2[k].n ? (o2[k].h / o2[k].n * 100).toFixed(1) : '0') + '% (' + o2[k].h + '/' + o2[k].n + ')').join(' · ')); };
  dok('PERIMETRE_BOS faz kırılımı', R.fazPer);
  if (R.perDet) { console.log('    ── PERİMETRE AYRINTI (r=rol, d=konum, t=hedef, s=slot · px) ──');
    R.perDet.slice(0, 8).forEach(x => console.log('      ' + x.faz + ' ' + x.saat + (x.sutYakin ? ' sutYakin' : '') + (x.donuk ? ' donuk' : '') + (x.putback ? ' putback' : '') + ' | ' + x.o.map(q => 'r' + q.r + ' d' + q.d + ' t' + q.t + ' s' + q.s + (q.sh ? '*' : '') + (q.c ? '@' : '')).join('  '))); }
  dok('ORTA_SAHA_6 faz kırılımı  ', R.fazOrta);
  console.log('    taşıyıcı değişimi (geniş pas): ' + (R.pasGN | 0));
  if (R.geri2Orn && R.geri2Orn.length) console.log('    geri saha el değiştirme: ' + R.geri2Orn.slice(0, 8).join(' · '));
  console.log('    toplam pas: ' + (R.pasN | 0));
  if (R.slotOrn && R.slotOrn.length) console.log('    slot çakışması : ' + R.slotOrn.slice(0, 6).join(' · '));
  if (R.geriOrn && R.geriOrn.length) console.log('    geri saha pası : ' + R.geriOrn.slice(0, 6).join(' · '));
  if (R.rakOrn && R.rakOrn.length) console.log('    rakibe pas     : ' + R.rakOrn.slice(0, 6).join(' · '));
  console.log('  ── BİLGİ ──');
  console.log('    orta sahada ortalama oyuncu : ' + (R.ortaN ? (R.ortaTop/R.ortaN).toFixed(2) : '-') + ' / 10');
  console.log('    pota çevresinde (150px) oyuncu: ' + (R.rimN ? (R.rimTop/R.rimN).toFixed(2) : '-') + ' / 10');
  console.log('    hava atışında top merkezden: ' + (R.hava == null ? '-' : R.hava + ' px'));
  if (R.ucOrn && R.ucOrn.length) console.log('    üçlük boşluğu örnekleri : ' + R.ucOrn.slice(0, 6).join(' · '));
  if (R.potaOrn && R.potaOrn.length) console.log('    pota dibi örnekleri     : ' + R.potaOrn.slice(0, 6).join(' · '));
  if (R.tacOrn && R.tacOrn.length) console.log('    sayı sonrası taç        : ' + R.tacOrn.slice(0, 6).join(' · '));
  if (sayac) { console.log('    ── MOTOR SAYAÇLARI (kapıların kaç kez TETİKLENDİĞİ) ──');
    console.log('      rakibe pas denemesi (FAZ 58 kapısı): ' + sayac.rakipPas + ' · geri saha pası (FAZ 78 kapısı): ' + sayac.geriSaha + ' · havadan pas: ' + sayac.havadan + ' · donan uçuş: ' + sayac.donuk);
    if (sayac.yol && sayac.yol.length) sayac.yol.forEach(y => console.log('      yol: t=' + y.t + ' ' + y.tip + ' ' + y.kimden + '->' + y.kime + ' | ' + y.yol)); }
  console.log('    sayfa hatası: ' + hatalar.length);
  console.log(dusen ? '\n✗ ' + dusen + ' kapı düştü' : '\n✓ bütün kural kapıları geçti');
  process.exit(dusen ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
