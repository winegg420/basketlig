#!/usr/bin/env python
"""FAZ 23 — PORTRE TARZI DENEME TURU (3 tarz × 4 portre = 12 görsel)

    .venv-portre\\Scripts\\python.exe tools\\portre-deneme.py

NEDEN BU TUR VAR
----------------
Önceki turda üretilen 465 portre basketbolcu portresi değil VESİKALIK çıktı: yüz kareyi
dolduruyor, forma görünmüyor, spora dair hiçbir işaret yok. YuNet ile ölçüldü — mevcut
karelerde yüz yüksekliği karenin **%59-112'si**, hedef %30-38.

Kök neden üç talimatın üst üste binmesiydi: (1) FAZ 17B kırpmayı 250→230'a indirdi,
(2) FAZ 17C "düz işaretsiz forma" dedi, (3) OCR kapısı kurulamayınca kadraj göğsün
üstüne çekildi. Üçü birleşince forma tamamen kadraj dışında kaldı; marka sorunu formayı
YOK EDEREK "çözülmüş" oldu.

BU TURUN FARKI
--------------
• Kırpma SABİT KUTU DEĞİL: yüz tespit edilir, kare yüz konumuna göre hesaplanır.
  Yüz yüksekliği karenin %34'ü olacak şekilde ölçeklenir; yüz merkezi üstten %25'e
  oturur — böylece kafa üstünde boşluk, altta omuz ve forma kalır.
• Yazı riski KADRAJLA DEĞİL ELEME İLE çözülür: forma bölgesinde kenar enerjisi eşiği
  aşan kare silinir ve YENİ TOHUMLA yeniden üretilir.
• Fon düz gri değil, koyu degrade (vesikalık hissinin sebeplerinden biri düz griydi).

assets/portraits/ klasörüne DOKUNULMAZ.
"""
from __future__ import annotations
import sys, time
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageDraw

KOK = Path(__file__).resolve().parents[1]
CIKTI = KOK / "deneme"
YUNET = KOK / "tools" / "models" / "yunet.onnx"

MODEL = "stabilityai/sd-turbo"
URETIM = 512          # üretim çözünürlüğü
BOY = 256             # çıktı kenarı (kare)
# ÖLÇÜLEREK BULUNDU (FAZ 23 ayar turu): turbo varsayılanı guidance_scale=0'dır ve o
# ayarda istem BAĞLAMIYOR — her yeni kısıt bir öncekini dışarı itiyordu:
#   cfg 0  → fon koyuluğu -13 (köşeler merkezden AÇIK), yüz karenin %59'u
#   cfg 0 + "wide shot" → kadraj düzeldi ama FORMA tamamen kayboldu (çıplak gövde)
#   512×768 → bozuk çıktı (üst üste iki yüz); bu modelde kare dışı en-boy güvenilmez
#   cfg 3.5 / 6 adım → forma VE koyu fon geldi (fon 29.0), kadraj hâlâ yakın
#   cfg 3.5 + "wide shot from the waist up" → üçü birden tuttu
ADIM = 6
KILAVUZ = 3.5
# CFG > 1 olduğu için artık GERÇEK negatif istem kullanılabiliyor — turbo'nun cfg=0
# varsayılanında bu kapı kapalıydı ve yazı yalnız eleme ile kovalanabiliyordu.
# Forma görünür hâle gelince yazı riski de görünür oldu (ölçülen yazı enerjisi %15,2).
NEGATIF = ("text, letters, numbers, words, logo, watermark, signature, "
           "jersey lettering, team name, cropped head, close-up face")

# ── Kadraj hedefleri (§3.1) ───────────────────────────────────────────────────────────
# Kapı %30-45 (kullanıcı kararı, FAZ 23 ölçümünden sonra). Gerekçe: 13 denemenin
# 10'u SADECE yüz oranından elendi (ölçülen %40-87) — SD-Turbo tutarlı biçimde yakın
# plan üretiyor ve bu istemle bastırılamıyor. %38 tavanı bu modelde kabul oranını
# neredeyse sıfırlıyordu. Hedef yine %34: kırpma mümkün olduğunca oraya çeker,
# kapı ise %45'e kadar tolere eder.
YUZ_ORAN_HEDEF = 0.34     # yüz yüksekliği / kare yüksekliği
YUZ_ORAN_ALT, YUZ_ORAN_UST = 0.30, 0.45
YUZ_MERKEZ_UST_PAY = 0.25 # yüz merkezi karenin üstten %25'ine oturur
KAFA_USTU_PAY = 0.05      # tespit kutusunun üstünde en az bu kadar pay kalmalı (saç payı)

# ── Eleme eşikleri (§4) ───────────────────────────────────────────────────────────────
# KANITLA YENİDEN KALİBRE EDİLDİ (FAZ 23): 0,055 eşiği formanın KADRAJ DIŞINDA olduğu
# döneme aitti. Forma artık gerçekten görünüyor ve kumaş kıvrımları, yaka biyesi, renk
# bloğu kenar enerjisi üretiyor. Elenen kare gözle incelendi: ÜZERİNDE YAZI YOK ama
# ölçüm %17 verdi — yani kapı yazıyı değil kumaş detayını ölçüyordu.
# Deneme turu için eşik yazısız tabanın (%17) belirgin üstüne çekildi.
# ÜRETİM ÖNCESİ NOT: bu metrik yazı ile kumaşı ayıramıyor; 3.000'lik turdan önce
# ayırt edici bir ölçüt gerekir (küçük, yatay tekrarlı, yüksek frekanslı yapı).
MAX_YAZI_ENERJI = 0.25
MIN_NETLIK = 60.0
MIN_FON_KOYULUK = 6.0     # köşeler merkezden en az bu kadar koyu olmalı

# ── Sabitler: forma, fon, yaş bandı (§3.2-3.4) ────────────────────────────────────────
# CLIP istemi 77 token'da KESER ve kesilen kuyruk hep en sondaki talimattır. FAZ 17C'de
# bu yüzden çerçeveleme talimatı kaybolmuştu; burada da fon/vignette kesiliyordu. Bu yüzden
# her parça kısa tutuldu ve önem sırasına dizildi (tarz > özne > forma > kadraj > fon).
FORMA = "dark navy sleeveless basketball jersey"
FON = "dark background, vignette"
BANT_TARIF = {
    "genc":    ("age 22", "smooth face, clean shaven"),
    "kidemli": ("age 32", "strong jaw, full beard, lined face"),
}
KOVA_TARIF = {
    "akd":   "Turkish man, olive skin, dark hair",
    "siyah": "African American man, dark brown skin",
    "kuz":   "Northern European man, very fair skin, light hair",
}
ACI = ["facing the camera", "head turned slightly right", "head turned slightly left"]
IFADE = ["neutral expression", "determined expression", "faint smile"]
ISIK = ["lit from the left", "lit from the right", "lit from the front"]

TARZLAR = {
    "A": "semi realistic painted portrait, soft brushwork",
    "B": "bold comic book art, heavy ink outlines, flat colours",
    "C": "stylized caricature, oversized head, exaggerated features",
}
# 4 portre: aynı tohumlar her tarzda kullanılır (birebir karşılaştırma)
PLAN = [("akd", "genc"), ("akd", "kidemli"), ("siyah", "genc"), ("kuz", "kidemli")]
TOHUMLAR = [10_001, 10_002, 10_003, 10_004]


def _karis(x: int) -> int:
    x &= 0xFFFFFFFF
    x ^= x >> 16; x = (x * 0x7FEB352D) & 0xFFFFFFFF
    x ^= x >> 15; x = (x * 0x846CA68B) & 0xFFFFFFFF
    x ^= x >> 16
    return x


def istem(tarz: str, kova: str, bant: str, tohum: int) -> str:
    yas, yuz = BANT_TARIF[bant]
    h = _karis(tohum)
    return (f"{TARZLAR[tarz]}, wide shot from the waist up, {KOVA_TARIF[kova]}, {yas}, {yuz}, "
            f"{FORMA}, chest visible, {FON}, "
            f"{ACI[h % 3]}, {IFADE[(h >> 3) % 3]}, {ISIK[(h >> 6) % 3]}")


# ── Üretim ────────────────────────────────────────────────────────────────────────────
_pipe = None
def _boru(threads=8):
    global _pipe
    if _pipe is None:
        import torch
        from diffusers import AutoPipelineForText2Image
        torch.set_num_threads(threads)
        t = time.time()
        p = AutoPipelineForText2Image.from_pretrained(MODEL, torch_dtype=torch.float32,
                                                      safety_checker=None)
        p = p.to("cpu"); p.set_progress_bar_config(disable=True)
        print(f"model yüklendi: {time.time()-t:.1f} sn", flush=True)
        _pipe = p
    return _pipe


def uret(tarz, kova, bant, tohum):
    import torch
    p = _boru()
    g = torch.Generator(device="cpu").manual_seed(tohum)
    return p(prompt=istem(tarz, kova, bant, tohum), negative_prompt=NEGATIF,
             num_inference_steps=ADIM, guidance_scale=KILAVUZ,
             height=URETIM, width=URETIM, generator=g).images[0]


# ── Yüz tespiti ve YÜZE GÖRE kırpma (§3.1) ────────────────────────────────────────────
_det = None
def _dedektor(w, h):
    global _det
    if _det is None:
        _det = cv2.FaceDetectorYN.create(str(YUNET), "", (w, h), 0.6, 0.3, 5000)
    _det.setInputSize((w, h))
    return _det


def yuzler(pil: Image.Image):
    bgr = np.array(pil.convert("RGB"))[:, :, ::-1].copy()
    h, w = bgr.shape[:2]
    _, f = _dedektor(w, h).detect(bgr)
    return [] if f is None else [tuple(map(float, x[:4])) for x in f]


def kadrajla(pil: Image.Image, yuz):
    """Yüz konumuna göre kare kırpma. Sabit kutu DEĞİL — önceki turun hatası buydu."""
    W, H = pil.size
    fx, fy, fw, fh = yuz
    kare = fh / YUZ_ORAN_HEDEF                       # kare kenarı (yüz %34 olacak şekilde)
    cx = fx + fw / 2.0
    cy = fy + fh / 2.0
    sol = cx - kare / 2.0
    ust = cy - kare * YUZ_MERKEZ_UST_PAY             # yüz merkezi üstten %25
    # Kare görüntüden büyükse (model yakın plan üretmişse) mümkün olan EN GENİŞ kare
    # alınır; gerçek yüz oranı sonra ölçülür ve %30-38 kapısı karar verir. Burada
    # sessizce reddetmek, kadraj sorununu görünmez kılıyordu.
    kare = min(kare, float(min(W, H)))
    sol = max(0.0, min(sol, W - kare))
    ust = max(0.0, min(ust, H - kare))
    # Kafa üstü kesilmiş mi? Tespit kutusunun üstünde saç payı kalmalı.
    if fy - ust < KAFA_USTU_PAY * kare:
        return None, "kafa-ustu-kesik"
    kutu = (int(round(sol)), int(round(ust)), int(round(sol + kare)), int(round(ust + kare)))
    return pil.crop(kutu).resize((BOY, BOY), Image.LANCZOS), None


# ── Ölçümler / kapılar (§4) ───────────────────────────────────────────────────────────
def _lum(a):
    return 0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]


def netlik(im):
    L = _lum(np.asarray(im, dtype=np.float32))
    lap = 4*L[1:-1,1:-1] - L[:-2,1:-1] - L[2:,1:-1] - L[1:-1,:-2] - L[1:-1,2:]
    return float(lap.var())


def yazi_enerjisi(im):
    """Forma bölgesi (alt üçte bir, orta sütun) — kumaş tonundaki kenar enerjisi."""
    L = _lum(np.asarray(im, dtype=np.float32))
    h, w = L.shape
    b = L[int(h*0.66):, int(w*0.28):int(w*0.72)]
    if b.size < 400:
        return 0.0
    med = float(np.median(b))
    kumas = b <= med + 28.0
    lap = np.abs(4*b[1:-1,1:-1] - b[:-2,1:-1] - b[2:,1:-1] - b[1:-1,:-2] - b[1:-1,2:])
    ic = kumas[1:-1,1:-1]
    n = int(ic.sum())
    return 0.0 if n < 200 else float((lap[ic] > 34.0).sum() / n)


def fon_koyulugu(im):
    """Koyu degrade doğrulaması: üst köşeler orta bölgeden koyu olmalı."""
    L = _lum(np.asarray(im, dtype=np.float32))
    h, w = L.shape
    k = int(min(h, w) * 0.18)
    koseler = np.concatenate([L[:k, :k].ravel(), L[:k, -k:].ravel()])
    orta = L[int(h*0.15):int(h*0.5), int(w*0.30):int(w*0.70)]
    return float(orta.mean() - koseler.mean())


def olc_ve_kapi(im):
    ys = yuzler(im)
    o = {"yuzSayisi": len(ys)}
    if len(ys) != 1:
        return o, "yuz-sayisi"
    h = im.size[1]
    o["yuzOran"] = ys[0][3] / h
    o["netlik"] = netlik(im)
    o["yazi"] = yazi_enerjisi(im)
    o["fonKoyu"] = fon_koyulugu(im)
    if not (YUZ_ORAN_ALT <= o["yuzOran"] <= YUZ_ORAN_UST):
        return o, "yuz-orani"
    if o["yazi"] > MAX_YAZI_ENERJI:
        return o, "forma-yazi"
    if o["netlik"] < MIN_NETLIK:
        return o, "bulanik"
    if o["fonKoyu"] < MIN_FON_KOYULUK:
        return o, "fon-duz"
    return o, None


# ── Ana akış ──────────────────────────────────────────────────────────────────────────
def main():
    CIKTI.mkdir(exist_ok=True)
    ozet = {}
    for tarz in TARZLAR:
        kls = CIKTI / f"tarz-{tarz}"
        kls.mkdir(exist_ok=True)
        kabul, redler, sureler, oranlar, fonlar = [], {}, [], [], []
        for ix, ((kova, bant), tohum0) in enumerate(zip(PLAN, TOHUMLAR)):
            yazildi = False
            for deneme in range(8):                    # düşen kare YENİ TOHUMLA yeniden
                tohum = tohum0 + deneme * 7919
                t0 = time.time()
                ham = uret(tarz, kova, bant, tohum)
                ys = yuzler(ham)
                if len(ys) != 1:
                    redler["yuz-sayisi"] = redler.get("yuz-sayisi", 0) + 1
                    sureler.append(time.time() - t0)
                    print(f"  red[yuz-sayisi={len(ys)}] tarz {tarz} #{ix+1}", flush=True)
                    continue
                kirp, hata = kadrajla(ham, ys[0])
                if hata:
                    redler[hata] = redler.get(hata, 0) + 1
                    sureler.append(time.time() - t0)
                    print(f"  red[{hata}] tarz {tarz} #{ix+1}", flush=True)
                    continue
                o, sebep = olc_ve_kapi(kirp)
                sureler.append(time.time() - t0)
                if sebep:
                    redler[sebep] = redler.get(sebep, 0) + 1
                    # Kalibrasyon: elenen kare de kaydedilir ki eşik GÖZLE doğrulanabilsin.
                    # FAZ 17C dersi: eşiği kanıta bakmadan değiştirmek ters sonuç veriyor.
                    try:
                        rk = CIKTI / "_red"; rk.mkdir(parents=True, exist_ok=True)
                        kirp.save(rk / f"{sebep}_{tarz}{ix+1}_{deneme}_yazi{o.get('yazi',0)*100:.0f}.png")
                    except Exception: pass
                    print(f"  red[{sebep}] tarz {tarz} #{ix+1} yuzOran="
                          f"{o.get('yuzOran',0)*100:.0f}% yazi={o.get('yazi',0)*100:.1f}% "
                          f"fon={o.get('fonKoyu',0):.1f}", flush=True)
                    continue
                ad = f"{ix+1}_{kova}_{bant}.png"
                kirp.save(kls / ad)
                kabul.append(ad); oranlar.append(o["yuzOran"]); fonlar.append(o["fonKoyu"])
                print(f"ok tarz-{tarz}/{ad}  yuzOran=%{o['yuzOran']*100:.0f} "
                      f"yazi={o['yazi']*100:.1f}% netlik={o['netlik']:.0f} "
                      f"fon={o['fonKoyu']:.1f} (deneme {deneme+1})", flush=True)
                yazildi = True
                break
            if not yazildi:
                print(f"  ! tarz {tarz} #{ix+1} 8 denemede geçemedi", flush=True)
        ozet[tarz] = {
            "kabul": len(kabul), "redler": redler,
            "sure": sum(sureler)/max(1, len(sureler)),
            "yuzOran": sum(oranlar)/max(1, len(oranlar)),
            "fon": sum(fonlar)/max(1, len(fonlar)),
        }
        print(f"— tarz {tarz}: {len(kabul)}/4 · ort {ozet[tarz]['sure']:.1f} sn/deneme · "
              f"yüz oranı %{ozet[tarz]['yuzOran']*100:.1f} · fon {ozet[tarz]['fon']:.1f} · "
              f"red {redler}", flush=True)

    karsilastirma(ozet)
    print("\n=== ÖZET ===", flush=True)
    for t, v in ozet.items():
        print(f"tarz {t}: kabul {v['kabul']}/4 · {v['sure']:.1f} sn/deneme · "
              f"yüz oranı %{v['yuzOran']*100:.1f} · fon koyuluk {v['fon']:.1f} · red {v['redler']}")


def karsilastirma(ozet):
    """3 satır (tarz) × 4 sütun (aynı tohumlar) karşılaştırma sayfası."""
    pad, bas = 10, 26
    W = 4 * BOY + 5 * pad
    H = len(TARZLAR) * (BOY + bas) + (len(TARZLAR) + 1) * pad
    sayfa = Image.new("RGB", (W, H), (17, 24, 39))
    d = ImageDraw.Draw(sayfa)
    for r, tarz in enumerate(TARZLAR):
        y = pad + r * (BOY + bas + pad)
        d.text((pad, y), f"TARZ {tarz} — {TARZLAR[tarz][:58]}", fill=(226, 232, 240))
        for c, (kova, bant) in enumerate(PLAN):
            f = CIKTI / f"tarz-{tarz}" / f"{c+1}_{kova}_{bant}.png"
            x = pad + c * (BOY + pad)
            if f.exists():
                sayfa.paste(Image.open(f), (x, y + bas))
            else:
                d.rectangle([x, y+bas, x+BOY, y+bas+BOY], outline=(100, 116, 139))
                d.text((x+10, y+bas+BOY//2), "üretilemedi", fill=(148, 163, 184))
            if r == 0:
                d.text((x, y - 2), f"{c+1} {kova}/{bant}", fill=(148, 163, 184))
    sayfa.save(CIKTI / "karsilastirma.png")
    print(f"\nkarşılaştırma sayfası: {CIKTI/'karsilastirma.png'}", flush=True)


if __name__ == "__main__":
    main()
