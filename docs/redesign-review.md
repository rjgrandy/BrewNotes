# BrewNotes dev redesign

The app now centers on the relationship between a coffee, the drinks brewed with it, and the recipes worth repeating.

## Main flows

- **Beans → bean → Brews:** the default bean view shows its history, with search, drink type, rating, make-again filtering, and newest/oldest/rating/grind sorting. Filters survive refresh and browser navigation.
- **Drinks → drink type:** compare every bean used for that drink, including archived beans. Sort by average rating, brew count, recency, or name. Open the bean's matching brews or start another cup with that pairing.
- **Individual brew:** open its bean, compare beans for its drink type, edit the log, promote its settings to a bean recipe, or brew it again.
- **Photos:** Camera and Add photo both open the same editor. Choose original/square/landscape/portrait/wide crops; rotate either direction; zoom and drag, or use keyboard-accessible position sliders. Cancel leaves the saved image unchanged. Errors retain the edit for retry. Existing bean photos retain their ID, order, and cover selection when edited.
- **Logging:** saved bean recipes take priority over the last matching brew and defaults. Brew again explicitly copies the selected log's settings. Notes and ratings reset after a successful save. A confirmation links to the saved brew and lets you add a photo.

## Review fixes

- Added visible loading/error/retry states and guarded asynchronous saves against duplicate clicks.
- Drink photo uploads preserve draft notes and recipe edits.
- Photo uploads validate image content, normalize camera orientation, and create matching thumbnails. Replacing/deleting drink photos removes their old files.
- Bean names can be edited. Input validation rejects blank names, negative volumes, and invalid rating/grind ranges.
- Backup ZIPs include a SQLite snapshot; JSON and CSV exports include bean ratings, recipes, and gallery metadata. Concurrent backups use separate temporary files.
- Migrations use the configured database path and resolve their script folder from the configuration file.
- Service-worker navigation fetches the current app shell so an old cached page does not hide a container update. API and photo requests remain uncached; logging requires the server to be available.
- Shared brew cards, coherent light/dark colors, larger touch targets, accessible names, reduced-motion support, a skip link, unit preferences, and route-level lazy loading.

## Verification

`python backend/tests/test_journal.py` exercises migrations, combined history filters, archived beans, photo edits/ownership, invalid images, EXIF rotation, photo cleanup, recipes/recommendations, and database backup integrity using isolated data.

`cd frontend && npm run build && npm test` checks the main navigation, sorting/filter persistence, repeat brewing, photo editing/cancel/save, draft preservation, and viewport fit in desktop and mobile Chromium configurations. Tests mock the API; backend behavior is covered separately by the API suite.

No new database migration is required. Existing beans, logs, recipes, and galleries retain their schema. Real phone camera capture and browser-specific HEIC decoding still need a device check; unsupported formats receive an error asking for JPEG, PNG, or WebP.
