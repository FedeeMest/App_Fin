import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RequestContext } from '@mikro-orm/core';
import { orm, syncSchema } from './shared/db/orm.js';
import { authRouter } from './auth/auth.routes.js';
import { cuentaRouter } from './cuenta/cuenta.routes.js';
import { categoriaRouter } from './categoria/categoria.routes.js';
import { transaccionRouter } from './transaccion/transaccion.routes.js';
import { cuotaRouter } from './cuota/cuota.routes.js';
import { recurrenteRouter } from './recurrente/recurrente.routes.js';
import { calendarioRouter } from './calendario/calendario.routes.js';
import { presupuestoRouter } from './presupuesto/presupuesto.routes.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:4200').split(',').map((s) => s.trim());
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('Origen no autorizado por CORS'))),
  credentials: true,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Demasiadas peticiones, intentá más tarde.' },
}));

app.use(express.json());
app.use((_req, _res, next) => RequestContext.create(orm.em, next));

app.use('/api/auth', authRouter);
app.use('/api/cuentas', cuentaRouter);
app.use('/api/categorias', categoriaRouter);
app.use('/api/transacciones', transaccionRouter);
app.use('/api/cuotas', cuotaRouter);
app.use('/api/recurrentes', recurrenteRouter);
app.use('/api/calendario', calendarioRouter);
app.use('/api/presupuestos', presupuestoRouter);

app.get('/', (_req, res) => res.send('App_Fin API funcionando'));
app.use((_req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

async function start() {
  await syncSchema();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Servidor en puerto ${port}`));
}
start().catch((e) => { console.error('Error al iniciar:', e); process.exit(1); });
