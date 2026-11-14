import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/base.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { Cuenta } from '../cuenta/cuenta.entity.js';
import { Categoria } from '../categoria/categoria.entity.js';

export type TipoTransaccion = 'INGRESO' | 'GASTO' | 'TRANSFERENCIA';

@Entity()
export class Transaccion extends BaseEntity {
  @ManyToOne(() => Usuario)
  usuario!: Usuario;

  @ManyToOne(() => Cuenta)
  cuenta!: Cuenta;

  // Solo para TRANSFERENCIA
  @ManyToOne(() => Cuenta, { nullable: true })
  cuenta_destino?: Cuenta;

  @ManyToOne(() => Categoria, { nullable: true })
  categoria?: Categoria;

  @Enum({ items: ['INGRESO', 'GASTO', 'TRANSFERENCIA'] })
  tipo!: TipoTransaccion;

  // Siempre positivo; el signo lo da el tipo
  @Property({ type: 'decimal', precision: 14, scale: 2 })
  monto!: string;

  @Index()
  @Property({ type: 'date' })
  fecha!: string;

  @Property({ type: 'text', nullable: true })
  nota?: string;
}
