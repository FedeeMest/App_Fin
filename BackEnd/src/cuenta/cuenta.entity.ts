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

  // --- Solo para TARJETA ---
  // Límite de compra de la tarjeta
  @Property({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  limite_credito?: string;

  // Día del mes en que cierra el resumen y día en que vence (1-31)
  @Property({ nullable: true })
  dia_cierre?: number;

  @Property({ nullable: true })
  dia_vencimiento?: number;
}
