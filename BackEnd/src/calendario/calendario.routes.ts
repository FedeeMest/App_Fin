import { Router, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { authMiddleware, AuthRequest } from '../shared/middleware/auth.middleware.js';
import { hoy, montoCuota, vencimiento } from '../cuota/cuota.util.js';
import { mesValido, rangoMes } from '../shared/fechas.js';
import { eventosPrevistos } from './calendario.service.js';
import { Recurrente } from '../recurrente/recurrente.entity.js';
import { CompraCuotas } from '../cuota/cuota.entity.js';
import { Cuenta } from '../cuenta/cuenta.entity.js';
import { Transaccion } from '../transaccion/transaccion.entity.js';
import { ocurrenciasEnRango } from '../recurrente/recurrente.util.js';

const fechaValida = (f: unknown): f is string => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f);

export const calendarioRouter = Router();
calendarioRouter.use(authMiddleware);

// GET /api/calendario?mes=YYYY-MM -> eventos previstos del mes (recurrentes + vencimientos de cuotas)
calendarioRouter.get('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const mes = String(req.query.mes ?? hoy().slice(0, 7));
  if (!mesValido(mes)) return res.status(400).json({ message: 'mes debe ser YYYY-MM' });
  const { desde, hasta } = rangoMes(mes);

  const eventos = await eventosPrevistos(em, req.userId as number, desde, hasta);
  const pend = (t: 'INGRESO' | 'GASTO') => Number(eventos.filter((e) => e.tipo === t && !e.confirmado).reduce((s, e) => s + e.monto, 0).toFixed(2));
  const suma = (t: 'INGRESO' | 'GASTO') => Number(eventos.filter((e) => e.tipo === t).reduce((s, e) => s + e.monto, 0).toFixed(2));
  const ingresos = suma('INGRESO');
  const gastos = suma('GASTO');
  res.json({ mes, eventos, total_ingresos: ingresos, total_gastos: gastos, balance_previsto: Number((ingresos - gastos).toFixed(2)),
    pendiente_ingresos: pend('INGRESO'), pendiente_gastos: pend('GASTO') });
});

// POST /api/calendario/confirmar
// Convierte un pago/cobro previsto en un movimiento real.
// Body: { origen: 'RECURRENTE', id, fecha }  o  { origen: 'CUOTA', id, nro_cuota }
//       + opcionales: cuentaId, monto, fecha_real (YYYY-MM-DD)
calendarioRouter.post('/confirmar', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const usuarioId = req.userId as number;
  const { origen, id, fecha, nro_cuota, cuentaId, monto, fecha_real } = req.body ?? {};

  let tipo: 'INGRESO' | 'GASTO';
  let prevista: string;
  let montoPrevisto: number;
  let nota: string;
  let cuentaOrigen: Cuenta | undefined;
  let categoriaOrigen: Transaccion['categoria'];
  const datos: Partial<Pick<Transaccion, 'recurrente' | 'compra_cuotas' | 'nro_cuota'>> = {};

  if (origen === 'RECURRENTE') {
    if (!fechaValida(fecha)) return res.status(400).json({ message: 'fecha debe ser YYYY-MM-DD' });
    const r = await em.findOne(Recurrente, { id: Number(id), usuario: usuarioId, activo: true }, { populate: ['cuenta', 'categoria'] });
    if (!r) return res.status(404).json({ message: 'Recurrente no encontrado' });
    if (ocurrenciasEnRango(r, fecha, fecha).length === 0) return res.status(400).json({ message: 'Esa fecha no corresponde a una ocurrencia' });
    if (await em.findOne(Transaccion, { recurrente: r.id, fecha_prevista: fecha })) return res.status(409).json({ message: 'Ya fue confirmado' });
    tipo = r.tipo; prevista = fecha; montoPrevisto = Number(r.monto); nota = r.descripcion;
    cuentaOrigen = r.cuenta ?? undefined; categoriaOrigen = r.categoria ?? undefined; datos.recurrente = r;
  } else if (origen === 'CUOTA') {
    const c = await em.findOne(CompraCuotas, { id: Number(id), usuario: usuarioId }, { populate: ['cuenta', 'categoria'] });
    if (!c) return res.status(404).json({ message: 'Compra no encontrada' });
    const k = Number(nro_cuota);
    if (!Number.isInteger(k) || k < 1 || k > c.cantidad_cuotas) return res.status(400).json({ message: 'nro_cuota inválido' });
    if (await em.findOne(Transaccion, { compra_cuotas: c.id, nro_cuota: k })) return res.status(409).json({ message: 'Ya fue confirmada' });
    tipo = 'GASTO'; prevista = vencimiento(c, k); montoPrevisto = montoCuota(c, k); nota = `${c.descripcion} (cuota ${k}/${c.cantidad_cuotas})`;
    cuentaOrigen = c.cuenta ?? undefined; categoriaOrigen = c.categoria ?? undefined; datos.compra_cuotas = c; datos.nro_cuota = k;
  } else {
    return res.status(400).json({ message: "origen debe ser 'RECURRENTE' o 'CUOTA'" });
  }

  const montoFinal = monto === undefined || monto === null || monto === '' ? montoPrevisto : Number(monto);
  if (!Number.isFinite(montoFinal) || montoFinal <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
  if (fecha_real && !fechaValida(fecha_real)) return res.status(400).json({ message: 'fecha_real inválida' });

  let cuenta: Cuenta | null = null;
  if (cuentaId) {
    cuenta = await em.findOne(Cuenta, { id: Number(cuentaId), usuario: usuarioId });
    if (!cuenta) return res.status(404).json({ message: 'Cuenta no encontrada' });
  } else if (cuentaOrigen) {
    cuenta = await em.findOne(Cuenta, { id: cuentaOrigen.id, usuario: usuarioId });
  }
  if (!cuenta) return res.status(400).json({ message: 'Elegí una cuenta para registrar el movimiento' });

  try {
    const t = em.create(Transaccion, {
      usuario: usuarioId, cuenta, categoria: categoriaOrigen, tipo, monto: montoFinal.toFixed(2),
      fecha: fecha_real || hoy(), nota, fecha_prevista: prevista, ...datos,
    });
    await em.persist(t).flush();
    return res.status(201).json({ id: t.id });
  } catch (e: any) {
    if (e?.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya fue confirmado' });
    throw e;
  }
});
