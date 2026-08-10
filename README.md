# logo

Numbered gallery of the generated logo candidates.

## View

Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8000
```

Keys: `←` `→` to move, `g` to toggle grid. The URL carries the current image
(`#7`) so a link points at exactly what you want to talk about.

## Add images

1. Drop the new files into `source/`.
2. `node build.js`

Numbers already assigned never move — new files get the next free number.
Requires ImageMagick (`magick`) on PATH. `source/` stays out of git; the
compressed `img/` webp files are what gets committed and shared.
