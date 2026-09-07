# Backup and recovery

## Recommended practice

Keep at least one recent backup outside the browser profile. For sensitive pastoral material, prefer the encrypted `.pulpit` format and use a strong, unique password.

## Backup formats

- JSON: portable and human-readable; not encrypted.
- `.pulpit`: JSON envelope encrypted with AES-256-GCM. The key is derived from the password using PBKDF2-SHA-256 with 250,000 iterations.

Passwords are never persisted by Pulpit. If an encrypted backup password is lost, the application cannot recover it.

## Restore behavior

The file is parsed and validated before persistence. Sermons, studies and devotionals are normalized and bounded; imported Bible translations also pass structural and size limits. The replacement of user collections, settings and revision history is committed through one IndexedDB transaction so a failed write does not intentionally leave a half-restored dataset.

The local File System Access directory handle is not imported from a backup. Reconnect a mirror folder on the device when needed.

## Browser data

Clearing site data, resetting a browser profile or uninstalling without retained storage may remove the IndexedDB database. Treat browser storage as the working copy, not the sole archival copy.
