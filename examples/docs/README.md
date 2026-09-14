# Kawaijs Docs (Interactive)

Playable documentation for **Kawaijs** by **Biagio Scaglia**.

Live site (GitHub Pages): https://biagio-scaglia.github.io/KawaiJS/

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
