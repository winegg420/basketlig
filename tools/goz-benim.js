/**
 * Charazay 2.0 — GÖZ · KARE KARE CANLI SAHNE DENETÇİSİ
 *
 * Neden var: mevcut denetçiler (`realism-check`, `sahne-check`) SİMÜLASYON konumlarını
 * ölçüyor. Ama kullanıcının şikâyeti ÇİZİMDE: jetonlar üst üste biniyor, isimler
 * okunmuyor, hakemler saha dışında, top taşıyıcının üstüne oturmuyor. Bu araç maçın
 * HER KARESİNİ hem geometri hem ÇİZİM (SVG/DOM) katmanında tarar ve her ihlali
 * MAÇ SAATİYLE damgalar.
 *
 * Kullanım:
 *   node tools/goz.js [--sn=180] [--tohum=987654321] [--hiz=1] [--json=yol.json] [--exec=/tmp/chromium]
 *
 *   --sn      kaç saniye izlenecek (gerçek zaman)          varsayılan 180
 *   --tohum   Math.random tohumu (tekrarlanabilirlik)      varsayılan 987654321
 *   --hiz     izleme hızı 1 / 1.5 / 2 / 3                  varsayılan 1
 *   --json    ham olay dökümü yazılacak dosya              varsayılan tools/goz-rapor.json
 *   --exec    chrome/chromium ikili yolu (channel yerine)  varsayılan sistem Chrome
 *
 * Chrome yoksa:  node tools/goz.js --exec=/tmp/chromium
 *
 * ÇIKTI: ihlal tipine göre gruplanmış sayım + her tipten ilk örnekler (maç saatiyle)
 *        + özet metrikler. Çıkış kodu: kapılardan düşen varsa 1.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const say = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? parseFloat(a.split('=')[1]) : d; };
const met = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };

const SN = say('sn', 180);
const TOHUM = say('tohum', 987654321);
const HIZ = say('hiz', 1);
const JSON_YOL = met('json', path.join(__dirname, 'goz-rapor.json'));
const EXEC = met('exec', null);
const PLAYOFF = args.includes('--playoff');   /* sezonu simüle et, playoff maçını ölç */

/* ── kabul kapıları ─────────────────────────────────────────────────────────────────── */
const KAPI = {
  JETON_CAKISMA_YUZDE: 10,      /* çakışan kare oranı ≤ %10 */
  HERKES_DONUK_YUZDE: 25,       /* ≥8/10 oyuncunun 500 ms'de <5 px oynadığı örnek oranı ≤ %25 */
  YAYILIM_PX: 450,              /* oyuncuların ortalama X yayılımı ≥ 450 px (saha 827) */
  TOP_KOPUK_YUZDE: 1,           /* top taşıyıcıdan kopuk kare oranı ≤ %1 */
  ETIKET_CAKISMA_YUZDE: 2,      /* iki isim kutusunun kesiştiği örnek oranı ≤ %2 */
};

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function sunucuBaslat() {
  const kok = path.join(__dirname, '..');
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      try {
        const u = decodeURIComponent((req.url || '/').split('?')[0]);
        const f = path.join(kok, u === '/' ? '/index.html' : u);
        if (!f.startsWith(kok) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('yok'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
        res.end(fs.readFileSync(f));
      } catch (e) { res.writeHead(500); res.end(String(e)); }
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}

const uyu = (ms) => new Promise(r => setTimeout(r, ms));
const TOHUM_FN = (seed) => {
  let a = seed >>> 0;
  Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ────────────────────────────────────────────────────────────────────────────────────
   SAYFAYA ENJEKTE EDİLEN DENETÇİ
   Geometri kontrolleri HER KARE; DOM (etiket kutusu) kontrolleri her 5. kare
   (getBoundingClientRect düzen hesabı tetikler — 60 fps'de 10 etiket pahalıdır).
   ──────────────────────────────────────────────────────────────────────────────────── */
const DENETCI = function () {
  const CRT = { x0: 56.4, x1: 883.6, y0: 28.43, y1: 471.57 };
  const RIM_L = [102.6, 250], RIM_R = [837.4, 250];
  const JETON_R = 13.1;            /* çizilen halkanın yarıçapı — görünür çap 26,2 px */
  const CAKISMA = JETON_R * 2;
  const DERIN = 12;                /* bu mesafenin altı: pratikte tek jeton */
  const KOPUK = 30;                /* top taşıyıcıdan bu kadar uzaksa kopuk */
  const SAHIPSIZ = 150;
  const ISIN = 30;                 /* kare başına bu kadar sıçrama = ışınlanma */
  const HIZLI = 430;               /* px/sn — insanüstü */
  /* ⚠ HAKEM ÇİZGİ DIŞINDA DURUR — BU KURAL GEREĞİDİR, HATA DEĞİL.
     Lead/trail/center hakemler dip ve yan çizgilerin DIŞINDA konumlanır. Bu yüzden
     "saha dışı" ölçütü hakemde çizgi değil TRİBÜN sınırıdır: çizginin 45 px (1,5 m)
     ötesi. Daha dar bir eşik (ilk sürümde çizginin kendisi) hakemlerin normal
     duruşunu ihlal sayıyordu — ölçüldü, 60 sn'de yüzlerce sahte olay üretti. */
  const HAKEM_PAY = 45;
  /* raket: rim'den dx≤172, dy≤74 (FIBA 5,8 × 4,9 m) */
  /* ⚠ RAKET KONTROLÜ SAHA SINIRINI DE İSTER — ölçüldü ve düzeltildi.
     İlk sürüm yalnız "rim'den dx≤172, dy≤74" bakıyordu. Dip çizginin ARKASINDA duran
     hakem (40,250) de bu koşulu sağlıyordu ve 180 sn'de 5704 sahte
     HAKEM_BOYALI_ALANDA olayı üretti — tüm raporu boğuyordu. Raket, sahanın İÇİNDE
     olmak zorunda. */
  const sahada = (x, y) => (x >= CRT.x0 && x <= CRT.x1 && y >= CRT.y0 && y <= CRT.y1);
  const boyada = (x, y) => {
    if (!sahada(x, y)) return false;
    for (const r of [RIM_L, RIM_R]) if (Math.abs(x - r[0]) <= 172 && Math.abs(y - r[1]) <= 74) return true;
    return false;
  };

  const G = window.__goz = {
    kare: 0, domOrnek: 0, olay: [], son: {}, bitti: false,
    sayac: { cakisma: 0, ayniTakim: 0, derin: 0, kopuk: 0, donuk: 0, sahaDisi: 0, topDisi: 0, isin: 0, hizli: 0, sahipsiz: 0, etiketCakisma: 0, hakemDisi: 0, hakemBoyada: 0, topIsin: 0, topHizli: 0 },
    looseT: 0, looseEp: [], pasKare: 0, pasDuzKare: 0,
    epizot: {}, karePayi: {}, klipKare: 0, ayrim: { klip: { kare: 0, yayilim: 0, tekYari: 0, raket: 0 }, motor: { kare: 0, yayilim: 0, tekYari: 0, raket: 0 } }, mod: {}, faz: {}, yayilim: [], kosan: [], duran: [], gorunenEtiket: {},
    saatGeri: 0, sonSaat: null, konsol: 0,
  };
  const KAP = 20000;
  /* ⚠ TEKRAR FİLTRESİ ANAHTARINA DETAY KOYMA — ölçüldü ve düzeltildi.
     İlk sürümde anahtar `tip+'|'+detay` idi; "199px" ile "198px" AYRI olay sayılıyordu
     ve sayaçlar 2-4 kat şişiyordu. Anahtar artık yalnız TİP. Ayrıca her ihlal
     EPİZOT olarak da ölçülür (kaç kez başladı, toplam kaç saniye sürdü) — asıl
     kabul ölçütü budur, olay sayısı değil. */
  const ekle = (tip, detay, saat) => {
    const k = tip;
    const n = performance.now();
    /* epizot: aynı tip 400 ms'den uzun ara verdiyse YENİ epizot */
    const E = (G.epizot[tip] = G.epizot[tip] || { adet: 0, sn: 0, sonT: -1e9, basT: 0 });
    if (n - E.sonT > 400) { E.adet++; E.basT = n; } else { E.sn += (n - E.sonT) / 1000; }
    E.sonT = n;
    G.karePayi[tip] = (G.karePayi[tip] || 0) + 1;
    if (G.son[k] && n - G.son[k] < 2500) return;
    G.son[k] = n;
    if (G.olay.length < KAP) G.olay.push({ t: Math.round(n / 1000), saat: saat || '', tip: tip, detay: detay });
  };
  const ad = (p) => (p.team || '?') + (p.role != null ? p.role : '?');

  let onceki = null, donukT = 0, sahipsizT = 0;
  /* ⚠ MAÇ BAŞI YERLEŞMESİ ÖLÇÜME GİRMEZ: startMatch ilk karede jetonları slotlarına
     KOYAR (koşturmaz). Bu bir çizim kurulumudur; ilk sürümde 1700 px/sn'lik sahte
     "insanüstü hız" olayları üretiyordu. İlk 1,2 sn atlanır. */
  const ISINMA = 1.2;
  let t0 = null;
  /* ⚠ "KOŞAN OYUNCU" KARE FARKINDAN ÖLÇÜLMEZ: 60 fps'de kare aralığı 16 ms, ayrışma
     itmesinin (`_pvx/_pvy`) yarattığı 1-2 px'lik titreşim bile 60-120 px/sn'ye
     çevriliyor ve hedefinde ÇAKILI duran jeton "koşuyor" sayılıyordu (ölçüldü: kare
     farkıyla 8,44/10, oysa `sahne-check` 2,76/10). Hız 250 ms'lik pencereden okunur. */
  const PENCERE = 0.25;
  let pen = null;

  const tik = () => {
    if (G.bitti) return;
    requestAnimationFrame(tik);
    let S, P, b;
    try {
      S = mState && mState._sim;
      if (!S || !mState.running) return;
      P = S.players; b = S.ball;
      if (!P || !P.length || !b) return;
    } catch (e) { return; }

    const simdi = performance.now();
    if (t0 == null) t0 = simdi;
    if (simdi - t0 < ISINMA * 1000) { onceki = null; return; }   /* maç başı yerleşmesi */
    const dt = onceki ? (simdi - onceki.t) / 1000 : 0;
    const hiz = Math.max(0.5, mState.rate || 1);
    const saatEl = document.getElementById('liveTime');
    const saat = saatEl ? (saatEl.textContent || '').trim() : '';
    G.kare++;
    /* ⚠ KLİP KARELERİ TOP KONTROLLERİNDEN MUAF — gerçek SportVU kaydı oynuyor;
       top ve oyuncu konumu gerçek veriden gelir, "kopuk" ölçmek anlamsız. */
    const klip = !!S._klipTop;
    if (klip) G.klipKare++;
    G.mod[b.mode] = (G.mod[b.mode] || 0) + 1;
    G.faz[S._faz || '?'] = (G.faz[S._faz || '?'] || 0) + 1;

    /* ── maç saati geri gitti mi ── */
    if (saat && /^\d+:\d\d$/.test(saat)) {
      const sn = (a => a[0] * 60 + a[1])(saat.split(':').map(Number));
      if (G.sonSaat != null && sn > G.sonSaat + 1) { G.saatGeri++; ekle('SAAT_GERI_GITTI', G.sonSaat + 's → ' + sn + 's', saat); }
      G.sonSaat = sn;
    }

    /* ── 1) jeton çakışması (ÇİZİLEN yarıçapa göre) ── */
    let cakismaVar = false;
    for (let i = 0; i < P.length; i++) {
      for (let j = i + 1; j < P.length; j++) {
        const a = P[i], c = P[j];
        if (a._klip || c._klip) continue;          /* gerçek NBA klibi — dokunulmaz */
        const d = Math.hypot(a.x - c.x, a.y - c.y);
        if (d >= CAKISMA) continue;
        cakismaVar = true;
        const et = ad(a) + '+' + ad(c) + ' d=' + Math.round(d);
        if (a.team === c.team) { G.sayac.ayniTakim++; ekle('AYNI_TAKIM_CAKISMA', et, saat); }
        if (d < DERIN) { G.sayac.derin++; ekle('DERIN_CAKISMA', et, saat); }
      }
    }
    if (cakismaVar) G.sayac.cakisma++;

    /* ── 2) saha sınırı ── */
    for (const p of P) {
      if (p._oob) continue;                        /* topu sokan oyuncu muaf */
      if (p.x < CRT.x0 || p.x > CRT.x1 || p.y < CRT.y0 || p.y > CRT.y1) {
        G.sayac.sahaDisi++;
        ekle('OYUNCU_SAHA_DISI', ad(p) + ' (' + Math.round(p.x) + ',' + Math.round(p.y) + ')', saat);
      }
    }
    if (b.x < CRT.x0 - 6 || b.x > CRT.x1 + 6 || b.y < CRT.y0 - 6 || b.y > CRT.y1 + 6) {
      G.sayac.topDisi++; ekle('TOP_SAHA_DISI', '(' + Math.round(b.x) + ',' + Math.round(b.y) + ') mod=' + b.mode, saat);
    }

    /* ── 3a) GERİ PAS · RAKET TIKANMASI · RİBAUNT BOŞLUĞU · ŞUT MESAFESİ ──
       Kullanıcının saydığı ama ilk sürümde HİÇ ölçülmeyen şeyler. */
    {
      const hucumSag = !!S.offSide;                       /* hücum sağ potaya mı */
      const pota = hucumSag ? RIM_R : RIM_L;
      /* geri pas: pas hedefi, pas başlangıcından potaya DAHA UZAKSA geri pastır */
      if (b.mode === 'pass' && b.from && b.target && b.target.x != null) {
        const d0 = Math.abs(b.from[0] - pota[0]), d1 = Math.abs(b.target.x - pota[0]);
        if (d1 - d0 > 120) ekle('GERI_PAS', Math.round(d1 - d0) + 'px geriye', saat);
      }
      /* raket tıkanması: boyalı alanda aynı anda 4+ oyuncu */
      let raket = 0; for (const p of P) if (boyada(p.x, p.y)) raket++;
      if (raket >= 4) ekle('RAKET_TIKANDI', raket + ' oyuncu boyalı alanda', saat);
      /* ribaunt boşluğu: şut/rim anında potanın 120 px çevresinde kimse yok */
      if (!klip && (b.mode === 'rim' || b.mode === 'shot')) {
        let yakin = 0; for (const p of P) if (Math.hypot(p.x - pota[0], p.y - pota[1]) < 120) yakin++;
        if (yakin === 0) ekle('RIBAUNT_BOSLUGU', 'pota çevresinde kimse yok', saat);
      }
      /* üç sayı çizgisinde kimse yok: hücum eden takımın en uzak oyuncusu potaya 200px'ten yakınsa */
      const hucumcu = P.filter(p => p.team === (S.offP && S.offP[0] && S.offP[0].team));
      if (hucumcu.length) {
        const enUzak = Math.max.apply(null, hucumcu.map(p => Math.hypot(p.x - pota[0], p.y - pota[1])));
        if (enUzak < 200) ekle('ACILIM_YOK', 'en uzak hücumcu ' + Math.round(enUzak) + 'px', saat);
      }
    }

    /* ── 3b) TOP FİZİĞİ — pas ışınlanması, imkânsız hız, kavis yokluğu, yerde kalma ──
       Kullanıcının en çok şikâyet ettiği iki şey: "top yerde kalıyor" ve "paslar havadan
       ışınlanıyor". İlk sürüm topun UÇUŞUNA hiç bakmıyordu; yalnız oyuncu ışınlanmasını
       ölçüyordu. Gerçek pas: 25-45 px/kare (1,5-2,7 m/kare değil). */
    if (onceki && onceki.b && simdi - onceki.t < 120) {
      const bd = Math.hypot(b.x - onceki.b[0], b.y - onceki.b[1]);
      const bdt = (simdi - onceki.t) / 1000;
      const bv = bd / bdt / hiz;
      /* mod değişimi (şut/pas başlangıcı, ribaunt, sokma) sıçrama sayılmaz */
      const modDegisti = onceki.b[2] !== b.mode;
      if (!modDegisti && bd > 60 * hiz) { G.sayac.topIsin++; ekle('TOP_ISINLANDI', Math.round(bd) + 'px tek karede · mod=' + b.mode, saat); }
      if (!modDegisti && (b.mode === 'pass' || b.mode === 'held') && bv > 1400) { G.sayac.topHizli++; ekle('TOP_IMKANSIZ_HIZ', Math.round(bv) + 'px/sn · mod=' + b.mode, saat); }
      /* pas kavisi: 'pass' boyunca top yüksekliği (h) hiç değişmiyorsa düz kayıyor demektir */
      if (b.mode === 'pass') { G.pasKare++; if (Math.abs((b.h || 0) - (onceki.b[3] || 0)) < 0.01) G.pasDuzKare++; }
    }
    /* top yerde ne kadar kalıyor — epizot uzunluğu */
    if (b.mode === 'loose') { G.looseT += dt; }
    else if (G.looseT > 0) { G.looseEp.push(+G.looseT.toFixed(2)); if (G.looseT > 2) ekle('TOP_YERDE_UZUN', G.looseT.toFixed(1) + ' sn', saat); G.looseT = 0; }

    /* ── 3) top ↔ taşıyıcı ── */
    if (!klip && b.mode === 'held' && b.carrier && b.carrier.x != null) {
      const d = Math.hypot(b.x - b.carrier.x, b.y - b.carrier.y);
      if (d > KOPUK) { G.sayac.kopuk++; ekle('TOP_TASIYICIDAN_KOPUK', ad(b.carrier) + ' d=' + Math.round(d), saat); }
    }
    if (b.mode === 'loose') {
      let m = 1e9; for (const p of P) m = Math.min(m, Math.hypot(b.x - p.x, b.y - p.y));
      if (m > SAHIPSIZ) { sahipsizT += dt; if (sahipsizT > 1.2) { G.sayac.sahipsiz++; ekle('SAHIPSIZ_TOP', 'en yakın ' + Math.round(m) + 'px', saat); sahipsizT = 0; } }
      else sahipsizT = 0;
    } else sahipsizT = 0;

    /* ── 4) hareket: ışınlanma, insanüstü hız, koşan sayısı, donma ── */
    /* ⚠ DONMA `tx` İLE ÖLÇÜLMEZ — ÖLÇÜLDÜ VE ELENDİ.
       İlk sürüm `|tx-x|<3` olan oyuncuyu "hedefinde, hareketsiz" sayıyordu ve karelerin
       %57,8'inde 10/10 çıkıyordu. Tanılama (6 örnek × 10 oyuncu) hepsinde `tx-x=0`
       gösterdi AMA aynı oyuncuların gerçek hızı 20-96 px/sn'ydi. Sebep: `tx` sabit bir
       varış noktası değil — motor onu HER KARE yeniden yazıyor (salınım hedefi ~satır
       1267, markaj hedefi `_defBehind` ~satır 1319). Yani `tx≈x` "hedef canlı
       güncelleniyor" demek, "oyuncu duruyor" demek değil.
       Donma yalnız GERÇEK YER DEĞİŞTİRMEDEN okunur: 500 ms'de 5 px'ten az. */
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (onceki && simdi - onceki.t < 120 && onceki.p[i]) {
        const d = Math.hypot(p.x - onceki.p[i][0], p.y - onceki.p[i][1]);
        if (d > ISIN * hiz) { G.sayac.isin++; ekle('ISINLANMA', ad(p) + ' ' + Math.round(d) + 'px', saat); }
        const v = d / ((simdi - onceki.t) / 1000) / hiz;
        if (v > HIZLI) { G.sayac.hizli++; ekle('INSANUSTU_HIZ', ad(p) + ' ' + Math.round(v) + 'px/sn', saat); }
      }
    }
    /* koşan oyuncu — 250 ms'lik pencereden (titreşim değil gerçek yer değiştirme) */
    if (!pen) pen = { t: simdi, p: P.map(p => [p.x, p.y]) };
    else if (simdi - pen.t >= PENCERE * 1000) {
      const gecen = (simdi - pen.t) / 1000;
      let kosan = 0;
      for (let i = 0; i < P.length; i++) {
        if (!pen.p[i]) continue;
        const v = Math.hypot(P[i].x - pen.p[i][0], P[i].y - pen.p[i][1]) / gecen / hiz;
        if (v > 15) kosan++;
      }
      G.kosan.push(kosan);
      /* donma: pencerede 5 px'ten az yer değiştiren oyuncu (gerçek hareketsizlik) */
      let duran = 0;
      for (let i = 0; i < P.length; i++) {
        if (!pen.p[i]) continue;
        if (Math.hypot(P[i].x - pen.p[i][0], P[i].y - pen.p[i][1]) < 5) duran++;
      }
      G.duran.push(duran);
      if (duran >= P.length - 2) {          /* 10'dan en az 8'i kıpırdamıyor */
        G.sayac.donuk++;
        donukT += gecen;
        if (donukT > 1.5) { ekle('SAHNE_DONDU', Math.round(donukT * 10) / 10 + ' sn · ' + duran + '/10 hareketsiz', saat); donukT = 0; }
      } else donukT = 0;
      pen = { t: simdi, p: P.map(p => [p.x, p.y]) };
    }

    /* ── 5) saha kullanımı ── */
    const xs = P.map(p => p.x);
    G.yayilim.push(Math.round(Math.max.apply(null, xs) - Math.min.apply(null, xs)));
    const sol = P.filter(p => p.x < (CRT.x0 + CRT.x1) / 2).length;
    if (sol === 0 || sol === P.length) ekle('TUM_OYUNCULAR_TEK_YARIDA', (sol === 0 ? 'sağ' : 'sol') + ' yarı', saat);
    /* KLİP / MOTOR AYRIMI — yumaklaşma gerçek kayıtta mı motorun kendi sahnesinde mi? */
    const yay = Math.round(Math.max.apply(null, xs) - Math.min.apply(null, xs));
    let raketS = 0; for (const p of P) if (boyada(p.x, p.y)) raketS++;
    const kova = klip ? G.ayrim.klip : G.ayrim.motor;
    kova.kare++; kova.yayilim += yay;
    if (sol === 0 || sol === P.length) kova.tekYari++;
    if (raketS >= 4) kova.raket++;

    /* ── 6) hakem jetonları ── */
    const H = S.hakem || [];
    for (let i = 0; i < H.length; i++) {
      const h = H[i]; if (!h || h.x == null) continue;
      if (h.x < CRT.x0 - HAKEM_PAY || h.x > CRT.x1 + HAKEM_PAY || h.y < CRT.y0 - HAKEM_PAY || h.y > CRT.y1 + HAKEM_PAY) {
        G.sayac.hakemDisi++; ekle('HAKEM_SAHA_DISI', 'hakem' + i + ' (' + Math.round(h.x) + ',' + Math.round(h.y) + ')', saat);
      } else if (boyada(h.x, h.y)) {
        G.sayac.hakemBoyada++; ekle('HAKEM_BOYALI_ALANDA', 'hakem' + i + ' (' + Math.round(h.x) + ',' + Math.round(h.y) + ')', saat);
      }
    }

    onceki = { t: simdi, p: P.map(p => [p.x, p.y]), b: [b.x, b.y, b.mode, b.h || 0] };

    /* ── 7) ÇİZİM KATMANI — her 5. kare ── */
    if (G.kare % 5 !== 0) return;
    try {
      G.domOrnek++;
      const etl = Array.prototype.slice.call(document.querySelectorAll('.tok-name'))
        .filter(e => e.style.display !== 'none' && e.getClientRects().length);
      G.gorunenEtiket[etl.length] = (G.gorunenEtiket[etl.length] || 0) + 1;
      const kutu = etl.map(e => ({ e: e, r: e.getBoundingClientRect(), s: (e.textContent || '').trim() }));
      let cak = false;
      for (let i = 0; i < kutu.length; i++) {
        for (let j = i + 1; j < kutu.length; j++) {
          const A = kutu[i].r, B = kutu[j].r;
          if (A.right > B.left && B.right > A.left && A.bottom > B.top && B.bottom > A.top) {
            cak = true; ekle('ETIKET_CAKISMASI', kutu[i].s + ' × ' + kutu[j].s, saat);
          }
        }
      }
      if (cak) G.sayac.etiketCakisma++;
      /* etiket saha dikdörtgeninin dışına taşıyor mu */
      const svg = document.getElementById('courtSvg');
      if (svg) {
        const sr = svg.getBoundingClientRect();
        for (const k of kutu) {
          if (k.r.left < sr.left || k.r.right > sr.right || k.r.top < sr.top || k.r.bottom > sr.bottom) {
            ekle('ETIKET_SAHNE_DISI', k.s, saat);
          }
        }
      }
    } catch (e) { /* DOM okunamadı — kareyi atla */ }
  };
  requestAnimationFrame(tik);
  return 'kuruldu';
};

/* ────────────────────────────────────────────────────────────────────────────────── */
async function main() {
  const sunucu = await sunucuBaslat();
  const taban = 'http://127.0.0.1:' + sunucu.address().port;

  const acilis = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--use-gl=swiftshader', '--hide-scrollbars'] };
  if (EXEC) acilis.executablePath = EXEC; else acilis.channel = 'chrome';

  let tarayici;
  try { tarayici = await chromium.launch(acilis); }
  catch (e) {
    console.error('Tarayıcı açılamadı: ' + e.message);
    console.error('Sistemde Chrome yoksa yerel bir chromium yolu ver:  node tools/goz.js --exec=/yol/chromium');
    sunucu.close(); process.exit(2);
  }

  const konsolHata = [];
  const sayfa = await tarayici.newPage({ viewport: { width: 1440, height: 900 } });
  sayfa.on('console', m => { if (m.type() === 'error') konsolHata.push(m.text()); });
  sayfa.on('pageerror', e => konsolHata.push(e.message));

  await sayfa.addInitScript('(' + TOHUM_FN.toString() + ')(' + TOHUM + ');');
  await sayfa.goto(taban + '/charazay2.0.html', { waitUntil: 'domcontentloaded' });
  await sayfa.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
  await sayfa.click('#loginPage button.btn-p');
  await sayfa.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
  await sayfa.fill('#teamName', 'Goz FK');
  await sayfa.click('#setupPage button.btn-p');
  await sayfa.waitForSelector('#app', { state: 'visible', timeout: 8000 });
  process.stdout.write('[adim] app hazir\n');
  await sayfa.evaluate(() => { try { showPage('mac'); } catch (e) {} });
  await uyu(400);

  process.stdout.write('[adim] denetci enjekte\n');
  await sayfa.evaluate('(' + DENETCI.toString() + ')()');
  process.stdout.write('[adim] denetci kuruldu\n');
  await sayfa.evaluate((h) => { try { if (h !== 1 && typeof setMatchRate === 'function') setMatchRate(h); } catch (e) {} }, HIZ);
  process.stdout.write('[adim] startMatch\n');
  if (PLAYOFF) {
    /* Sezonu bot maçlarıyla sonuna kadar simüle et, sonra playoff serisini kur.
       Amaç: kullanıcının kaydı (sezon bitmiş + playoff aktif) koşullarını yeniden üretmek. */
    const po = await sayfa.evaluate(() => {
      try {
        const S = G.season;
        if (S && S.active) {
          let g = 0;
          while (S.matches.some(m => !m.played) && g++ < 400) {
            const tur = Math.min.apply(null, S.matches.filter(m => !m.played).map(m => m.round));
            if (typeof simulateRoundCpuMatches === 'function') simulateRoundCpuMatches(tur);
            S.matches.filter(m => m.round === tur && !m.played).forEach(m => {
              const r = (typeof playoffPickWinner === 'function') ? playoffPickWinner(m.home, m.away) : null;
              m.hs = r ? r.hs : 90; m.as = r ? r.as : 85; m.played = true;
            });
          }
          S.active = false;
        }
        /* Lig sıralamasını taklit etmeye çalışmıyoruz — ölçülecek şey PLAYOFF SAHNESİ.
           Eşleşme doğrudan kurulur: kullanıcı 2. sıra, rakip 5. sıra (kullanıcının
           kaydındaki Santos United - dggf eşleşmesinin aynısı: homeSeed 2, awaySeed 5). */
        const rows = buildLeagueRows(G.team.tblKey || 'tbl').filter(r => r && !r.bos && r.isim);
        const rakip = (rows.find(r => r.isim !== G.team.isim) || {}).isim;
        if (!rakip) return 'rakip bulunamadı';
        const seri = (typeof makeSeries === 'function') ? makeSeries(rakip, G.team.isim, 2, 5)
                                                       : { home: rakip, away: G.team.isim, homeSeed: 2, awaySeed: 5, wins: [0, 0], games: [], done: false, winner: null };
        G.playoff = { active: true, year: (S && S.year) || 1, teams: [rakip, G.team.isim], round: 0, rounds: [[seri]], champion: null, finalStats: {}, mvp: null };
        const m = (typeof userPlayoffMatch === 'function') ? userPlayoffMatch() : null;
        if (!m) return 'userPlayoffMatch boş döndü';
        startPlayoffMatch();
        return 'playoff maçı: ' + m.home + ' vs ' + m.away + ' · g' + m.gameNo + ' · running=' + mState.running;
      } catch (e) { return 'HATA: ' + e.message; }
    });
    process.stdout.write('[playoff] ' + po + '\n');
  } else
  await sayfa.evaluate(() => { try { startMatch(); } catch (e) { window.__baslatHata = String(e); } });
  process.stdout.write('[adim] startMatch bitti\n');

  const hata = await sayfa.evaluate(() => window.__baslatHata || null);
  if (hata) { console.error('startMatch hatası: ' + hata); await tarayici.close(); sunucu.close(); process.exit(2); }

  process.stdout.write('İzleniyor: ' + SN + ' sn · tohum ' + TOHUM + ' · hız ' + HIZ + 'x ');
  const bit = Date.now() + SN * 1000;
  while (Date.now() < bit) {
    await uyu(5000);
    const c = await sayfa.evaluate(() => { try { return { k: window.__goz.kare, o: window.__goz.olay.length, r: !!(mState && mState.running) }; } catch (e) { return null; } });
    process.stdout.write('.');
    if (c && !c.r) { process.stdout.write(' (maç bitti)'); break; }
  }
  process.stdout.write('\n');

  const R = await sayfa.evaluate(() => { window.__goz.bitti = true; const G = window.__goz; return JSON.parse(JSON.stringify({ kare: G.kare, domOrnek: G.domOrnek, sayac: G.sayac, mod: G.mod, faz: G.faz, olay: G.olay, yayilim: G.yayilim, kosan: G.kosan, duran: G.duran, looseEp: G.looseEp, pasKare: G.pasKare, pasDuzKare: G.pasDuzKare, epizot: G.epizot, karePayi: G.karePayi, klipKare: G.klipKare, ayrim: G.ayrim, gorunenEtiket: G.gorunenEtiket, saatGeri: G.saatGeri })); });
  const skor = await sayfa.evaluate(() => { try { return { s: mState.score, q: mState.quarter }; } catch (e) { return null; } });

  await tarayici.close(); sunucu.close();

  /* ── RAPOR ─────────────────────────────────────────────────────────────────────── */
  const K = R.kare || 1, D = R.domOrnek || 1;
  const yuz = (n, t) => +(100 * n / (t || 1)).toFixed(1);
  const ort = (a) => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : 0;

  const grup = {};
  for (const o of R.olay) (grup[o.tip] = grup[o.tip] || []).push(o);
  const sirali = Object.keys(grup).sort((a, b) => grup[b].length - grup[a].length);

  console.log('');
  console.log('='.repeat(78));
  console.log('GÖZ — KARE KARE CANLI SAHNE DENETİMİ');
  console.log('  ' + K + ' kare · ' + D + ' çizim örneği · tohum ' + TOHUM + ' · hız ' + HIZ + 'x'
    + (skor ? ' · skor ' + skor.s[0] + '-' + skor.s[1] + ' (P' + skor.q + ')' : ''));
  console.log('='.repeat(78));

  console.log('\nİHLAL OLAYLARI  (aynı ihlal 2,5 sn içinde tekrar sayılmaz)');
  if (!sirali.length) console.log('  — hiç olay yok');
  let toplam = 0;
  for (const t of sirali) {
    toplam += grup[t].length;
    console.log('  ' + String(grup[t].length).padStart(4) + '  ' + t);
    for (const o of grup[t].slice(0, 3)) console.log('          @' + (o.saat || '?') + '  ' + o.detay);
  }
  console.log('  ' + String(toplam).padStart(4) + '  TOPLAM');

  console.log('\nEPİZOT ÖLÇÜMÜ  (asıl ölçüt — kaç kez oldu, toplam kaç saniye, karelerin yüzde kaçı)');
  const ep = R.epizot || {}, kp = R.karePayi || {};
  const eps = Object.keys(ep).sort((a, b2) => (ep[b2].sn || 0) - (ep[a].sn || 0));
  console.log('  ' + 'olay'.padEnd(28) + 'epizot'.padStart(7) + 'toplam sn'.padStart(11) + 'kare payı'.padStart(11));
  for (const t of eps) console.log('  ' + t.padEnd(28) + String(ep[t].adet).padStart(7) + (ep[t].sn || 0).toFixed(1).padStart(11) + (yuz(kp[t] || 0, K) + '%').padStart(11));
  console.log('  klip karesi (gerçek kayıt): ' + yuz(R.klipKare || 0, K) + '% — top kontrolleri bu karelerde uygulanmadı');

  const A = R.ayrim || { klip: {}, motor: {} };
  console.log('\nKLİP / MOTOR AYRIMI  (yumaklaşma nerede oluyor?)');
  console.log('  ' + 'kaynak'.padEnd(10) + 'kare'.padStart(8) + 'ort. yayılım'.padStart(14) + 'tek yarı'.padStart(10) + 'raket 4+'.padStart(10));
  for (const k of ['klip', 'motor']) {
    const v = A[k] || {}; const n = v.kare || 1;
    console.log('  ' + k.padEnd(10) + String(v.kare || 0).padStart(8) + (Math.round((v.yayilim || 0) / n) + 'px').padStart(14)
      + (yuz(v.tekYari || 0, n) + '%').padStart(10) + (yuz(v.raket || 0, n) + '%').padStart(10));
  }

  console.log('\nKARE ORANLARI');
  const kapi = [];
  const bas = (etiket, deger, birim, gecti, hedef) => {
    kapi.push(gecti); console.log('  ' + (gecti ? '✓' : '✗') + ' ' + etiket.padEnd(38) + String(deger).padStart(8) + birim + '   hedef ' + hedef);
  };
  const cak = yuz(R.sayac.cakisma, K);
  bas('jeton çakışması (<26,2 px)', cak, '%', cak <= KAPI.JETON_CAKISMA_YUZDE, '≤ %' + KAPI.JETON_CAKISMA_YUZDE);
  const don = yuz(R.sayac.donuk, (R.duran || []).length);
  bas('sahne dondu (≥8/10 hareketsiz)', don, '%', don <= KAPI.HERKES_DONUK_YUZDE, '≤ %' + KAPI.HERKES_DONUK_YUZDE);
  const kop = yuz(R.sayac.kopuk, K);
  bas('top taşıyıcıdan kopuk', kop, '%', kop <= KAPI.TOP_KOPUK_YUZDE, '≤ %' + KAPI.TOP_KOPUK_YUZDE);
  const yay = ort(R.yayilim);
  bas('oyuncu X yayılımı (saha 827 px)', yay, 'px', yay >= KAPI.YAYILIM_PX, '≥ ' + KAPI.YAYILIM_PX + ' px');
  const ti = yuz(R.sayac.topIsin, K);
  bas('top ışınlandı (>60 px/kare)', ti, '%', ti <= 0.2, '≤ %0,2');
  const th = yuz(R.sayac.topHizli, K);
  bas('top imkânsız hız (>1400 px/sn)', th, '%', th <= 0.2, '≤ %0,2');
  const lep = R.looseEp || [];
  const luz = lep.filter(x => x > 2).length;
  bas('2 sn+ yerde kalan top epizodu', luz, ' adet', luz === 0, '0 adet');
  const etc = yuz(R.sayac.etiketCakisma, D);
  bas('etiket kutusu çakışması', etc, '%', etc <= KAPI.ETIKET_CAKISMA_YUZDE, '≤ %' + KAPI.ETIKET_CAKISMA_YUZDE);

  console.log('\nBİLGİ (yargılanmaz)');
  console.log('  top modu %: ' + JSON.stringify(Object.keys(R.mod).reduce((o, k) => (o[k] = yuz(R.mod[k], K), o), {})));
  console.log('  faz    %: ' + JSON.stringify(Object.keys(R.faz).reduce((o, k) => (o[k] = yuz(R.faz[k], K), o), {})));
  console.log('  görünen etiket sayısı dağılımı: ' + JSON.stringify(R.gorunenEtiket));
  console.log('  ortalama hareketsiz oyuncu: ' + ort(R.duran || []) + ' / 10');
  /* ⚠ KAPI DEĞİL — UZLAŞTIRILMADI: bu araç 250 ms penceresinden ort. 8,8/10 "koşan"
     buluyor, `sahne-check` kare farkından 2,76/10. İki ölçüm aynı sahnede 3 kat
     ayrışıyor; hangisinin doğru olduğu belirlenene kadar sayı KAPI OLARAK
     KULLANILMAZ, yalnız bilgi olarak basılır. */
  console.log('  aynı anda koşan oyuncu: ' + ort(R.kosan || []) + ' / 10   (⚠ sahne-check ile uzlaşmıyor — kapı değil)');
  console.log('  pas kavisi: ' + (R.pasKare ? yuz(R.pasDuzKare, R.pasKare) : 0) + '% düz kayma (yükseklik değişmiyor)');
  console.log('  loose epizot: ' + lep.length + ' adet · ort ' + ort(lep) + ' sn · en uzun ' + (lep.length ? Math.max.apply(null, lep) : 0) + ' sn');
  console.log('  maç saati geri gitti: ' + R.saatGeri);
  console.log('  konsol hatası: ' + konsolHata.length);
  konsolHata.slice(0, 5).forEach(e => console.log('    ! ' + e));

  try {
    fs.writeFileSync(JSON_YOL, JSON.stringify({ kare: K, domOrnek: D, tohum: TOHUM, hiz: HIZ, sayac: R.sayac, olay: R.olay, konsolHata: konsolHata }, null, 1));
    console.log('\nHam döküm: ' + JSON_YOL + ' (' + R.olay.length + ' olay)');
  } catch (e) { console.log('\nJSON yazılamadı: ' + e.message); }

  const dusen = kapi.filter(x => !x).length + (konsolHata.length ? 1 : 0);
  console.log('');
  console.log(dusen ? ('✗ ' + dusen + ' kapı düştü') : '✓ tüm kapılar tuttu');
  console.log('='.repeat(78));
  process.exit(dusen ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
