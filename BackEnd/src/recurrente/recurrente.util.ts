import type { Recurrente } from './recurrente.entity.js';
import { sumarMeses } from '../cuota/cuota.util.js';

export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** Fecha de la ocurrencia número k (0 = la primera). */
export function ocurrencia(r: Pick<Recurrente, 'fecha_inicio' | 'frecuencia'>, k: number): string {
  if (r.frecuencia === 'SEMANAL') return sumarDias(r.fecha_inicio, 7 * k);
  if (r.frecuencia === 'ANUAL') return sumarMeses(r.fecha_inicio, 12 * k);
  return sumarMeses(r.fecha_inicio, k);
}

/** Todas las fechas en las que cae el recurrente dentro de [desde, hasta] (inclusive). */
export function ocurrenciasEnRango(r: Recurrente, desde: string, hasta: string): string[] {
  if (!r.activo) return [];
  const out: string[] = [];
  for (let k = 0; k < 5000; k++) {
    const f = ocurrencia(r, k);
    if (f > hasta) break;
    if (r.fecha_fin && f > r.fecha_fin) break;
    if (f >= desde) out.push(f);
  }
  return out;
}

export function proximaFecha(r: Recurrente, desde: string): string | null {
  if (!r.activo) return null;
  for (let k = 0; k < 5000; k++) {
    const f = ocurrencia(r, k);
    if (r.fecha_fin && f > r.fecha_fin) return null;
    if (f >= desde) return f;
  }
  return null;
}
