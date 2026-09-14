# Kawaijs Docs (Interactive)

Playable documentation for **Kawaijs** by **Biagio Scaglia**.

Live site (GitHub Pages): https://biagio-scaglia.github.io/KawaiJS/

> **Pages setup:** Repo → Settings → Pages → Deploy from a branch → Branch `main` → folder **`/docs`** (not `/ root`).
> That folder is the built interactive VN. Root was showing the README via Jekyll.

## Local preview

```bash
# from monorepo root
npm run build
npx kawa dev ./examples/docs
```

## Production build

```bash
npx kawa build ./examples/docs
```

Output: `examples/docs/dist/` - static HTML + SEO (`robots.txt`, `sitemap.xml`, `llms.txt`, JSON-LD FAQ).

## Deep links

| URL | Lesson |
| --- | --- |
| `?at=hub` | Topic menu |
| `?at=lesson_install` | Quick start |
| `?at=lesson_script` | Script basics |
| `?at=lesson_stage` | Scenes & VFX |
| `?at=lesson_branch` | Menus & branching |
| `?at=lesson_deploy` | GitHub Pages |
| `?at=lesson_seo` | SEO / AEO / GEO |
| `?lang=it` | Italian string table |
