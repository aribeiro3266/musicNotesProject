import subprocess
from pathlib import Path

from PIL import Image

# ~300 DPI for a standard 8.5"-wide page. Audiveris needs enough pixels between
# staff lines to detect them reliably; below this it reports the image as
# unreadably low-resolution even if the source content is otherwise fine.
MIN_WIDTH_PX = 2550


def _upscale_if_needed(image_path: Path, output_dir: Path) -> Path:
    """Upscale a too-small image so Audiveris has enough pixel detail to find staff lines.

    This can't add real detail a blurry source never had, but Audiveris's resolution
    check is a pixel-count threshold in its line-detection math, not a quality judgment
    - so upscaling a small-but-clean image (e.g. a low-res screenshot) can genuinely fix it.
    """
    with Image.open(image_path) as img:
        if img.width >= MIN_WIDTH_PX:
            return image_path
        scale = MIN_WIDTH_PX / img.width
        new_size = (MIN_WIDTH_PX, round(img.height * scale))
        upscaled = img.resize(new_size, Image.LANCZOS)
        upscaled_path = output_dir / f"upscaled_{image_path.name}"
        output_dir.mkdir(parents=True, exist_ok=True)
        upscaled.save(upscaled_path)
        return upscaled_path


def scan_image_to_musicxml(image_path: str | Path, output_dir: str | Path) -> Path:
    """Run Audiveris OMR on an image and return the path to the resulting MusicXML file."""
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    image_path = _upscale_if_needed(Path(image_path), out_dir)

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
