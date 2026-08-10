# logo

Numbered gallery of the generated logo candidates, with a hide/bring-back pass
for narrowing them down.

Live: https://jukkai-logo.martinmoradi.com

## View

Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8000
```

Keys: `←` `→` to move, `h` to hide or bring back, `g` to toggle grid. On touch,
swipe left/right. The URL carries the current image (`#7`) so a link points at
exactly what you want to talk about.

Hidden images drop out of carousel navigation and go grey and hatched in the
grid, where they can be brought back. The counter shows the current number and
how many images are still in play.

## Add images

1. Drop the new files into `source/`.
2. `node build.js`
3. Commit and push — Cloudflare Pages redeploys on its own.

Numbers already assigned never move — new files get the next free number.
Requires ImageMagick (`magick`) on PATH. `source/` stays out of git; the
compressed `img/` webp files are what gets committed and shared.

## Selection sync

There is one shared selection, not one per visitor. It lives in localStorage
and, once `worker/` is deployed, is mirrored to a Cloudflare Worker so it
follows the client across devices and is visible to everyone opening the page.

It is deployed at `https://jukkai-logo-sync.martinmoradi.com` and `config.js`
points at it. Redeploy after changing `worker/`:

```sh
cd worker
npx wrangler deploy
```

The KV namespace and the hostname are already recorded in `wrangler.toml`.
Leaving `SYNC_URL` empty in `config.js` keeps the selection on one device.

The contract is two calls on one key:

```
GET  /                       -> {"hidden":[2,5,9],"updated":1754820000000}
PUT  /  {"hidden":[2,5,9]}   -> the stored record, with a fresh timestamp
```

The server owns `updated`; the client only ever reads it back and adopts a
remote copy that is stamped newer than the last one it synced. That way an
eventually-consistent stale read can never undo a click, and a write that fails
while offline leaves the local copy in charge until it lands.

Read `ALLOWED_ORIGINS` in `worker/worker.js` before deploying anywhere else.
