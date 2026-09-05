import uuid
from pathlib import Path
from typing import Tuple

from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException, UploadFile

from .config import settings

MAX_IMAGE_DIMENSION = 2000
THUMBNAIL_SIZE = 400


def ensure_dirs(*paths: Path) -> None:
    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


def to_web_path(stored: str | None) -> str | None:
    """Map a stored path to the public /uploads URL.

    Older rows stored absolute filesystem paths such as /data/uploads/beans/x.jpg;
    newer rows already store /uploads/beans/x.jpg.
    """
    if not stored:
        return stored
    if stored.startswith("/uploads/"):
        return stored
    try:
        relative = Path(stored).relative_to(settings.upload_dir)
    except ValueError:
        return stored
    return f"/uploads/{relative.as_posix()}"


def save_upload(file: UploadFile, upload_dir: Path, thumb_dir: Path) -> Tuple[str, str]:
    ensure_dirs(upload_dir, thumb_dir)

    try:
        image = Image.open(file.file)
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail="File is not a valid image") from exc

    # Honor camera orientation and normalize to RGB so we can always save JPEG.
    image = ImageOps.exif_transpose(image)
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION))

    filename = f"{uuid.uuid4().hex}.jpg"
    target_path = upload_dir / filename
    image.save(target_path, format="JPEG", quality=88)

    thumb = image.copy()
    thumb.thumbnail((THUMBNAIL_SIZE, THUMBNAIL_SIZE))
    thumb_path = thumb_dir / filename
    thumb.save(thumb_path, format="JPEG", quality=82)

    return (
        f"/uploads/{target_path.relative_to(settings.upload_dir).as_posix()}",
        f"/uploads/{thumb_path.relative_to(settings.upload_dir).as_posix()}",
    )
