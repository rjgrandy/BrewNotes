import io
from pathlib import Path
from typing import Tuple

from PIL import Image
from fastapi import UploadFile


def ensure_dirs(*paths: Path) -> None:
    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


def save_upload(file: UploadFile, upload_dir: Path, thumb_dir: Path) -> Tuple[str, str]:
    ensure_dirs(upload_dir, thumb_dir)
    filename = file.filename or "upload"
    target_path = upload_dir / filename
    counter = 1
    while target_path.exists():
        stem = target_path.stem
        suffix = target_path.suffix
        target_path = upload_dir / f"{stem}-{counter}{suffix}"
        counter += 1

    with target_path.open("wb") as buffer:
        buffer.write(file.file.read())

    thumb_path = thumb_dir / target_path.name
    create_thumbnail(target_path, thumb_path)

    return str(target_path), str(thumb_path)


def create_thumbnail(source: Path, destination: Path, size: int = 400) -> None:
    with Image.open(source) as img:
        img.thumbnail((size, size))
        with io.BytesIO() as buffer:
            img.save(buffer, format=img.format or "JPEG")
            destination.write_bytes(buffer.getvalue())
