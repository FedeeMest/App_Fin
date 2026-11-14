import { Migration } from '@mikro-orm/migrations';

// Esquema inicial de App_Fin (MySQL). Generado a partir de las entidades.
export class Migration20261114000000_inicial extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table \`usuario\` (\`id\` int unsigned not null auto_increment primary key, \`fecha_creacion\` datetime not null, \`fecha_actualizacion\` datetime not null, \`username\` varchar(255) not null, \`email\` varchar(255) not null, \`password\` varchar(255) not null, \`nombre_completo\` varchar(255) not null, \`moneda_base\` varchar(3) not null default 'ARS') default character set utf8mb4 engine = InnoDB`);
    this.addSql(`alter table \`usuario\` add unique \`usuario_username_unique\`(\`username\`)`);
    this.addSql(`alter table \`usuario\` add unique \`usuario_email_unique\`(\`email\`)`);
    this.addSql(`create table \`cuenta\` (\`id\` int unsigned not null auto_increment primary key, \`fecha_creacion\` datetime not null, \`fecha_actualizacion\` datetime not null, \`usuario_id\` int unsigned not null, \`nombre\` varchar(255) not null, \`tipo\` enum('EFECTIVO', 'BANCO', 'BILLETERA', 'TARJETA') not null default 'EFECTIVO', \`moneda\` varchar(3) not null default 'ARS', \`saldo_inicial\` numeric(14,2) not null default 0, \`activa\` tinyint(1) not null default true) default character set utf8mb4 engine = InnoDB`);
    this.addSql(`alter table \`cuenta\` add index \`cuenta_usuario_id_index\`(\`usuario_id\`)`);
    this.addSql(`create table \`categoria\` (\`id\` int unsigned not null auto_increment primary key, \`fecha_creacion\` datetime not null, \`fecha_actualizacion\` datetime not null, \`usuario_id\` int unsigned not null, \`nombre\` varchar(255) not null, \`tipo\` enum('INGRESO', 'GASTO') not null, \`icono\` varchar(255) null, \`color\` varchar(255) null, \`padre_id\` int unsigned null, \`activa\` tinyint(1) not null default true) default character set utf8mb4 engine = InnoDB`);
    this.addSql(`alter table \`categoria\` add index \`categoria_usuario_id_index\`(\`usuario_id\`)`);
    this.addSql(`alter table \`categoria\` add index \`categoria_padre_id_index\`(\`padre_id\`)`);
    this.addSql(`create table \`recurrente\` (\`id\` int unsigned not null auto_increment primary key, \`fecha_creacion\` datetime not null, \`fecha_actualizacion\` datetime not null, \`usuario_id\` int unsigned not null, \`cuenta_id\` int unsigned null, \`categoria_id\` int unsigned null, \`descripcion\` varchar(255) not null, \`tipo\` enum('INGRESO', 'GASTO') not null, \`monto\` numeric(14,2) not null, \`frecuencia\` enum('SEMANAL', 'MENSUAL', 'ANUAL') not null default 'MENSUAL', \`fecha_inicio\` date not null, \`fecha_fin\` date null, \`activo\` tinyint(1) not null default true) default character set utf8mb4 engine = InnoDB`);
    this.addSql(`alter table \`recurrente\` add index \`recurrente_usuario_id_index\`(\`usuario_id\`)`);
    this.addSql(`alter table \`recurrente\` add index \`recurrente_cuenta_id_index\`(\`cuenta_id\`)`);
    this.addSql(`alter table \`recurrente\` add index \`recurrente_categoria_id_index\`(\`categoria_id\`)`);
    this.addSql(`create table \`presupuesto\` (\`id\` int unsigned not null auto_increment primary key, \`fecha_creacion\` datetime not null, \`fecha_actualizacion\` datetime not null, \`usuario_id\` int unsigned not null, \`categoria_id\` int unsigned null, \`monto_limite\` numeric(14,2) not null) default character set utf8mb4 engine = InnoDB`);
    this.addSql(`alter table \`presupuesto\` add index \`presupuesto_usuario_id_index\`(\`usuario_id\`)`);
    this.addSql(`alter table \`presupuesto\` add index \`presupuesto_categoria_id_index\`(\`categoria_id\`)`);
    this.addSql(`alter table \`presupuesto\` add unique \`presupuesto_usuario_id_categoria_id_unique\`(\`usuario_id\`, \`categoria_id\`)`);
    this.addSql(`create table \`compra_cuotas\` (\`id\` int unsigned not null auto_increment primary key, \`fecha_creacion\` datetime not null, \`fecha_actualizacion\` datetime not null, \`usuario_id\` int unsigned not null, \`cuenta_id\` int unsigned null, \`categoria_id\` int unsigned null, \`descripcion\` varchar(255) not null, \`monto_total\` numeric(14,2) not null, \`cantidad_cuotas\` int not null, \`fecha_primera_cuota\` date not null) default character set utf8mb4 engine = InnoDB`);
    this.addSql(`alter table \`compra_cuotas\` add index \`compra_cuotas_usuario_id_index\`(\`usuario_id\`)`);
    this.addSql(`alter table \`compra_cuotas\` add index \`compra_cuotas_cuenta_id_index\`(\`cuenta_id\`)`);
    this.addSql(`alter table \`compra_cuotas\` add index \`compra_cuotas_categoria_id_index\`(\`categoria_id\`)`);
    this.addSql(`create table \`transaccion\` (\`id\` int unsigned not null auto_increment primary key, \`fecha_creacion\` datetime not null, \`fecha_actualizacion\` datetime not null, \`usuario_id\` int unsigned not null, \`cuenta_id\` int unsigned not null, \`cuenta_destino_id\` int unsigned null, \`categoria_id\` int unsigned null, \`tipo\` enum('INGRESO', 'GASTO', 'TRANSFERENCIA') not null, \`monto\` numeric(14,2) not null, \`fecha\` date not null, \`nota\` text null, \`recurrente_id\` int unsigned null, \`compra_cuotas_id\` int unsigned null, \`fecha_prevista\` date null, \`nro_cuota\` int null) default character set utf8mb4 engine = InnoDB`);
    this.addSql(`alter table \`transaccion\` add index \`transaccion_usuario_id_index\`(\`usuario_id\`)`);
    this.addSql(`alter table \`transaccion\` add index \`transaccion_cuenta_id_index\`(\`cuenta_id\`)`);
    this.addSql(`alter table \`transaccion\` add index \`transaccion_cuenta_destino_id_index\`(\`cuenta_destino_id\`)`);
    this.addSql(`alter table \`transaccion\` add index \`transaccion_categoria_id_index\`(\`categoria_id\`)`);
    this.addSql(`alter table \`transaccion\` add index \`transaccion_fecha_index\`(\`fecha\`)`);
    this.addSql(`alter table \`transaccion\` add index \`transaccion_recurrente_id_index\`(\`recurrente_id\`)`);
    this.addSql(`alter table \`transaccion\` add index \`transaccion_compra_cuotas_id_index\`(\`compra_cuotas_id\`)`);
    this.addSql(`alter table \`transaccion\` add unique \`transaccion_compra_cuotas_id_nro_cuota_unique\`(\`compra_cuotas_id\`, \`nro_cuota\`)`);
    this.addSql(`alter table \`transaccion\` add unique \`transaccion_recurrente_id_fecha_prevista_unique\`(\`recurrente_id\`, \`fecha_prevista\`)`);
    this.addSql(`alter table \`cuenta\` add constraint \`cuenta_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\` (\`id\`) on update cascade`);
    this.addSql(`alter table \`categoria\` add constraint \`categoria_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\` (\`id\`) on update cascade`);
    this.addSql(`alter table \`categoria\` add constraint \`categoria_padre_id_foreign\` foreign key (\`padre_id\`) references \`categoria\` (\`id\`) on update cascade on delete set null`);
    this.addSql(`alter table \`recurrente\` add constraint \`recurrente_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\` (\`id\`) on update cascade`);
    this.addSql(`alter table \`recurrente\` add constraint \`recurrente_cuenta_id_foreign\` foreign key (\`cuenta_id\`) references \`cuenta\` (\`id\`) on update cascade on delete set null`);
    this.addSql(`alter table \`recurrente\` add constraint \`recurrente_categoria_id_foreign\` foreign key (\`categoria_id\`) references \`categoria\` (\`id\`) on update cascade on delete set null`);
    this.addSql(`alter table \`presupuesto\` add constraint \`presupuesto_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\` (\`id\`) on update cascade`);
    this.addSql(`alter table \`presupuesto\` add constraint \`presupuesto_categoria_id_foreign\` foreign key (\`categoria_id\`) references \`categoria\` (\`id\`) on update cascade on delete set null`);
    this.addSql(`alter table \`compra_cuotas\` add constraint \`compra_cuotas_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\` (\`id\`) on update cascade`);
    this.addSql(`alter table \`compra_cuotas\` add constraint \`compra_cuotas_cuenta_id_foreign\` foreign key (\`cuenta_id\`) references \`cuenta\` (\`id\`) on update cascade on delete set null`);
    this.addSql(`alter table \`compra_cuotas\` add constraint \`compra_cuotas_categoria_id_foreign\` foreign key (\`categoria_id\`) references \`categoria\` (\`id\`) on update cascade on delete set null`);
    this.addSql(`alter table \`transaccion\` add constraint \`transaccion_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\` (\`id\`) on update cascade`);
    this.addSql(`alter table \`transaccion\` add constraint \`transaccion_cuenta_id_foreign\` foreign key (\`cuenta_id\`) references \`cuenta\` (\`id\`) on update cascade`);
    this.addSql(`alter table \`transaccion\` add constraint \`transaccion_cuenta_destino_id_foreign\` foreign key (\`cuenta_destino_id\`) references \`cuenta\` (\`id\`) on update cascade on delete set null`);
    this.addSql(`alter table \`transaccion\` add constraint \`transaccion_categoria_id_foreign\` foreign key (\`categoria_id\`) references \`categoria\` (\`id\`) on update cascade on delete set null`);
    this.addSql(`alter table \`transaccion\` add constraint \`transaccion_recurrente_id_foreign\` foreign key (\`recurrente_id\`) references \`recurrente\` (\`id\`) on update cascade on delete set null`);
    this.addSql(`alter table \`transaccion\` add constraint \`transaccion_compra_cuotas_id_foreign\` foreign key (\`compra_cuotas_id\`) references \`compra_cuotas\` (\`id\`) on update cascade on delete set null`);
  }

  override async down(): Promise<void> {
    this.addSql('set foreign_key_checks = 0;');
    this.addSql(`drop table if exists \`transaccion\`;`);
    this.addSql(`drop table if exists \`compra_cuotas\`;`);
    this.addSql(`drop table if exists \`presupuesto\`;`);
    this.addSql(`drop table if exists \`recurrente\`;`);
    this.addSql(`drop table if exists \`categoria\`;`);
    this.addSql(`drop table if exists \`cuenta\`;`);
    this.addSql(`drop table if exists \`usuario\`;`);
    this.addSql('set foreign_key_checks = 1;');
  }
}
