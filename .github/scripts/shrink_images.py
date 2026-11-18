"""يصغّر الصور الكبيرة قبل النشر عشان الموقع يبقى سريع.

يشتغل تلقائيًا من ملف النشر (.github/workflows/deploy.yml) على نسخة النشر بس،
فالصور الأصلية في GitHub ما تتغيّر.

  - أطول ضلع أكثر من 2000 بكسل ← يصغّره لـ 2000
  - JPEG أكبر من 600KB ← يعيد حفظه بجودة 82%
  - يحافظ على اتجاه الصورة (EXIF) وعلى ملف الألوان (ICC)
"""

import sys
from pathlib import Path

from PIL import Image, ImageOps

MAX_SIDE = 2000
MAX_BYTES = 600_000
QUALITY = 82
EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def shrink(path: Path) -> bool:
    before = path.stat().st_size
    with Image.open(path) as im:
        im.load()
        if max(im.size) <= MAX_SIDE and before <= MAX_BYTES:
            return False
        icc = im.info.get("icc_profile")
        out = ImageOps.exif_transpose(im)
    out.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)

    ext = path.suffix.lower()
    extra = {"icc_profile": icc} if icc else {}
    if ext in (".jpg", ".jpeg"):
        out.convert("RGB").save(path, "JPEG", quality=QUALITY, optimize=True, progressive=True, **extra)
    elif ext == ".webp":
        out.save(path, "WEBP", quality=QUALITY, **extra)
    else:
        out.save(path, "PNG", optimize=True, **extra)

    print(f"{path}: {before // 1024}KB -> {path.stat().st_size // 1024}KB {out.size[0]}x{out.size[1]}")
    return True


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "site")
    changed = 0
    for path in sorted(root.rglob("*")):
        if path.suffix.lower() in EXTS and path.is_file():
            try:
                changed += shrink(path)
            except Exception as err:  # صورة خربانة ما توقف النشر
                print(f"skip {path}: {err}")
    print(f"done: {changed} image(s) resized")


if __name__ == "__main__":
    main()
