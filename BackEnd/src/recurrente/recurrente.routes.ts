import { Router, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { authMiddleware, AuthRequest } from '../shared/middleware/auth.middleware.js';
import { Recurrente } from './recurrente.entity.js';
import { Cuenta } from '../cuenta/cuenta.entity.js';
import { Categoria } from '../categoria/categoria.entity.js';
import { proximaFecha } from './recurrente.util.js';
import { hoy } from '../cuota/cuota.util.js';

export const recurrenteRouter = Router();
recurrenteRouter.use(authMiddleware);

const fechaValida = (f: unknown) => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f);

const serializar = (r: Recurrente) => ({
  id: r.id, descripcion: r.descripcion, tipo: r.tipo, monto: Number(r.monto), frecuencia: r.frecuencia,
  fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin ?? null, activo: r.activo,
  cuenta: r.cuenta ? { id: r.cuenta.id, nombre: r.cuenta.nombre } : null,
  categoria: r.categoria ? { id: r.categoria.id, nombre: r.categoria.nombre } : null,
  proxima_fecha: proximaFecha(r, hoy()),
});

recurrenteRouter.get('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const lista = await em.find(Recurrente, { usuario: req.userId }, { populate: ['cuenta', 'categoria'], orderBy: { descripcion: 'asc' } });
  res.json(lista.map(serializar));
});

recurrenteRouter.post('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const { descripcion, tipo, monto, frecuencia, fecha_inicio, fecha_fin, cuentaId, categoriaId } = req.body ?? {};

  if (!descripcion || !String(descripcion).trim()) return res.status(400).json({ message: 'La descripción es obligatoria' });
  if (!['INGRESO', 'GASTO'].includes(tipo)) return res.status(400).json({ message: 'tipo inválido' });
  const m = Number(monto);
  if (!Number.isFinite(m) || m <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
  if (!['SEMANAL', 'MENSUAL', 'ANUAL'].includes(frecuencia)) return res.status(400).json({ message: 'frecuencia inválida' });
  if (!fechaValida(fecha_inicio)) return res.status(400).json({ message: 'fecha_inicio debe ser YYYY-MM-DD' });
  if (fecha_fin && (!fechaValida(fecha_fin) || fecha_fin < fecha_inicio))
    return res.status(400).json({ message: 'fecha_fin inválida' });

  let cuenta: Cuenta | null = null;
  if (cuentaId) {
    cuenta = await em.findOne(Cuenta, { id: cuentaId, usuario: req.userId });
    if (!cuenta) return res.status(404).json({ message: 'Cuenta no encontrada' });
  }
  let categoria: Categoria | null = null;
  if (categoriaId) {
    categoria = await em.findOne(Categoria, { id: categoriaId, usuario: req.userId });
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada' });
  }

  const r = em.create(Recurrente, {
    usuario: req.userId as number, descripcion: String(descripcion).trim(), tipo, monto: m.toFixed(2), frecuencia,
    fecha_inicio, fecha_fin: fecha_fin || undefined, cuenta: cuenta ?? undefined, categoria: categoria ?? undefined, activo: true,
  });
  await em.persist(r).flush();
  res.status(201).json({ id: r.id });
});

// Pausar / reanudar
recurrenteRouter.patch('/:id/activo', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const r = await em.findOne(Recurrente, { id: Number(req.params.id), usuario: req.userId });
  if (!r) return res.status(404).json({ message: 'No encontrado' });
  r.activo = Boolean(req.body?.activo);
  await em.flush();
  res.json({ id: r.id, activo: r.activo });
});

recurrenteRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const r = await em.findOne(Recurrente, { id: Number(req.params.id), usuario: req.userId });
  if (!r) return res.status(404).json({ message: 'No encontrado' });
  await em.remove(r).flush();
  res.status(204).send();
});
