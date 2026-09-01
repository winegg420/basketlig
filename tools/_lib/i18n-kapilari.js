/**
 * FAZ 29 §1 — İ18N KÖR NOKTA KAPILARI
 *
 * `tools/i18n-scan.js` bugüne kadar YALNIZCA "içinde Türkçe harf/sözcük geçen metin
 * düğümü" arıyordu ve bulduğunu BİLGİ olarak listeliyordu (kapı yalnız canlı anlatım
 * oranıydı). Bu yüzden EN modunda ekranda duran üç kusur sınıfını hiç göremedi:
 *
 *   A) KISMİ ÇEVİRİ — cümlenin bir kısmı çevrilmiş, kalanı Türkçe:
 *      "Kasa bu gidişle ~14 weeks yeter" · "Day 10 · Maç ödülü (galibiyet)"
 *      (Türkçe harf içerdiği için listeye giriyordu ama 1700 satırlık özel isim
 *       gürültüsünün içinde kayboluyor ve HİÇBİR KAPIYI düşürmüyordu.)
 *
 *   B) BİÇİM — sayı/yüzde/sıra Türkçe biçiminde kalmış:
 *      "14.714 KR" (İngilizcede 14,714) · "%77" (77%) · "2. place" (2nd place)
 *      (Bu satırlarda Türkçe HARF YOK; eski tarayıcı için tamamen görünmezdi.)
 *
 *   C) KELİME SIRASI — Türkçe şablonun yer tutucuları sırayla doldurulmuş, İngilizce
 *      cümle bozulmuş: "… 14.714 KR with Yiğit Kırca have announced a deal for."
 *      (Yine tek bir Türkçe harf yok.)
 *
 * Üçü de artık SAYILIR ve KAPIDIR. Ölçüm mantığı ayrı dosyada durur ki hangi sınıfın
 * neden eklendiği kaybolmasın.
 */

/* ── Sınıf A: kısmi çeviri ───────────────────────────────────────────────────────────
   Ölçüt: aynı metin düğümünde HEM Türkçe HEM İngilizce belirteç var.
   İngilizce belirteçler yalnızca Türkçede bulunmayan işlev sözcükleridir — özel isim
   ("Ankara Eagles") tek başına sınıf A üretmez. */
const TR_HARF = /[çğıöşüÇĞİÖŞÜ]/;
const TR_SOZ = new RegExp('(^|[^A-Za-zÇĞİÖŞÜçğıöşü])(' + [
  've', 'ile', 'için', 'icin', 'bu', 'bir', 'yeter', 'kasa', 'gidişle', 'gidisle',
  'maç', 'mac', 'ödülü', 'odulu', 'galibiyet', 'mağlubiyet', 'maglubiyet',
  'haftalık', 'haftalik', 'maaş', 'maas', 'bakım', 'bakim', 'seyahat', 'masrafı', 'masrafi',
  /* ⚠ 'form' HEM Türkçe HEM İngilizce sözcüktür — TR belirteci olamaz, İngilizce
     arayüzde yanlış pozitif üretir. Aynı sebeple 'arena', 'transfer', 'draft' de yok. */
  'doluluk', 'taraftar', 'bilet', 'fiyatı', 'fiyati', 'durdur', 'mola', 'devam',
  'ev', 'başlat', 'baslat', 'koçluk', 'kocluk', 'ekran', 'bakiye', 'büyüyor', 'buyuyor',
  'antrenman', 'altyapı', 'altyapi', 'bilanço', 'bilanco', 'izci', 'sakat', 'yeniden',
  'enerji', 'kimya', 'sözleşme', 'sozlesme', 'hücum', 'hucum', 'savunma', 'yedek',
  'çeyrek', 'ceyrek', 'uzatma', 'ödül', 'odul', 'tahmini', 'düzenli', 'duzenli',
  'sahibi', 'deplasman', 'takım', 'takim', 'oyuncu', 'sezon', 'puan', 'kadro',
  'sıra', 'sira', 'gün', 'gun', 'hafta', 'yok', 'senin', 'kalan', 'toplam',
  'gelir', 'gider', 'sayı', 'sayi', 'asist', 'faul', 'ribaund', 'blok'
].join('|') + ')([^A-Za-zÇĞİÖŞÜçğıöşü]|$)', 'i');
/* ⚠ SINIR TÜRKÇE HARFİ DE DIŞLAMALI. `[^A-Za-z]` sınırıyla "Kürşat" içindeki "at",
   "Öcal" içindeki "cal" İngilizce sözcük sanılıyor ve her Türk oyuncu adı "kısmi çeviri"
   raporlanıyordu (ölçüldü: 181 yanlış pozitif). CLAUDE.md'deki FAZ 17 i18n dersinin
   aynısı — Türkçe harf ASCII sözcük sınırı değildir. */
const EN_SOZ = new RegExp('(^|[^A-Za-zÇĞİÖŞÜçğıöşü])(' + [
  'the', 'and', 'with', 'for', 'from', 'this', 'that', 'these', 'those',
  'are', 'is', 'was', 'were', 'have', 'has', 'will', 'been',
  'at', 'of', 'in', 'on', 'to', 'by', 'as', 'per',
  'week', 'weeks', 'day', 'days', 'match', 'win', 'loss', 'away', 'home',
  'season', 'team', 'player', 'points', 'rate', 'bonus', 'travel', 'costs',
  'wages', 'upkeep', 'attendance', 'price', 'cash', 'lasts', 'side'
].join('|') + ')([^A-Za-zÇĞİÖŞÜçğıöşü]|$)', 'i');

/* ⚠ ÖZEL İSİM AYIRT ETME KURALI: Türkçe harf içeren KÜÇÜK harfli sözcük bir cins
   isimdir ("gidişle", "ödülü", "doğru", "fiyatı"); BÜYÜK harfle başlayan sözcük özel
   isimdir ("Kürşat", "Gençlik", "Atmacaları") ve zaten çevrilmez. Ölçüt yalnız
   "Türkçe harf var" olsaydı her Türk oyuncu/takım adı kusur sayılırdı. */
const TR_KUCUK = /(^|[^A-Za-zÇĞİÖŞÜçğıöşü])[a-zçğıöşü]*[çğıöşü][a-zçğıöşü]*/;
/** Satırda Türkçe CİNS İSİM var mı (özel isim sayılmaz)? */
function trIsaret(t) { return TR_SOZ.test(t) || TR_KUCUK.test(t); }

function kismiCeviri(s) {
  const t = String(s || '');
  if (t.length < 4) return false;
  /* ⚠ Türkçe belirteç ÖZEL İSİM OLAMAZ. Ölçüt "Türkçe harf var" olursa her Türk oyuncu
     ve takım adı ("Kürşat Öcal", "Bursa Gençlik from") kısmi çeviri sanılır — oysa özel
     isim zaten çevrilmez (ölçüldü: 181 yanlış pozitif). Türkçe taraf da İngilizce taraf
     da CİNS İSİM / işlev sözcüğü listesinden okunur; ikisi AYNI satırda geçiyorsa cümle
     yarım çevrilmiştir. */
  if (!trIsaret(t)) return false;
  return EN_SOZ.test(t);
}

/* ── Sınıf B: biçim ──────────────────────────────────────────────────────────────────
   EN modunda Türkçe sayı biçimleri. Bu satırlarda Türkçe harf yoktur; eski tarayıcı
   için görünmezdiler. */
/* 14.714 · 129.000 — noktayla binlik ayracı (İngilizcede virgül). */
const BICIM_BINLIK = /(^|[^\d.,])\d{1,3}(\.\d{3})+(?!\d)/;
/* %77 — yüzde işareti ÖNDE (İngilizcede 77%). Şablon yer tutucusu (%S, %SC) hariç. */
const BICIM_YUZDE = /%\s?\d/;
/* "2. place" · "16. sıra" — noktalı sıra sayısı (İngilizcede 2nd / 16th).
   Ölçüt dar tutulur: rakam + nokta + boşluk + KÜÇÜK harfle başlayan sözcük. Cümle
   sonundaki sayı ("… toplam 25. Next") büyük harfle devam ettiği için elenir. */
const BICIM_SIRA = /(^|[^\d])\d{1,3}\.\s+[a-zçğıöşü]/;

function bicimHatasi(s) {
  const t = String(s || '');
  const hit = [];
  if (BICIM_BINLIK.test(t)) hit.push('binlik');
  if (BICIM_YUZDE.test(t)) hit.push('yüzde');
  if (BICIM_SIRA.test(t)) hit.push('sıra');
  return hit;
}

/* ── Sınıf C: kelime sırası ──────────────────────────────────────────────────────────
   Türkçe şablonun yer tutucuları sırayla doldurulunca İngilizce cümle nesnesiz kalıyor
   ve ilgeç havada asılı bitiyor: "… have announced a deal for."
   Ölçüt: cümle bir İNGİLİZCE İLGEÇ ile bitiyor. Türkçede böyle bir bitiş yoktur, bu
   yüzden yanlış pozitif riski düşüktür. */
/* ⚠ İngilizcede ilgeçle biten SAĞLAM cümleler vardır: "…the pool you assign them to."
   Ayırt edici işaret, ilgeçten ÖNCEKİ sözcüktür: zamir geliyorsa (them/it/you…) cümle
   tamdır; ad geliyorsa ("a deal for.") nesne düşmüştür. */
const ZAMIR_ONCE = /\b(them|it|him|her|us|you|me|that|this|those|these|which|whom|one|ones)\s+(for|with|of|to|from|by|about|into|onto|over|under|between)\s*[.!?]\s*$/i;
const SIRA_BOZUK = /(^|[^A-Za-z])(for|with|of|to|from|by|about|into|onto|over|under|between)\s*[.!?]\s*$/i;
/* Ayrıca: bir cümlede iki kez "—" ayracı ve ardından İngilizce yüklem — Türkçe
   dizilimin birebir çevrildiği tipik kalıp. */
const SIRA_TIRE = /—[^—]*—[^—]*\b(have|has|was|were|is|are)\b[^.]*\b(for|with|to)\s*\.$/i;

function siraBozuk(s) {
  const t = String(s || '').trim();
  if (t.length < 8) return false;
  if (ZAMIR_ONCE.test(t)) return false;
  return SIRA_BOZUK.test(t) || SIRA_TIRE.test(t);
}

/* ── Sınıf D: tamamen çevrilmemiş satır ──────────────────────────────────────────────
   Eski araç bunları LİSTELİYORDU ama 1700 satırlık ÖZEL İSİM gürültüsünün içinde
   kayboluyor ve hiçbir kapıyı düşürmüyordu; rapor "eksik 0" diyordu. Ölçüt özel ismi
   dışlar: satırda Türkçe CİNS İSİM / işlev sözcüğü varsa o satır çevrilmemiştir. */
function cevrilmemis(s) {
  const t = String(s || '');
  if (t.length < 4) return false;
  return trIsaret(t);
}

/** Bir metin düğümü listesini dört sınıfa ayırır. */
function siniflandir(satirlar) {
  const r = { A: [], B: [], C: [], D: [] };
  (satirlar || []).forEach(s => {
    const gov = String(s).replace(/^[^\p{L}\d%]+/u, '').trim();
    if (!gov) return;
    if (kismiCeviri(gov)) r.A.push(s);
    else if (cevrilmemis(gov)) r.D.push(s);      /* A ile çift saymamak için else */
    const b = bicimHatasi(gov);
    if (b.length) r.B.push(s + '   [' + b.join('+') + ']');
    if (siraBozuk(gov)) r.C.push(s);
  });
  return r;
}

module.exports = { siniflandir, kismiCeviri, bicimHatasi, siraBozuk, cevrilmemis };
