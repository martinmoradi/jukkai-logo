// Mirrors the hidden set to the Worker in worker/, so the selection follows
// the client between devices and is visible to everyone opening the page.
//
// Rules of the road:
//   - the server owns the clock; the client never invents a timestamp
//   - we only adopt a remote copy stamped newer than the one we last synced,
//     so a stale read (KV is eventually consistent) can never undo a local click
//   - a failed write leaves us dirty and local wins until it lands
//
// With window.SYNC_URL empty this module does nothing and the app runs on
// localStorage alone.
window.Sync = (function () {
  const url = (window.SYNC_URL || '').trim();
  if (!url) return null;

  const STAMP = 'logo:synced-at';
  const POLL_MS = 8000;

  let seen = Number(localStorage.getItem(STAMP)) || 0;
  let queued = null;
  let dirty = false;
  let busy = false;

  function remember(updated) {
    seen = updated;
    try {
      localStorage.setItem(STAMP, String(updated));
    } catch {
      /* storage unavailable: this session keeps the stamp in memory */
    }
  }

  async function flush() {
    if (busy || !dirty) return;
    busy = true;
    const sent = queued;
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: sent }),
      });
      if (res.ok) {
        const data = await res.json();
        remember(data.updated);
        if (queued === sent) dirty = false;
      }
    } catch {
      /* offline: stay dirty, the poll retries */
    } finally {
      busy = false;
      if (dirty && queued !== sent) flush();
    }
  }

  async function pull() {
    if (dirty) return flush();
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.hidden)) return;

      // Nothing stored server-side yet: seed it with what this device has.
      if (!data.updated && window.Store.count() > 0) return push(window.Store.list());

      if (data.updated > seen) {
        remember(data.updated);
        window.Store.adopt(data.hidden);
      }
    } catch {
      /* offline: keep showing the local copy */
    }
  }

  function push(list) {
    queued = list;
    dirty = true;
    flush();
  }

  setInterval(() => {
    if (document.visibilityState === 'visible') pull();
  }, POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pull();
  });
  pull();

  return { push, pull };
})();
