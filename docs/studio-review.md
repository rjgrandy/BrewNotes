# Coffee studio refresh

BrewNotes now pairs warm paper and graphite surfaces with copper accents, editorial headings, and monospace measurement labels. All eight drink illustrations use locally rendered SVGs with shaded ceramic, glass highlights, crema, and decorative construction marks. Large illustrations include the technical details; small drink thumbnails keep a simpler silhouette.

## Photos

The Beans grid uses equal 4:5 frames. Photos fit completely inside their frames, including portrait bags, landscape shots, squares, and unusually wide or tall images. Gallery, comparison, and drink thumbnails use the same fitting behavior. Missing or broken photos get an illustrated placeholder, and compact previews fall back to the full photo if their thumbnail is unavailable.

Bean detail places the cover next to the title and rating on desktop and above them on mobile. No title or badge covers the image. Larger views use the full image; lightboxes stay within the viewport. Existing saved images benefit without re-uploading. A previously saved crop remains the saved image.

## Free crop

Camera, library, and existing-photo edits start in Free mode with the complete image selected. Drag any edge or corner independently, or drag inside the rectangle to move it. Width, height, and position sliders are keyboard accessible. Focused resize handles respond to arrow keys; Shift adjusts by ten source pixels.

Original, Square, Landscape 4:3, Portrait 3:4, and Wide 16:9 remain available with zoom and positioning controls. Switching to Free retains the current rectangle. Choosing a preset centers its largest crop. Rotation retains the mode and resets framing; Reset restores the full unrotated image in Free mode.

Save exports only the selected rectangle as JPEG, capped at 2400 pixels on the longest side. Cancel makes no upload. Failed uploads retain the selection for retry. Editing an existing bean photo retains its ID, order, and cover status. Drink photo saves preserve unsaved notes and recipe settings.

## Review screenshots

These captures use illustrative photo fixtures, including deliberately extreme image proportions to make the fitting behavior visible.

- [Desktop bean collection](screenshots/studio-beans-desktop.png)
- [Mobile bean detail](screenshots/studio-bean-mobile.png)
- [Dark drink artwork](screenshots/studio-artwork-dark.png)
- [Desktop brewing view](screenshots/brew-desktop.png)
- [Mobile comparison](screenshots/compare-mobile.png)
- [Mobile free-crop editor](screenshots/studio-crop-mobile.png)

## Verification

Validated: TypeScript/Vite production build, all 22 desktop/mobile Playwright checks, all eight backend tests, and a clean whitespace check. Local UI validation used Node 24 and installed Edge with one worker (`npm test -- --workers=1 --timeout=120000`).

Run `npm run build` and `npm test` from `frontend`, and `python backend/tests/test_journal.py` from the repository root. UI tests mock the API and cover desktop and mobile Chromium. Set `PLAYWRIGHT_CHANNEL=msedge` to use installed Edge.

The added tests check arbitrary crop bounds, pointer resizing, mobile touch resizing, keyboard adjustments, movement limits, presets, rotation, reset, exported dimensions and pixel content, failed-save retry, mixed photo proportions, broken-image fallback, both themes, and viewport fit. The existing suite covers cancellation, editing saved photos, unsaved drink notes, navigation, and brewing history. Backend tests cover EXIF orientation, matching thumbnails, replacement, and cleanup.

The app-shell cache version also advances so installed PWAs receive the updated manifest and icon.

No API or database migration is required. Physical phone camera capture and platform-specific HEIC decoding still need a real-device check; unsupported image formats retain the existing error message.
