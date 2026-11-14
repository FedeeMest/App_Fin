import type { EntityManager } from '@mikro-orm/core';
import { Recurrente } from '../recurrente/recurrente.entity.js';
import { CompraCuotas } from '../cuota/cuota.entity.js';
import { Transaccion } from '../transaccion/transaccion.entity.js';
import { ocurrenciasEnRango } from '../recurrente/recurrente.util.js';
import { montoCuota, vencimiento } from '../cuota/cuota.util.js';

export interface Evento {
  fecha: string; tipo: 'INGRESO' | 'GASTO'; origen: 'RECURRENTE' | 'CUOTA';
  origenId: number; nroCuota: number | null; cuentaId: number | null; categoriaId: number | null;
  descripcion: string; monto: number; detalle?: string;
  confirmado: boolean; // ya existe un movimiento real que lo confirma
  tarjeta: boolean; // cuota de una compra con tarjeta: se paga con el resumen, no una por una
}

/**
 * Eventos previstos (recurrentes activos + vencimientos de cuotas) entre `desde` y `hasta`, ordenados por fecha.
 * Cada uno indica si ya fue confirmado con un movimiento real.
 */
export async function eventosPrevistos(em: EntityManager, usuarioId: number, desde: string, hasta: string): Promise<Evento[]> {
  const eventos: Evento[] = [];

  const recurrentes = await em.find(Recurrente, { usuario: usuarioId, activo: true });
  for (const r of recurrentes) {
    for (const f of ocurrenciasEnRango(r, desde, hasta)) {
      eventos.push({
        fecha: f, tipo: r.tipo, origen: 'RECURRENTE', origenId: r.id, nroCuota: null,
        cuentaId: r.cuenta?.id ?? null, categoriaId: r.categoria?.id ?? null,
        descripcion: r.descripcion, monto: Number(r.monto), confirmado: false, tarjeta: false,
      });
    }
  }

  const compras = await em.find(CompraCuotas, { usuario: usuarioId }, { populate: ['cuenta'] });
  for (const c of compras) {
    for (let k = 1; k <= c.cantidad_cuotas; k++) {
      const f = vencimiento(c, k);
      if (f >= desde && f <= hasta) {
        eventos.push({
          fecha: f, tipo: 'GASTO', origen: 'CUOTA', origenId: c.id, nroCuota: k,
          cuentaId: c.cuenta?.id ?? null, categoriaId: c.categoria?.id ?? null,
          descripcion: c.descripcion, monto: montoCuota(c, k), detalle: `Cuota ${k}/${c.cantidad_cuotas}`, confirmado: false, tarjeta: c.cuenta?.tipo === 'TARJETA',
        });
      }
    }
  }

  // Marcar los ya confirmados (movimientos vinculados cuya fecha prevista cae en el rango)
  const vinculados = await em.find(Transaccion, {
    usuario: usuarioId, fecha_prevista: { $gte: desde, $lte: hasta },
    $or: [{ recurrente: { $ne: null } }, { compra_cuotas: { $ne: null } }],
  });
  const claves = new Set(vinculados.map((t) =>
    t.recurrente ? `R:${t.recurrente.id}:${t.fecha_prevista}` : `C:${t.compra_cuotas?.id}:${t.nro_cuota}`));
  for (const e of eventos) {
    e.confirmado = claves.has(e.origen === 'RECURRENTE' ? `R:${e.origenId}:${e.fecha}` : `C:${e.origenId}:${e.nroCuota}`);
  }

  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.descripcion.localeCompare(b.descripcion));
}
