from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import analytics, beans, drinks, export


app = FastAPI(title="BrewNotes")

app.include_router(beans.router)
app.include_router(drinks.router)
app.include_router(analytics.router)
app.include_router(export.router)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


uploads_path = settings.upload_dir
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

frontend_path = Path(__file__).resolve().parents[2] / "frontend" / "dist"

if frontend_path.exists():
    assets_path = frontend_path / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> FileResponse:
        # Serve real files (manifest, icons, service worker) directly and fall
        # back to index.html so client-side routes survive a page refresh.
        if full_path:
            candidate = (frontend_path / full_path).resolve()
            if candidate.is_file() and candidate.is_relative_to(frontend_path):
                return FileResponse(candidate)
        index_file = frontend_path / "index.html"
        if not index_file.exists():
            raise HTTPException(status_code=404, detail="Frontend not built")
        return FileResponse(index_file)
