// URL of the Cloudflare Worker that stores the hidden-image selection.
// Empty = the selection stays on this device only (localStorage).
//
// Served locally, it stays empty on purpose: the selection is live client work,
// and a local run — a preview, a test — must never write to it. Set
// window.SYNC_URL by hand in the console if you deliberately want to test
// against the real endpoint.
window.SYNC_URL =
  location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname)
    ? ''
    : 'https://jukkai-logo-sync.martinmoradi.com/';
