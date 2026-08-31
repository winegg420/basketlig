#!/usr/bin/env python3
"""Charazay oyuncu portre havuzu — FAZ 17 kova tabanlı üretim + işleme boru hattı.

    python3 tools/generate-portraits.py <kova> <adet> [is_parcacigi]

    kova : akd | siyah | kuz | beyaz | afr | lat | asya
    adet : ZORUNLU — bu çağrıda kaç yeni portre üretileceği

KAYNAK VE LİSANS — DİKKAT
-------------------------
Görseller pollinations.ai üzerinden üretiliyor. Bu servisin TİCARİ KULLANIM LİSANSI
BELİRSİZDİR: Terms sayfası JavaScript gerektirdiği için okunamadı, kendi GitHub deposunda
lisans sorusu cevapsız duruyor. Kullanıcı bunu bilerek kabul etti — önce web sürümü,
Steam öncesinde gerekirse görseller değiştirilecek. Bu yüzden ÜRETİM adımı ayrı bir
fonksiyondadır (`uret_bir`); kaynak değişirse boru hattının geri kalanı (fon eşitleme,
kırpma, eleme, manifest) aynen kalır.

BORU HATTI
----------
üret → fon parlaklığını eşitle (hedef ~120, std ≤8) → 256x320'den 256x250'ye dar kırp
     → bozuk/bulanık/benzer olanı ele → manifest'i güncelle

Elenen dosyanın numarası ATLANMAZ: sıradaki üretim o numarayı doldurur.
Yeniden numaralama YAPILMAZ — oyuncular portre dosya adını kendi üzerlerinde saklar.

NOT: Bu makinede Python kurulu değilse aynı boru hattının Node karşılığı kullanılır:
    node tools/generate-portraits.js <kova> <adet>
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

try:
    from PIL import Image, ImageFilter, ImageStat
except ImportError:  # pragma: no cover
    print("Pillow gerekli:  pip install Pillow", file=sys.stderr)
    raise

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "portraits"
MANIFEST = OUT / "manifest.json"

KOVALAR = ("akd", "siyah", "kuz", "beyaz", "afr", "lat", "asya")
BANTLAR = ("genc", "kidemli")
# Dağılım %45 genç / %55 kıdemli — oyuncu yaşı rand(18,36), 25 dahil genç.
GENC_PAY = 0.45

# ── Kilitlenmiş istem parçaları ───────────────────────────────────────────────────────
# Fon TEK: eski havuzda parlaklık 10,9–155,2 arasında geziniyordu (14 kat fark), kadro
# ekranı dağınık görünüyordu. Giysi TEK AİLE: kapüşonlu/tişört karışımı çıkarıldı.
FON = "neutral medium gray studio background"
GIYSI = "plain dark navy sleeveless basketball jersey"
KOVA_ETNIK = {
    "akd":   "Turkish Mediterranean man, olive skin, dark hair",
    "siyah": "African American man, dark skin",
    "kuz":   "Northern European man, fair skin, light brown hair",
    "beyaz": "white North American man, fair skin",
    "afr":   "West African man, very dark skin",
    "lat":   "Latin American man, tan skin, dark hair",
    "asya":  "East Asian man, straight black hair",
}
KOVA_BANT_YAS = {"genc": "age 19-25", "kidemli": "age 27-35"}
# Yüz çeşitliliği — etnik ifade ve fon SABİT kalır, yalnız bunlar döner.
LOOK = [
    "short hair, clean shaven",
    "buzz cut, short beard",
    "curly hair, athletic build",
    "shaved head, strong jawline",
    "fade haircut, goatee",
    "wavy hair, light stubble",
    "cropped hair, broad shoulders",
    "textured hair, light beard",
]

# ── Eleme eşikleri ────────────────────────────────────────────────────────────────────
HEDEF_PARLAKLIK = 120.0     # fon eşitleme hedefi
MIN_NETLIK = 90.0           # Laplace varyansı — altındaki bulanık sayılır
DHASH_MIN_MESAFE = 8        # bu Hamming mesafesinden yakın olan "aşırı benzer" sayılır
GENISLIK, YUKSEKLIK = 256, 320
KIRP_YUKSEKLIK = 230        # FAZ 17B: 256x320 → 256x230 (forma payı azalır, yüz büyür)


# ══ 1) ÜRETİM — kaynak değişirse yalnız burası değişir ════════════════════════════════
def istem(kova: str, bant: str, i: int) -> str:
    return (
        f"professional basketball player portrait headshot, {KOVA_ETNIK[kova]}, "
        f"{GIYSI}, {LOOK[i % len(LOOK)]}, {KOVA_BANT_YAS[bant]}, "
        f"{FON}, photorealistic, front facing, chest up, soft even lighting, "
        "single person, face fully visible, no text, no watermark, no logo"
    )


def uret_bir(kova: str, bant: str, i: int) -> bytes | None:
    """Tek portrenin ham baytlarını döndürür. Ağ/servis katmanı YALNIZ burada."""
    seed = abs(hash((kova, bant, i))) % 10_000_000
    q = urllib.parse.quote(istem(kova, bant, i))
    url = (
        f"https://image.pollinations.ai/prompt/{q}"
        f"?seed={seed}&width={GENISLIK}&height={YUKSEKLIK}&nologo=true"
    )
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "CharazayPortraitBot/2.0", "Accept": "image/*"},
    )
    for deneme in range(6):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = resp.read()
            return data if len(data) >= 3000 else None
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(4 * (deneme + 1))
                continue
            return None
        except Exception:
            time.sleep(2 * (deneme + 1))
    return None


# ══ 2) İŞLEME — fon eşitleme + dar kırpma ═════════════════════════════════════════════
def fon_parlakligi(im: Image.Image) -> float:
    """Kenar şeritlerinin ortalama parlaklığı — özne değil FON ölçülür."""
    g = im.convert("L")
    w, h = g.size
    serit = [g.crop((0, 0, int(w * 0.12), h)), g.crop((int(w * 0.88), 0, w, h)),
             g.crop((0, 0, w, int(h * 0.10)))]
    toplam = sum(ImageStat.Stat(s).mean[0] * s.size[0] * s.size[1] for s in serit)
    alan = sum(s.size[0] * s.size[1] for s in serit)
    return toplam / max(1, alan)


def isle(im: Image.Image) -> Image.Image:
    """Fon parlaklığını HEDEF_PARLAKLIK'a çeker, sonra dar kırpar."""
    fark = HEDEF_PARLAKLIK - fon_parlakligi(im)
    if abs(fark) > 1.0:
        im = im.point(lambda v: max(0, min(255, int(v + fark))))
    w, h = im.size
    ust = int((h - KIRP_YUKSEKLIK) * 0.35)       # üstten biraz, altından çok kırp
    return im.crop((0, ust, w, ust + KIRP_YUKSEKLIK))


# ══ 3) ELEME ══════════════════════════════════════════════════════════════════════════
def netlik(im: Image.Image) -> float:
    g = im.convert("L").filter(ImageFilter.FIND_EDGES)
    return ImageStat.Stat(g).stddev[0] ** 2


def dhash(im: Image.Image) -> int:
    g = im.convert("L").resize((9, 8))
    px = list(g.getdata())
    bit = 0
    for y in range(8):
        for x in range(8):
            bit = (bit << 1) | int(px[y * 9 + x] < px[y * 9 + x + 1])
    return bit


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def yuz_var_mi(im: Image.Image) -> bool:
    """Merkez bölgede ten rengi oranı — tek yüz vekili.

    NOT: gerçek yüz SAYISI tespiti OpenCV/dlib gerektirir. Bu fonksiyon onun yerine
    "merkezde makul büyüklükte tek bir ten yüzeyi var mı" sorusunu yanıtlar; boş,
    soyut ve özneyi çok uzakta bırakan kareleri eler.
    """
    w, h = im.size
    merkez = im.convert("RGB").crop((int(w * 0.28), int(h * 0.10), int(w * 0.72), int(h * 0.55)))
    px = list(merkez.getdata())
    ten = sum(
        1 for r, g, b in px
        if r > 60 and g > 35 and b > 20 and r > b and (max(r, g, b) - min(r, g, b)) > 12
    )
    oran = ten / max(1, len(px))
    return 0.30 <= oran <= 0.97


# ══ 4) MANİFEST ═══════════════════════════════════════════════════════════════════════
def manifest_oku() -> dict:
    try:
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    except Exception:
        return {"version": 2, "buckets": {}, "pattern": "%s_%s_%04d.jpg"}


def manifest_yaz() -> dict:
    """Diskteki GERÇEK dosyaları sayar — elle sayı girilmez."""
    m = {"version": 2, "buckets": {}, "pattern": "%s_%s_%04d.jpg"}
    for k in KOVALAR:
        m["buckets"][k] = {}
        for b in BANTLAR:
            n = 0
            while (OUT / f"{k}_{b}_{n:04d}.jpg").exists():
                n += 1
            m["buckets"][k][b] = n
    MANIFEST.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return m


def sonraki_sira(kova: str, bant: str) -> int:
    n = 0
    while (OUT / f"{kova}_{bant}_{n:04d}.jpg").exists():
        n += 1
    return n


# ══ 5) ANA AKIŞ ═══════════════════════════════════════════════════════════════════════
def mevcut_hashler(kova: str, bant: str) -> list[int]:
    out = []
    for p in sorted(OUT.glob(f"{kova}_{bant}_*.jpg")):
        try:
            out.append(dhash(Image.open(p)))
        except Exception:
            pass
    return out


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    kova = sys.argv[1]
    if kova not in KOVALAR:
        print(f"bilinmeyen kova: {kova} (geçerli: {', '.join(KOVALAR)})", file=sys.stderr)
        sys.exit(2)
    adet = int(sys.argv[2])
    OUT.mkdir(parents=True, exist_ok=True)

    hashler = {b: mevcut_hashler(kova, b) for b in BANTLAR}
    yazilan = {b: 0 for b in BANTLAR}
    elenen = {"bozuk": 0, "bulanik": 0, "yuz": 0, "benzer": 0}

    i = 0
    denenen = 0
    while sum(yazilan.values()) < adet and denenen < adet * 4:
        denenen += 1
        # Bant seçimi DİSKTEKİ duruma bakar, sayaç turuna değil. Sabit tur küçük
        # partilerde bozuluyordu: bir kovaya 8 tane istendiğinde 8'i de "genc" oluyordu.
        # FAZ 17B §3: (a) bir kovada ikinci görsel daima diğer banda gider — hiçbir
        # bant 0'da kalmaz; (b) sonrası %45/%55 hedefinden geri kalan bandı doldurur.
        var_genc, var_kid = sonraki_sira(kova, "genc"), sonraki_sira(kova, "kidemli")
        toplam_v = var_genc + var_kid
        if toplam_v == 0 or var_genc == 0:
            bant = "genc"
        elif var_kid == 0:
            bant = "kidemli"
        else:
            bant = "genc" if var_genc / toplam_v < GENC_PAY else "kidemli"
        i += 1
        ham = uret_bir(kova, bant, sonraki_sira(kova, bant) + denenen)
        if not ham:
            elenen["bozuk"] += 1
            continue
        try:
            import io
            im = Image.open(io.BytesIO(ham)).convert("RGB")
        except Exception:
            elenen["bozuk"] += 1
            continue
        im = isle(im)
        if not yuz_var_mi(im):
            elenen["yuz"] += 1
            continue
        if netlik(im) < MIN_NETLIK:
            elenen["bulanik"] += 1
            continue
        h = dhash(im)
        if any(hamming(h, o) < DHASH_MIN_MESAFE for o in hashler[bant]):
            elenen["benzer"] += 1
            continue
        # Elenen dosyanın numarası atlanmaz: sıra her zaman ilk BOŞ numaradır.
        sira = sonraki_sira(kova, bant)
        im.save(OUT / f"{kova}_{bant}_{sira:04d}.jpg", "JPEG", quality=88, optimize=True)
        hashler[bant].append(h)
        yazilan[bant] += 1
        print(f"ok {kova}_{bant}_{sira:04d}.jpg")

    m = manifest_yaz()
    print(f"bitti: {sum(yazilan.values())}/{adet} yazıldı {yazilan} · elenen {elenen}")
    print(f"manifest: {json.dumps(m['buckets'][kova], ensure_ascii=False)}")


if __name__ == "__main__":
    main()
