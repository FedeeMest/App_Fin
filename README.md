# App_Fin

App de control financiero personal (ingresos, gastos, cuentas, presupuestos, recurrentes y metas de ahorro).

Inspirada en [Moneo](https://moneofinance.com/) y construida sobre la misma base tecnológica que
[Alquimia_Home_Deco](https://github.com/FedeeMest/Alquimia_Home_Deco).

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node + Express 5, TypeScript (ESM), MikroORM 6, MySQL |
| Auth | JWT + bcryptjs, helmet, CORS por lista, rate-limit |
| Frontend | Angular 21 + Tailwind 3 + chart.js (responsive) |

## Estructura

```
BackEnd/   API REST (módulos: auth, usuario, cuenta, categoria, transaccion)
FrontEnd/  Angular (login, inicio, movimientos, cuentas, categorías)
docs/      Documentación (ver docs/ANALISIS.md)
```

## Puesta en marcha (backend)

```bash
cd BackEnd
# crear una base vacía:  CREATE DATABASE app_fin CHARACTER SET utf8mb4;
cp .env.example .env     # completar valores
pnpm install
pnpm start:dev           # al iniciar aplica las migraciones pendientes (crea las tablas)
```

Ver el análisis y el roadmap en [docs/ANALISIS.md](docs/ANALISIS.md).

## Puesta en marcha (frontend)

```bash
cd FrontEnd
pnpm install
pnpm start   # http://localhost:4200 (API en http://localhost:3000/api)
```

## Pruebas (backend)

```bash
cd BackEnd
pnpm test   # integración sobre SQLite en memoria, no necesita MySQL
```

## Migraciones (backend)

El esquema ya no se sincroniza solo: lo versionan las migraciones de `BackEnd/src/migrations`, que se aplican al iniciar.

```bash
# después de cambiar una entidad, con la base de desarrollo al día:
cd BackEnd
pnpm build
pnpm migration:create nombre_corto   # genera el archivo en src/migrations con los cambios
# revisar el archivo generado, luego pnpm start:dev (o pnpm migration:up) lo aplica
```
