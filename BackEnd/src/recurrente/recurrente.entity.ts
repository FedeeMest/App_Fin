import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/base.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { Cuenta } from '../cuenta/cuenta.entity.js';
import { Categoria } from '../categoria/categoria.entity.js';

export type Frecuencia = 'SEMANAL' | 'MENSUAL' | 'ANUAL';

// Ingreso o gasto que se repite (sueldo, alquiler, suscripciones). Las ocurrencias se calculan, no se guardan.
@Entity()
export class Recurrente extends BaseEntity {
  @ManyToOne(() => Usuario)
  usuario!: Usuario;

  @ManyToOne(() => Cuenta, { nullable: true })
  cuenta?: Cuenta;

  @ManyToOne(() => Categoria, { nullable: true })
  categoria?: Categoria;

  @Property()
  descripcion!: string;

  @Enum({ items: ['INGRESO', 'GASTO'] })
  tipo!: 'INGRESO' | 'GASTO';

  @Property({ type: 'decimal', precision: 14, scale: 2 })
  monto!: string;

  @Enum({ items: ['SEMANAL', 'MENSUAL', 'ANUAL'] })
  frecuencia: Frecuencia = 'MENSUAL';

  // Primera ocurrencia (YYYY-MM-DD). El día del mes se conserva en las siguientes.
  @Property({ type: 'date' })
  fecha_inicio!: string;

  @Property({ type: 'date', nullable: true })
  fecha_fin?: string;

  @Property({ default: true })
  activo: boolean = true;
}
