# BrewNotes

BrewNotes is a self-hosted coffee and espresso logging app designed for fast daily use and deeper analytics over time. It helps you dial in your KitchenAid KF7 by tracking beans, drink settings, ratings, notes, photos, and attribution. BrewNotes is a single-container deployment that runs on Unraid or any Docker host.

## Feature Overview 

- **Fast drink entry flow** optimized for mobile logging, with a sticky save button and camera-first photo capture on phones.
- **Bean + drink presets** with auto-loaded settings — a new bean/drink combo starts from the bean's saved best espresso settings, then copies your most recent matching drink.
- **Full KF7 settings** support (strength, temperature, body, order, volumes, grind 1–7 — matching the KF7's 7-step grinder).
- **Attribution** for “Made by” and “Rated by” with recent names.
- **Analytics dashboard** with Recharts graphs, per-bean flavor radar, and recommended settings from your top-rated drinks.
- **Cost analytics** — estimated cost per drink and monthly spend, derived from bag price/size and per-strength dose estimates (8/11/14 g at Low/Medium/High; tune in `frontend/src/utils/constants.ts`).
- **Photo management** with thumbnails and a built-in editor (crop, pinch/scroll zoom, rotate, aspect presets) for bean and drink photos.
- **oz/ml unit toggle** persisted per device.
- **PWA support** for quick home screen access; pages and data are always fetched network-first so deploys show up immediately.
- **Export/backup endpoints** including JSON, CSV, and ZIP with uploads.

## Screenshots

> _Add screenshots here once you deploy BrewNotes._

- Dashboard
- Beans list
- Bean analytics
- Drink detail

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
3. Restore the SQLite database from `/data/app.db`.

## Permissions (PUID/PGID)

If `PUID` and `PGID` are set, BrewNotes will:

- Create a user/group once.
- Fix permissions on `/data` only once.
- Avoid re-chowning on every start.

If you run into permission issues, delete `/data/.brewnotes_permissions` to force a one-time fix.

## Development Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Outside Docker, point the data paths somewhere writable first —
# the defaults are /data, /data/app.db, and /data/uploads.
export DATA_DIR=../data DB_PATH=../data/app.db UPLOAD_DIR=../data/uploads

alembic -c alembic.ini upgrade head
uvicorn app.main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend proxies `/api` to the backend in development.

## API Overview

- `GET /health`
- `GET /api/beans` (query: `include_archived`)
- `POST /api/beans`
- `GET /api/beans/{id}`
- `PUT /api/beans/{id}`
- `POST /api/beans/{id}/archive`
- `POST /api/beans/{id}/unarchive`
- `POST /api/beans/{id}/photo`
- `GET /api/beans/{id}/analytics`
- `GET /api/beans/{id}/recommended-settings`

- `GET /api/drinks`
- `POST /api/drinks`
- `GET /api/drinks/{id}`
- `PUT /api/drinks/{id}`
- `DELETE /api/drinks/{id}`
- `POST /api/drinks/{id}/photo`

- `GET /api/analytics` (summary counts; the UI computes most analytics client-side)

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
- KF7 settings: `strength_level`, `temperature_level`, `body_level`, `order`, `coffee_volume_ml`, `milk_volume_ml`, `grind_setting` (1–7)
- Ratings (all 1–5): `overall_rating`, `sweetness`, `bitterness`, `acidity`, `body_mouthfeel`, `balance`, plus `would_make_again`, `dialed_in`
  - `balance` is a scale, not a score: 1 = sour, 3 = balanced, 5 = bitter
- `notes`, `photo_path`, `thumbnail_path` (photos are stored as `/uploads/...` web paths; volumes are always stored in ml)

## License

MIT
