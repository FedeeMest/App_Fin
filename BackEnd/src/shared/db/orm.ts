import { MikroORM } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import { Migrator } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

for (const v of ['DB_NAME', 'DB_USER', 'DB_HOST', 'DB_PORT', 'JWT_SECRET']) {
  if (!process.env[v]) {
    console.error(`FATAL: falta la variable de entorno ${v}`);
    process.exit(1);
  }
}

export const orm = await MikroORM.init({
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  driver: MySqlDriver,
  dbName: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? '',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  highlighter: new SqlHighlighter(),
  extensions: [Migrator],
  migrations: {
    tableName: 'mikro_orm_migrations',
    path: 'dist/src/migrations',      // migraciones compiladas (lo que corre el servidor)
    pathTs: 'src/migrations',         // código fuente
    glob: '!(*.d).{js,ts}',
    snapshot: false,                  // las nuevas migraciones se calculan contra la base real
    transactional: true,
    emit: 'ts',
  },
  debug: !isProduction,
  driverOptions: isProduction ? { connection: { ssl: { rejectUnauthorized: false } } } : undefined,
});

/** Aplica las migraciones pendientes. Se ejecuta al iniciar el servidor. */
export const migrar = async () => {
  const aplicadas = await orm.migrator.up();
  if (aplicadas.length) console.log(`Migraciones aplicadas: ${aplicadas.map((m) => m.name).join(', ')}`);
};
