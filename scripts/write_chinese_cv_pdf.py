#!/usr/bin/env python3
"""Create files/chinese-cv.pdf: copy ../chinese_cv.pdf if present, else download a small valid PDF."""
from __future__ import annotations

import shutil
import urllib.request
from pathlib import Path

_PLACEHOLDER_URL = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"


def main() -> None:
    site = Path(__file__).resolve().parent.parent
    out = site / "files" / "chinese-cv.pdf"
    out.parent.mkdir(parents=True, exist_ok=True)
    local = site.parent / "chinese_cv.pdf"
    if local.is_file():
        shutil.copy2(local, out)
        print("Copied", local, "->", out, f"({out.stat().st_size} bytes)")
        return
    data = urllib.request.urlopen(_PLACEHOLDER_URL, timeout=30).read()
    out.write_bytes(data)
    print("Wrote placeholder PDF ->", out, f"({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
