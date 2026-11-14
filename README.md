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
cp .env.example .env     # completar valores
pnpm install
pnpm start:dev
```

Ver el análisis y el roadmap en [docs/ANALISIS.md](docs/ANALISIS.md).

## Puesta en marcha (frontend)

```bash
cd FrontEnd
pnpm install
pnpm start   # http://localhost:4200 (API en http://localhost:3000/api)
```
