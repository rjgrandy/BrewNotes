from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import analytics, beans, drinks, export


app = FastAPI(title="BrewNotes")

app.include_router(beans.router)
app.include_router(drinks.router)
app.include_router(analytics.router)
app.include_router(export.router)

frontend_path = Path(__file__).resolve().parents[2] / "frontend" / "dist"

if frontend_path.exists():
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

uploads_path = settings.upload_dir
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.get("/")
def spa_index() -> FileResponse:
    index_file = frontend_path / "index.html"
    return FileResponse(index_file)
