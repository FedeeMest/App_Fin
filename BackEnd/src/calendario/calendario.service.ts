import type { EntityManager } from '@mikro-orm/core';
import { Recurrente } from '../recurrente/recurrente.entity.js';
import { CompraCuotas } from '../cuota/cuota.entity.js';
import { ocurrenciasEnRango } from '../recurrente/recurrente.util.js';
import { montoCuota, vencimiento } from '../cuota/cuota.util.js';

export interface Evento {
  fecha: string; tipo: 'INGRESO' | 'GASTO'; origen: 'RECURRENTE' | 'CUOTA';
  descripcion: string; monto: number; detalle?: string; categoriaId: number | null;
}

/** Eventos previstos (recurrentes activos + vencimientos de cuotas) entre `desde` y `hasta`, ordenados por fecha. */
export async function eventosPrevistos(em: EntityManager, usuarioId: number, desde: string, hasta: string): Promise<Evento[]> {
  const eventos: Evento[] = [];

  const recurrentes = await em.find(Recurrente, { usuario: usuarioId, activo: true });
  for (const r of recurrentes) {
    for (const f of ocurrenciasEnRango(r, desde, hasta)) {
      eventos.push({ fecha: f, tipo: r.tipo, origen: 'RECURRENTE', descripcion: r.descripcion, monto: Number(r.monto), categoriaId: r.categoria?.id ?? null });
    }
  }

  const compras = await em.find(CompraCuotas, { usuario: usuarioId });
  for (const c of compras) {
    for (let k = 1; k <= c.cantidad_cuotas; k++) {
      const f = vencimiento(c, k);
      if (f >= desde && f <= hasta) {
        eventos.push({ fecha: f, tipo: 'GASTO', origen: 'CUOTA', descripcion: c.descripcion, monto: montoCuota(c, k),
          detalle: `Cuota ${k}/${c.cantidad_cuotas}`, categoriaId: c.categoria?.id ?? null });
      }
    }
  }

  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.descripcion.localeCompare(b.descripcion));
}
