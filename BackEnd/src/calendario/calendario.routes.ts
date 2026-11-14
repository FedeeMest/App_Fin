import { Router, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { authMiddleware, AuthRequest } from '../shared/middleware/auth.middleware.js';
import { Recurrente } from '../recurrente/recurrente.entity.js';
import { CompraCuotas } from '../cuota/cuota.entity.js';
import { ocurrenciasEnRango } from '../recurrente/recurrente.util.js';
import { montoCuota, vencimiento, hoy } from '../cuota/cuota.util.js';

export const calendarioRouter = Router();
calendarioRouter.use(authMiddleware);

type Origen = 'RECURRENTE' | 'CUOTA';
interface Evento { fecha: string; tipo: 'INGRESO' | 'GASTO'; origen: Origen; descripcion: string; monto: number; detalle?: string }

// GET /api/calendario?mes=YYYY-MM -> eventos previstos del mes (recurrentes + vencimientos de cuotas)
calendarioRouter.get('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const mes = String(req.query.mes ?? hoy().slice(0, 7));
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return res.status(400).json({ message: 'mes debe ser YYYY-MM' });
  const [anio, nroMes] = mes.split('-').map(Number);
  const desde = `${mes}-01`;
  const hasta = `${mes}-${String(new Date(anio, nroMes, 0).getDate()).padStart(2, '0')}`;

  const eventos: Evento[] = [];

  const recurrentes = await em.find(Recurrente, { usuario: req.userId, activo: true });
  for (const r of recurrentes) {
    for (const f of ocurrenciasEnRango(r, desde, hasta)) {
      eventos.push({ fecha: f, tipo: r.tipo, origen: 'RECURRENTE', descripcion: r.descripcion, monto: Number(r.monto) });
    }
  }

  const compras = await em.find(CompraCuotas, { usuario: req.userId });
  for (const c of compras) {
    for (let k = 1; k <= c.cantidad_cuotas; k++) {
      const f = vencimiento(c, k);
      if (f >= desde && f <= hasta) {
        eventos.push({ fecha: f, tipo: 'GASTO', origen: 'CUOTA', descripcion: c.descripcion, monto: montoCuota(c, k), detalle: `Cuota ${k}/${c.cantidad_cuotas}` });
      }
    }
  }

  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.descripcion.localeCompare(b.descripcion));
  const suma = (t: 'INGRESO' | 'GASTO') => Number(eventos.filter((e) => e.tipo === t).reduce((s, e) => s + e.monto, 0).toFixed(2));
  const ingresos = suma('INGRESO');
  const gastos = suma('GASTO');
  res.json({ mes, eventos, total_ingresos: ingresos, total_gastos: gastos, balance_previsto: Number((ingresos - gastos).toFixed(2)) });
});
