import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { orm } from '../shared/db/orm.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { sembrarUsuario } from '../shared/db/seeds.js';

const firmar = (u: Usuario) =>
  jwt.sign({ id: u.id, username: u.username }, process.env.JWT_SECRET as string, { expiresIn: '12h' });

export async function register(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    const { username, email, password, nombre_completo } = req.body ?? {};
    if (!username || !email || !password || !nombre_completo)
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    if (String(password).length < 8)
      return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });

    const existe = await em.findOne(Usuario, { $or: [{ username }, { email }] });
    if (existe) return res.status(409).json({ message: 'Usuario o email ya registrado' });

    const usuario = em.create(Usuario, {
      username, email, nombre_completo,
      password: await bcrypt.hash(password, 10),
      moneda_base: 'ARS',
    });
    em.persist(usuario);
    await em.flush(); // necesitamos el id antes de sembrar
    sembrarUsuario(em, usuario);
    await em.flush();

    return res.status(201).json({ token: firmar(usuario), usuario: { nombre: usuario.nombre_completo } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
}

export async function login(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    const { username, password } = req.body ?? {};
    const usuario = await em.findOne(Usuario, { username });
    if (!usuario || !(await bcrypt.compare(String(password ?? ''), usuario.password))) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }
    return res.json({ token: firmar(usuario), usuario: { nombre: usuario.nombre_completo } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
}
