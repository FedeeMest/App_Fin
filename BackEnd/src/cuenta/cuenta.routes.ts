import { Router, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { authMiddleware, AuthRequest } from '../shared/middleware/auth.middleware.js';
import { Cuenta } from './cuenta.entity.js';
import { Transaccion } from '../transaccion/transaccion.entity.js';
import { CompraCuotas } from '../cuota/cuota.entity.js';
import { cuotasConfirmadas } from '../cuota/cuota.service.js';
import { estadoCompra, hoy, montoCuota, vencimiento } from '../cuota/cuota.util.js';
import { mesValido } from '../shared/fechas.js';

export const cuentaRouter = Router();
cuentaRouter.use(authMiddleware);

const TIPOS = ['EFECTIVO', 'BANCO', 'BILLETERA', 'TARJETA'];

function saldoDe(cuenta: Cuenta, txs: Transaccion[]): number {
  let saldo = Number(cuenta.saldo_inicial);
  for (const t of txs) {
    const m = Number(t.monto);
    if (t.cuenta.id === cuenta.id) saldo += t.tipo === 'INGRESO' ? m : -m; // GASTO y TRANSFERENCIA salen
    if (t.tipo === 'TRANSFERENCIA' && t.cuenta_destino?.id === cuenta.id) saldo += m;
  }
  return Number(saldo.toFixed(2));
}

/** Datos propios de una tarjeta: cuánto debe en cuotas futuras y cuánto límite le queda. */
function datosTarjeta(cuenta: Cuenta, saldo: number, compras: CompraCuotas[], conf: Map<number, Set<number>>) {
  const deudaCuotas = compras
    .filter((c) => c.cuenta?.id === cuenta.id)
    .reduce((s, c) => s + estadoCompra(c, hoy(), conf.get(c.id) ?? new Set()).monto_restante, 0);
  const consumos = Math.max(0, -saldo); // gastos directos con la tarjeta todavía no pagados
  const limite = cuenta.limite_credito != null ? Number(cuenta.limite_credito) : null;
  return {
    limite_credito: limite,
    dia_cierre: cuenta.dia_cierre ?? null,
    dia_vencimiento: cuenta.dia_vencimiento ?? null,
    deuda_cuotas: Number(deudaCuotas.toFixed(2)),
    consumos_sin_pagar: Number(consumos.toFixed(2)),
    disponible: limite == null ? null : Number((limite - deudaCuotas - consumos).toFixed(2)),
  };
}

/** Valida los campos propios de tarjeta; devuelve un mensaje de error o null. */
function validarTarjeta(b: any): string | null {
  if (b.limite_credito !== undefined && b.limite_credito !== null && b.limite_credito !== '') {
    const l = Number(b.limite_credito);
    if (!Number.isFinite(l) || l < 0) return 'El límite debe ser un número mayor o igual a 0';
  }
  for (const campo of ['dia_cierre', 'dia_vencimiento']) {
    const v = b[campo];
    if (v === undefined || v === null || v === '') continue;
    if (!Number.isInteger(Number(v)) || Number(v) < 1 || Number(v) > 31) return `${campo === 'dia_cierre' ? 'El día de cierre' : 'El día de vencimiento'} debe ser entre 1 y 31`;
  }
  return null;
}
const vacio = (v: unknown) => v === undefined || v === null || v === '';

// Lista cuentas del usuario con saldo calculado (y datos de límite para las tarjetas)
cuentaRouter.get('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const cuentas = await em.find(Cuenta, { usuario: req.userId, activa: true });
  const txs = await em.find(Transaccion, { usuario: req.userId });
  const compras = cuentas.some((c) => c.tipo === 'TARJETA') ? await em.find(CompraCuotas, { usuario: req.userId }, { populate: ['cuenta'] }) : [];
  const conf = await cuotasConfirmadas(em, req.userId as number);
  res.json(cuentas.map((c) => {
    const saldo = saldoDe(c, txs);
    return {
      id: c.id, nombre: c.nombre, tipo: c.tipo, moneda: c.moneda, saldo,
      ...(c.tipo === 'TARJETA' ? datosTarjeta(c, saldo, compras, conf) : {}),
    };
  }));
});

cuentaRouter.post('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const { nombre, tipo, moneda, saldo_inicial, limite_credito, dia_cierre, dia_vencimiento } = req.body ?? {};
  if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });
  if (tipo !== undefined && !TIPOS.includes(tipo)) return res.status(400).json({ message: 'Tipo de cuenta inválido' });
  const esTarjeta = tipo === 'TARJETA';
  if (esTarjeta) {
    const err = validarTarjeta(req.body);
    if (err) return res.status(400).json({ message: err });
  }
  const c = em.create(Cuenta, {
    usuario: req.userId as number, nombre, tipo: tipo ?? 'EFECTIVO',
    moneda: moneda ?? 'ARS', saldo_inicial: String(saldo_inicial ?? 0), activa: true,
    ...(esTarjeta ? {
      limite_credito: vacio(limite_credito) ? undefined : Number(limite_credito).toFixed(2),
      dia_cierre: vacio(dia_cierre) ? undefined : Number(dia_cierre),
      dia_vencimiento: vacio(dia_vencimiento) ? undefined : Number(dia_vencimiento),
    } : {}),
  });
  await em.persist(c).flush();
  res.status(201).json({ id: c.id });
});

// Edita nombre y, en tarjetas, límite / día de cierre / día de vencimiento
cuentaRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const c = await em.findOne(Cuenta, { id: Number(req.params.id), usuario: req.userId });
  if (!c) return res.status(404).json({ message: 'Cuenta no encontrada' });
  const { nombre, limite_credito, dia_cierre, dia_vencimiento } = req.body ?? {};
  if (nombre !== undefined) {
    if (!String(nombre).trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
    c.nombre = String(nombre).trim();
  }
  if (c.tipo === 'TARJETA') {
    const err = validarTarjeta(req.body);
    if (err) return res.status(400).json({ message: err });
    if (limite_credito !== undefined) c.limite_credito = vacio(limite_credito) ? undefined : Number(limite_credito).toFixed(2);
    if (dia_cierre !== undefined) c.dia_cierre = vacio(dia_cierre) ? undefined : Number(dia_cierre);
    if (dia_vencimiento !== undefined) c.dia_vencimiento = vacio(dia_vencimiento) ? undefined : Number(dia_vencimiento);
  }
  await em.flush();
  res.json({ id: c.id });
});

// Resumen de la tarjeta de un mes: las cuotas que aparecen solas, cuánto es el total y cuánto límite queda.
// GET /api/cuentas/:id/resumen?mes=YYYY-MM
cuentaRouter.get('/:id/resumen', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const tarjeta = await em.findOne(Cuenta, { id: Number(req.params.id), usuario: req.userId });
  if (!tarjeta) return res.status(404).json({ message: 'Cuenta no encontrada' });
  if (tarjeta.tipo !== 'TARJETA') return res.status(400).json({ message: 'La cuenta no es una tarjeta' });
  const mes = String(req.query.mes ?? hoy().slice(0, 7));
  if (!mesValido(mes)) return res.status(400).json({ message: 'mes debe ser YYYY-MM' });

  const txs = await em.find(Transaccion, { usuario: req.userId });
  const compras = await em.find(CompraCuotas, { usuario: req.userId, cuenta: tarjeta.id }, { populate: ['cuenta'] });
  const conf = await cuotasConfirmadas(em, req.userId as number);

  const items = resumenItems(compras, conf, mes);
  const total = Number(items.reduce((s, i) => s + i.monto, 0).toFixed(2));
  const pagado = Number(items.filter((i) => i.pagada).reduce((s, i) => s + i.monto, 0).toFixed(2));
  res.json({
    cuenta: { id: tarjeta.id, nombre: tarjeta.nombre, saldo: saldoDe(tarjeta, txs), ...datosTarjeta(tarjeta, saldoDe(tarjeta, txs), compras, conf) },
    mes, items, total, pagado, pendiente: Number((total - pagado).toFixed(2)),
    vencimiento: items[0]?.vencimiento ?? null,
  });
});

function resumenItems(compras: CompraCuotas[], conf: Map<number, Set<number>>, mes: string) {
  const items: { compraId: number; descripcion: string; nro_cuota: number; cantidad_cuotas: number; monto: number; vencimiento: string; pagada: boolean }[] = [];
  for (const c of compras) {
    for (let k = 1; k <= c.cantidad_cuotas; k++) {
      const v = vencimiento(c, k);
      if (v.slice(0, 7) !== mes) continue;
      items.push({ compraId: c.id, descripcion: c.descripcion, nro_cuota: k, cantidad_cuotas: c.cantidad_cuotas, monto: montoCuota(c, k), vencimiento: v, pagada: !!conf.get(c.id)?.has(k) });
    }
  }
  return items.sort((a, b) => a.descripcion.localeCompare(b.descripcion) || a.nro_cuota - b.nro_cuota);
}

// Paga el resumen del mes: confirma de una vez todas sus cuotas pendientes y descuenta el total de la cuenta elegida.
// POST /api/cuentas/:id/resumen/pagar  { mes, cuentaOrigenId, fecha? }
cuentaRouter.post('/:id/resumen/pagar', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const usuarioId = req.userId as number;
  const { mes, cuentaOrigenId, fecha } = req.body ?? {};
  const tarjeta = await em.findOne(Cuenta, { id: Number(req.params.id), usuario: usuarioId });
  if (!tarjeta) return res.status(404).json({ message: 'Cuenta no encontrada' });
  if (tarjeta.tipo !== 'TARJETA') return res.status(400).json({ message: 'La cuenta no es una tarjeta' });
  if (!mesValido(mes)) return res.status(400).json({ message: 'mes debe ser YYYY-MM' });
  if (fecha !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) return res.status(400).json({ message: 'fecha inválida' });
  const origen = await em.findOne(Cuenta, { id: Number(cuentaOrigenId), usuario: usuarioId });
  if (!origen) return res.status(404).json({ message: 'Elegí la cuenta desde la que pagás el resumen' });
  if (origen.tipo === 'TARJETA') return res.status(400).json({ message: 'El resumen se paga desde una cuenta, no desde otra tarjeta' });

  const compras = await em.find(CompraCuotas, { usuario: usuarioId, cuenta: tarjeta.id }, { populate: ['categoria'] });
  const conf = await cuotasConfirmadas(em, usuarioId);
  const pendientes = resumenItems(compras, conf, mes).filter((i) => !i.pagada);
  if (!pendientes.length) return res.status(409).json({ message: 'Ese resumen no tiene cuotas pendientes' });
  const total = Number(pendientes.reduce((s, i) => s + i.monto, 0).toFixed(2));
  const fechaPago = fecha ?? hoy();

  try {
    await em.transactional(async (tem) => {
      for (const i of pendientes) {
        const c = compras.find((x) => x.id === i.compraId)!;
        tem.persist(tem.create(Transaccion, {
          usuario: usuarioId, cuenta: tarjeta, categoria: c.categoria, tipo: 'GASTO', monto: i.monto.toFixed(2), fecha: fechaPago,
          nota: `${c.descripcion} (cuota ${i.nro_cuota}/${c.cantidad_cuotas})`, compra_cuotas: c, nro_cuota: i.nro_cuota, fecha_prevista: i.vencimiento,
        }));
      }
      tem.persist(tem.create(Transaccion, {
        usuario: usuarioId, cuenta: origen, cuenta_destino: tarjeta, tipo: 'TRANSFERENCIA', monto: total.toFixed(2), fecha: fechaPago,
        nota: `Pago resumen ${tarjeta.nombre} ${mes}`,
      }));
    });
  } catch (e: any) {
    if (e?.code === 'ER_DUP_ENTRY' || /UNIQUE/i.test(String(e?.message))) return res.status(409).json({ message: 'Ese resumen ya fue pagado' });
    throw e;
  }
  res.status(201).json({ cuotas_pagadas: pendientes.length, total });
});
