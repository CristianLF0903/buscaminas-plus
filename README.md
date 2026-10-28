# Buscaminas+

Clon web de Buscaminas con modo sin adivinar, tienda de power-ups, reto diario, contrarreloj, infinito y puzzle por niveles.

**Jugar:** https://cristianlf0903.github.io/buscaminas-plus/

## Deploy

Cada push a `master` corre lint, tests y build, y despliega en GitHub Pages (`.github/workflows/deploy.yml`). El build usa `BASE_PATH=/buscaminas-plus/`; en local la base es `/`.

## Comandos

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run preview` — previsualizar el build
- `npm run test` — tests (Vitest)
- `npm run lint` — ESLint
- `npm run format` — Prettier
