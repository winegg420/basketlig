/**
 * FAZ 25 §8 — ANLATIM KAPILARI (anlatim-check.js buradan çağırır).
 *
 * Neden ayrı dosya: anlatim-check.js zaten 450 satır ve FAZ 13'ün kendi ölçümlerini
 * tutuyor. FAZ 25'in dil kapıları (ek uyumu, failsiz cümle, saat referansı, üslup)
 * ayrı bir konu; birlikte tek dosyaya yığılınca hangi ölçümün hangi brifden geldiği
 * kaybolur. `olcumler(events, macSayisi)` saf bir fonksiyondur — dosya okumaz.
 */

const metin = e => String((e && e.text) || '').replace(/<[^>]*>/g, '');

/* ── Türkçe ek uyumu taraması ────────────────────────────────────────────────────────
   Şablonlarda ek SABİT yazılıyken "Ömer Polat'ye", "Bursa Yıldırım'de",
   "Koray Gündoğdu'nin" gibi 263 olayda 20 hata çıkıyordu. Burada üretilen METİN taranır:
   kesme işaretinden önceki son ünlüye bakılır, ekin ünlüsü uyuyor mu ölçülür.
   turkEk() doğru çalışıyorsa bu sayı 0 olmalıdır. */
const UNLU = 'aeıioöuüâîû';
const KALIN = 'aıouâû', INCE = 'eiöüî';
const DUZ_A = 'aıou', DUZ_E = 'eiöü';   /* düz ek 'a' isteyenler / 'e' isteyenler */
const SERT = 'fstkçşhp';

function sonUnlu(s) {
  const t = String(s || '').toLowerCase();
  for (let i = t.length - 1; i >= 0; i--) if (UNLU.indexOf(t[i]) >= 0) return t[i];
  return null;
}

/** Bir "Ad'ek" parçasını denetler. Dönüş: null = sorun yok, string = hata açıklaması. */
function ekDenetle(govde, ek) {
  const su = sonUnlu(govde);
  if (!su) return null;                                  /* ünlüsüz kısaltma — yargılama */
  const kalin = KALIN.indexOf(su) >= 0;
  const duzA = DUZ_A.indexOf(su) >= 0;
  const sonHarf = govde[govde.length - 1].toLowerCase();
  const unluBiter = UNLU.indexOf(sonHarf) >= 0;
  const sertBiter = SERT.indexOf(sonHarf) >= 0;
  const e = ek.toLowerCase();

  /* Bulunma / ayrılma: -da/-de/-ta/-te (+n zamir n'si). Sert ünsüzden sonra t. */
  let m = /^n?([dt])([ae])(n?)$/.exec(e);
  if (m) {
    const [, dt, unl] = m;
    if (sertBiter && dt !== 't') return `${govde}'${ek}: sert ünsüzden sonra -t beklenir`;
    if (!sertBiter && !unluBiter && dt !== 'd') return `${govde}'${ek}: yumuşak ünsüzden sonra -d beklenir`;
    if (kalin && unl !== 'a') return `${govde}'${ek}: kalın ünlüden sonra -a beklenir`;
    if (!kalin && unl !== 'e') return `${govde}'${ek}: ince ünlüden sonra -e beklenir`;
    return null;
  }
  /* Yönelme: -a/-e/-ya/-ye/-na/-ne */
  m = /^([yn]?)([ae])$/.exec(e);
  if (m) {
    const unl = m[2];
    if (duzA && unl !== 'a') return `${govde}'${ek}: kalın-düz ünlüden sonra -a beklenir`;
    if (!duzA && unl !== 'e') return `${govde}'${ek}: ince-düz ünlüden sonra -e beklenir`;
    return null;
  }
  /* Tamlayan: -ın/-in/-un/-ün (+n kaynaştırma) */
  m = /^(n?)([ıiuü])n$/.exec(e);
  if (m) {
    const unl = m[2];
    const bek = kalin ? (DUZ_A.indexOf(su) >= 0 && 'ou'.indexOf(su) >= 0 ? 'u' : 'ı') : ('öü'.indexOf(su) >= 0 ? 'ü' : 'i');
    if (unl !== bek) return `${govde}'${ek}: "${bek}n" beklenir`;
    if (unluBiter && m[1] !== 'n') return `${govde}'${ek}: ünlüden sonra kaynaştırma n beklenir`;
    return null;
  }
  return null;                                           /* tanımadığımız ek — yargılama */
}

/** Metindeki tüm "Özelad'ek" örneklerini denetler. */
function ekHatalari(txt) {
  const out = [];
  /* Kesme işaretinden ÖNCE en az iki harfli bir gövde, sonra 1-4 harflik ek. */
  const re = /([A-Za-zÇĞİÖŞÜçğıöşü]{2,})['’]([a-zçğıöşü]{1,4})\b/g;
  let m;
  while ((m = re.exec(txt)) !== null) {
    const h = ekDenetle(m[1], m[2]);
    if (h) out.push(h);
  }
  return out;
}

/* ── Failsiz cümle ───────────────────────────────────────────────────────────────────
   "Perde geldi. İsabet yok." — kim attığı belli değil. Yalnız OYUN olayları denetlenir;
   çeyrek başlığı, taktik, devre arası, mola gibi yapısal satırların faili yoktur. */
const FAILLI_TIP = new Set(['score2', 'score3', 'miss2', 'miss3', 'reb', 'steal', 'free', 'foul', 'block']);
/** Cümlede en az bir büyük harfle başlayan özel ad var mı? */
function failVar(txt) {
  const t = String(txt || '').replace(/^[^\p{L}]*/u, '');
  return /\p{Lu}[\p{Ll}\p{M}'’-]+/u.test(t);
}

/* ── Yabancı terim ───────────────────────────────────────────────────────────────── */
const YABANCI = /\bspacing\b|\bbox-?out\b|\bdrive\b|\broll\b|\bAND-?1\b|\bpick\b|\bclutch\b|\bcrossover\b|\bstep-?back\b|\bspin move\b/i;

/* ── Saat referansı ──────────────────────────────────────────────────────────────── */
const SAAT = /süre|saat|saniye|çeyrek biterken|çeyrek kapan|son saniyeler|zaman daral/i;
/* ⚠ Bu okuyucu SON_BOLUM havuzunun BİREBİR metnini arar. FAZ 28 §2.1.3'te satırlara
   yüklem eklenince ("Tansiyon tavanda." → "Tansiyon yükseldi.") kapı sessizce 3,8'den
   2,1'e düştü — havuz değişmişti, ton azalmamıştı. Havuz satırı değiştirilirse burası
   da güncellenir (FAZ 25'teki "kapı biçim okuyordu" dersinin aynısı). */
const TON = /kritik an geldi|bu top belirleyici|savunma dikildi|salon nefesini|her şey buna|tansiyon yükseldi|kimse oturmuyor|maç koptu|fark açıldı|skor tabelası konuştu|iş bitti sayılır|kalan süre yetmez|başa baş gidiyor/i;

/* ── Künye biçimli faul ──────────────────────────────────────────────────────────── */
const KUNYE = /Faul — .+\(kişisel \d\)/;

/* ── §7.5: anlatım ile saha çelişmesi ────────────────────────────────────────────────
   Kısa çekirdekler bölge filtresinden GEÇMEZ; içlerinde bölge iddiası olmamalı.
   Ayrıca köşe iddiası yalnız corner3 bölgesinde, post iddiası yalnız postup şemasında. */
const KOSE = /köşe/i;
const POST = /sırtını döndü|posta indi|postta sırtladı|düşük postta/i;
const YAKIN_SOZ = /turnike|pota altı|boyalı alan|dibe indi|smaç/i;

/* ══ FAZ 28 §2: DEYİM DENETİMİ ═══════════════════════════════════════════════════════
   FAZ 26'da şut tipleri eklenirken yazılan ifadeler Türkçe basketbol diline oturmuyordu.
   Canlıda görülenler: "Sancak servisini yaptı" (servis VOLEYBOL/TENİS terimidir,
   basketbolda karşılığı yoktur), "Yavuz demire geldi", "Turnike dönmedi",
   "Smacı tutmadı" — hiçbiri Türkçede kullanılan bir deyim değil. */
const SERVIS_RE = /(^|[^A-Za-zÇĞİÖŞÜçğıöşü])servis(i|in|ini|inde)?([^A-Za-zÇĞİÖŞÜçğıöşü]|$)/i;
const KARA_LISTE = [
  /demire geldi/i,
  /turnike dönmedi/i,
  /smacı tutmadı/i,
];

/* ── Fiil (yüklem) taraması ──
   Türkçede kısa parça anlatımın ritmidir ("Kaçırdı.") ama YÜKLEMSİZ parça kopuk durur
   ("Yavuz geldi. Üç sayı." / "Uçar adamını okudu. Camdan sakin."). Ölçüm cümle
   düzeyindedir: bir olay metni birden çok cümleye bölünür ve her cümlede en az bir
   çekimli fiil aranır.
   ⚠ Ünlem/nida parçaları (⚡ "Hızlı hücum!", "İkinci şans!") Türkçede geçerli
   birer nida cümlesidir, yüklem aramaz — kapsam dışıdır. Skor damgası ("84-79") ve
   simge önekleri de cümle değildir. */
const FIIL_RE = new RegExp(
  '(' +
  '[a-zçğıöşü]+(dı|di|du|dü|tı|ti|tu|tü)(lar|ler)?' +   /* belirli geçmiş: geldi, attı, buldu */
  '|[a-zçğıöşü]+(mış|miş|muş|müş)(lar|ler)?' +           /* öğrenilen geçmiş */
  '|[a-zçğıöşü]+(ıyor|iyor|uyor|üyor)(lar|ler)?' +       /* şimdiki zaman */
  '|[a-zçğıöşü]+(acak|ecek)(lar|ler)?' +                 /* gelecek */
  '|[a-zçğıöşü]+(malı|meli)' +                           /* gereklilik */
  '|(var|yok|değil|gerek)' +
  /* Geniş zaman ("Bunu sever.", "Durdurabilene aşk olsun.") yalnız CÜMLE SONUNDA
     aranır; 'haber' / 'şehir' gibi adlar cümle ortasında fiil sanılmasın. */
  '|[a-zçğıöşü]{2,}(ar|er|ır|ir|ur|ür)(?=[.!?]?$)' +
  '|olsun|olacak' +
  ')(?![a-zçğıöşü])', 'u');
function cumleler(tx) {
  return String(tx || '')
    .replace(/<[^>]*>/g, ' ')
    /* Skor damgası cümle değildir. ⚠ Yalnız BAŞINA BUYRUK skor atılır: "8-0'lık seri"
       içindeki sayıyı silmek cümleyi "lık seri." diye bozuyordu. */
    .replace(/(^|\s)\d+\s*-\s*\d+(?=\s|$)/g, ' ')
    .replace(/\([^)]*\)/g, ' ')                     /* parantez içi künye */
    /* Sıra sayısı ("üst üste 3. isabetini buldu") cümle sonu DEĞİLDİR — rakamdan
       sonraki nokta bölmez, yoksa yüklem bir sonraki parçada kalır. */
    .split(/(?<=[.!?])(?<![0-9]\.)\s+|\n+/)
    .map(x => x.trim())
    .filter(Boolean);
}
/* Künye / etiket satırları yüklem aramaz. Türkçede "Faul — Ali Kaya (kişisel 2)",
   "DEVRE ARASI — 45-38", "Maçın yıldızı: Ali Kaya — 18 sayı" birer ETİKET (ara söz)
   yapısıdır; bunları fiilli cümleye çevirmek anlatımı bozar, düzeltmez. Kapının konusu
   §2'nin kendisidir: ŞUT anlatımındaki kopuk parçalar ("Üç sayı.", "Camdan sakin."). */
const ETIKET_RE = /[—:]|^[A-ZÇĞİÖŞÜ\s]{6,}$/u;
function fiilsizCumleler(tx) {
  const cikan = [];
  cumleler(tx).forEach(c => {
    if (ETIKET_RE.test(c)) return;
    const govde = c.replace(/^[^\p{L}\d]+/u, '').trim();       /* simge öneki at */
    if (!govde) return;
    if (!/\p{L}/u.test(govde)) return;                          /* harf yoksa cümle değil */
    if (/[!]\s*$/.test(govde) && govde.split(/\s+/).length <= 3) return;   /* nida */
    if (FIIL_RE.test(govde.toLowerCase())) return;
    cikan.push(govde);
  });
  return cikan;
}

function olcumler(events, macSayisi) {
  const r = {
    olay: 0, kelime: 0, sut: 0, zincir: 0,
    ekHata: [], failsiz: [], yabanci: {},
    saat: 0, ton: 0, foul: 0, foulKunye: 0, hepsiIceride: 0,
    celiski: [],
    /* FAZ 28 §2 */
    servis: [], kara: [], cumle: 0, fiilsiz: [], fiilsizN: 0,
  };
  events.forEach(e => {
    const tx = metin(e);
    if (!tx) return;
    r.olay++;
    r.kelime += tx.replace(/\([^)]*\)/g, '').trim().split(/\s+/).filter(Boolean).length;

    ekHatalari(tx).forEach(h => { if (r.ekHata.length < 12) r.ekHata.push(h); });

    if (FAILLI_TIP.has(e.type) && !failVar(tx) && r.failsiz.length < 12) r.failsiz.push(`[${e.type}] ${tx}`);

    const y = tx.match(YABANCI);
    if (y) r.yabanci[y[0].toLowerCase()] = (r.yabanci[y[0].toLowerCase()] || 0) + 1;

    if (SAAT.test(tx)) r.saat++;
    if (TON.test(tx)) r.ton++;
    if (e.type === 'foul') { r.foul++; if (KUNYE.test(tx)) r.foulKunye++; }
    if (/hepsi içeride/i.test(tx)) r.hepsiIceride++;

    /* FAZ 28 §2: yasak terim + kara liste + yüklem taraması */
    if (SERVIS_RE.test(tx) && r.servis.length < 8) r.servis.push(tx.slice(0, 90));
    KARA_LISTE.forEach(re => { if (re.test(tx) && r.kara.length < 8) r.kara.push(tx.slice(0, 90)); });
    const _c = cumleler(tx);
    r.cumle += _c.length;
    const _f = fiilsizCumleler(tx);
    r.fiilsizN += _f.length;
    _f.forEach(x => { if (r.fiilsiz.length < 8) r.fiilsiz.push(x); });

    if (e.shot) {
      r.sut++;
      if (e.shot.zincir) r.zincir++;
      /* Söz ile saha çelişmesi */
      if (KOSE.test(tx) && e.shot.zone !== 'corner3' && r.celiski.length < 10)
        r.celiski.push(`köşe iddiası ama bölge ${e.shot.zone}: ${tx.slice(0, 70)}`);
      if (POST.test(tx) && e.shot.scheme !== 'postup' && r.celiski.length < 10)
        r.celiski.push(`post iddiası ama şema ${e.shot.scheme}: ${tx.slice(0, 70)}`);
      if (YAKIN_SOZ.test(tx) && e.shot.kind === '3' && r.celiski.length < 10)
        r.celiski.push(`yakın şut sözü ama 3'lük: ${tx.slice(0, 70)}`);
    }
  });
  r.mac = macSayisi;
  r.kelimeOrt = r.olay ? r.kelime / r.olay : 0;
  r.saatOran = r.olay ? r.saat / r.olay : 0;
  r.zincirOran = r.sut ? r.zincir / r.sut : 0;
  r.foulKunyeOran = r.foul ? r.foulKunye / r.foul : 0;
  r.tonMac = macSayisi ? r.ton / macSayisi : 0;
  r.hepsiIceridMac = macSayisi ? r.hepsiIceride / macSayisi : 0;
  r.fiilsizOran = r.cumle ? r.fiilsizN / r.cumle : 0;
  return r;
}

/* ── FAZ 13 kapılarının FAZ 25 sonrası okuyucuları ───────────────────────────────────
   İki mevcut kapı yüzeysel BİÇİM arıyordu ve FAZ 25 üslup değişikliğiyle yanlış negatif
   veriyordu. Niyetleri korunur, okuyucu her iki biçimi de anlar:
     • top çalma iki taraflı → "Ad Soyad" kalıbı arıyordu; anlatım artık tek ad kullanıyor
       (§7.4a) ve ölçüm 0/795 çıkıyordu.
     • faul satırı adlı + sayaç → yalnız künye ("Faul — X (kişisel 2)") okunuyordu;
       satırların yarısı artık cümle ("X'in ikinci faulü") biçiminde (§7.4d). */
const AD_RE = /\p{Lu}[\p{L}'’]+/gu;
const FOUL_KUNYE = /Faul — ([^()]+?) \(kişisel (\d+)\)/;
/* ⚠ `\b` ASCII sınırıdır: 'ü'/'ç' sözcük karakteri SAYILMAZ, bu yüzden /\büçüncü\b/
   hiç eşleşmiyordu ve "üçüncü faul" satırlarının HEPSİ okunamıyordu (25 satır, ve
   sayaç kopunca 27 sahte "atlama"). CLAUDE.md'deki FAZ 17 i18n dersinin aynısı —
   sınır Türkçe harf sınıfıyla açık yazılır. */
const HARF = "A-Za-zÇĞİÖŞÜçğıöşü";
const FOUL_CUMLE_RE = new RegExp(
  "(\\p{Lu}[\\p{L}'’]+(?:\\s\\p{Lu}[\\p{L}'’]+)?)[^.]{0,40}?" +
  "(?:^|[^" + HARF + "])(ilk|ilki|ikinci|ikincisi|üçüncü|üçüncüsü|dördüncü|dördüncüsü|beşinci|beşincisi)" +
  "(?![" + HARF + "])", "u");
const FOUL_EK_RE = /['’](in|ın|un|ün|nin|nın|nun|nün)$/u;
const SIRA_NO = {
  ilk: 1, ilki: 1, ikinci: 2, ikincisi: 2, 'üçüncü': 3, 'üçüncüsü': 3,
  'dördüncü': 4, 'dördüncüsü': 4, 'beşinci': 5, 'beşincisi': 5
};

/** Metinde geçen ve kadroda GERÇEKTEN bulunan adlar (tekil). Cümle başındaki büyük
    harfli fiil/ünlem yanlış saymasın diye kadro süzgeci şart. */
function adlariBul(txt, kadroSet) {
  const p = String(txt || '').match(AD_RE) || [];
  return Array.from(new Set(p.filter(w => kadroSet && kadroSet.has(w))));
}
/* Sıra sözcüğünün KENDİSİNİ bulur (adı ayrıca ararız). Türkçe harf sınırı açık yazılır. */
const ORD_RE = new RegExp(
  "(?:^|[^" + HARF + "])(ilk|ilki|ikinci|ikincisi|üçüncü|üçüncüsü|dördüncü|dördüncüsü|beşinci|beşincisi)" +
  "(?![" + HARF + "])", "u");
/** Ad anahtarını SOYADA indirger. Künye tam ad ("İlker Genç"), cümle biçimi de tam ad
    verir; ama cümlede önce "Hakem" gibi büyük harfli bir sözcük gelebiliyor. Soyad,
    iki biçimde de aynı anahtarı üretir — sayaç ancak böyle kesintisiz izlenebilir. */
function _soyad(s) {
  const a = String(s || '').trim().replace(FOUL_EK_RE, '').split(/\s+/);
  return (a[a.length - 1] || '').replace(/['’][a-zçğıöşü]{1,4}$/u, '');
}
/** Faul satırından {ad, no} çıkarır; künye ve cümle biçimini birlikte okur. */
function foulOku(txt) {
  const mk = FOUL_KUNYE.exec(txt);
  if (mk) return { ad: _soyad(mk[1]), no: Number(mk[2]) };
  const mo = ORD_RE.exec(txt);
  if (!mo) return null;
  const no = SIRA_NO[mo[1]];
  if (!no) return null;
  /* Sıra sözcüğünden ÖNCEKİ son özel ad, faulü yapandır. İlk sürüm regex'in ilk
     yakaladığı sözcüğü alıyordu ve "Hakem Bekir Çelik'i gördü, üçüncü faul" satırında
     ad "Hakem" oluyordu — sayaç kopuyor, 26 sahte "atlama" üretiyordu. */
  const once = txt.slice(0, mo.index);
  const toks = once.match(AD_RE) || [];
  if (!toks.length) return null;
  return { ad: _soyad(toks[toks.length - 1]), no };
}


/* ── FAZ 28 §2: sınıf başına ifade sayımı ──
   Sorun yalnız yanlış deyim değildi; sınıf başına 3-4 ifade vardı ve aynı cümle maç
   içinde tekrar ediyordu. Kapı: her şut sınıfı için havuzda ≥8 farklı ifade. */
function sutIfadeSayisi(ctx) {
  const say = {};
  const ekle = (sinif, dizi) => {
    if (!Array.isArray(dizi)) return;
    const k = say[sinif] || (say[sinif] = new Set());
    dizi.forEach(x => { if (typeof x === 'string' && x.trim()) k.add(x.trim()); });
  };
  try {
    const SL = ctx.SUT_LINES;
    if (SL) Object.keys(SL).forEach(t => { Object.keys(SL[t]).forEach(kind => ekle(t, SL[t][kind])); });
  } catch (e) {}
  try {
    const KC = ctx.KISA_CEKIRDEK_SUT;
    if (KC) Object.keys(KC).forEach(t => { Object.keys(KC[t]).forEach(kind => ekle(t, KC[t][kind])); });
  } catch (e) {}
  const out = {};
  Object.keys(say).forEach(k => { out[k] = say[k].size; });
  return out;
}

/* ── FAZ 28 §4: ardışık olay damgası ──
   Canlıda üç ayrı olay "1P 6:19" damgasıyla arka arkaya geliyordu. Duraklama olayları
   (çeyrek başı/sonu, maç sonu, MVP) bu kuralın dışındadır — onların damgası sabittir. */
const DAMGA_MUAF = new Set(['quarter_start', 'quarter_end', 'end', 'mvp']);
function damgaCakismasi(events) {
  const cak = [];
  for (let i = 1; i < events.length; i++) {
    const a = events[i - 1], b = events[i];
    if (!a || !b || a.t == null || b.t == null) continue;
    if (a.q !== b.q) continue;                       /* çeyrek değişimi */
    if (DAMGA_MUAF.has(a.type) || DAMGA_MUAF.has(b.type)) continue;
    /* Kornaya (0:00) kadar oynanan pozisyonun kaçan şutu ve ribaundu GERÇEKTEN aynı
       damgayı taşır — saat durmuştur, ilerleyecek saniye yoktur. Şikâyetin konusu
       maç ORTASINDA (1P 6:19) üst üste gelen olaylardı; korna anı kuralın kendisidir. */
    if (a.t === 0 && b.t === 0) continue;
    if (a.t === b.t) cak.push({ q: a.q, t: a.t, a: a.type, b: b.type });
  }
  return cak;
}

module.exports = { olcumler, ekHatalari, ekDenetle, failVar, metin, adlariBul, foulOku,
                   sutIfadeSayisi, damgaCakismasi, fiilsizCumleler, cumleler };
