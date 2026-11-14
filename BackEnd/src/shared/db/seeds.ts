import type { EntityManager } from '@mikro-orm/core';
import { Categoria, TipoCategoria } from '../../categoria/categoria.entity.js';
import { Cuenta } from '../../cuenta/cuenta.entity.js';
import { Usuario } from '../../usuario/usuario.entity.js';

const CATEGORIAS_BASE: [string, TipoCategoria][] = [
  ['Sueldo', 'INGRESO'], ['Otros ingresos', 'INGRESO'],
  ['Alquiler', 'GASTO'], ['Supermercado', 'GASTO'], ['Transporte', 'GASTO'],
  ['Servicios', 'GASTO'], ['Salud', 'GASTO'], ['Ocio', 'GASTO'], ['Suscripciones', 'GASTO'],
];

// Se ejecuta al registrar un usuario: crea su cuenta y categorías iniciales.
export function sembrarUsuario(em: EntityManager, usuario: Usuario) {
  const cuenta = em.create(Cuenta, { usuario, nombre: 'Efectivo', tipo: 'EFECTIVO', moneda: usuario.moneda_base, saldo_inicial: '0', activa: true });
  em.persist(cuenta);
  for (const [nombre, tipo] of CATEGORIAS_BASE) {
    em.persist(em.create(Categoria, { usuario, nombre, tipo, activa: true }));
  }
}
