import { Router, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { authMiddleware, AuthRequest } from '../shared/middleware/auth.middleware.js';
import { Presupuesto } from './presupuesto.entity.js';
import { Categoria } from '../categoria/categoria.entity.js';
import { Transaccion } from '../transaccion/transaccion.entity.js';
import { eventosPrevistos } from '../calendario/calendario.service.js';
import { hoy } from '../cuota/cuota.util.js';
import { mesValido, rangoMes } from '../shared/fechas.js';
import { estadoPresupuesto, presupuestoDiario } from './presupuesto.util.js';

export const presupuestoRouter = Router();
presupuestoRouter.use(authMiddleware);

// GET /api/presupuestos?mes=YYYY-MM
// Para cada presupuesto: gastado (movimientos reales) + previsto pendiente (fijos y cuotas que aún no vencieron).
presupuestoRouter.get('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const usuarioId = req.userId as number;
  const mes = String(req.query.mes ?? hoy().slice(0, 7));
  if (!mesValido(mes)) return res.status(400).json({ message: 'mes debe ser YYYY-MM' });
  const { desde, hasta } = rangoMes(mes);
  const hoyStr = hoy();

  const [presupuestos, gastos, eventos] = await Promise.all([
    em.find(Presupuesto, { usuario: usuarioId }, { populate: ['categoria'] }),
    em.find(Transaccion, { usuario: usuarioId, tipo: 'GASTO', fecha: { $gte: desde, $lte: hasta } }),
    eventosPrevistos(em, usuarioId, desde, hasta),
  ]);
  // Previsto = pagos aún sin confirmar del mes (aunque su fecha ya pasó: falta registrarlos). En meses pasados no se proyecta nada.
  const pendientes = mes < hoyStr.slice(0, 7) ? [] : eventos.filter((e) => e.tipo === 'GASTO' && !e.confirmado);

  const items = presupuestos.map((p) => {
    const catId = p.categoria?.id ?? null;
    const gastado = gastos.filter((t) => catId === null || t.categoria?.id === catId).reduce((s, t) => s + Number(t.monto), 0);
    const previsto = pendientes.filter((e) => catId === null || e.categoriaId === catId).reduce((s, e) => s + e.monto, 0);
    const limite = Number(p.monto_limite);
    return {
      id: p.id, categoria: p.categoria ? { id: p.categoria.id, nombre: p.categoria.nombre } : null,
      monto_limite: limite, ...estadoPresupuesto(limite, gastado, previsto),
    };
  }).sort((a, b) => (a.categoria === null ? -1 : b.categoria === null ? 1 : b.porcentaje - a.porcentaje));

  // Presupuesto diario: solo para el mes en curso y si hay presupuesto total
  let diario = null;
  const total = items.find((i) => i.categoria === null);
  if (total && mes === hoyStr.slice(0, 7)) {
    diario = { ...presupuestoDiario(total.restante, hoyStr, hasta), restante_mes: total.restante };
  }

  res.json({ mes, items, diario });
});

// Crea o actualiza el presupuesto de una categoría (categoriaId null/ausente = total del mes)
presupuestoRouter.post('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const usuarioId = req.userId as number;
  const { categoriaId, monto_limite } = req.body ?? {};
  const limite = Number(monto_limite);
  if (!Number.isFinite(limite) || limite <= 0) return res.status(400).json({ message: 'El límite debe ser mayor a 0' });

  let categoria: Categoria | null = null;
  if (categoriaId) {
    categoria = await em.findOne(Categoria, { id: categoriaId, usuario: usuarioId });
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada' });
    if (categoria.tipo !== 'GASTO') return res.status(400).json({ message: 'Solo se puede presupuestar categorías de gasto' });
  }

  let p = await em.findOne(Presupuesto, { usuario: usuarioId, categoria: categoria ? categoria.id : null });
  const nuevo = !p;
  if (p) p.monto_limite = limite.toFixed(2);
  else p = em.create(Presupuesto, { usuario: usuarioId, categoria: categoria ?? undefined, monto_limite: limite.toFixed(2) });
  await em.persist(p).flush();
  res.status(nuevo ? 201 : 200).json({ id: p.id });
});

presupuestoRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const p = await em.findOne(Presupuesto, { id: Number(req.params.id), usuario: req.userId });
  if (!p) return res.status(404).json({ message: 'Presupuesto no encontrado' });
  await em.remove(p).flush();
  res.status(204).send();
});
