// Stores the one shared "hidden images" selection for the logo gallery.
//
//   GET  /  -> {"hidden":[2,5,9],"updated":1754820000000}
//   PUT  /  {"hidden":[2,5,9]}  -> the stored record, with a fresh timestamp
//
// The server owns `updated`; clients only ever read it back. There is a single
// key, because there is a single selection — no per-user state.

const ALLOWED_ORIGINS = [
  'https://jukkai-logo.martinmoradi.com',
  // Kept through the move off GitHub Pages; drop once that site is retired.
  'https://martinmoradi.github.io',
  'http://localhost:8777',
];

const KEY = 'hidden';
const MAX_IMAGES = 5000;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };

    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (request.method === 'GET') {
      const raw = await env.SELECTION.get(KEY);
      return json(raw ? JSON.parse(raw) : { hidden: [], updated: 0 });
    }

    if (request.method === 'PUT') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'body must be JSON' }, 400);
      }
      if (!Array.isArray(body?.hidden)) return json({ error: 'hidden must be an array' }, 400);
      if (body.hidden.length > MAX_IMAGES) return json({ error: 'too many entries' }, 413);

      const hidden = [...new Set(body.hidden)]
        .filter((n) => Number.isInteger(n) && n >= 0 && n < MAX_IMAGES)
        .sort((a, b) => a - b);

      const record = { hidden, updated: Date.now() };
      await env.SELECTION.put(KEY, JSON.stringify(record));
      return json(record);
    }

    return json({ error: 'method not allowed' }, 405);
  },
};
