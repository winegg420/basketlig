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
/* dHash önbelleği: havuz büyüdükçe her koşuda mevcut dosyaların tamamını yeniden
   çözmek açılışı dakikalarca uzatıyordu (600'lük partide akd kovası 400+ dosya).
   Dosya yeniden üretilebilir, depoya girmez (.gitignore). */
const HASH_CACHE = path.join(OUT, '.dhash.json');

const KOVALAR = ['akd', 'siyah', 'kuz', 'beyaz', 'afr', 'lat', 'asya'];
const BANTLAR = ['genc', 'kidemli'];
const GENC_PAY = 0.45;              /* %45 genç / %55 kıdemli */

/* ══ KİLİTLİ İSTEM (FAZ 17B) ═══════════════════════════════════════════════════════
   FAZ 17'nin ilk 100'lük partisinde ölçülen üç kusur bu bloğu yeniden yazdırdı:

   1) MARKA VE YAZI. Formalarda "LAKERS" açıkça okunuyordu; "LAKEAN" + Lakers'ın
      lacivert-sarı düzeni, "OKLD", Nike swoosh'u ve bir sürü bozuk sahte yazı
      ("TIURV", "DAKIEIRI", "JUKTEIG") vardı. NBA takım adı ve Nike tescilli marka —
      Steam'e çıkacak üründe kabul edilemez; bozuk yazı ayrıca ucuz gösteriyor.
   2) TOP. Yaklaşık 6 karede 1'ine basketbol topu girmişti.
   3) KOVA İSABETİ. afr kovası Batı Afrika'dan çok karışık/açık tenli, lat kovası
      Akdeniz'e benzer çıkıyordu — tarifler ayırt edici değildi.

   Forma TEK: düz, tamamen boş lacivert kolsuz forma. Fon TEK: nötr orta gri.
   Yazı/logo/marka/top olumsuzlamaları hem istemin içinde hem negatif istemde. */
const FON = 'neutral medium gray studio background';
const GIYSI = 'plain solid dark navy sleeveless athletic jersey, completely blank, ' +
  'no text, no letters, no numbers, no logo, no emblem, no brand, no team name, ' +
  'no sponsor, plain fabric';
/* Negatif istem — pollinations ?negative= destekliyorsa ayrı gönderilir; desteklemese
   bile aynı olumsuzlamalar GIYSI ve KUYRUK içinde gömülü durur (çift güvence). */
const NEGATIF = 'text, letters, numbers, words, logo, brand, trademark, nike, adidas, ' +
  'jersey text, team name, NBA, basketball ball, ball, watermark, signature, ' +
  'holding object, two people, group';
const KUYRUK = 'photorealistic, front facing, chest up portrait only, soft even lighting, ' +
  'single person, face fully visible, empty hands, hands not visible, ' +
  'no ball, no basketball, no text, no watermark, no logo, no props';

/* Kova tarifleri — FAZ 17B'de ayırt edici hâle getirildi. */
const KOVA_ETNIK = {
  akd:   'Turkish man, Eastern Mediterranean and Balkan features, olive skin, dark brown hair',
  siyah: 'African American man, North American, dark brown skin',
  kuz:   'Northern European man, Slavic Baltic Scandinavian features, very fair skin, light hair',
  beyaz: 'white North American man, fair skin, European descent',
  afr:   'West African man from Nigeria or Senegal, very dark ebony skin, broad nose, tightly coiled short hair',
  lat:   'Latin American man from Brazil Argentina or Mexico, mestizo features, warm tan brown skin, dark hair',
  asya:  'East Asian man, Chinese Korean or Japanese features, straight black hair, light skin',
};
const BANT_YAS = { genc: [19, 25], kidemli: [27, 35] };

/* ── ÇEŞİTLİLİK EKSENLERİ (FAZ 17B §8) ────────────────────────────────────────────
   İlk partide akd kovasındaki 58 yüz birbirine fazla benziyordu: çoğu koyu saçlı,
   sakallı, benzer hatlı genç erkek — 15 kişilik kadroda tekrar hissi verir.
   Eksenler KOVA + BANT + SIRA'dan türer (hash), Math.random ile DEĞİL: aynı tohum
   aynı yüzü verir. Eksenler asal uzunlukta tutuldu ki kombinasyonlar geç tekrarlasın. */
const SAC = ['short cropped hair', 'very short buzzed hair', 'wavy medium hair',
  'tightly curly hair', 'hair combed back', 'receding hairline, thinning hair',
  'short textured hair'];                                    /* 7 */
const SAKAL = ['clean shaven', 'light stubble', 'full short beard', 'moustache only',
  'goatee'];                                                 /* 5 */
const YUZ = ['broad square jaw', 'narrow long face', 'prominent cheekbones',
  'rounded face'];                                           /* 4 */
const TEN = ['lighter complexion', 'medium complexion', 'deeper complexion',
  'sun tanned complexion'];                                  /* 4 */

function karis(x){ x=x>>>0; x^=x>>>16; x=Math.imul(x,0x7feb352d)>>>0; x^=x>>>15;
  x=Math.imul(x,0x846ca68b)>>>0; x^=x>>>16; return x>>>0; }
function eksen(kova, bant, sira, tuz, dizi){
  let h = 5381; const s = kova + '|' + bant + '|' + sira + '|' + tuz;
  for (let k = 0; k < s.length; k++) h = (((h << 5) + h) ^ s.charCodeAt(k)) >>> 0;
  return dizi[karis(h) % dizi.length];
}

/* ── SERVİS SINIRI (FAZ 17B'de ölçüldü) ──────────────────────────────────────────────
   pollinations anonim kullanımda IP BAŞINA TEK istek kabul ediyor; ikincisi anında
   429 ile geri dönüyor:
     {"error":"Too Many Requests","message":"Queue full for IP: … 1 requests already
      queued (max: 1). Get unlimited access at https://enter.pollinations.ai"}
   Yani PARALELLİK MÜMKÜN DEĞİL. Ölçülen tek istek süresi ~43 sn (256×320).
   FAZ 17'de --jobs=6 ile koşulan parti bu yüzden çok sayıda 429 yiyip boşa emek
   harcamıştı. JOBS artık 1'e kelepçeli; hız için gecikme SIFIRLANMAZ (ban riski). */
/* FAZ 17B §1: forma yazısı/markası iki katmanda çözülür.
   (a) KADRAJ — istem tek başına yetmiyor: yeni kilitli istemle üretilen ilk 5 karenin
       4'ünde hâlâ yazı/amblem vardı, birinde Nike swoosh'u. Kadraj yakınlaştırılır,
       çerçeve göğsün üstünde biter; markanın basıldığı alan büyük ölçüde dışarıda kalır.
   (b) ELEME — kalan kareler ölçülüp elenir (KUMAŞ ÜZERİ kenar enerjisi, aşağıda). */
const ZOOM = 1.22;                /* kadraj yakınlaştırma — yüz büyür, göğüs çıkar */
const KADRAJ_UST = 0.06;          /* kaynak karede üstten pay (0=tepeden) */
const MAX_YAZI_ENERJI = 0.030;    /* kumaş üzeri güçlü kenar oranı — üstü elenir */
const ISTEK_ARASI_MS = 2500;      /* başarılı istekten sonra nefes payı */
const BACKOFF_429_MS = 30000;     /* kuyruk doluysa ilk bekleme; katlanarak artar */
const HATA_ORANI_KAPISI = 0.20;   /* %20'yi aşarsa dur (brif §6) */
const HATA_PENCERESI = 40;        /* son kaç denemede ölçülür */
const HEDEF_PARLAKLIK = 120;
const MIN_NETLIK = 90;
const DHASH_MIN_MESAFE = 8;
/* Forma koyuluk kapısı. İstem "sade koyu lacivert forma" diyor ama model buna UYMUYOR:
   ilk 100'lük partide göğüs bölgesi parlaklığı 14,5 ile 224,3 arasında ölçüldü (medyan
   94,3) — havuzun üçte biri beyaz forma. "Tek giysi ailesi" hedefi istemle tutmuyor,
   ölçülüp elenmesi gerekiyor. Lacivert forma ~40-70 bandında, beyaz forma 160+. */
const MAX_FORMA_PARLAKLIK = 115;
/* FAZ 17B §1.3: 250 → 230. Omuz hizasının hemen altında kesilir; yüz büyür, forma
   alanı küçülür, formadaki yazı riski azalır. Arayüzdeki tüm portre kutuları
   object-fit:cover ve portre oranlı (70×88, 52×66, 44×56 …) olduğu için kaynak
   yüksekliğini kısaltmak DOĞRUDAN görünen forma payını azaltır. */
const GENISLIK = 256, YUKSEKLIK = 320, KIRP_YUKSEKLIK = 230;

/* ══ 1) ÜRETİM — kaynak değişirse yalnız burası değişir ═════════════════════════════ */
function istem(kova, bant, i) {
  const [yLo, yHi] = BANT_YAS[bant];
  const yas = yLo + (karis(i * 2654435761) % (yHi - yLo + 1));   /* bant içinde dağıt */
  return `professional basketball player portrait headshot, ${KOVA_ETNIK[kova]}, ` +
    `${eksen(kova, bant, i, 'ten', TEN)}, ${eksen(kova, bant, i, 'sac', SAC)}, ` +
    `${eksen(kova, bant, i, 'sakal', SAKAL)}, ${eksen(kova, bant, i, 'yuz', YUZ)}, ` +
    `age ${yas}, ${GIYSI}, ${FON}, ${KUYRUK}`;
}
function tohum(kova, bant, i) {
  let h = 5381;
  const s = kova + '|' + bant + '|' + i;
  for (let k = 0; k < s.length; k++) h = (((h << 5) + h) ^ s.charCodeAt(k)) >>> 0;
  return h % 10000000;
}
let son429 = 0;                     /* art arda kaç kez kuyruk dolu geldi */
async function uretBir(kova, bant, i) {
  const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(istem(kova, bant, i)) +
    `?seed=${tohum(kova, bant, i)}&width=${GENISLIK}&height=${YUKSEKLIK}&nologo=true` +
    `&negative=${encodeURIComponent(NEGATIF)}`;
  for (let deneme = 0; deneme < 6; deneme++) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'CharazayPortraitBot/2.0', Accept: 'image/*' },
        signal: AbortSignal.timeout(240000),      /* üretim ~43 sn; kuyrukta bekleyebilir */
      });
      if (r.status === 429) {
        son429++;
        /* Katlanarak geri çekil — servis "kuyruk dolu" diyorsa hızlı yeniden denemek
           yalnız sırayı uzatır. */
        await bekle(BACKOFF_429_MS * Math.min(4, deneme + 1));
        continue;
      }
      if (!r.ok) { await bekle(3000 * (deneme + 1)); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 3000) return null;
      son429 = 0;
      await bekle(ISTEK_ARASI_MS);
      return buf;
    } catch (e) { await bekle(4000 * (deneme + 1)); }
  }
  return null;
}
const bekle = (ms) => new Promise(r => setTimeout(r, ms));
/* Tek akış: servis IP başına tek istek kabul ediyor (yukarıdaki SERVİS SINIRI notu).
   Sıra sayısı, tekilleştirme ve dosya numarası zaten sıralı olmak zorundaydı. */
async function seriUret(istekler) {
  const sonuc = [];
  for (const it of istekler) sonuc.push({ bant: it.bant, ham: await uretBir(it.kova, it.bant, it.tohumIx) });
  return sonuc;
}

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
  /* FAZ 17B: fon eşitleme yeniden yazıldı. Önceki sürüm ORTALAMA kullanıyor ve
     KIRPILMAMIŞ kareyi ölçüyordu; alt köşelerde omuzlar kenar şeridine giriyor,
     tahmini aşağı çekiyor ve düzeltme eksik kalıyordu (ölçülen ort 104,6 · std 11,3).
     Şimdi: (1) önce kırp, (2) kenar şeritlerinin MEDYANI (omuz/saç aykırı değerlerine
     dayanıklı), (3) iki geçiş — ilk düzeltmeden sonra kalan sapma da kapatılır. */
  /* Zoomlu kadraj: kaynaktan (W/Z)×(KH/Z) pencere alınıp KH yüksekliğine büyütülür.
     Sonuç boyutu yine 256×230; değişen şey ÇERÇEVEYE NE GİRDİĞİ — göğüs dışarı çıkar. */
  const sw = Math.round(W / ${ZOOM}), sh = Math.round(KH / ${ZOOM});
  const sx = Math.round((W - sw) / 2);
  const sy = Math.round(H * ${KADRAJ_UST});
  const c1 = document.createElement('canvas'); c1.width = W; c1.height = KH;
  const x1 = c1.getContext('2d', { willReadFrequently: true });
  x1.drawImage(c0, sx, sy, sw, sh, 0, 0, W, KH);

  function fonMedyan(data){
    const v = [];
    for (let y = 0; y < KH; y++) for (let x = 0; x < W; x++) {
      /* yalnız ÜST yarının yan şeritleri + üst şerit: alt köşelerde omuz var */
      const kenar = ((x < W*0.10 || x > W*0.90) && y < KH*0.62) || y < KH*0.08;
      if (!kenar) continue;
      const i = (y*W + x) * 4;
      v.push(0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]);
    }
    v.sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : 128;
  }
  for (let gecis = 0; gecis < 2; gecis++) {
    const im = x1.getImageData(0, 0, W, KH);
    const fark = ${HEDEF_PARLAKLIK} - fonMedyan(im.data);
    if (Math.abs(fark) < 0.5) break;
    const q = im.data;
    for (let i = 0; i < q.length; i += 4) {
      q[i]   = Math.max(0, Math.min(255, q[i]   + fark));
      q[i+1] = Math.max(0, Math.min(255, q[i+1] + fark));
      q[i+2] = Math.max(0, Math.min(255, q[i+2] + fark));
    }
    x1.putImageData(im, 0, 0);
  }
  const k = x1.getImageData(0, 0, W, KH).data;
  const L = (i) => 0.299*k[i] + 0.587*k[i+1] + 0.114*k[i+2];
  /* fon ölçümü (kırpılmış hâlde, raporlama ve doğrulama için) */
  let fT = 0, fN = 0, kareT = 0;
  for (let y = 0; y < KH; y++) for (let x = 0; x < W; x++) {
    if (!(((x < W*0.10 || x > W*0.90) && y < KH*0.62) || y < KH*0.08)) continue;
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
  /* forma bölgesi: alt orta şerit — yüzün altında kalan gövde */
  let fj = 0, fjN = 0;
  for (let y = Math.round(KH*0.80); y < KH; y++)
    for (let x = Math.round(W*0.32); x < W*0.68; x++) { fj += L((y*W + x) * 4); fjN++; }
  const formaParlaklik = fj / Math.max(1, fjN);
  /* YAZI/LOGO ÖLÇÜMÜ — düz kumaş ile basılı yazıyı ayırır.
     Naif "medyandan sapan piksel oranı" İŞE YARAMADI: beyaz yaka biyesi ve arka plan
     boşluğu temiz kareyi en yüksek skora çıkarıyordu (ölçüldü: temiz kare %43,9,
     yazılı kare %25,3 — ters sonuç). Ayrım şurada: yazı, KUMAŞIN KENDİ tonundaki
     bölgede güçlü yerel gradyan üretir. Bu yüzden yalnız "kumaş sayılan" pikseller
     (medyana yakın, tenden ve biyeden koyu) taranır ve onların Laplace enerjisine
     bakılır. Düz kumaşta bu oran sıfıra yakındır. */
  const gy0 = Math.round(KH*0.80), gy1 = KH - 1, gx0 = Math.round(W*0.24), gx1 = Math.round(W*0.76);
  const gv = [];
  for (let y = gy0; y < gy1; y++) for (let x = gx0; x < gx1; x++) gv.push(L((y*W + x) * 4));
  gv.sort((a, b) => a - b);
  const kumasMed = gv.length ? gv[Math.floor(gv.length / 2)] : 0;
  let kumasN = 0, kenarN = 0;
  for (let y = gy0 + 1; y < gy1 - 1; y++) for (let x = gx0 + 1; x < gx1 - 1; x++) {
    const i = (y*W + x) * 4, v = L(i);
    if (v > kumasMed + 28) continue;          /* biye / ten / arka plan — kumaş değil */
    kumasN++;
    const lap = Math.abs(4*v - L(i-4) - L(i+4) - L(i - W*4) - L(i + W*4));
    if (lap > 34) kenarN++;
  }
  const yaziEnerji = kumasN > 200 ? kenarN / kumasN : 0;
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
  return { jpeg: c1.toDataURL('image/jpeg', 0.88), fonOrt, fonStd, netlik, tenOran, formaParlaklik, yaziEnerji, hash };
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
  /* --jobs artık YOK SAYILIYOR: servis IP başına tek istek kabul ediyor, ikincisi anında
     429 döner. Bayrak geriye dönük uyum için kabul edilir ama 1'e kelepçelenir. */
  const JOBS = 1;
  if (!KOVALAR.includes(kova) || !Number.isFinite(adet) || adet <= 0) {
    console.log('kullanım: node tools/generate-portraits.js <kova> <adet>');
    console.log('kovalar :', KOVALAR.join(' | '));
    process.exit(2);
  }
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`kova ${kova} · hedef ${adet} · tek akış (servis IP başına 1 istek kabul ediyor)`);

  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.addScriptTag({ content: SAYFA_KODU });

  /* mevcut dosyaların hash'leri — yeni parti eskilerin kopyası olmasın.
     Önbellekte olan dosya yeniden çözülmez; yalnız yeni gelenler hesaplanır. */
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(HASH_CACHE, 'utf8')); } catch (e) { cache = {}; }
  const hashler = { genc: [], kidemli: [] };
  let cozulen = 0;
  for (const b of BANTLAR) {
    for (let i = 0; i < sonrakiSira(kova, b); i++) {
      const ad = dosyaAdi(kova, b, i);
      if (cache[ad]) { hashler[b].push(cache[ad]); continue; }
      const dataUrl = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(OUT, ad)).toString('base64');
      try {
        const h = (await page.evaluate(u => window.__isle(u), dataUrl)).hash;
        cache[ad] = h; hashler[b].push(h); cozulen++;
      } catch (e) {}
    }
  }
  const cacheYaz = () => { try { fs.writeFileSync(HASH_CACHE, JSON.stringify(cache)); } catch (e) {} };
  if (cozulen) cacheYaz();
  console.log(`mevcut havuz: genc ${hashler.genc.length} · kidemli ${hashler.kidemli.length}` +
    ` (önbellekten ${hashler.genc.length + hashler.kidemli.length - cozulen}, yeni çözülen ${cozulen})`);

  const yazilan = { genc: 0, kidemli: 0 };
  const elenen = { indirilemedi: 0, bozuk: 0, yuz: 0, acikForma: 0, formaYazi: 0, bulanik: 0, benzer: 0 };
  const fonlar = [], formalar = [];
  let denenen = 0, i = 0;
  /* Brif §6: kaynak engellerse veya hata oranı %20'yi aşarsa dur, o ana kadarki işi
     koru ve raporla — sonsuz döngüye girme. */
  const pencere = []; let dur = false, durSebep = '';

  /* Bant seçimi DİSKTEKİ duruma bakar, sayaç turuna değil. Sabit tur (i%20<9) küçük
     partilerde bozuluyordu: bir kovaya 8 tane istendiğinde 8'i de 'genc' oluyor, kıdemli
     hiç üretilmiyordu (§9 koşusunda kuz/beyaz/afr/lat kovaları böyle çıktı). Şimdi hangi
     bant %45/%55 hedefinin ALTINDAYSA o seçilir — parti parti üretimde de oran tutar.
     Paralel indirmede küme içindeki bantlar önden kestirilir (yazılacak varsayımıyla);
     yazma anında sıra yine diskten okunur, o yüzden numara kayması olmaz. */
  /* FAZ 17B §3: bant seçimi. İlk partide 7 kovanın 5'inde HİÇ kıdemli portre yoktu
     (kuz/beyaz/afr/lat/asya: genç 8/7/6/4/3, kıdemli 0) — 30 yaşındaki bir Litvanyalıya
     genç yüz düşüyordu. İki kural:
       (a) bir kovada ikinci görsel DAİMA diğer banda gider → hiçbir bant 0'da kalmaz,
       (b) sonrası %45/%55 hedefinden geri kalan bandı öncelikli doldurur.
     Kural (b) parti parti üretimde dağılımı kendi kendine toparlar. */
  const bantSec = (gencN, kidN) => {
    if (gencN + kidN === 0) return 'genc';
    if (gencN === 0) return 'genc';
    if (kidN === 0) return 'kidemli';          /* (a) en az 1 kıdemli garantisi */
    return gencN / (gencN + kidN) < GENC_PAY ? 'genc' : 'kidemli';
  };

  while (yazilan.genc + yazilan.kidemli < adet && denenen < adet * 4) {
    const kalan = adet - (yazilan.genc + yazilan.kidemli);
    const kumeBoy = Math.min(JOBS, kalan, adet * 4 - denenen);
    if (dur) break;
    if (kumeBoy <= 0) break;

    /* küme için bantları kestir */
    let tGenc = sonrakiSira(kova, 'genc'), tKid = sonrakiSira(kova, 'kidemli');
    const istekler = [];
    for (let j = 0; j < kumeBoy; j++) {
      denenen++;
      const bant = bantSec(tGenc, tKid);
      if (bant === 'genc') tGenc++; else tKid++;
      i++;
      istekler.push({ kova, bant, tohumIx: (tGenc + tKid) * 31 + denenen });
    }

    const paket = await seriUret(istekler);

    /* işleme + eleme + yazma SIRALI — dosya numarası ve tekilleştirme bozulmasın */
    for (const it of paket) {
      pencere.push(it && it.ham ? 0 : 1);
      if (pencere.length > HATA_PENCERESI) pencere.shift();
      if (pencere.length === HATA_PENCERESI) {
        const oran = pencere.reduce((a, b) => a + b, 0) / pencere.length;
        if (oran > HATA_ORANI_KAPISI) {
          dur = true;
          durSebep = `indirme hata oranı %${(oran * 100).toFixed(0)} (kapı %${HATA_ORANI_KAPISI * 100}) — servis engelliyor`;
        }
      }
      if (!it || !it.ham) { elenen.indirilemedi++; continue; }
      const bant = it.bant;
      let r = null;
      try {
        r = await page.evaluate(u => window.__isle(u), 'data:image/jpeg;base64,' + it.ham.toString('base64'));
      } catch (e) { elenen.bozuk++; continue; }
      if (!r || !r.jpeg) { elenen.bozuk++; continue; }
      const OLC = process.argv.includes('--olc');
      if (OLC) console.log(`   olcum ten=${(r.tenOran*100).toFixed(0)}% forma=${r.formaParlaklik.toFixed(0)} yazi=${(r.yaziEnerji*100).toFixed(2)}% netlik=${r.netlik.toFixed(0)}`);
      if (!(r.tenOran >= 0.30 && r.tenOran <= 0.97)) { elenen.yuz++; continue; }
      if (r.formaParlaklik > MAX_FORMA_PARLAKLIK) { elenen.acikForma++; continue; }
      if (r.yaziEnerji > MAX_YAZI_ENERJI) { elenen.formaYazi++; continue; }
      if (r.netlik < MIN_NETLIK) { elenen.bulanik++; continue; }
      if (hashler[bant].some(h => hamming(h, r.hash) < DHASH_MIN_MESAFE)) { elenen.benzer++; continue; }
      const sira = sonrakiSira(kova, bant);        /* elenen numara atlanmaz */
      const ad = dosyaAdi(kova, bant, sira);
      fs.writeFileSync(path.join(OUT, ad), Buffer.from(r.jpeg.split(',')[1], 'base64'));
      cache[ad] = r.hash;
      hashler[bant].push(r.hash);
      yazilan[bant]++;
      fonlar.push(r.fonOrt); formalar.push(r.formaParlaklik);
      process.stdout.write(`ok ${ad}  fon=${r.fonOrt.toFixed(1)} forma=${r.formaParlaklik.toFixed(0)} yazi=${(r.yaziEnerji*100).toFixed(1)}% netlik=${r.netlik.toFixed(0)}\n`);
    }
    cacheYaz();                                   /* kesinti olursa emek kaybolmasın */
    manifestYaz();                                /* ilerleme diske yansısın */
  }

  await browser.close();
  const m = manifestYaz();
  if (dur) console.log(`\nDURDURULDU: ${durSebep}. O ana kadarki iş korundu.`);
  const ort = fonlar.length ? fonlar.reduce((a, b) => a + b, 0) / fonlar.length : 0;
  const std = fonlar.length ? Math.sqrt(fonlar.reduce((a, b) => a + (b - ort) ** 2, 0) / fonlar.length) : 0;
  console.log(`\nbitti: ${yazilan.genc + yazilan.kidemli}/${adet} yazıldı ` +
    `(genc ${yazilan.genc}, kidemli ${yazilan.kidemli})`);
  console.log('elenen:', JSON.stringify(elenen));
  console.log(`fon parlaklığı: ort ${ort.toFixed(1)} · std ${std.toFixed(1)} (hedef ort ~120, std ≤8)`);
  if (formalar.length) {
    const fo = formalar.reduce((a, b) => a + b, 0) / formalar.length;
    const fs2 = Math.sqrt(formalar.reduce((a, b) => a + (b - fo) ** 2, 0) / formalar.length);
    console.log(`forma parlaklığı: ort ${fo.toFixed(1)} · std ${fs2.toFixed(1)} (kapı ≤${MAX_FORMA_PARLAKLIK})`);
  }
  console.log('manifest:', JSON.stringify(m.buckets[kova]));
}

main().catch(e => { console.error(e); process.exit(1); });
