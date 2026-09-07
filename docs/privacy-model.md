# Privacy model

Pulpit Ultimate is designed so the default workflow does not require an account, analytics service or application server.

## Stored locally

Sermons, studies, devotionals, revision snapshots, imported Bible translations, application settings and optional File System Access handles are kept in the browser profile.

## Network behavior

The application shell is served by the host where Pulpit is deployed. After caching, the service worker supports offline use. The runtime code has no required third-party CDN or API dependency.

## Future integrations

Any future cloud synchronization, AI provider, telemetry or shared-workspace feature should be opt-in, disclose exactly what leaves the device, avoid sending pastoral content unnecessarily, and keep local export/backup available.
