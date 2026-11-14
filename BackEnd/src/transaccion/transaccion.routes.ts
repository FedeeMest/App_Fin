import { Router, Response } from 'express';
import type { EntityManager } from '@mikro-orm/core';
import { orm } from '../shared/db/orm.js';
import { authMiddleware, AuthRequest } from '../shared/middleware/auth.middleware.js';
import { Transaccion } from './transaccion.entity.js';
import { Cuenta } from '../cuenta/cuenta.entity.js';
import { Categoria } from '../categoria/categoria.entity.js';
import { hoy } from '../cuota/cuota.util.js';
import { mesValido, rangoMes } from '../shared/fechas.js';

export const transaccionRouter = Router();
transaccionRouter.use(authMiddleware);

const TIPOS = ['INGRESO', 'GASTO', 'TRANSFERENCIA'];

// Filtros: ?desde=&hasta=&cuentaId=&categoriaId=&tipo=GASTO|INGRESO|TRANSFERENCIA&q=texto&page=&limit=
transaccionRouter.get('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const { desde, hasta, cuentaId, categoriaId, tipo, q } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);

  const where: any = { usuario: req.userId };
  if (desde && hasta) where.fecha = { $gte: String(desde), $lte: String(hasta) };
  if (cuentaId) where.cuenta = Number(cuentaId);
  if (categoriaId) where.categoria = Number(categoriaId);
  if (tipo && TIPOS.includes(String(tipo))) where.tipo = String(tipo);
  if (q && String(q).trim()) {
    // Busca en la nota y en el nombre de la categoría
    const texto = `%${String(q).trim()}%`;
    where.$or = [{ nota: { $like: texto } }, { categoria: { nombre: { $like: texto } } }];
  }

  const [items, total] = await em.findAndCount(Transaccion, where, {
    populate: ['cuenta', 'cuenta_destino', 'categoria'],
    orderBy: { fecha: 'desc', id: 'desc' },
    limit, offset: (page - 1) * limit,
  });
  res.json({ items, total, page, limit });
});

interface DatosValidados {
  tipo: 'INGRESO' | 'GASTO' | 'TRANSFERENCIA'; monto: string; fecha: string; nota?: string;
  cuenta: Cuenta; destino: Cuenta | null; categoria: Categoria | null;
}

/** Valida el cuerpo de un alta o edición. Todas las referencias deben pertenecer al usuario del token. */
async function validar(em: EntityManager, usuarioId: number, body: any): Promise<DatosValidados | { status: number; message: string }> {
  const { tipo, monto, fecha, cuentaId, cuentaDestinoId, categoriaId, nota } = body ?? {};
  if (!TIPOS.includes(tipo)) return { status: 400, message: 'tipo inválido' };
  const m = Number(monto);
  if (!Number.isFinite(m) || m <= 0) return { status: 400, message: 'El monto debe ser mayor a 0' };
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { status: 400, message: 'fecha debe ser YYYY-MM-DD' };

  const cuenta = await em.findOne(Cuenta, { id: cuentaId, usuario: usuarioId });
  if (!cuenta) return { status: 404, message: 'Cuenta no encontrada' };

  let destino: Cuenta | null = null;
  if (tipo === 'TRANSFERENCIA') {
    destino = await em.findOne(Cuenta, { id: cuentaDestinoId, usuario: usuarioId });
    if (!destino || destino.id === cuenta.id) return { status: 400, message: 'Cuenta destino inválida' };
  }

  let categoria: Categoria | null = null;
  if (categoriaId && tipo !== 'TRANSFERENCIA') {
    categoria = await em.findOne(Categoria, { id: categoriaId, usuario: usuarioId });
    if (!categoria) return { status: 404, message: 'Categoría no encontrada' };
    if (categoria.tipo !== tipo) return { status: 400, message: 'La categoría no corresponde al tipo de movimiento' };
  }
  return { tipo, monto: m.toFixed(2), fecha, nota: nota ? String(nota).slice(0, 200) : undefined, cuenta, destino, categoria };
}

transaccionRouter.post('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const d = await validar(em, req.userId as number, req.body);
  if ('status' in d) return res.status(d.status).json({ message: d.message });

  const t = em.create(Transaccion, {
    usuario: req.userId as number, cuenta: d.cuenta, cuenta_destino: d.destino ?? undefined,
    categoria: d.categoria ?? undefined, tipo: d.tipo, monto: d.monto, fecha: d.fecha, nota: d.nota,
  });
  await em.persist(t).flush();
  res.status(201).json({ id: t.id });
});

// Edición completa de un movimiento. Si confirma un pago previsto, no se puede cambiar su tipo.
transaccionRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const t = await em.findOne(Transaccion, { id: Number(req.params.id), usuario: req.userId });
  if (!t) return res.status(404).json({ message: 'Movimiento no encontrado' });

  const d = await validar(em, req.userId as number, req.body);
  if ('status' in d) return res.status(d.status).json({ message: d.message });
  if ((t.recurrente || t.compra_cuotas) && d.tipo !== t.tipo)
    return res.status(400).json({ message: 'Un pago confirmado no puede cambiar de tipo' });

  t.cuenta = d.cuenta; t.cuenta_destino = d.destino ?? undefined; t.categoria = d.categoria ?? undefined;
  t.tipo = d.tipo; t.monto = d.monto; t.fecha = d.fecha; t.nota = d.nota;
  await em.flush();
  res.json({ id: t.id });
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
  const mes = String(req.query.mes ?? hoy().slice(0, 7));
  if (!mesValido(mes)) return res.status(400).json({ message: 'mes debe ser YYYY-MM' });
  const { desde, hasta } = rangoMes(mes);
  const txs = await em.find(Transaccion, { usuario: req.userId, fecha: { $gte: desde, $lte: hasta } }, { populate: ['categoria'] });

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
