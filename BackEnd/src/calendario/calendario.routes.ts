import { Router, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { authMiddleware, AuthRequest } from '../shared/middleware/auth.middleware.js';
import { hoy } from '../cuota/cuota.util.js';
import { mesValido, rangoMes } from '../shared/fechas.js';
import { eventosPrevistos } from './calendario.service.js';

export const calendarioRouter = Router();
calendarioRouter.use(authMiddleware);

// GET /api/calendario?mes=YYYY-MM -> eventos previstos del mes (recurrentes + vencimientos de cuotas)
calendarioRouter.get('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const mes = String(req.query.mes ?? hoy().slice(0, 7));
  if (!mesValido(mes)) return res.status(400).json({ message: 'mes debe ser YYYY-MM' });
  const { desde, hasta } = rangoMes(mes);

  const eventos = await eventosPrevistos(em, req.userId as number, desde, hasta);
  const suma = (t: 'INGRESO' | 'GASTO') => Number(eventos.filter((e) => e.tipo === t).reduce((s, e) => s + e.monto, 0).toFixed(2));
  const ingresos = suma('INGRESO');
  const gastos = suma('GASTO');
  res.json({ mes, eventos, total_ingresos: ingresos, total_gastos: gastos, balance_previsto: Number((ingresos - gastos).toFixed(2)) });
});
