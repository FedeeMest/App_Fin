const pad = (n: number) => String(n).padStart(2, '0');
const ultimoDia = (y: number, m: number) => new Date(y, m, 0).getDate(); // m: 1-12

/**
 * Sugiere cuándo vence la primera cuota de una compra con tarjeta, según el cierre del resumen:
 * si comprás hasta el día de cierre entra en el resumen de ese mes; si no, en el siguiente.
 * El vencimiento es el día indicado, en el mismo mes del cierre si es posterior al cierre, o en el siguiente.
 */
export function primerVencimiento(fechaCompra: string, diaCierre: number, diaVenc: number | null): string {
  const [y, m, d] = fechaCompra.split('-').map(Number);
  let cy = y, cm = m;
  if (d > diaCierre) { cm++; if (cm > 12) { cm = 1; cy++; } }
  if (!diaVenc) return `${cy}-${pad(cm)}-${pad(Math.min(diaCierre, ultimoDia(cy, cm)))}`;
  let vy = cy, vm = cm;
  if (diaVenc <= diaCierre) { vm++; if (vm > 12) { vm = 1; vy++; } }
  return `${vy}-${pad(vm)}-${pad(Math.min(diaVenc, ultimoDia(vy, vm)))}`;
}
