# BrewNotes

BrewNotes is a self-hosted coffee and espresso logging app designed for fast daily use and deeper analytics over time. It helps you dial in your KitchenAid KF7 by tracking beans, drink settings, ratings, notes, photos, and attribution. BrewNotes is a single-container deployment that runs on Unraid or any Docker host.

## Feature Overview 

- **Fast drink entry flow** optimized for mobile logging.
- **Bean + drink presets** with auto-loaded settings.
- **Full KF7 settings** support (strength, temperature, body, order, volumes, grind).
- **Attribution** for “Made by” and “Rated by” with recent names.
- **Analytics dashboard** with Recharts graphs.
- **Photo management** with thumbnails.
- **Photo editor** for camera and library images: crop, rotate, zoom, and reposition before saving; edit existing bean and drink photos.
- **Connected brewing history**: open a bean to search and sort its brews, or open a drink type to compare every bean used.
- **Brew again** from a saved log, with its settings copied and fresh ratings and notes.
- **Light/dark themes and oz/ml preferences**, with responsive layouts and keyboard controls.
- **PWA support** for quick home screen access.
- **Export/backup endpoints** including JSON, CSV, and ZIP with uploads.

## Screenshots

See [the redesign review](docs/redesign-review.md) for the changed flows and validation instructions.

[Desktop brewing view](docs/screenshots/brew-desktop.png) · [Mobile bean comparison](docs/screenshots/compare-mobile.png)

## Quick Start (Docker)

```bash
docker run -d \
  --name brewnotes \
  -p 8087:8080 \
  -e APP_PORT=8080 \
  -e DATA_DIR=/data \
  -e DB_PATH=/data/app.db \
  -e UPLOAD_DIR=/data/uploads \
  -e PUID=99 \
  -e PGID=100 \
  -v /mnt/user/appdata/brewnotes:/data \
  brewnotes:latest
```

## Unraid Install (Template + Docker Run)

1. Copy `brewnotes.xml` into your Unraid templates directory.
2. In Unraid, go to **Apps → Templates** and select BrewNotes.
3. Map `/mnt/user/appdata/brewnotes` to `/data` and set the port to `8087`.
4. Access BrewNotes at `http://<unraid-ip>:8087`.

## Updating the Container

```bash
docker pull brewnotes:latest
docker stop brewnotes
docker rm brewnotes
docker run ... (same as above)
```

## Backups and Exports

BrewNotes provides full export endpoints:

- `/api/export.json` → Full JSON export
- `/api/export.csv` → Beans + drinks CSVs in one response
- `/api/export.zip` → ZIP containing JSON, CSVs, and uploads

### Backup Strategy

- Schedule a job to download `/api/export.zip` weekly.
- Store it in Unraid backups or cloud storage.

### Restore Strategy

1. Extract the ZIP locally.
2. Copy `uploads/` back into `/data/uploads`.
3. Stop BrewNotes and replace `/data/app.db` with the `app.db` snapshot included in the ZIP, then restart.

Keep the same upload directory mapping when restoring: stored photo paths refer to that directory. ZIP backups now include the database snapshot, bean ratings, per-drink recipes, gallery metadata, JSON/CSV exports, and uploads. Older ZIP exports do not include a database snapshot; keep a separate copy of their database.

## Permissions (PUID/PGID)

If `PUID` and `PGID` are set, BrewNotes will:

- Create a user/group once.
- Fix permissions on `/data` only once.
- Avoid re-chowning on every start.

If you run into permission issues, delete `/data/.brewnotes_permissions` to force a one-time fix.

## Development Setup

### Backend

Use Python 3.11 or newer. From the `backend` directory, point development at a separate data folder before starting the API:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATA_DIR="$PWD/.data"
export DB_PATH="$DATA_DIR/app.db"
export UPLOAD_DIR="$DATA_DIR/uploads"
alembic -c alembic.ini upgrade head
uvicorn app.main:app --reload --port 8080
```

### Frontend

Use Node.js 20 or newer.

```bash
cd frontend
npm install
npm run dev
```

The frontend proxies `/api` to the backend in development.

### Validation

From the repository root:

```bash
pip install -r backend/requirements.txt httpx
python backend/tests/test_journal.py
cd frontend
npm ci
npm run build
npx playwright install chromium
npm test
```

Backend tests create and migrate an isolated temporary database. UI tests use mock journal data and run against the production build at port 5173. On Windows with Edge installed, set `PLAYWRIGHT_CHANNEL=msedge` to use it for testing.

## API Overview

- `GET /api/beans` (query: `include_archived`)
- `POST /api/beans`
- `PUT /api/beans/{id}`
- `POST /api/beans/{id}/archive`
- `POST /api/beans/{id}/unarchive`
- `POST /api/beans/{id}/photo`
- `POST /api/beans/{id}/photos`
- `POST /api/beans/{id}/photos/{photo_id}/image` (replace an edited image, keeping its gallery identity and cover status)
- `POST /api/beans/{id}/photos/{photo_id}/cover`
- `DELETE /api/beans/{id}/photos/{photo_id}`
- `GET /api/beans/{id}/analytics`
- `GET /api/beans/{id}/recommended-settings`

- `GET /api/drinks` (optional `bean_id` and `drink_type` filters, combined when both are supplied)
- `POST /api/drinks`
- `PUT /api/drinks/{id}`
- `DELETE /api/drinks/{id}`
- `POST /api/drinks/{id}/photo`

- `GET /api/export.json`
- `GET /api/export.csv`
- `GET /api/export.zip`

## Data Model

### Beans

- `name` (required)
- `roaster`, `origin`, `process`, `roast_level`
- `tasting_notes`, `notes`
- `roast_date`, `open_date`
- `bag_size_g`, `price`, `decaf`
- `image_path`, `thumbnail_path`
- `archived`
- `current_best_settings` (JSON blob)

### Drink Logs

- `bean_id`, `drink_type`, `custom_label`
- `made_by`, `rated_by`
- KF7 settings: `strength_level`, `temperature_level`, `body_level`, `order`, `coffee_volume_ml`, `milk_volume_ml`, `grind_setting`
- Ratings: `overall_rating`, `sweetness`, `bitterness`, `acidity`, `body_mouthfeel`, `balance`, `would_make_again`, `dialed_in`
- `notes`, `photo_path`, `thumbnail_path`

## License

MIT
