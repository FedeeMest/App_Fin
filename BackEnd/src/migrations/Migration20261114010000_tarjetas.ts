import { Migration } from '@mikro-orm/migrations';

// Tarjetas de crédito: límite, día de cierre y día de vencimiento del resumen.
export class Migration20261114010000_tarjetas extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table `cuenta` add `limite_credito` numeric(14,2) null, add `dia_cierre` int null, add `dia_vencimiento` int null');
  }

  override async down(): Promise<void> {
    this.addSql('alter table `cuenta` drop column `limite_credito`, drop column `dia_cierre`, drop column `dia_vencimiento`');
  }
}
