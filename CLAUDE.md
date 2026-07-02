# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BrewNotes is a self-hosted, single-container app for logging espresso drinks made on a KitchenAid KF7 superautomatic machine: beans (with photos), per-drink KF7 settings, taste ratings, and analytics. Single user (Ryan), used primarily as a phone PWA. FastAPI + SQLite backend serves the built React SPA and uploaded images; no auth.

## Commands

```bash
# Frontend (from frontend/)
npm install
npm run dev        # Vite dev server on :5173, proxies /api and /uploads to :8080
npm run build      # tsc -b && vite build → frontend/dist (backend serves this)

# Backend (from repo root; env vars required outside Docker or it writes to /data)
pip install -r backend/requirements.txt
DATA_DIR=./data DB_PATH=./data/app.db UPLOAD_DIR=./data/uploads \
  PYTHONPATH=backend uvicorn app.main:app --reload --port 8080

# Docker (production path; image built by .github/workflows/repository.yaml on main/dev)
docker compose up --build   # app on :8087, data volume ./data
```

There is no test suite or linter configured. Verification in past sessions was done with
throwaway scripts: FastAPI `TestClient` for API checks and Playwright (global `playwright`
package, chromium at `/opt/pw-browsers/chromium-*/chrome-linux/chrome` in the remote env)
driving the built SPA against a scratch `DATA_DIR`. `Base.metadata.create_all` bootstraps a
fresh dev DB (see below re: Alembic).

## Architecture

Two-tier, deliberately simple:

- `backend/app/` — FastAPI. `main.py` wires routers (`routers/beans.py`, `drinks.py`,
  `analytics.py`, `export.py`), mounts `/uploads`, and serves `frontend/dist` with a
  catch-all SPA fallback route.
- `frontend/src/` — React 18 + TypeScript + Vite + react-router + Recharts. No state
  library; pages fetch via `utils/api.ts`. PWA via `public/manifest.json` +
  `public/service-worker.js`.

**Route registration order in `main.py` is load-bearing.** API routers, then `/health`,
then the `/uploads` static mount, then the SPA catch-all `GET /{full_path:path}` — the
catch-all must be registered last or it shadows everything. Do not mount `StaticFiles` at
`/`; that bug previously broke `/uploads` and `/health` in production.

**Image pipeline** (`utils.py: save_upload`): validates with Pillow, applies EXIF
transpose, converts to RGB, caps at 2000px, saves as JPEG under a uuid filename in
`{UPLOAD_DIR}/beans|drinks/` plus a 400px thumb in `.../thumbs/`. DB stores **web paths**
(`/uploads/beans/x.jpg`). Older rows may hold absolute filesystem paths; `to_web_path()`
normalizes them in `BeanOut`/`DrinkLogOut` validators — keep that behavior for backward
compatibility. Client-side, photos go through `components/ImageEditor.tsx` (dependency-free
canvas crop/zoom/rotate; export math mirrors the CSS transform — see comments there) via
`components/PhotoField.tsx` before upload.

**Domain model** (`models.py`, mirrored in `frontend/src/utils/types.ts`): `Bean` 1—N
`DrinkLog`. KF7 settings on a drink: `strength_level`/`temperature_level` (LOW|MEDIUM|HIGH),
`body_level` (LIGHT|MEDIUM|BOLD), `order` (COFFEE_FIRST|MILK_FIRST), `coffee_volume_ml`,
`milk_volume_ml`, `grind_setting` (1–7 — the KF7's physical grinder range; the dial is in
the bean hopper and only shows on the machine, so the app just records it). Ratings are
1–5; `balance` is semantic: 1=sour … 3=balanced … 5=bitter, not "higher is better".
Beans are archived, never deleted. `bean.current_best_settings` is a free-form JSON blob of
preferred espresso settings, used to prefill the Dashboard when a bean/drink-type combo has
no history (otherwise the most recent matching drink's settings are copied).

**Units:** everything is stored in ml; display unit (oz default) is a localStorage-backed
toggle in `App.tsx`, prop-drilled as `unit`. Use the helpers in `utils/units.ts` —
especially `inputMatchesMl` in input-sync effects, which exists to avoid clobbering a
value the user is mid-way through typing.

**Costs** are estimates, not records: `utils/cost.ts` derives $/drink from
`bean.price / bag_size_g ×` an assumed dose per strength (`DOSE_G_BY_STRENGTH` in
`utils/constants.ts`, 8/11/14 g). Currency is hardcoded `$` in `formatMoney`.

**Service worker:** network-first for `/api/`, `/uploads/`, and navigations; cache-first
only for hashed assets. If you change caching behavior, bump `CACHE_NAME`.

## Gotchas

- **Schema changes need an Alembic migration** (`backend/alembic/versions/`); production
  Docker runs `alembic upgrade head` on start, and user data already exists — don't rely on
  `create_all`, and don't renumber/edit migration `0001`.
- `BeanUpdate`/`DrinkLogUpdate` intentionally exclude `image_path`/`photo_path`; photos are
  set only via the `/photo` upload endpoints. Frontend PUTs echo the whole object back and
  Pydantic ignores the extras — that's expected.
- Config (`config.py`) defaults to `/data`; importing the app without the env vars set will
  try to create `/data/uploads`.
- Analytics pages compute mostly client-side from `/api/drinks` + `/api/beans`; the
  `/api/analytics` endpoint is only a small summary and is currently unused by the UI.
- Recharts marks set `isAnimationActive={false}` (Analytics) — animation caused malformed
  SVG paths and nondeterministic screenshots.
- The `main`/`dev` branches publish Docker images to GHCR via GitHub Actions; deployment
  target is Unraid (`brewnotes.xml` template, PUID/PGID handling in `docker/entrypoint.sh`).

## UX conventions

Fast entry is the product's core promise: the Dashboard is a one-screen drink logger with
chips/segmented controls, auto-copied previous settings, and a sticky save button on
mobile. Advanced taste ratings live behind a `<details>` fold. Keep new features off the
critical logging path; phone-first (bigger tap targets, camera capture input) beats
desktop polish. Visual language: warm coffee palette (accent `#9c6b4f`), rounded cards,
`styles.css` custom properties with a `data-theme="dark"` variant — no CSS framework.
