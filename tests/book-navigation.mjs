// Keep the existing npm command pointed at the shared navigation checks.
process.env.SITE_BASE ||= (process.env.READER_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '') + '/';
await import('./site-navigation.mjs');
