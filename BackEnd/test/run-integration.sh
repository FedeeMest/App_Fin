#!/usr/bin/env bash
# Prueba de integración del backend sobre SQLite en memoria (no necesita MySQL).
# Compila a una carpeta temporal, reemplaza solo la conexión a la base y ejecuta test/flow.mjs contra la API real.
# Uso:  cd BackEnd && pnpm install && bash test/run-integration.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'kill $SERVER_PID 2>/dev/null || true; rm -rf "$TMP"' EXIT

(cd "$ROOT" && npx tsc --outDir "$TMP/dist" --noEmit false)
node -e "
const p=require('$ROOT/package.json');const d={...p.dependencies};delete d['@mikro-orm/mysql'];delete d.mysql2;
require('fs').writeFileSync('$TMP/package.json',JSON.stringify({name:'it',type:'module',private:true,dependencies:{...d,'@mikro-orm/libsql':'^6.6.2'}}));"
(cd "$TMP" && npm i --no-audit --no-fund --silent)

cat > "$TMP/dist/src/shared/db/orm.js" <<JS
import { MikroORM } from '@mikro-orm/libsql';
export const orm = await MikroORM.init({ entities: ['$TMP/dist/src/**/*.entity.js'], dbName: ':memory:' });
export const syncSchema = async () => { await orm.getSchemaGenerator().createSchema(); };
JS

cd "$TMP"
JWT_SECRET=test PORT=3999 node dist/src/app.js >"$TMP/server.log" 2>&1 &
SERVER_PID=$!
sleep 4
cd "$ROOT"
node "$ROOT/test/flow.mjs" | tee "$TMP/out.txt"
! grep -q '^FAIL' "$TMP/out.txt"
