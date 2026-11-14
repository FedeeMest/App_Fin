import { Router, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { authMiddleware, AuthRequest } from '../shared/middleware/auth.middleware.js';
import { Cuenta } from './cuenta.entity.js';
import { Transaccion } from '../transaccion/transaccion.entity.js';

export const cuentaRouter = Router();
cuentaRouter.use(authMiddleware);

// Lista cuentas del usuario con saldo calculado
cuentaRouter.get('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const cuentas = await em.find(Cuenta, { usuario: req.userId, activa: true });
  const txs = await em.find(Transaccion, { usuario: req.userId });
  const out = cuentas.map((c) => {
    let saldo = Number(c.saldo_inicial);
    for (const t of txs) {
      const m = Number(t.monto);
      if (t.cuenta.id === c.id) saldo += t.tipo === 'INGRESO' ? m : -m; // GASTO y TRANSFERENCIA salen
      if (t.tipo === 'TRANSFERENCIA' && t.cuenta_destino?.id === c.id) saldo += m;
    }
    return { id: c.id, nombre: c.nombre, tipo: c.tipo, moneda: c.moneda, saldo: Number(saldo.toFixed(2)) };
  });
  res.json(out);
});

cuentaRouter.post('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const { nombre, tipo, moneda, saldo_inicial } = req.body ?? {};
  if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });
  const c = em.create(Cuenta, {
    usuario: req.userId as number, nombre, tipo: tipo ?? 'EFECTIVO',
    moneda: moneda ?? 'ARS', saldo_inicial: String(saldo_inicial ?? 0), activa: true,
  });
  await em.persist(c).flush();
  res.status(201).json({ id: c.id });
});
