// Genera una migración con los cambios entre las entidades y la base actual.
// Uso (con la base de desarrollo al día): pnpm build && pnpm migration:create nombre_corto
import { orm } from './orm.js';

const nombre = process.argv[2];
const r = await orm.migrator.createMigration('src/migrations', false, false, nombre);
if (!r.diff.up.length) console.log('Sin cambios: la base ya coincide con las entidades.');
else console.log(`Migración creada: ${r.fileName}`);
await orm.close();
