import { Router, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { authMiddleware, AuthRequest } from '../shared/middleware/auth.middleware.js';
import { CompraCuotas } from './cuota.entity.js';
import { Cuenta } from '../cuenta/cuenta.entity.js';
import { Categoria } from '../categoria/categoria.entity.js';
import { estadoCompra, hoy, sumarMeses, totalDelMes, vencimiento, montoCuota } from './cuota.util.js';

export const cuotaRouter = Router();
cuotaRouter.use(authMiddleware);

const serializar = (c: CompraCuotas) => ({
  id: c.id,
  descripcion: c.descripcion,
  monto_total: Number(c.monto_total),
  cantidad_cuotas: c.cantidad_cuotas,
  fecha_primera_cuota: c.fecha_primera_cuota,
  cuenta: c.cuenta ? { id: c.cuenta.id, nombre: c.cuenta.nombre } : null,
  categoria: c.categoria ? { id: c.categoria.id, nombre: c.categoria.nombre } : null,
  ...estadoCompra(c),
});

// Lista de compras. ?estado=activas|finalizadas (por defecto todas)
cuotaRouter.get('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const compras = await em.find(CompraCuotas, { usuario: req.userId }, {
    populate: ['cuenta', 'categoria'], orderBy: { fecha_primera_cuota: 'desc', id: 'desc' },
  });
  let out = compras.map(serializar);
  if (req.query.estado === 'activas') out = out.filter((c) => !c.finalizada);
  if (req.query.estado === 'finalizadas') out = out.filter((c) => c.finalizada);
  res.json(out);
});

// Resumen: cuotas del mes, deuda total y proyección de los próximos N meses (?meses=12)
cuotaRouter.get('/resumen', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const compras = await em.find(CompraCuotas, { usuario: req.userId });
  const n = Math.min(36, Math.max(1, Number(req.query.meses) || 12));
  const mesActual = hoy().slice(0, 7);

  const proyeccion = Array.from({ length: n }, (_, i) => {
    const mes = sumarMeses(`${mesActual}-01`, i).slice(0, 7);
    return { mes, total: totalDelMes(compras, mes) };
  });
  const estados = compras.map((c) => estadoCompra(c));

  res.json({
    mes_actual: mesActual,
    total_mes_actual: proyeccion[0].total,
    deuda_total: Number(estados.reduce((s, e) => s + e.monto_restante, 0).toFixed(2)),
    compras_activas: estados.filter((e) => !e.finalizada).length,
    proyeccion,
  });
});

cuotaRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const c = await em.findOne(CompraCuotas, { id: Number(req.params.id), usuario: req.userId }, { populate: ['cuenta', 'categoria'] });
  if (!c) return res.status(404).json({ message: 'Compra no encontrada' });
  const ref = hoy();
  const cuotas = Array.from({ length: c.cantidad_cuotas }, (_, i) => ({
    numero: i + 1, vencimiento: vencimiento(c, i + 1), monto: montoCuota(c, i + 1), pagada: vencimiento(c, i + 1) <= ref,
  }));
  res.json({ ...serializar(c), cuotas });
});

cuotaRouter.post('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const { descripcion, monto_total, cantidad_cuotas, fecha_primera_cuota, cuentaId, categoriaId } = req.body ?? {};

  const total = Number(monto_total);
  const n = Number(cantidad_cuotas);
  if (!descripcion || !String(descripcion).trim()) return res.status(400).json({ message: 'La descripción es obligatoria' });
  if (!Number.isFinite(total) || total <= 0) return res.status(400).json({ message: 'El monto total debe ser mayor a 0' });
  if (!Number.isInteger(n) || n < 1 || n > 60) return res.status(400).json({ message: 'La cantidad de cuotas debe ser un entero entre 1 y 60' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha_primera_cuota ?? '')))
    return res.status(400).json({ message: 'fecha_primera_cuota debe ser YYYY-MM-DD' });

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

  const c = em.create(CompraCuotas, {
    usuario: req.userId as number, descripcion: String(descripcion).trim(), monto_total: total.toFixed(2),
    cantidad_cuotas: n, fecha_primera_cuota, cuenta: cuenta ?? undefined, categoria: categoria ?? undefined,
  });
  await em.persist(c).flush();
  res.status(201).json({ id: c.id });
});

cuotaRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const c = await em.findOne(CompraCuotas, { id: Number(req.params.id), usuario: req.userId });
  if (!c) return res.status(404).json({ message: 'Compra no encontrada' });
  await em.remove(c).flush();
  res.status(204).send();
});
