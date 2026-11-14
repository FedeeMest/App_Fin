import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, register } from './auth.controller.js';

export const authRouter = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
});

authRouter.post('/login', limiter, login);
authRouter.post('/register', limiter, register);
