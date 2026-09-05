import io
import uuid
from pathlib import Path
from typing import Tuple

from PIL import Image, ImageOps
from fastapi import UploadFile


def ensure_dirs(*paths: Path) -> None:
    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


def save_upload(file: UploadFile, upload_dir: Path, thumb_dir: Path) -> Tuple[str, str]:
    ensure_dirs(upload_dir, thumb_dir)
    original_name = Path(file.filename or "").name
    filename = f"{uuid.uuid4().hex}{Path(original_name).suffix.lower() or '.jpg'}"
    target_path = upload_dir / filename
    counter = 1
    while target_path.exists():
        stem = target_path.stem
        suffix = target_path.suffix
        target_path = upload_dir / f"{stem}-{counter}{suffix}"
        counter += 1

    with target_path.open("wb") as buffer:
        buffer.write(file.file.read())

    thumb_path = thumb_dir / f"{target_path.stem}.jpg"
    create_thumbnail(target_path, thumb_path)

    return str(target_path), str(thumb_path)


def create_thumbnail(source: Path, destination: Path, size: int = 400) -> None:
    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img)
        img.thumbnail((size, size))
        if img.mode != "RGB":
            img = img.convert("RGB")
        with io.BytesIO() as buffer:
            img.save(buffer, format="JPEG", quality=88)
            destination.write_bytes(buffer.getvalue())
