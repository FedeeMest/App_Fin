import { Router, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { authMiddleware, AuthRequest } from '../shared/middleware/auth.middleware.js';
import { Categoria } from './categoria.entity.js';

export const categoriaRouter = Router();
categoriaRouter.use(authMiddleware);

categoriaRouter.get('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  res.json(await em.find(Categoria, { usuario: req.userId, activa: true }, { orderBy: { nombre: 'asc' } }));
});

categoriaRouter.post('/', async (req: AuthRequest, res: Response) => {
  const em = orm.em.fork();
  const { nombre, tipo, icono, color } = req.body ?? {};
  if (!nombre || !['INGRESO', 'GASTO'].includes(tipo))
    return res.status(400).json({ message: 'nombre y tipo (INGRESO|GASTO) son obligatorios' });
  const c = em.create(Categoria, { usuario: req.userId as number, nombre, tipo, icono, color, activa: true });
  await em.persist(c).flush();
  res.status(201).json({ id: c.id });
});
