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
| CompraCuotas | descripción, monto_total, cantidad_cuotas, fecha_primera_cuota, cuenta, categoría | Hecho |
| Recurrente | descripción, tipo, monto, frecuencia, fecha_inicio, fecha_fin, activo, cuenta, categoría | Hecho |
| Presupuesto | categoría (vacía = total del mes), monto_limite | Hecho |
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

## 5. Decisiones tomadas

- **Multiusuario** con registro abierto (todas las tablas tienen dueño).
- **Solo pesos argentinos (ARS)** por ahora; `TipoCambio` queda para más adelante.
- **Responsive** (móvil primero): menú inferior en celular, barra lateral en escritorio; Angular + Tailwind.

## 6. Frontend (FrontEnd/)

Angular 21 standalone + Tailwind 3 + chart.js. Pantallas: login/registro, inicio (saldo, resumen mensual,
gráfico por categoría), movimientos (alta en hoja inferior, paginación), cuentas, categorías.
Entornos: `environment.ts` (dev) y `environment.prod.ts` (reemplazo en build de producción).

## 7. Compras en cuotas

Endpoints (`/api/cuotas`): listado (`?estado=activas|finalizadas`), `/resumen` (cuotas del mes, deuda total,
proyección de N meses), detalle con calendario de cuotas, alta y baja.

Reglas: la cuota k vence `fecha_primera_cuota + (k-1)` meses (si el día no existe, se usa el último del mes);
una cuota se considera paga cuando ya venció; la última cuota absorbe el redondeo para que la suma sea exacta.
Nada de esto se guarda: se calcula a la fecha de hoy. Pendiente: generar el gasto en Movimientos al vencer cada
cuota y marcar cuotas pagadas manualmente.

## 8. Recurrentes y calendario

`/api/recurrentes`: alta, listado (con próxima fecha), pausar/reanudar y baja. Frecuencias semanal, mensual y anual;
las fechas se calculan desde `fecha_inicio` (un recurrente del día 31 cae el último día en meses cortos).
`/api/calendario?mes=YYYY-MM` junta recurrentes activos y vencimientos de cuotas, con ingresos, pagos y balance previstos.
Frontend: pantalla Calendario (grilla mensual con puntos por día, detalle del día y gestión de fijos) y pantalla "Más"
en móvil para Cuentas, Categorías y cerrar sesión.
Pendiente: generar el movimiento real al llegar la fecha y avisos de próximos pagos.

## 9. Presupuestos

`/api/presupuestos?mes=YYYY-MM`: límite mensual por categoría de gasto o total del mes (rige todos los meses).
Por cada uno calcula gastado (movimientos reales), previsto pendiente (fijos y cuotas que aún no vencieron, hoy incluido),
restante, porcentaje y semáforo (OK < 80 %, ATENCIÓN ≥ 80 %, EXCEDIDO ≥ 100 %).
Con presupuesto total y mes en curso devuelve el presupuesto diario: restante / días que quedan (hoy incluido).
Previsto = pagos sin confirmar del mes (aunque su fecha ya pasó); en meses pasados no se proyecta nada.
"Hoy" se calcula en `APP_TZ` (por defecto Argentina), no en UTC.

## 10. Confirmar pagos

`POST /api/calendario/confirmar` convierte un pago o cobro previsto (fijo o cuota) en un movimiento real:
`{origen:'RECURRENTE', id, fecha}` o `{origen:'CUOTA', id, nro_cuota}`, con `cuentaId`, `monto` y `fecha_real` opcionales
(si no se indica cuenta se usa la del origen). El movimiento guarda su origen (`recurrente`/`compra_cuotas`,
`fecha_prevista`, `nro_cuota`) con índices únicos, así que no se puede confirmar dos veces. El calendario marca los
confirmados y los presupuestos descuentan el previsto: no hay doble conteo. Borrar el movimiento lo devuelve a pendiente;
borrar el origen conserva el movimiento (`deleteRule: set null`). Los pagos vencidos sin confirmar se señalan.

## 11. Pruebas

`cd BackEnd && pnpm test` ejecuta `test/run-integration.sh`: levanta la API real sobre SQLite en memoria (sin MySQL) y
corre ~55 chequeos de punta a punta (auth, aislamiento entre usuarios, saldos, cuotas, calendario, confirmación y
presupuestos). Limitación: SQLite no reemplaza una prueba contra MySQL (tipos y índices pueden diferir levemente).

## 12. Migraciones

Se reemplazó `updateSchema` al arrancar por migraciones de MikroORM (`@mikro-orm/migrations`). `Migration20261114000000_inicial`
crea todas las tablas (generada con el generador de esquema de MikroORM para MySQL; se verificó que coincide sentencia por
sentencia con las entidades). Las migraciones se aplican al iniciar el servidor (`migrar()` en `shared/db/orm.ts`) y las nuevas
se generan con `pnpm migration:create`, comparando contra la base real (`snapshot: false`).
Verificado: coincidencia con las entidades, descubrimiento por el migrador y generación de archivos nuevos (sobre SQLite).
Sin verificar: la ejecución de la migración inicial sobre un MySQL real (no hay MySQL en el entorno de desarrollo del asistente).
