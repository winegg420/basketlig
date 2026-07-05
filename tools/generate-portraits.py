#!/usr/bin/env python3
"""Charazay oyuncu portre havuzu — pollinations.ai ile yerel JPG üretir."""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "portraits"
COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 120
DELAY = float(sys.argv[2]) if len(sys.argv) > 2 else 0.35

# Yalnızca erkek — kadın portre üretilmez (oyunda erkek oyuncu şartı).
ETH = [
    "African American man",
    "Turkish man",
    "Japanese man",
    "Irish man",
    "Nigerian man",
    "Colombian man",
    "Russian man",
    "Italian man",
    "Brazilian man",
    "German man",
    "Spanish man",
    "Korean man",
    "French man",
    "Greek man",
    "Polish man",
    "Mexican man",
    "Canadian man",
    "Australian man",
    "Serbian man",
    "Lithuanian man",
    "Argentinian man",
    "Croatian man",
    "Slovenian man",
    "Senegalese man",
    "Dominican man",
    "Chinese man",
    "Filipino man",
    "Ukrainian man",
    "Swedish man",
    "Egyptian man",
]
JERSEY = [
    "blue white basketball jersey",
    "green basketball jersey",
    "red white basketball jersey",
    "purple yellow basketball jersey",
    "black athletic shirt",
    "grey hoodie",
    "white t-shirt",
    "orange basketball jersey",
    "navy basketball jersey",
    "maroon basketball jersey",
    "teal basketball warmup jacket",
    "charcoal training top",
]
LOOK = [
    "short hair, clean shaven",
    "buzz cut, short beard",
    "curly hair, athletic build",
    "shaved head, strong jawline",
    "afro hair, full beard",
    "cornrows, lean build",
    "fade haircut, goatee",
    "long hair tied back, muscular build",
    "wavy hair, light stubble",
    "bald, broad shoulders",
]


def prompt_for(i: int) -> str:
    eth = ETH[i % len(ETH)]
    jersey = JERSEY[(i // 3) % len(JERSEY)]
    look = LOOK[(i // 5) % len(LOOK)]
    age = 19 + (i * 7) % 18  # 19..36 arası çeşitli yaşlar
    return (
        f"professional basketball player portrait headshot, {eth}, {jersey}, "
        f"{look}, age {age}, "
        "neutral light gray studio background, photorealistic, front facing, "
        "chest up, soft lighting, no text, no watermark, no logo"
    )


def fetch_one(i: int) -> bool:
    """Tek portre indir. Zaten varsa (>8000 bayt) atlar. Başarılıysa True döner."""
    name = f"p_{i:04d}.jpg"
    path = OUT / name
    if path.exists() and path.stat().st_size > 8000:
        return True
    seed = 10000 + i * 7919
    q = urllib.parse.quote(prompt_for(i))
    url = (
        f"https://image.pollinations.ai/prompt/{q}"
        f"?seed={seed}&width=256&height=320&nologo=true"
    )
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CharazayPortraitBot/1.0",
            "Accept": "image/*",
        },
    )
    # 429 (hız sınırı) ve geçici hatalar için artan beklemeyle yeniden dene.
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = resp.read()
            if len(data) < 3000:
                print(f"skip {name} (too small)")
                return False
            path.write_bytes(data)
            print(f"ok {name} ({len(data)} bytes)")
            return True
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 4 * (attempt + 1)
                time.sleep(wait)
                continue
            print(f"fail {name}: {e}")
            return False
        except Exception as e:
            time.sleep(2 * (attempt + 1))
            if attempt == 5:
                print(f"fail {name}: {e}")
    return False


def main() -> None:
    from concurrent.futures import ThreadPoolExecutor
    OUT.mkdir(parents=True, exist_ok=True)
    workers = int(sys.argv[3]) if len(sys.argv) > 3 else 8
    ok = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for res in ex.map(fetch_one, range(COUNT)):
            if res:
                ok += 1
    # manifest gerçek (kesintisiz) dosya sayısını yazsın — oyun PORTRAIT_POOL_SIZE bununla eşit olmalı
    n = 0
    while (OUT / f"p_{n:04d}.jpg").exists():
        n += 1
    manifest = {"version": 1, "count": n, "pattern": "p_%04d.jpg"}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"done: {ok}/{COUNT} portraits, manifest count={n} in {OUT}")


if __name__ == "__main__":
    main()
