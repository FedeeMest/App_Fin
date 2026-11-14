import type { CompraCuotas } from './cuota.entity.js';

const pad = (n: number) => String(n).padStart(2, '0');

/** Suma `meses` a una fecha YYYY-MM-DD; si el día no existe en ese mes, usa el último día. */
export function sumarMeses(fecha: string, meses: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const idx = m - 1 + meses;
  const anio = y + Math.floor(idx / 12);
  const mes = ((idx % 12) + 12) % 12;
  const ultimo = new Date(anio, mes + 1, 0).getDate();
  return `${anio}-${pad(mes + 1)}-${pad(Math.min(d, ultimo))}`;
}

/** Importe de la cuota k (1..n). La última absorbe el redondeo para que sumen exactamente el total. */
export function montoCuota(c: Pick<CompraCuotas, 'monto_total' | 'cantidad_cuotas'>, k: number): number {
  const total = Math.round(Number(c.monto_total) * 100);
  const base = Math.floor(total / c.cantidad_cuotas);
  return (k === c.cantidad_cuotas ? total - base * (c.cantidad_cuotas - 1) : base) / 100;
}

export const vencimiento = (c: Pick<CompraCuotas, 'fecha_primera_cuota'>, k: number) => sumarMeses(c.fecha_primera_cuota, k - 1);

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria de la app, no la del servidor (suele estar en UTC). */
export function hoy(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: process.env.APP_TZ || 'America/Argentina/Buenos_Aires' });
}

/**
 * Estado de una compra a la fecha `ref`.
 * - Compra con tarjeta (se pasa `confirmadas`): una cuota está paga cuando se pagó el resumen que la incluye.
 * - Sin tarjeta: se considera paga cuando ya venció.
 */
export function estadoCompra(c: CompraCuotas, ref = hoy(), confirmadas?: Set<number>) {
  let pagadas = 0;
  let montoRestante = 0;
  let proximo: string | null = null;
  for (let k = 1; k <= c.cantidad_cuotas; k++) {
    const paga = confirmadas ? confirmadas.has(k) : vencimiento(c, k) <= ref;
    if (paga) pagadas++;
    else {
      montoRestante += montoCuota(c, k);
      proximo ??= vencimiento(c, k);
    }
  }
  const restantes = c.cantidad_cuotas - pagadas;
  return {
    cuotas_pagadas: pagadas,
    cuotas_restantes: restantes,
    monto_cuota: montoCuota(c, 1),
    monto_restante: Number(montoRestante.toFixed(2)),
    proximo_vencimiento: proximo,
    finalizada: restantes === 0,
  };
}

/** Total de cuotas que vencen en el mes `YYYY-MM` entre todas las compras. */
export function totalDelMes(compras: CompraCuotas[], mes: string): number {
  let total = 0;
  for (const c of compras) {
    for (let k = 1; k <= c.cantidad_cuotas; k++) {
      if (vencimiento(c, k).slice(0, 7) === mes) total += montoCuota(c, k);
    }
  }
  return Number(total.toFixed(2));
}
