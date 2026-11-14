# Diseño UX

## Principios
1. **Inicio como centro de mando**: saldo, qué podés gastar hoy, próximos pagos, presupuestos y cuentas en una sola pantalla.
2. **Cargar un gasto en pocos toques**: botón "+" central (o tecla `N` en escritorio) abre una hoja con monto grande, categorías ordenadas por uso, última cuenta recordada y fecha Hoy/Ayer.
3. **Deshacer en vez de confirmar**: toasts con "Deshacer" al guardar o eliminar.
4. **Divulgación progresiva**: lo opcional (nota, otra fecha) no estorba.
5. **Privacidad**: "Ocultar montos" (ojo) para usar la app en público.
6. **Estados vacíos y esqueletos** de carga en lugar de pantallas en blanco.

## Navegación
- Móvil: barra inferior Inicio · Movimientos · [+] · Calendario · Más. "Más" agrupa Presupuestos, Cuotas, Cuentas y Categorías.
- Escritorio: barra lateral agrupada (Principal / Planificar / Configuración) + botón "Nuevo movimiento".

## Componentes
`app-sheet` (modal / bottom sheet), `app-quick-add`, `app-toast-host`, `app-icon`, pipe `money`, servicios `PrivacyService`, `ToastService`, `DatosService`, `QuickAddService`.

## Backend asociado
`GET /transacciones` acepta `tipo` y `q`; nuevo `PUT /transacciones/:id`.

## Tarjetas de crédito y cuotas
- Una cuenta `TARJETA` tiene límite, día de cierre y día de vencimiento.
- Una compra en cuotas con tarjeta **baja el límite por el total financiado** desde el día de la compra; el límite se libera a medida que se pagan los resúmenes.
- Las cuotas **no se pagan una por una**: aparecen solas en el resumen del mes (`GET /cuentas/:id/resumen?mes=`).
- "Pagar resumen" (`POST /cuentas/:id/resumen/pagar`) registra de una vez todas las cuotas del mes como gasto de la tarjeta (con su categoría) y una transferencia desde la cuenta elegida; la tarjeta queda en 0.
- Al cargar la compra, la 1.ª cuota se sugiere según el cierre: si comprás hasta el día de cierre entra en ese resumen, si no, en el siguiente.
- Compras sin tarjeta mantienen el comportamiento anterior (se confirman desde el calendario).
