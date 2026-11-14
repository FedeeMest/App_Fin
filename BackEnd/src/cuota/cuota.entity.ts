import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/base.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { Cuenta } from '../cuenta/cuenta.entity.js';
import { Categoria } from '../categoria/categoria.entity.js';

// Compra financiada en cuotas fijas (ej: 12 cuotas con la tarjeta).
// No guarda "cuotas pagadas": se calcula según la fecha de cada cuota.
@Entity()
export class CompraCuotas extends BaseEntity {
  @ManyToOne(() => Usuario)
  usuario!: Usuario;

  @ManyToOne(() => Cuenta, { nullable: true })
  cuenta?: Cuenta; // normalmente una tarjeta

  @ManyToOne(() => Categoria, { nullable: true })
  categoria?: Categoria;

  @Property()
  descripcion!: string;

  // Importe total financiado (suma de todas las cuotas, con intereses si los hay)
  @Property({ type: 'decimal', precision: 14, scale: 2 })
  monto_total!: string;

  @Property()
  cantidad_cuotas!: number;

  // Vencimiento de la primera cuota (YYYY-MM-DD). Las siguientes vencen cada mes.
  @Property({ type: 'date' })
  fecha_primera_cuota!: string;
}
