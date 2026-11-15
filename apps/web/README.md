# CANJEA · Web

Aplicación Angular 22 de CANJEA: PWA standalone, signals, formularios reactivos y rutas lazy.

## Desarrollo

Desde la raíz del monorepo (recomendado):

```bash
npm run dev:api   # API en http://localhost:4100/api
npm run dev:web   # Web en http://localhost:4200
```

La web usa `proxy.conf.json` para redirigir `/api` al API durante el desarrollo.

## Build

```bash
npm run build
```

El resultado queda en `dist/canjea-web/browser` y el API lo sirve en producción.

La documentación completa —instalación, cuentas demo, RBAC, endpoints y despliegue— está en el [`README.md`](../../README.md) de la raíz.
