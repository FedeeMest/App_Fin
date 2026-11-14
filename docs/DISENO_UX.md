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
