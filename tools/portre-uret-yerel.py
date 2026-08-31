#!/usr/bin/env python
"""FAZ 17C — YEREL PORTRE ÜRETİMİ (SD-Turbo, CPU)

    .venv-portre\\Scripts\\python.exe tools\\portre-uret-yerel.py [kova] [adet]
    .venv-portre\\Scripts\\python.exe tools\\portre-uret-yerel.py --hepsi --hedef=3000 --dilim=500

NEDEN YEREL
-----------
pollinations ölçüldü: IP başına TEK eşzamanlı istek, 162 sn/portre → 3.000 için ~134 saat.
Yerel SD-Turbo ölçüldü: **16,2 sn/görsel** (512×512, 1 adım, fp32, 8 iş parçacığı) —
on kat hızlı, hız sınırı yok, çevrimdışı.

DONANIM NOTU (brifin öncülü tutmadı)
------------------------------------
Makinede NVIDIA YOK: AMD Ryzen 7 7735HS + tümleşik Radeon, 13,7 GB paylaşımlı RAM.
CUDA olmadığı için FLUX.1-schnell (12B, bf16'da ~24 GB) uygulanamıyor. Brifin §2
tablosunun son satırı bu durumu karara bağlıyor: Turbo ailesine düşülür ve raporlanır.

LİSANS (brifteki bilgi hatalı)
------------------------------
Brif SDXL-Turbo için "OpenRAIL++" diyor; Hugging Face'te hem `stabilityai/sd-turbo` hem
`stabilityai/sdxl-turbo` lisans alanı `other` — **Stability AI Community License**
(yıllık geliri 1 M$ altındaki kuruluşlar için ticari kullanım serbest, atıf şartıyla).
OpenRAIL++ olan SDXL base 1.0'dır, Turbo türevleri değil. Steam AI beyanı bu bilgiyle
yapılmalı.

BORU HATTI değişmedi: tools/portre-boru.py — kadraj, fon eşitleme ve eleme kapıları
FAZ 17B'deki eşiklerle aynı. Değişen tek şey görselin nereden geldiği.
"""
from __future__ import annotations
import argparse, json, os, subprocess, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import portre_boru as boru  # noqa: E402

KOK = Path(__file__).resolve().parents[1]
CIKTI = KOK / "assets" / "portraits"
MANIFEST = CIKTI / "manifest.json"

KOTA = {"akd": 1740, "siyah": 420, "kuz": 240, "beyaz": 210, "afr": 180, "lat": 120, "asya": 90}
KOVALAR = list(KOTA)
BANTLAR = ("genc", "kidemli")
GENC_PAY = 0.45

MODEL = "stabilityai/sd-turbo"
URETIM_BOY = 512          # SD-Turbo doğal çözünürlüğü; boru hattı 256×230'a indirir
ADIM = 1                  # turbo damıtılmış: 1 adım yeter
KILAVUZ = 0.0             # turbo'da yönlendirme kullanılmaz

# ── İSTEM ─────────────────────────────────────────────────────────────────────────────
# FAZ 17B'nin kova tarifleri, yaş bandı ve çeşitlilik eksenleri KORUNDU; yalnız Turbo'nun
# iyi çalıştığı doğal cümle yapısına çevrildi (virgüllü etiket listesi değil).
# Olumsuz kalıp ("no text") yerine İSTENEN açıkça tarif edilir — difüzyon modellerinde
# olumsuzlama ters tepebiliyor, FAZ 17B'de bunu ölçtük.
# Kova tarifleri KISA tutulmak zorunda: CLIP istemi 77 token'da kesiyor ve ayar turunda
# kesilen kuyruk tam da çerçeveleme talimatıydı ("gray background, chest up, front facing").
# Sonuç: 20 karenin 6'sı kadraj dışı (ten %0-16), 5'i forma yazısı ile geldi. Önemli olan
# ÖNE alındı, cümle kısaltıldı.
KOVA_TARIF = {
    "akd":   "Turkish man, olive skin, dark hair",
    "siyah": "African American man, dark brown skin",
    "kuz":   "Northern European man, very fair skin, light hair",
    "beyaz": "white American man, fair skin",
    "afr":   "West African man, very dark skin, broad nose",
    "lat":   "Latin American man, tan brown skin, dark hair",
    "asya":  "East Asian man, straight black hair",
}
BANT_YAS = {"genc": (19, 25), "kidemli": (27, 35)}

SAC = ["short hair", "buzz cut", "wavy hair", "curly hair",
       "hair combed back", "receding hairline", "textured hair"]
SAKAL = ["clean shaven", "light stubble", "full beard", "moustache", "goatee"]
YUZ = ["square jaw", "narrow face", "high cheekbones", "round face"]
TEN = ["lighter skin", "medium skin", "deeper skin", "tanned skin"]

FORMA = "plain dark navy blank sleeveless jersey"
SAHNE = "neutral gray studio background, chest up, front facing, photorealistic"

def _karis(x: int) -> int:
    x &= 0xFFFFFFFF
    x ^= x >> 16
    x = (x * 0x7FEB352D) & 0xFFFFFFFF
    x ^= x >> 15
    x = (x * 0x846CA68B) & 0xFFFFFFFF
    x ^= x >> 16
    return x


def _eksen(kova: str, bant: str, i: int, tuz: str, dizi: list[str]) -> str:
    h = 5381
    for c in f"{kova}|{bant}|{i}|{tuz}":
        h = (((h << 5) + h) ^ ord(c)) & 0xFFFFFFFF
    return dizi[_karis(h) % len(dizi)]


def istem(kova: str, bant: str, i: int) -> str:
    lo, hi = BANT_YAS[bant]
    yas = lo + _karis(i * 2654435761) % (hi - lo + 1)
    return (f"studio headshot of a {KOVA_TARIF[kova]}, age {yas}, "
            f"{_eksen(kova, bant, i, 'ten', TEN)}, {_eksen(kova, bant, i, 'sac', SAC)}, "
            f"{_eksen(kova, bant, i, 'sakal', SAKAL)}, {_eksen(kova, bant, i, 'yuz', YUZ)}, "
            f"{FORMA}, {SAHNE}")


def tohum(kova: str, bant: str, i: int) -> int:
    h = 5381
    for c in f"{kova}|{bant}|{i}":
        h = (((h << 5) + h) ^ ord(c)) & 0xFFFFFFFF
    return h % 2_000_000_000


# ── Dosya / manifest ──────────────────────────────────────────────────────────────────
def dosya_adi(kova: str, bant: str, sira: int) -> str:
    return f"{kova}_{bant}_{sira:04d}.jpg"


def sonraki_sira(kova: str, bant: str) -> int:
    n = 0
    while (CIKTI / dosya_adi(kova, bant, n)).exists():
        n += 1
    return n


def kova_say(k: str) -> int:
    return sonraki_sira(k, "genc") + sonraki_sira(k, "kidemli")


def toplam_say() -> int:
    return sum(kova_say(k) for k in KOVALAR)


def manifest_yaz() -> dict:
    m = {"version": 2, "buckets": {}, "pattern": "%s_%s_%04d.jpg"}
    for k in KOVALAR:
        m["buckets"][k] = {b: sonraki_sira(k, b) for b in BANTLAR}
    MANIFEST.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return m


def bant_sec(genc_n: int, kid_n: int) -> str:
    """FAZ 17B §3: hiçbir bant 0'da kalmaz, sonrası %45/%55 hedefini kovalar."""
    if genc_n + kid_n == 0 or genc_n == 0:
        return "genc"
    if kid_n == 0:
        return "kidemli"
    return "genc" if genc_n / (genc_n + kid_n) < GENC_PAY else "kidemli"


def mevcut_hashler(kova: str) -> dict[str, list[int]]:
    from PIL import Image
    out = {b: [] for b in BANTLAR}
    for b in BANTLAR:
        for i in range(sonraki_sira(kova, b)):
            try:
                out[b].append(boru.dhash(Image.open(CIKTI / dosya_adi(kova, b, i))))
            except Exception:
                pass
    return out


# ── Üretim ────────────────────────────────────────────────────────────────────────────
_pipe = None


def boru_hatti_yukle(threads: int):
    global _pipe
    if _pipe is not None:
        return _pipe
    import torch
    from diffusers import AutoPipelineForText2Image
    torch.set_num_threads(threads)
    t = time.time()
    p = AutoPipelineForText2Image.from_pretrained(MODEL, torch_dtype=torch.float32,
                                                  safety_checker=None)
    p = p.to("cpu")
    p.set_progress_bar_config(disable=True)
    print(f"model yüklendi: {time.time()-t:.1f} sn · {MODEL} · {threads} iş parçacığı", flush=True)
    _pipe = p
    return p


def uret_bir(kova: str, bant: str, ix: int, threads: int):
    """Tek ham görsel üretir (512×512). ÜRETİM KATMANI YALNIZ BURADA."""
    import torch
    p = boru_hatti_yukle(threads)
    g = torch.Generator(device="cpu").manual_seed(tohum(kova, bant, ix))
    return p(prompt=istem(kova, bant, ix), num_inference_steps=ADIM,
             guidance_scale=KILAVUZ, height=URETIM_BOY, width=URETIM_BOY,
             generator=g).images[0]


def kova_uret(kova: str, adet: int, threads: int, deneme_kat: int = 4) -> dict:
    CIKTI.mkdir(parents=True, exist_ok=True)
    hashler = mevcut_hashler(kova)
    yazilan = {b: 0 for b in BANTLAR}
    elenen = {"yuz": 0, "acikForma": 0, "formaYazi": 0, "bulanik": 0, "benzer": 0}
    fonlar, formalar, sureler = [], [], []
    denenen = 0
    ix = sonraki_sira(kova, "genc") * 7919 + sonraki_sira(kova, "kidemli") * 104729

    while sum(yazilan.values()) < adet and denenen < adet * deneme_kat:
        denenen += 1
        ix += 1
        bant = bant_sec(sonraki_sira(kova, "genc"), sonraki_sira(kova, "kidemli"))
        t0 = time.time()
        try:
            ham = uret_bir(kova, bant, ix, threads)
        except Exception as e:
            print(f"   üretim hatası: {type(e).__name__} {e}"[:140], flush=True)
            continue
        im, o = boru.isle_ve_olc(ham)
        sebep = boru.kapilar(o, hashler[bant])
        sureler.append(time.time() - t0)
        if sebep:
            elenen[sebep] += 1
            print(f"   red[{sebep}] forma={o['forma']:.0f} yazi={o['yazi']*100:.2f}% "
                  f"ten={o['ten']*100:.0f}% netlik={o['netlik']:.0f}", flush=True)
            continue
        sira = sonraki_sira(kova, bant)          # elenen numara atlanmaz
        im.save(CIKTI / dosya_adi(kova, bant, sira), "JPEG", quality=88, optimize=True)
        hashler[bant].append(o["hash"])
        yazilan[bant] += 1
        fonlar.append(o["fonOrt"]); formalar.append(o["forma"])
        print(f"ok {dosya_adi(kova, bant, sira)}  fon={o['fonOrt']:.1f} "
              f"forma={o['forma']:.0f} yazi={o['yazi']*100:.1f}% netlik={o['netlik']:.0f}", flush=True)

    manifest_yaz()
    ort = lambda a: sum(a) / len(a) if a else 0.0
    std = lambda a: (sum((x - ort(a)) ** 2 for x in a) / len(a)) ** 0.5 if a else 0.0
    print(f"bitti: {sum(yazilan.values())}/{adet} yazıldı "
          f"(genc {yazilan['genc']}, kidemli {yazilan['kidemli']}) · deneme {denenen}", flush=True)
    print(f"elenen: {json.dumps(elenen)}", flush=True)
    print(f"fon parlaklığı: ort {ort(fonlar):.1f} · std {std(fonlar):.1f} (hedef 118-122, std ≤8)", flush=True)
    print(f"forma parlaklığı: ort {ort(formalar):.1f} (kapı ≤{boru.MAX_FORMA_PARLAKLIK:.0f})", flush=True)
    print(f"hız: {ort(sureler):.1f} sn/deneme · "
          f"{(sum(sureler)/max(1,sum(yazilan.values()))):.1f} sn/portre", flush=True)
    return {"yazilan": yazilan, "elenen": elenen, "denenen": denenen,
            "fonOrt": ort(fonlar), "fonStd": std(fonlar), "sure": ort(sureler)}


def git_push(mesaj: str):
    try:
        subprocess.run(["git", "add", "-A", "assets/portraits"], cwd=KOK, check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        st = subprocess.run(["git", "status", "--porcelain", "--", "assets/portraits"],
                            cwd=KOK, capture_output=True, text=True).stdout
        if not st.strip():
            print("  (commit edilecek değişiklik yok)", flush=True); return
        subprocess.run(["git", "commit", "-q", "-m", mesaj], cwd=KOK, check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        p = subprocess.run(["git", "push", "-q", "origin", "master"], cwd=KOK)
        print(f"  ✓ commit + push: {mesaj}" + ("" if p.returncode == 0 else " (push başarısız)"), flush=True)
    except Exception as e:
        print(f"  ! git adımı atlandı: {e}"[:120], flush=True)


def en_geri_kova(olcek: float):
    en, en_oran = None, 1e9
    for k in KOVALAR:
        hedef = round(KOTA[k] * olcek)
        if kova_say(k) >= hedef:
            continue
        o = kova_say(k) / max(1, hedef)
        if o < en_oran:
            en_oran, en = o, k
    return en


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kova", nargs="?", default=None)
    ap.add_argument("adet", nargs="?", type=int, default=None)
    ap.add_argument("--hepsi", action="store_true")
    ap.add_argument("--hedef", type=int, default=3000)
    ap.add_argument("--dilim", type=int, default=500)
    ap.add_argument("--parti", type=int, default=25)
    ap.add_argument("--threads", type=int, default=8)
    a = ap.parse_args()

    if not a.hepsi:
        if not a.kova or a.kova not in KOVALAR or not a.adet:
            print("kullanım: portre-uret-yerel.py <kova> <adet>  |  --hepsi --hedef=3000")
            print("kovalar :", " | ".join(KOVALAR)); sys.exit(2)
        kova_uret(a.kova, a.adet, a.threads)
        return

    olcek = a.hedef / 3000
    basla, baslangic = time.time(), toplam_say()
    print(f"FAZ 17C — yerel üretim · hedef {a.hedef} · mevcut {baslangic} · dilim {a.dilim}", flush=True)
    son_dilim, bos = baslangic // a.dilim, 0

    while toplam_say() < a.hedef:
        k = en_geri_kova(olcek)
        if not k:
            print("tüm kovalar kotasında — bitti.", flush=True); break
        iste = min(a.parti, round(KOTA[k] * olcek) - kova_say(k), a.hedef - toplam_say())
        once = toplam_say()
        print(f"\n→ {k}: {kova_say(k)}/{round(KOTA[k]*olcek)} · bu turda {iste}", flush=True)
        kova_uret(k, iste, a.threads)
        sonra = toplam_say()
        gecen, uretilen = time.time() - basla, sonra - baslangic
        hiz = gecen / uretilen if uretilen else 0
        print(f"   toplam {sonra}/{a.hedef} · ort {hiz:.0f} sn/portre · "
              f"kalan ~{(a.hedef - sonra) * hiz / 3600:.1f} sa", flush=True)

        if sonra == once:
            bos += 1
            print(f"   ! boş tur ({bos}/3)", flush=True)
            if bos >= 3:
                print("\nDURDURULDU: art arda 3 tur boş geçti.", flush=True)
                git_push(f"FAZ 17C: yerel portre havuzu {sonra} (ara kayit)"); return
        else:
            bos = 0
        if sonra // a.dilim > son_dilim:
            son_dilim = sonra // a.dilim
            git_push(f"FAZ 17C: yerel portre havuzu {sonra}/{a.hedef} (dilim {son_dilim * a.dilim})")

    bitis = toplam_say()
    print(f"\nbitti: {bitis}/{a.hedef} · bu oturumda {bitis - baslangic}", flush=True)
    for k in KOVALAR:
        print(f"  {k:6s} {kova_say(k):4d}/{round(KOTA[k]*olcek)} "
              f"(genc {sonraki_sira(k,'genc')} · kidemli {sonraki_sira(k,'kidemli')})", flush=True)
    git_push(f"FAZ 17C: yerel portre havuzu {bitis}/{a.hedef}")


if __name__ == "__main__":
    main()
