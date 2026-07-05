#!/usr/bin/env python3
"""Charazay oyuncu portre havuzu — pollinations.ai ile yerel JPG üretir."""
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "portraits"
COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 120
DELAY = float(sys.argv[2]) if len(sys.argv) > 2 else 0.35

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
]


def prompt_for(i: int) -> str:
    eth = ETH[i % len(ETH)]
    jersey = JERSEY[(i // 3) % len(JERSEY)]
    return (
        f"professional basketball player portrait headshot, {eth}, {jersey}, "
        "neutral light gray studio background, photorealistic, front facing, "
        "chest up, soft lighting, no text, no watermark, no logo"
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ok = 0
    for i in range(COUNT):
        name = f"p_{i:04d}.jpg"
        path = OUT / name
        if path.exists() and path.stat().st_size > 8000:
            ok += 1
            continue
        seed = 10000 + i * 7919
        q = urllib.parse.quote(prompt_for(i))
        url = (
            f"https://image.pollinations.ai/prompt/{q}"
            f"?seed={seed}&width=256&height=320&nologo=true"
        )
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CharazayPortraitBot/1.0",
                    "Accept": "image/*",
                },
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                path.write_bytes(resp.read())
            if path.stat().st_size < 3000:
                path.unlink(missing_ok=True)
                print(f"skip {name} (too small)")
            else:
                ok += 1
                print(f"ok {name} ({path.stat().st_size} bytes)")
        except Exception as e:
            print(f"fail {name}: {e}")
        time.sleep(DELAY)
    # manifest gerçek (kesintisiz) dosya sayısını yazsın — oyun PORTRAIT_POOL_SIZE bununla eşit olmalı
    n = 0
    while (OUT / f"p_{n:04d}.jpg").exists():
        n += 1
    manifest = {"version": 1, "count": n, "pattern": "p_%04d.jpg"}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"done: {ok}/{COUNT} portraits, manifest count={n} in {OUT}")


if __name__ == "__main__":
    main()
