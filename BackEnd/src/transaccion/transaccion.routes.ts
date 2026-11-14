import { Router, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { authMiddleware, AuthRequest } from '../shared/middleware/auth.middleware.js';
import { Transaccion } from './transaccion.entity.js';
import { Cuenta } from '../cuenta/cuenta.entity.js';
import { Categoria } from '../categoria/categoria.entity.js';

export const transaccionRouter = Router();
transaccionRouter.use(authMiddleware);

// Filtros: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&cuentaId=&categoriaId=&page=&limit=
transaccionRouter.get('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const { desde, hasta, cuentaId, categoriaId } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);

  const where: any = { usuario: req.userId };
  if (desde && hasta) where.fecha = { $gte: String(desde), $lte: String(hasta) };
  if (cuentaId) where.cuenta = Number(cuentaId);
  if (categoriaId) where.categoria = Number(categoriaId);

  const [items, total] = await em.findAndCount(Transaccion, where, {
    populate: ['cuenta', 'categoria'],
    orderBy: { fecha: 'desc', id: 'desc' },
    limit, offset: (page - 1) * limit,
  });
  res.json({ items, total, page, limit });
});

transaccionRouter.post('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const { tipo, monto, fecha, cuentaId, cuentaDestinoId, categoriaId, nota } = req.body ?? {};

  if (!['INGRESO', 'GASTO', 'TRANSFERENCIA'].includes(tipo))
    return res.status(400).json({ message: 'tipo inválido' });
  const m = Number(monto);
  if (!Number.isFinite(m) || m <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ message: 'fecha debe ser YYYY-MM-DD' });

  // Todas las referencias deben pertenecer al usuario del token
  const cuenta = await em.findOne(Cuenta, { id: cuentaId, usuario: req.userId });
  if (!cuenta) return res.status(404).json({ message: 'Cuenta no encontrada' });

  let destino: Cuenta | null = null;
  if (tipo === 'TRANSFERENCIA') {
    destino = await em.findOne(Cuenta, { id: cuentaDestinoId, usuario: req.userId });
    if (!destino || destino.id === cuenta.id)
      return res.status(400).json({ message: 'Cuenta destino inválida' });
  }

  let categoria: Categoria | null = null;
  if (categoriaId) {
    categoria = await em.findOne(Categoria, { id: categoriaId, usuario: req.userId });
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada' });
  }

  const t = em.create(Transaccion, {
    usuario: req.userId as number, cuenta, cuenta_destino: destino ?? undefined,
    categoria: categoria ?? undefined, tipo, monto: m.toFixed(2), fecha, nota,
  });
  await em.persist(t).flush();
  res.status(201).json({ id: t.id });
});

transaccionRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const t = await em.findOne(Transaccion, { id: Number(req.params.id), usuario: req.userId });
  if (!t) return res.status(404).json({ message: 'Transacción no encontrada' });
  await em.remove(t).flush();
  res.status(204).send();
});

// Resumen mensual: ?mes=YYYY-MM
transaccionRouter.get('/resumen', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const mes = String(req.query.mes ?? new Date().toISOString().slice(0, 7));
  if (!/^\d{4}-\d{2}$/.test(mes)) return res.status(400).json({ message: 'mes debe ser YYYY-MM' });
  const txs = await em.find(Transaccion, {
    usuario: req.userId, fecha: { $gte: `${mes}-01`, $lte: `${mes}-31` },
  }, { populate: ['categoria'] });

  let ingresos = 0, gastos = 0;
  const porCategoria: Record<string, number> = {};
  for (const t of txs) {
    const m = Number(t.monto);
    if (t.tipo === 'INGRESO') ingresos += m;
    if (t.tipo === 'GASTO') {
      gastos += m;
      const k = t.categoria?.nombre ?? 'Sin categoría';
      porCategoria[k] = (porCategoria[k] ?? 0) + m;
    }
  }
  res.json({ mes, ingresos, gastos, balance: ingresos - gastos, porCategoria });
});
