"""Encode the eight numbered villa stills at web-ready sizes."""

import argparse
from pathlib import Path

from PIL import Image


def encode(source_dir: Path) -> None:
    output = Path(__file__).resolve().parents[1] / "site-assets" / "villa"
    output.mkdir(parents=True, exist_ok=True)
    sources = []
    for stage in range(1, 9):
        matches = list(source_dir.glob(f"{stage:02d}-*.png"))
        if len(matches) != 1:
            raise ValueError(f"Stage {stage} needs exactly one numbered PNG")
        sources.append(matches[0])
    for stage, source in enumerate(sources, 1):
        with Image.open(source) as image:
            frame = image.convert("RGB")
            if abs(frame.width / frame.height - 16 / 9) > 0.01 or frame.width < 1670:
                raise ValueError(f"{source.name} must be a 16:9 still at least 1670 pixels wide")
            for size, width, quality in [("small", 640, 82), ("medium", 1000, 84), ("wide", 1670, 85)]:
                height = round(width * frame.height / frame.width)
                frame.resize((width, height), Image.Resampling.LANCZOS).save(
                    output / f"stage-{stage}-{size}.webp", quality=quality, method=6
                )
            if stage == 8:
                frame.resize((1200, 675), Image.Resampling.LANCZOS).save(
                    output / "share.webp", quality=85, method=6
                )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_dir", type=Path, help="Directory containing the eight numbered PNGs")
    encode(parser.parse_args().source_dir)
