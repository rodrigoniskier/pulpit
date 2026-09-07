# Changelog

## 2.1.0 — NVI Online licenciada

- Added licensed NVI Online access through YouVersion Platform (Bible version ID 129).
- Added official YouVersion deep links that work without storing Bible text in the repository.
- Added optional inline NVI reading through the official YouVersion API.
- Added mandatory runtime display of the copyright/attribution returned by the YouVersion API.
- Added a dedicated IndexedDB `secrets` store for the YouVersion App Key; secrets are excluded from backups.
- Added a same-origin service-worker proxy so the existing restrictive CSP remains intact.
- YouVersion responses use `no-store` and are not included in the Pulpit offline cache.
- Added Portuguese Bible book → USFM mapping and tests for ranges and cross-chapter references.
- Fixed ambiguity between Jó and João in online-reference conversion.

## 2.0.0 — Ultimate upgrade

- Rebuilt as a dependency-free, local-first PWA.
- Removed bundled copyrighted Bible text and added legal user-import workflow.
- Added IndexedDB persistence with schema versioning.
- Added encrypted backups using Web Crypto (AES-GCM + PBKDF2).
- Added Markdown mirror with File System Access API and download fallback.
- Added sermon, study, devotional, agenda, Bible workspace and dashboard modules.
- Added revision snapshots and restore support.
- Added safe DOM rendering; user data is never interpolated into executable HTML.
- Added accessible responsive UI, light/dark/system themes and reading preferences.
- Added offline service worker, manifest and installability.
- Added custom calendar without third-party CDN dependencies.
- Added CI, syntax checks and unit tests with zero npm runtime dependencies.
- Added GitHub Pages workflow and deployment documentation.
