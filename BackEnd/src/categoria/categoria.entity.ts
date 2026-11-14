import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/base.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';

export type TipoCategoria = 'INGRESO' | 'GASTO';

@Entity()
export class Categoria extends BaseEntity {
  @ManyToOne(() => Usuario)
  usuario!: Usuario;

  @Property()
  nombre!: string;

  @Enum({ items: ['INGRESO', 'GASTO'] })
  tipo!: TipoCategoria;

  @Property({ nullable: true })
  icono?: string;

  @Property({ nullable: true })
  color?: string;

  @ManyToOne(() => Categoria, { nullable: true })
  padre?: Categoria;

  @Property({ default: true })
  activa: boolean = true;
}
