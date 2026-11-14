# Análisis inicial — App_Fin

Fecha: 2026-11-13

## 1. Base tecnológica (Alquimia_Home_Deco)

Monorepo con `BackEnd/` y `alquimia-front/`.

- **Backend:** Express 5, TypeScript ESM, MikroORM 6 + MySQL, JWT, bcrypt, helmet, cors, express-rate-limit, multer + Cloudinary.
- **Frontend:** Angular 21 (standalone, signals, lazy loading), Tailwind 3, chart.js, jsPDF, exceljs.
- **Despliegue:** Vercel (front) + Railway (back).
- **Patrón backend:** un módulo por carpeta (`*.entity.ts`, `*.controller.ts`, `*.routes.ts`) y `shared/` (db, middleware, config).

### Tablas existentes

| Tabla | Uso original | Reutilización en App_Fin |
|---|---|---|
| Usuario | Login | Sí (base de auth) |
| Venta / DetalleVenta | Ventas | Inspira `Transaccion` |
| Producto | Catálogo y stock | No |
| Cliente | Contactos | Parcial |
| Configuracion | Porcentajes globales | Se adapta a preferencias por usuario |
| CierreCaja | Teórico vs real | Inspira conciliación de cuentas |
| EventoProducto | Analítica web | No |

### Problemas a no heredar

1. Sin multiusuario: ninguna tabla tiene dueño.
2. Dinero mezclado (number vs decimal).
3. Esquema con `updateSchema` al arrancar, sin migraciones.
4. Front siempre usa `environment.prod.ts`; CORS con dominio fijo.
5. Controladores muy grandes, sin capa de servicios.
6. bcrypt y bcryptjs a la vez, mucho `any`, casi sin tests, sin `.env.example`.

## 2. Referencia: Moneo

Presupuesto diario, resumen, pagos y gastos recurrentes, calendario financiero, análisis por categoría,
ahorro y metas, hábitos, check-in diario, multimoneda, modo oscuro, exportación (Premium).
La web no muestra cuentas múltiples ni presupuestos por categoría; se diseñan aquí.

## 3. Modelo de datos propuesto

Todas las tablas de datos pertenecen a un `Usuario`.
Montos: `decimal(14,2)`; nunca `number` flotante.

| Tabla | Campos principales | Estado |
|---|---|---|
| Usuario | username, email, password, nombre, moneda_base | Hecho |
| Cuenta | nombre, tipo, moneda, saldo_inicial, activa | Hecho |
| Categoria | nombre, tipo, icono, color, padre | Hecho |
| Transaccion | fecha, monto, tipo, cuenta, categoria, nota, cuenta_destino | Hecho |
| Recurrente | monto, frecuencia, proxima_fecha, cuenta, categoria | Pendiente |
| Presupuesto | periodo, categoria, monto_limite | Pendiente |
| Meta / AporteMeta | objetivo, fecha_limite, aportes | Pendiente |
| TipoCambio | fecha, moneda_origen, moneda_destino, tasa | Pendiente |
| Conciliacion | cuenta, saldo_real, saldo_sistema, diferencia | Pendiente |

Reglas: saldo de cuenta = saldo_inicial + ingresos − gastos ± transferencias (se calcula, no se guarda).
Toda consulta filtra por `usuario` del token.

## 4. Roadmap

1. **Base (este cambio):** backend, auth, usuarios con registro, cuentas, categorías (con semillas), transacciones.
2. Migraciones MikroORM, tests (jest + supertest), servicios.
3. Frontend Angular: login, layout, cuentas, transacciones, dashboard.
4. Recurrentes + calendario, presupuestos, resumen mensual.
5. Metas de ahorro, multimoneda, exportación PDF/Excel, hábitos.

## 5. Decisiones abiertas

- Solo personal o multiusuario con registro abierto (el código ya soporta multiusuario).
- Monedas desde el inicio (ARS/USD) y fuente de cotización.
- Web responsive o app móvil.
