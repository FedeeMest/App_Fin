import { OptionalProps, PrimaryKey, Property } from '@mikro-orm/core';

export abstract class BaseEntity {
  [OptionalProps]?: 'fecha_creacion' | 'fecha_actualizacion';

  @PrimaryKey()
  id!: number;

  @Property({ onCreate: () => new Date() })
  fecha_creacion: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  fecha_actualizacion: Date = new Date();
}
