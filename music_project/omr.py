import subprocess
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

# ~300 DPI for a standard 8.5"-wide page. Audiveris needs enough pixels between
# staff lines to detect them reliably; below this it reports the image as
# unreadably low-resolution even if the source content is otherwise fine.
MIN_WIDTH_PX = 2550

# Audiveris hard-rejects any single image over 20,000,000 pixels ("too large
# image"). Stay safely under that - real scans embedded in PDFs can be much
# bigger than this (a phone/scanner can easily produce 79-megapixel pages).
MAX_PIXELS = 19_000_000

# Target pixel width when rendering PDF pages. Comfortably between
# MIN_WIDTH_PX and the width MAX_PIXELS allows for a typical portrait page.
# A fixed DPI doesn't work here: PDF page sizes are wildly inconsistent
# (one real scan had pages claiming to be up to 46 inches tall), so we compute
# the zoom per page to hit this pixel width directly, ignoring the PDF's
# declared physical page size entirely.
PDF_TARGET_WIDTH_PX = 2800


def _normalize_resolution(image_path: Path, output_dir: Path) -> Path:
    """Resize an image so it's neither too small nor too large for Audiveris.

    Too small (e.g. a low-res screenshot): Audiveris can't reliably find staff
    lines. Too large (e.g. a high-res phone photo): Audiveris refuses outright.
    Both are pixel-count thresholds in Audiveris's own code, not quality
    judgments, so resizing a clean image in either direction can genuinely fix it.
    """
    with Image.open(image_path) as img:
        width, height = img.size
        pixel_count = width * height

        if width >= MIN_WIDTH_PX and pixel_count <= MAX_PIXELS:
            return image_path

        scale = (MAX_PIXELS / pixel_count) ** 0.5 if pixel_count > MAX_PIXELS else MIN_WIDTH_PX / width
        new_size = (round(width * scale), round(height * scale))
        resized = img.resize(new_size, Image.LANCZOS)

        output_dir.mkdir(parents=True, exist_ok=True)
        resized_path = output_dir / f"resized_{image_path.name}"
        resized.save(resized_path)
        return resized_path


def _pdf_first_page_to_image(pdf_path: Path, output_dir: Path) -> Path:
    """Render just the first page of a PDF to a PNG at a controlled resolution.

    Multi-page pieces aren't supported yet - Audiveris doesn't combine separate
    pages into one continuous score on its own, and stitching fragments back
    together reliably is a much bigger problem for another day. One page at a
    time for now.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    with fitz.open(pdf_path) as doc:
        page = doc[0]
        zoom = PDF_TARGET_WIDTH_PX / page.rect.width
        matrix = fitz.Matrix(zoom, zoom)
        page_path = output_dir / "page_01.png"
        page.get_pixmap(matrix=matrix).save(page_path)
    return page_path


def scan_image_to_musicxml(image_path: str | Path, output_dir: str | Path) -> Path:
    """Run Audiveris OMR on an image or single-page PDF, returning the MusicXML file."""
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    image_path = Path(image_path)

    if image_path.suffix.lower() == ".pdf":
        image_path = _pdf_first_page_to_image(image_path, out_dir / "pages")

    image_path = _normalize_resolution(image_path, out_dir / "normalized")

    subprocess.run(
        [
            "Audiveris",
            "-batch",
            "-output", str(out_dir),
            "-export", str(image_path),
        ],
        check=True,
    )

    mxl_files = list(out_dir.glob("*.mxl"))
    if not mxl_files:
        raise FileNotFoundError(f"Audiveris did not produce a .mxl file in {out_dir}")
    return mxl_files[0]
