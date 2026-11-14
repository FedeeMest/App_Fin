import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/base.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';

export type TipoCuenta = 'EFECTIVO' | 'BANCO' | 'BILLETERA' | 'TARJETA';

@Entity()
export class Cuenta extends BaseEntity {
  @ManyToOne(() => Usuario)
  usuario!: Usuario;

  @Property()
  nombre!: string;

  @Enum({ items: ['EFECTIVO', 'BANCO', 'BILLETERA', 'TARJETA'] })
  tipo: TipoCuenta = 'EFECTIVO';

  @Property({ length: 3, default: 'ARS' })
  moneda: string = 'ARS';

  @Property({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  saldo_inicial: string = '0';

  @Property({ default: true })
  activa: boolean = true;
}
