import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/base.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { Categoria } from '../categoria/categoria.entity.js';

// Límite mensual de gasto. Sin categoría = presupuesto total del mes. Rige todos los meses hasta que se cambie o borre.
@Entity()
@Unique({ properties: ['usuario', 'categoria'] })
export class Presupuesto extends BaseEntity {
  @ManyToOne(() => Usuario)
  usuario!: Usuario;

  @ManyToOne(() => Categoria, { nullable: true })
  categoria?: Categoria;

  @Property({ type: 'decimal', precision: 14, scale: 2 })
  monto_limite!: string;
}
