# BrewNotes

BrewNotes is a self-hosted coffee and espresso logging app designed for fast daily use and deeper analytics over time. It helps you dial in your KitchenAid KF7 by tracking beans, drink settings, ratings, notes, photos, and attribution. BrewNotes is a single-container deployment that runs on Unraid or any Docker host.

## Feature Overview 

- **Fast drink entry flow** optimized for mobile logging.
- **Bean + drink presets** with auto-loaded settings.
- **Full KF7 settings** support (strength, temperature, body, order, volumes, grind).
- **Attribution** for “Made by” and “Rated by” with recent names.
- **Analytics dashboard** with Recharts graphs.
- **Photo management** with thumbnails.
- **PWA support** for quick home screen access.
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
alembic -c alembic.ini upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend proxies `/api` to the backend in development.

## API Overview

- `GET /api/beans` (query: `include_archived`)
- `POST /api/beans`
- `PUT /api/beans/{id}`
- `POST /api/beans/{id}/archive`
- `POST /api/beans/{id}/unarchive`
- `POST /api/beans/{id}/photo`
- `GET /api/beans/{id}/analytics`
- `GET /api/beans/{id}/recommended-settings`

- `GET /api/drinks`
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
