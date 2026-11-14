import { MikroORM } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
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
  debug: !isProduction,
  driverOptions: isProduction ? { connection: { ssl: { rejectUnauthorized: false } } } : undefined,
});

// TODO: reemplazar por migraciones de MikroORM antes de usar datos reales.
export const syncSchema = async () => {
  await orm.getSchemaGenerator().updateSchema({ safe: true });
};
