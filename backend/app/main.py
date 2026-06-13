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

# Uploads must be mounted before the catch-all SPA mount below, otherwise the
# "/" mount shadows /uploads/* and reference photos fail to load.
uploads_path = settings.upload_dir
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


# SPA: serve the built assets and fall back to index.html for client-side routes
# (so deep links like /beans/<id> survive a refresh). Registered last so /api
# and /uploads take precedence.
if frontend_path.exists():
    app.mount("/assets", StaticFiles(directory=frontend_path / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa_index(full_path: str) -> FileResponse:
        candidate = (frontend_path / full_path).resolve()
        if full_path and candidate.is_file() and frontend_path.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(frontend_path / "index.html")
