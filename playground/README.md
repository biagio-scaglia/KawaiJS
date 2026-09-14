# Kawaijs Playground

Zero-install editor: write `.kawa` on the left, live preview on the right, download a starter project as zip.

## Local build

```bash
# from monorepo root (after npm install && npx tsc -b)
npm run build:playground
npx --yes serve playground/dist
```

Open the URL shown by `serve`, then edit the script.

## Production

Assembled into GitHub Pages at `/playground/` via:

```bash
npm run assemble:pages
```
