"""FAZ 17C — PORTRE İŞLEME BORU HATTI (ortak modül)

FAZ 17B'de bu boru hattı headless Chromium'un <canvas>'ında JavaScript olarak yazılmıştı
(makinede Python yoktu). FAZ 17C'de üretim yerele taşınınca Python'a alındı; ADIMLAR VE
EŞİKLER AYNI, yalnız uygulama dili değişti. Kaynak değişse bile bu modül aynı kalır —
`tools/generate-portraits.py` (pollinations) ve `tools/portre-uret-yerel.py` (SD-Turbo)
ikisi de buradan geçer.

BORU HATTI:  kadraj (zoom + 256×230) → fon eşitleme → eleme kapıları → dHash

ELEME KAPILARININ GEREKÇESİ (FAZ 17B'de ölçüldü, tahminle konmadı):
  • forma parlaklığı  — havuzun üçte biri beyaz formayla geliyordu (ölçüm 14,5-224,3).
  • forma yazı enerjisi — "no text" demek yetmiyor; kareler "LAKERS", Nike swoosh'u ve
    bozuk sahte yazı taşıyordu. Naif "medyandan sapan piksel oranı" TERS sonuç veriyor
    (temiz kare %43,9 · yazılı kare %25,3) çünkü beyaz yaka biyesi temizi şişiriyor.
    Doğru ayrım: KUMAŞIN KENDİ tonundaki bölgede Laplace kenar enerjisi.
  • ten yüzeyi vekili — gerçek yüz SAYISI tespiti OpenCV ister; bu, boş/soyut/özneyi
    uzakta bırakan kareleri eleyen vekildir.
"""
from __future__ import annotations
import numpy as np
from PIL import Image

# ── Çıktı biçimi ──────────────────────────────────────────────────────────────────────
GENISLIK, YUKSEKLIK = 256, 230        # FAZ 17B §1.3
HEDEF_PARLAKLIK = 120.0               # fon hedefi (kapı: ort 118-122, std ≤8)

# ── Kadraj ────────────────────────────────────────────────────────────────────────────
# Kaynak artık 512×512 (SD-Turbo), pollinations'ın 256×320'si değil. Özne göğüsten yukarı
# ve ortada duruyor; kadraj yüzü büyütecek ve formayı büyük ölçüde dışarıda bırakacak
# şekilde seçildi. Değerler ayar turunda ölçülerek belirlenir.
KADRAJ_GENISLIK_PAY = 0.80            # kaynak genişliğinin ne kadarı alınır
KADRAJ_UST_PAY = 0.045                # üstten atlanan pay

# ── Eleme eşikleri ────────────────────────────────────────────────────────────────────
MAX_FORMA_PARLAKLIK = 115.0
MAX_YAZI_ENERJI = 0.030
MIN_NETLIK = 70.0
DHASH_MIN_MESAFE = 8
TEN_ALT, TEN_UST = 0.30, 0.97


def _lum(a: np.ndarray) -> np.ndarray:
    return 0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]


def kadrajla(im: Image.Image) -> Image.Image:
    """Zoomlu kadraj: kaynaktan pencere alınıp 256×230'a ölçeklenir."""
    im = im.convert("RGB")
    W, H = im.size
    sw = int(W * KADRAJ_GENISLIK_PAY)
    sh = int(round(sw * YUKSEKLIK / GENISLIK))
    sx = (W - sw) // 2
    sy = int(H * KADRAJ_UST_PAY)
    if sy + sh > H:
        sy = max(0, H - sh)
    return im.crop((sx, sy, sx + sw, sy + sh)).resize((GENISLIK, YUKSEKLIK), Image.LANCZOS)


def _fon_maskesi(L: np.ndarray) -> np.ndarray:
    """Arka plan sayılan piksellerin maskesi.

    Kenar şeritlerinin ÜST yarısı + üst şerit alınır (alt köşelerde omuz var), sonra
    şerit medyanına ±30 yakın olanlar seçilir: saç, omuz ve forma dışarıda kalır.
    FAZ 17B'de bu sınıflandırma yokken rapor 107,7 gösteriyordu (hedef 118-122) —
    normalizasyon medyanı düzeltiyor ama rapor ortalamayı yazıyordu.
    """
    h, w = L.shape
    kenar = np.zeros((h, w), dtype=bool)
    kenar[: int(h * 0.08), :] = True
    ust = slice(0, int(h * 0.62))
    kenar[ust, : int(w * 0.10)] = True
    kenar[ust, int(w * 0.90):] = True
    if not kenar.any():
        return kenar
    med = float(np.median(L[kenar]))
    yakin = np.abs(L - med) <= 30.0
    m = kenar & yakin
    return m if m.sum() > 50 else kenar


def fon_olc(im: Image.Image) -> tuple[float, float]:
    a = np.asarray(im, dtype=np.float32)
    L = _lum(a)
    m = _fon_maskesi(L)
    if not m.any():
        return 128.0, 0.0
    v = L[m]
    return float(v.mean()), float(v.std())


def fon_esitle(im: Image.Image, gecis: int = 3) -> Image.Image:
    """Arka plan ortalamasını HEDEF_PARLAKLIK'a çeker (düzeltilen = raporlanan)."""
    a = np.asarray(im, dtype=np.float32)
    for _ in range(gecis):
        L = _lum(a)
        m = _fon_maskesi(L)
        if not m.any():
            break
        fark = HEDEF_PARLAKLIK - float(L[m].mean())
        if abs(fark) < 0.4:
            break
        a = np.clip(a + fark, 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGB")


def ten_orani(im: Image.Image) -> float:
    """Merkez bölgede ten rengi oranı — tek yüz vekili."""
    a = np.asarray(im, dtype=np.int16)
    h, w, _ = a.shape
    b = a[int(h * 0.10):int(h * 0.55), int(w * 0.28):int(w * 0.72)]
    r, g, bl = b[:, :, 0], b[:, :, 1], b[:, :, 2]
    mx = b.max(axis=2); mn = b.min(axis=2)
    ten = (r > 60) & (g > 35) & (bl > 20) & (r > bl) & ((mx - mn) > 12)
    return float(ten.mean())


def forma_parlakligi(im: Image.Image) -> float:
    a = np.asarray(im, dtype=np.float32)
    L = _lum(a)
    h, w = L.shape
    return float(L[int(h * 0.80):, int(w * 0.32):int(w * 0.68)].mean())


def yazi_enerjisi(im: Image.Image) -> float:
    """Kumaş tonundaki bölgede Laplace kenar enerjisi — düz kumaşta ~0, yazıda yüksek."""
    a = np.asarray(im, dtype=np.float32)
    L = _lum(a)
    h, w = L.shape
    y0, y1 = int(h * 0.80), h
    x0, x1 = int(w * 0.24), int(w * 0.76)
    böl = L[y0:y1, x0:x1]
    if böl.size < 400:
        return 0.0
    med = float(np.median(böl))
    kumas = böl <= med + 28.0          # biye / ten / arka plan hariç
    lap = np.abs(4 * böl[1:-1, 1:-1] - böl[:-2, 1:-1] - böl[2:, 1:-1]
                 - böl[1:-1, :-2] - böl[1:-1, 2:])
    ic = kumas[1:-1, 1:-1]
    n = int(ic.sum())
    if n < 200:
        return 0.0
    return float((lap[ic] > 34.0).sum() / n)


def netlik(im: Image.Image) -> float:
    a = np.asarray(im, dtype=np.float32)
    L = _lum(a)
    lap = 4 * L[1:-1, 1:-1] - L[:-2, 1:-1] - L[2:, 1:-1] - L[1:-1, :-2] - L[1:-1, 2:]
    return float(lap.var())


def dhash(im: Image.Image) -> int:
    g = im.convert("L").resize((9, 8), Image.LANCZOS)
    a = np.asarray(g, dtype=np.int16)
    bits = (a[:, :-1] < a[:, 1:]).flatten()
    out = 0
    for b in bits:
        out = (out << 1) | int(b)
    return out


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def isle_ve_olc(ham: Image.Image) -> tuple[Image.Image, dict]:
    """Kadrajla + fonu eşitle, sonra tüm ölçümleri döndür."""
    im = fon_esitle(kadrajla(ham))
    fo, fs = fon_olc(im)
    return im, {
        "fonOrt": fo, "fonStd": fs,
        "ten": ten_orani(im),
        "forma": forma_parlakligi(im),
        "yazi": yazi_enerjisi(im),
        "netlik": netlik(im),
        "hash": dhash(im),
    }


def kapilar(o: dict, hashler: list[int]) -> str | None:
    """Elenme sebebini döndürür; kare temizse None."""
    if not (TEN_ALT <= o["ten"] <= TEN_UST):
        return "yuz"
    if o["forma"] > MAX_FORMA_PARLAKLIK:
        return "acikForma"
    if o["yazi"] > MAX_YAZI_ENERJI:
        return "formaYazi"
    if o["netlik"] < MIN_NETLIK:
        return "bulanik"
    if any(hamming(o["hash"], h) < DHASH_MIN_MESAFE for h in hashler):
        return "benzer"
    return None
