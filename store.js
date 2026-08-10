// Where the hidden-image set lives.
//
// One shared selection, not per-user: whoever opens the page sees the same
// picks. localStorage is the local copy and the offline fallback; if
// window.SYNC_URL is set (see sync.js), it is mirrored to that endpoint so the
// selection follows the client across devices.
window.Store = (function () {
  const KEY = 'logo:hidden';
  const listeners = new Set();
  let hidden = new Set();

  function readLocal() {
    try {
      return new Set(JSON.parse(localStorage.getItem(KEY)) || []);
    } catch {
      return new Set();
    }
  }

  function writeLocal() {
    try {
      localStorage.setItem(KEY, JSON.stringify(list()));
    } catch {
      /* private mode / full quota: in-memory only for this session */
    }
  }

  function list() {
    return [...hidden].sort((a, b) => a - b);
  }

  function emit() {
    listeners.forEach((fn) => fn());
  }

  hidden = readLocal();

  return {
    has: (n) => hidden.has(n),
    list,
    count: () => hidden.size,

    toggle(n) {
      if (hidden.has(n)) hidden.delete(n);
      else hidden.add(n);
      writeLocal();
      emit();
      window.Sync?.push(list());
    },

    // Called by sync.js when the remote copy is newer than ours.
    adopt(numbers) {
      const next = new Set(numbers);
      if (next.size === hidden.size && [...next].every((n) => hidden.has(n))) return;
      hidden = next;
      writeLocal();
      emit();
    },

    onChange(fn) {
      listeners.add(fn);
    },
  };
})();
