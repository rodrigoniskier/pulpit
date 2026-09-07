# Architecture

Pulpit Ultimate is a static, local-first web application.

## Runtime layers

- `index.html` and `styles.css`: accessible application shell and responsive interface.
- `src/app.js`: UI orchestration, autosave, navigation, search, calendar and editor flows.
- `src/db.js`: IndexedDB access and atomic user-data restoration.
- `src/schema.js`: entity defaults, normalization and backup/translation validation.
- `src/backup.js`: JSON backup plus optional PBKDF2-SHA-256/AES-256-GCM encryption.
- `src/mirror.js`: optional File System Access API Markdown mirror.
- `src/markdown.js`: portable Markdown serialization.
- `src/bible.js`: licensed/user-provided translation import and passage lookup.
- `sw.js`: application-shell cache and safe offline navigation fallback.

## Data stores

IndexedDB database `pulpit-ultimate` contains:

- `sermons`
- `studies`
- `devotionals`
- `translations`
- `revisions`
- `settings`
- `handles`

The preaching calendar is derived from sermon scheduling metadata; it is intentionally not a separate data store.

## Trust boundaries

Imported backups and Bible files are untrusted input and are normalized before persistence. User-authored content is rendered as text in the normal UI. Printable sermon HTML escapes user values before interpolation.

File-system handles remain local to the browser profile. The app has no runtime dependency on a cloud API.
