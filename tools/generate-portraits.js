#!/usr/bin/env node
/* Charazay portre üretimi — FAZ 17 boru hattının Node karşılığı.
 *
 *     node tools/generate-portraits.js <kova> <adet> [--jobs=N]
 *
 * NEDEN İKİ BETİK VAR: tools/generate-portraits.py aynı boru hattının Python/Pillow
 * sürümüdür ve brifin istediği arayüzdür. Bu geliştirme makinesinde Python KURULU DEĞİL
 * ve node_modules içinde görüntü kütüphanesi (sharp/jimp/canvas) yok; bu yüzden işleme
 * adımları depoda zaten bulunan Playwright'ın headless Chromium'unda <canvas> ile
 * yapılıyor. İki betik aynı dosya adlarını, aynı eşikleri ve aynı manifest'i üretir.
 *
 * KAYNAK VE LİSANS — DİKKAT
 * Görseller pollinations.ai üzerinden üretiliyor; TİCARİ KULLANIM LİSANSI BELİRSİZ
 * (Terms sayfası JS gerektirdiği için okunamadı, GitHub'da lisans sorusu cevapsız).
 * Kullanıcı bunu bilerek kabul etti: önce web, Steam öncesinde gerekirse kaynak değişir.
 * Bu yüzden ÜRETİM adımı tek fonksiyonda durur (uretBir); kaynak değişirse fon eşitleme,
 * kırpma, eleme ve manifest aynen kalır.
 *
 * BORU HATTI: üret → fon parlaklığını eşitle (hedef ~120) → 256x320'den 256x250'ye dar
 * kırp → bozuk / bulanık / yüzsüz / aşırı benzer olanı ele → manifest'i güncelle.
 * Elenen dosyanın numarası ATLANMAZ; sıra her zaman ilk boş numaradır.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'portraits');
const MANIFEST = path.join(OUT, 'manifest.json');

const KOVALAR = ['akd', 'siyah', 'kuz', 'beyaz', 'afr', 'lat', 'asya'];
const BANTLAR = ['genc', 'kidemli'];
const GENC_PAY = 0.45;              /* %45 genç / %55 kıdemli */

/* Kilitlenmiş istem: fon TEK, giysi TEK AİLE. Eski havuzda fon parlaklığı 10,9-155,2
   arasında geziniyordu (14 kat) ve 8 farklı giysi vardı — kadro ekranı dağınıktı. */
const FON = 'neutral medium gray studio background';
const GIYSI = 'plain dark navy sleeveless basketball jersey';
const KOVA_ETNIK = {
  akd:   'Turkish Mediterranean man, olive skin, dark hair',
  siyah: 'African American man, dark skin',
  kuz:   'Northern European man, fair skin, light brown hair',
  beyaz: 'white North American man, fair skin',
  afr:   'West African man, very dark skin',
  lat:   'Latin American man, tan skin, dark hair',
  asya:  'East Asian man, straight black hair',
};
const BANT_YAS = { genc: 'age 19-25', kidemli: 'age 27-35' };
const LOOK = ['short hair, clean shaven', 'buzz cut, short beard', 'curly hair, athletic build',
  'shaved head, strong jawline', 'fade haircut, goatee', 'wavy hair, light stubble',
  'cropped hair, broad shoulders', 'textured hair, light beard'];

const HEDEF_PARLAKLIK = 120;
const MIN_NETLIK = 90;
const DHASH_MIN_MESAFE = 8;
const GENISLIK = 256, YUKSEKLIK = 320, KIRP_YUKSEKLIK = 250;

/* ══ 1) ÜRETİM — kaynak değişirse yalnız burası değişir ═════════════════════════════ */
function istem(kova, bant, i) {
  return `professional basketball player portrait headshot, ${KOVA_ETNIK[kova]}, ${GIYSI}, ` +
    `${LOOK[i % LOOK.length]}, ${BANT_YAS[bant]}, ${FON}, photorealistic, front facing, ` +
    'chest up, soft even lighting, single person, face fully visible, no text, no watermark, no logo';
}
function tohum(kova, bant, i) {
  let h = 5381;
  const s = kova + '|' + bant + '|' + i;
  for (let k = 0; k < s.length; k++) h = (((h << 5) + h) ^ s.charCodeAt(k)) >>> 0;
  return h % 10000000;
}
async function uretBir(kova, bant, i) {
  const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(istem(kova, bant, i)) +
    `?seed=${tohum(kova, bant, i)}&width=${GENISLIK}&height=${YUKSEKLIK}&nologo=true`;
  for (let deneme = 0; deneme < 5; deneme++) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'CharazayPortraitBot/2.0', Accept: 'image/*' },
        signal: AbortSignal.timeout(150000),
      });
      if (r.status === 429) { await bekle(4000 * (deneme + 1)); continue; }
      if (!r.ok) { await bekle(1500 * (deneme + 1)); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 3000) return null;
      return buf;
    } catch (e) { await bekle(2000 * (deneme + 1)); }
  }
  return null;
}
const bekle = (ms) => new Promise(r => setTimeout(r, ms));

/* ══ 2-3) İŞLEME + ELEME — headless Chromium <canvas> ═══════════════════════════════ */
/* Tarayıcı içinde çalışır: fon parlaklığı ölçümü, normalize, dar kırpma, netlik
   (Laplace varyansı), ten-yüzeyi vekili ve dHash tek geçişte yapılır. */
const SAYFA_KODU = `
window.__isle = async function(dataUrl){
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const W = ${GENISLIK}, H = ${YUKSEKLIK}, KH = ${KIRP_YUKSEKLIK};
  const c0 = document.createElement('canvas'); c0.width = W; c0.height = H;
  const x0 = c0.getContext('2d', { willReadFrequently: true });
  x0.drawImage(img, 0, 0, W, H);
  let d = x0.getImageData(0, 0, W, H);
  const px = d.data;
  const lum = (i) => 0.299*px[i] + 0.587*px[i+1] + 0.114*px[i+2];
  /* fon = sol/sağ kenar şeritleri + üst şerit (özne değil fon ölçülür) */
  let fonT = 0, fonN = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const kenar = x < W*0.12 || x > W*0.88 || y < H*0.10;
    if (!kenar) continue;
    fonT += lum((y*W + x) * 4); fonN++;
  }
  const fon = fonT / Math.max(1, fonN);
  const fark = ${HEDEF_PARLAKLIK} - fon;
  if (Math.abs(fark) > 1) {
    for (let i = 0; i < px.length; i += 4) {
      px[i]   = Math.max(0, Math.min(255, px[i]   + fark));
      px[i+1] = Math.max(0, Math.min(255, px[i+1] + fark));
      px[i+2] = Math.max(0, Math.min(255, px[i+2] + fark));
    }
  }
  x0.putImageData(d, 0, 0);
  /* dar kırpma: üstten az, alttan çok — giysi payı azalır, yüz büyür */
  const ust = Math.round((H - KH) * 0.35);
  const c1 = document.createElement('canvas'); c1.width = W; c1.height = KH;
  const x1 = c1.getContext('2d', { willReadFrequently: true });
  x1.drawImage(c0, 0, ust, W, KH, 0, 0, W, KH);
  const k = x1.getImageData(0, 0, W, KH).data;
  const L = (i) => 0.299*k[i] + 0.587*k[i+1] + 0.114*k[i+2];
  /* fon ölçümü (kırpılmış hâlde, raporlama ve doğrulama için) */
  let fT = 0, fN = 0, kareT = 0;
  for (let y = 0; y < KH; y++) for (let x = 0; x < W; x++) {
    if (!(x < W*0.12 || x > W*0.88 || y < KH*0.10)) continue;
    const v = L((y*W + x) * 4); fT += v; kareT += v*v; fN++;
  }
  const fonOrt = fT / Math.max(1, fN);
  const fonStd = Math.sqrt(Math.max(0, kareT/Math.max(1,fN) - fonOrt*fonOrt));
  /* netlik: Laplace varyansı */
  let lT = 0, lK = 0, lN = 0;
  for (let y = 1; y < KH-1; y++) for (let x = 1; x < W-1; x++) {
    const i = (y*W + x) * 4;
    const v = 4*L(i) - L(i-4) - L(i+4) - L(i - W*4) - L(i + W*4);
    lT += v; lK += v*v; lN++;
  }
  const netlik = lK/lN - (lT/lN)*(lT/lN);
  /* ten yüzeyi vekili (gerçek yüz SAYISI tespiti OpenCV ister; bu onun yerine
     "merkezde makul büyüklükte tek ten yüzeyi var mı" sorusunu yanıtlar) */
  let ten = 0, tenN = 0;
  for (let y = Math.round(KH*0.10); y < KH*0.55; y++)
    for (let x = Math.round(W*0.28); x < W*0.72; x++) {
      const i = (y*W + x) * 4, r = k[i], g = k[i+1], b = k[i+2];
      tenN++;
      if (r > 60 && g > 35 && b > 20 && r > b && (Math.max(r,g,b) - Math.min(r,g,b)) > 12) ten++;
    }
  const tenOran = ten / Math.max(1, tenN);
  /* dHash 64 bit */
  const c2 = document.createElement('canvas'); c2.width = 9; c2.height = 8;
  const x2 = c2.getContext('2d', { willReadFrequently: true });
  x2.drawImage(c1, 0, 0, 9, 8);
  const s = x2.getImageData(0, 0, 9, 8).data;
  let hash = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const a = 0.299*s[(y*9+x)*4] + 0.587*s[(y*9+x)*4+1] + 0.114*s[(y*9+x)*4+2];
    const b = 0.299*s[(y*9+x+1)*4] + 0.587*s[(y*9+x+1)*4+1] + 0.114*s[(y*9+x+1)*4+2];
    hash += (a < b) ? '1' : '0';
  }
  return { jpeg: c1.toDataURL('image/jpeg', 0.88), fonOrt, fonStd, netlik, tenOran, hash };
};`;

function hamming(a, b) { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; }

/* ══ 4) MANİFEST — disk sayılır, elle sayı girilmez ═════════════════════════════════ */
function dosyaAdi(kova, bant, sira) {
  return `${kova}_${bant}_${String(sira).padStart(4, '0')}.jpg`;
}
function sonrakiSira(kova, bant) {
  let n = 0;
  while (fs.existsSync(path.join(OUT, dosyaAdi(kova, bant, n)))) n++;
  return n;
}
function manifestYaz() {
  const m = { version: 2, buckets: {}, pattern: '%s_%s_%04d.jpg' };
  for (const k of KOVALAR) { m.buckets[k] = {}; for (const b of BANTLAR) m.buckets[k][b] = sonrakiSira(k, b); }
  fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
  return m;
}

/* ══ 5) ANA AKIŞ ════════════════════════════════════════════════════════════════════ */
async function main() {
  const kova = process.argv[2];
  const adet = parseInt(process.argv[3], 10);
  if (!KOVALAR.includes(kova) || !Number.isFinite(adet) || adet <= 0) {
    console.log('kullanım: node tools/generate-portraits.js <kova> <adet>');
    console.log('kovalar :', KOVALAR.join(' | '));
    process.exit(2);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.addScriptTag({ content: SAYFA_KODU });

  /* mevcut dosyaların hash'leri — yeni parti eskilerin kopyası olmasın */
  const hashler = { genc: [], kidemli: [] };
  for (const b of BANTLAR) {
    for (let i = 0; i < sonrakiSira(kova, b); i++) {
      const p = path.join(OUT, dosyaAdi(kova, b, i));
      const dataUrl = 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64');
      try { hashler[b].push((await page.evaluate(u => window.__isle(u), dataUrl)).hash); } catch (e) {}
    }
  }

  const yazilan = { genc: 0, kidemli: 0 };
  const elenen = { indirilemedi: 0, bozuk: 0, yuz: 0, bulanik: 0, benzer: 0 };
  const fonlar = [];
  let denenen = 0, i = 0;

  while (yazilan.genc + yazilan.kidemli < adet && denenen < adet * 4) {
    denenen++;
    const bant = (i % 20) < Math.round(GENC_PAY * 20) ? 'genc' : 'kidemli';
    i++;
    const ham = await uretBir(kova, bant, sonrakiSira(kova, bant) * 31 + denenen);
    if (!ham) { elenen.indirilemedi++; continue; }
    let r = null;
    try {
      r = await page.evaluate(u => window.__isle(u), 'data:image/jpeg;base64,' + ham.toString('base64'));
    } catch (e) { elenen.bozuk++; continue; }
    if (!r || !r.jpeg) { elenen.bozuk++; continue; }
    if (!(r.tenOran >= 0.30 && r.tenOran <= 0.97)) { elenen.yuz++; continue; }
    if (r.netlik < MIN_NETLIK) { elenen.bulanik++; continue; }
    if (hashler[bant].some(h => hamming(h, r.hash) < DHASH_MIN_MESAFE)) { elenen.benzer++; continue; }
    const sira = sonrakiSira(kova, bant);        /* elenen numara atlanmaz */
    fs.writeFileSync(path.join(OUT, dosyaAdi(kova, bant, sira)),
      Buffer.from(r.jpeg.split(',')[1], 'base64'));
    hashler[bant].push(r.hash);
    yazilan[bant]++;
    fonlar.push(r.fonOrt);
    process.stdout.write(`ok ${dosyaAdi(kova, bant, sira)}  fon=${r.fonOrt.toFixed(1)} netlik=${r.netlik.toFixed(0)}\n`);
  }

  await browser.close();
  const m = manifestYaz();
  const ort = fonlar.length ? fonlar.reduce((a, b) => a + b, 0) / fonlar.length : 0;
  const std = fonlar.length ? Math.sqrt(fonlar.reduce((a, b) => a + (b - ort) ** 2, 0) / fonlar.length) : 0;
  console.log(`\nbitti: ${yazilan.genc + yazilan.kidemli}/${adet} yazıldı ` +
    `(genc ${yazilan.genc}, kidemli ${yazilan.kidemli})`);
  console.log('elenen:', JSON.stringify(elenen));
  console.log(`fon parlaklığı: ort ${ort.toFixed(1)} · std ${std.toFixed(1)} (hedef ort ~120, std ≤8)`);
  console.log('manifest:', JSON.stringify(m.buckets[kova]));
}

main().catch(e => { console.error(e); process.exit(1); });
