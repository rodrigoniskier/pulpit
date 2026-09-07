# Security Policy

## Supported version

The actively supported line is Pulpit Ultimate 2.x on the `main` branch.

## Data model and privacy

Pulpit is local-first. Sermons, studies, devotionals, imported Bible translations, settings and revision history are stored in the browser using IndexedDB. No application backend is required and the project does not transmit pastoral content to a server by default.

Encrypted backups use PBKDF2-SHA-256 with 250,000 iterations to derive an AES-256-GCM key. Backup passwords are not stored by the application.

## Reporting a vulnerability

Please do not publish proof-of-concept payloads containing private pastoral material or real user data. Report security concerns through a private channel to the repository owner when possible, or open a minimal GitHub issue that describes the affected component without exposing sensitive content.

## Browser security

Use the application from HTTPS (including GitHub Pages) or localhost so that service workers, Web Crypto and supported File System Access capabilities operate in a secure context. Keep the browser updated and maintain independent backups of important data.
