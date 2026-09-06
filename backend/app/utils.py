import io
from pathlib import Path
from typing import Tuple

from uuid import uuid4
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException, UploadFile


def ensure_dirs(*paths: Path) -> None:
    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


def remove_upload(path: str | None, upload_root: Path) -> None:
    if not path:
        return
    target = Path(path).resolve()
    if upload_root.resolve() not in target.parents:
        return
    try:
        target.unlink(missing_ok=True)
    except OSError:
        pass


def save_upload(file: UploadFile, upload_dir: Path, thumb_dir: Path) -> Tuple[str, str]:
    data = file.file.read(25 * 1024 * 1024 + 1)
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Choose a photo smaller than 25 MB.")
    try:
        with Image.open(io.BytesIO(data)) as source:
            if source.width * source.height > 40_000_000:
                raise HTTPException(status_code=422, detail="This photo is too large. Resize it and try again.")
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((3000, 3000))
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(status_code=422, detail="This photo could not be opened. Choose a JPEG, PNG, or WebP image.") from exc
    ensure_dirs(upload_dir, thumb_dir)
    filename = f"{uuid4().hex}.jpg"
    target_path = upload_dir / filename
    thumb_path = thumb_dir / target_path.name
    try:
        image.save(target_path, format="JPEG", quality=92)
        create_thumbnail(target_path, thumb_path)
    except OSError:
        target_path.unlink(missing_ok=True)
        thumb_path.unlink(missing_ok=True)
        raise
    return str(target_path), str(thumb_path)


def create_thumbnail(source: Path, destination: Path, size: int = 400) -> None:
    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img)
        img.thumbnail((size, size))
        with io.BytesIO() as buffer:
            img.save(buffer, format=img.format or "JPEG")
            destination.write_bytes(buffer.getvalue())
