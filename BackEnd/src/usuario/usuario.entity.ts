import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/base.entity.js';

@Entity()
export class Usuario extends BaseEntity {
  @Property({ unique: true })
  username!: string;

  @Property({ unique: true })
  email!: string;

  @Property({ hidden: true })
  password!: string;

  @Property()
  nombre_completo!: string;

  @Property({ length: 3, default: 'ARS' })
  moneda_base: string = 'ARS';
}
