import { Entity, Enum, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/base.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { Cuenta } from '../cuenta/cuenta.entity.js';
import { Categoria } from '../categoria/categoria.entity.js';
import { Recurrente } from '../recurrente/recurrente.entity.js';
import { CompraCuotas } from '../cuota/cuota.entity.js';

export type TipoTransaccion = 'INGRESO' | 'GASTO' | 'TRANSFERENCIA';

// Un pago previsto (fijo o cuota) solo puede confirmarse una vez: lo garantizan los índices únicos.
@Entity()
@Unique({ properties: ['recurrente', 'fecha_prevista'] })
@Unique({ properties: ['compra_cuotas', 'nro_cuota'] })
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

  // --- Origen, si el movimiento confirma un pago previsto ---
  @ManyToOne(() => Recurrente, { nullable: true, deleteRule: 'set null' })
  recurrente?: Recurrente;

  @ManyToOne(() => CompraCuotas, { nullable: true, deleteRule: 'set null' })
  compra_cuotas?: CompraCuotas;

  // Fecha en que estaba previsto (puede diferir de `fecha`, que es cuando realmente ocurrió)
  @Property({ type: 'date', nullable: true })
  fecha_prevista?: string;

  @Property({ nullable: true })
  nro_cuota?: number;
}
