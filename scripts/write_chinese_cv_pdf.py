#!/usr/bin/env python3
"""Sync CV PDFs into files/: chinese_cv.pdf / english_cv.pdf from parent of site root."""
from __future__ import annotations

import shutil
import urllib.request
from pathlib import Path

_PLACEHOLDER_URL = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

# (source filename next to site folder, output under files/ — 与仓库内文件名一致，如 english_cv.pdf)
_PAIRS: tuple[tuple[str, str], ...] = (
    ("chinese_cv.pdf", "chinese_cv.pdf"),
    ("english_cv.pdf", "english_cv.pdf"),
)


def _ensure_pdf(local: Path, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    if local.is_file():
        shutil.copy2(local, out)
        print("Copied", local, "->", out, f"({out.stat().st_size} bytes)")
        return
    data = urllib.request.urlopen(_PLACEHOLDER_URL, timeout=30).read()
    out.write_bytes(data)
    print("Missing", local, "— wrote placeholder ->", out, f"({out.stat().st_size} bytes)")


def main() -> None:
    site = Path(__file__).resolve().parent.parent
    files = site / "files"
    root = site.parent
    for src_name, dest_name in _PAIRS:
        _ensure_pdf(root / src_name, files / dest_name)


if __name__ == "__main__":
    main()
