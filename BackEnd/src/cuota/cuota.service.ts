import type { EntityManager } from '@mikro-orm/core';
import { Transaccion } from '../transaccion/transaccion.entity.js';
import type { CompraCuotas } from './cuota.entity.js';

/** Números de cuota ya confirmadas (pagadas) por compra. */
export async function cuotasConfirmadas(em: EntityManager, usuarioId: number): Promise<Map<number, Set<number>>> {
  const txs = await em.find(Transaccion, { usuario: usuarioId, compra_cuotas: { $ne: null } });
  const m = new Map<number, Set<number>>();
  for (const t of txs) {
    if (!t.compra_cuotas || t.nro_cuota == null) continue;
    const id = t.compra_cuotas.id;
    if (!m.has(id)) m.set(id, new Set());
    m.get(id)!.add(t.nro_cuota);
  }
  return m;
}

/** Si la compra es con tarjeta, devuelve sus cuotas confirmadas (para estadoCompra); si no, undefined. */
export const confirmadasSiTarjeta = (c: CompraCuotas, mapa: Map<number, Set<number>>) =>
  c.cuenta?.tipo === 'TARJETA' ? (mapa.get(c.id) ?? new Set<number>()) : undefined;
