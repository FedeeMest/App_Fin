const B = (process.env.API_URL ?? 'http://localhost:3999') + '/api';
let tok = '';
const call = async (m, p, body) => {
  const r = await fetch(B + p, { method: m, headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { s: r.status, j };
};
const ok = (c, msg, extra) => console.log((c ? 'PASS' : 'FAIL') + ' - ' + msg + (c ? '' : ' -> ' + JSON.stringify(extra)));

// Auth
let r = await call('POST', '/auth/register', { username: 'fede', email: 'f@x.com', password: 'corta' });
ok(r.s === 400, 'registro rechaza datos incompletos', r);
r = await call('POST', '/auth/register', { username: 'fede', email: 'f@x.com', password: 'password123', nombre_completo: 'Fede' });
ok(r.s === 201 && r.j.token, 'registro ok', r); tok = r.j.token;
r = await call('POST', '/auth/register', { username: 'fede', email: 'o@x.com', password: 'password123', nombre_completo: 'Dup' });
ok(r.s === 409, 'usuario duplicado -> 409', r);
r = await call('POST', '/auth/login', { username: 'fede', password: 'mala' }); ok(r.s === 401, 'login incorrecto -> 401', r);
r = await call('POST', '/auth/login', { username: 'fede', password: 'password123' }); ok(r.s === 200, 'login ok', r);
const tokFede = tok;
const sinToken = await (await fetch(B + '/cuentas')).status; ok(sinToken === 401, 'sin token -> 401', sinToken);

// Semillas
const cuentas = (await call('GET', '/cuentas')).j; ok(cuentas.length === 1 && cuentas[0].nombre === 'Efectivo', 'semilla: cuenta Efectivo', cuentas);
const cats = (await call('GET', '/categorias')).j; ok(cats.length === 9, 'semilla: 9 categorías', cats.length);
const catSuper = cats.find((c) => c.nombre === 'Supermercado'), catSueldo = cats.find((c) => c.nombre === 'Sueldo'), catAlq = cats.find((c) => c.nombre === 'Alquiler');
const efectivo = cuentas[0].id;
r = await call('POST', '/cuentas', { nombre: 'Visa', tipo: 'TARJETA', saldo_inicial: 0 }); const visa = r.j.id;
r = await call('POST', '/cuentas', { nombre: 'Banco', tipo: 'BANCO', saldo_inicial: 50000 }); const banco = r.j.id; ok(r.s === 201, 'crear cuenta', r);

// Transacciones
const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
const mes = hoy.slice(0, 7);
r = await call('POST', '/transacciones', { tipo: 'INGRESO', monto: 100000, fecha: hoy, cuentaId: banco, categoriaId: catSueldo.id }); ok(r.s === 201, 'ingreso', r);
r = await call('POST', '/transacciones', { tipo: 'GASTO', monto: 20000, fecha: hoy, cuentaId: banco, categoriaId: catSuper.id, nota: 'compra' }); ok(r.s === 201, 'gasto', r);
r = await call('POST', '/transacciones', { tipo: 'TRANSFERENCIA', monto: 10000, fecha: hoy, cuentaId: banco, cuentaDestinoId: efectivo }); ok(r.s === 201, 'transferencia', r);
r = await call('POST', '/transacciones', { tipo: 'TRANSFERENCIA', monto: 10, fecha: hoy, cuentaId: banco, cuentaDestinoId: banco }); ok(r.s === 400, 'transferencia a misma cuenta -> 400', r);
r = await call('POST', '/transacciones', { tipo: 'GASTO', monto: -5, fecha: hoy, cuentaId: banco }); ok(r.s === 400, 'monto negativo -> 400', r);
r = await call('GET', '/cuentas'); const sb = Object.fromEntries(r.j.map((c) => [c.nombre, c.saldo]));
ok(sb.Banco === 120000 && sb.Efectivo === 10000, 'saldos: Banco 50000+100000-20000-10000=120000, Efectivo 10000', sb);
r = await call('GET', '/transacciones?limit=2'); ok(r.j.total === 3 && r.j.items.length === 2, 'paginación', r.j.total);
r = await call('GET', `/transacciones/resumen?mes=${mes}`); ok(r.j.ingresos === 100000 && r.j.gastos === 20000 && r.j.porCategoria.Supermercado === 20000, 'resumen mensual', r.j);

// Aislamiento entre usuarios
tok = ''; r = await call('POST', '/auth/register', { username: 'otro', email: 'o@x.com', password: 'password123', nombre_completo: 'Otro' }); tok = r.j.token;
r = await call('GET', '/transacciones'); ok(r.j.total === 0, 'otro usuario no ve movimientos ajenos', r.j.total);
r = await call('POST', '/transacciones', { tipo: 'GASTO', monto: 5, fecha: hoy, cuentaId: banco }); ok(r.s === 404, 'no puede usar cuenta ajena', r);
tok = tokFede;

// Cuotas: 3 cuotas de 90000, primera hoy
r = await call('POST', '/cuotas', { descripcion: 'Heladera', monto_total: 90000, cantidad_cuotas: 3, fecha_primera_cuota: hoy, cuentaId: visa, categoriaId: catSuper.id }); ok(r.s === 201, 'crear compra en cuotas', r); const compra = r.j.id;
r = await call('POST', '/cuotas', { descripcion: 'x', monto_total: 10, cantidad_cuotas: 0, fecha_primera_cuota: hoy }); ok(r.s === 400, 'cuotas=0 -> 400', r);
r = await call('GET', '/cuotas'); const c1 = r.j[0]; ok(c1.cuotas_pagadas === 1 && c1.cuotas_restantes === 2 && c1.monto_restante === 60000, 'estado cuotas', c1);
r = await call('GET', '/cuotas/resumen?meses=3'); ok(r.j.total_mes_actual === 30000 && r.j.deuda_total === 60000 && r.j.proyeccion.length === 3, 'resumen cuotas', r.j);
r = await call('GET', `/cuotas/${compra}`); ok(r.j.cuotas.length === 3 && r.j.cuotas[0].pagada === true, 'detalle cuotas', r.j.cuotas);

// Recurrentes: alquiler mensual desde el día 1 del mes; sueldo semanal
r = await call('POST', '/recurrentes', { descripcion: 'Alquiler', tipo: 'GASTO', monto: 40000, frecuencia: 'MENSUAL', fecha_inicio: `${mes}-01`, cuentaId: banco, categoriaId: catAlq.id }); ok(r.s === 201, 'crear recurrente', r); const alq = r.j.id;
r = await call('POST', '/recurrentes', { descripcion: 'Netflix', tipo: 'GASTO', monto: 5000, frecuencia: 'MENSUAL', fecha_inicio: `${mes}-28`, fecha_fin: '2020-01-01' }); ok(r.s === 400, 'fecha_fin anterior -> 400', r);
r = await call('GET', '/recurrentes'); ok(r.j.length === 1 && r.j[0].proxima_fecha, 'listar recurrentes', r.j);

// Calendario
r = await call('GET', `/calendario?mes=${mes}`);
const evAlq = r.j.eventos.find((e) => e.origen === 'RECURRENTE'), evCuota = r.j.eventos.find((e) => e.origen === 'CUOTA');
ok(r.j.eventos.length === 2 && !evAlq.confirmado && r.j.total_gastos === 70000 && r.j.pendiente_gastos === 70000, 'calendario: 2 eventos, 70000 pendiente', r.j);

// Presupuestos antes de confirmar
r = await call('POST', '/presupuestos', { monto_limite: 200000 }); ok(r.s === 201, 'presupuesto total', r);
r = await call('POST', '/presupuestos', { categoriaId: catSuper.id, monto_limite: 60000 }); ok(r.s === 201, 'presupuesto categoría', r);
r = await call('POST', '/presupuestos', { categoriaId: catSuper.id, monto_limite: 80000 }); ok(r.s === 200, 'actualiza (upsert)', r);
r = await call('POST', '/presupuestos', { categoriaId: catSueldo.id, monto_limite: 1000 }); ok(r.s === 400, 'no permite categoría de ingreso', r);
r = await call('GET', `/presupuestos?mes=${mes}`);
let tot = r.j.items.find((i) => !i.categoria), sup = r.j.items.find((i) => i.categoria?.nombre === 'Supermercado');
ok(tot.gastado === 20000 && tot.previsto === 70000 && tot.restante === 110000, 'presupuesto total antes de confirmar', tot);
ok(sup.gastado === 20000 && sup.previsto === 30000 && sup.restante === 30000 && sup.estado === 'OK', 'presupuesto Supermercado', sup);
ok(r.j.diario && r.j.diario.por_dia > 0, 'presupuesto diario', r.j.diario);

// Confirmar pagos
r = await call('POST', '/calendario/confirmar', { origen: 'RECURRENTE', id: alq, fecha: `${mes}-01` }); ok(r.s === 201, 'confirmar alquiler (cuenta del origen)', r);
r = await call('POST', '/calendario/confirmar', { origen: 'RECURRENTE', id: alq, fecha: `${mes}-01` }); ok(r.s === 409, 'confirmar dos veces -> 409', r);
r = await call('POST', '/calendario/confirmar', { origen: 'RECURRENTE', id: alq, fecha: `${mes}-15` }); ok(r.s === 201 || r.s === 400, 'fecha que no es ocurrencia se valida (mensual día 1)', r);
ok(r.s === 400, 'día 15 no es ocurrencia -> 400', r);
r = await call('POST', '/calendario/confirmar', { origen: 'CUOTA', id: compra, nro_cuota: 1 }); ok(r.s === 201, 'confirmar cuota 1 (cuenta Visa del origen)', r); const txCuota = r.j.id;
r = await call('POST', '/calendario/confirmar', { origen: 'CUOTA', id: compra, nro_cuota: 1 }); ok(r.s === 409, 'cuota ya confirmada -> 409', r);
r = await call('POST', '/calendario/confirmar', { origen: 'CUOTA', id: compra, nro_cuota: 9 }); ok(r.s === 400, 'cuota inexistente -> 400', r);
r = await call('POST', '/calendario/confirmar', { origen: 'XX' }); ok(r.s === 400, 'origen inválido -> 400', r);
tok = ''; r = await call('POST', '/auth/login', { username: 'otro', password: 'password123' }); tok = r.j.token;
r = await call('POST', '/calendario/confirmar', { origen: 'CUOTA', id: compra, nro_cuota: 2 }); ok(r.s === 404, 'no confirma cuotas de otro usuario', r);
tok = tokFede;

r = await call('GET', `/calendario?mes=${mes}`);
ok(r.j.eventos.every((e) => e.confirmado) && r.j.pendiente_gastos === 0, 'calendario: todo confirmado', r.j.eventos.map((e) => e.confirmado));
r = await call('GET', `/presupuestos?mes=${mes}`);
tot = r.j.items.find((i) => !i.categoria); sup = r.j.items.find((i) => i.categoria?.nombre === 'Supermercado');
ok(tot.gastado === 90000 && tot.previsto === 0 && tot.restante === 110000, 'total tras confirmar: sin doble conteo (90000 gastado, 0 previsto)', tot);
ok(sup.gastado === 50000 && sup.previsto === 0, 'Supermercado tras confirmar: 20000+30000', sup);
r = await call('GET', '/cuentas'); const sb2 = Object.fromEntries(r.j.map((c) => [c.nombre, c.saldo]));
ok(sb2.Banco === 80000 && sb2.Visa === -30000, 'saldos tras confirmar: Banco 120000-40000, Visa -30000', sb2);

// Des-confirmar borrando el movimiento
r = await call('DELETE', `/transacciones/${txCuota}`); ok(r.s === 204, 'borrar movimiento confirmado', r);
r = await call('GET', `/calendario?mes=${mes}`); ok(r.j.eventos.find((e) => e.origen === 'CUOTA').confirmado === false, 'la cuota vuelve a pendiente', null);

// Borrar origen con movimientos vinculados no debe fallar
r = await call('DELETE', `/recurrentes/${alq}`); ok(r.s === 204, 'borrar recurrente con movimiento vinculado', r);
r = await call('GET', '/transacciones'); ok(r.j.items.some((t) => t.nota === 'Alquiler'), 'el movimiento se conserva', r.j.items.map((t) => t.nota));

// Pausar
r = await call('POST', '/recurrentes', { descripcion: 'Gym', tipo: 'GASTO', monto: 3000, frecuencia: 'SEMANAL', fecha_inicio: `${mes}-01` }); const gym = r.j.id;
r = await call('PATCH', `/recurrentes/${gym}/activo`, { activo: false }); ok(r.j.activo === false, 'pausar', r);
r = await call('GET', `/calendario?mes=${mes}`); ok(!r.j.eventos.some((e) => e.descripcion === 'Gym'), 'pausado no aparece en calendario', null);
r = await call('GET', '/calendario?mes=2026-13'); ok(r.s === 400, 'mes inválido -> 400', r);

// ---- Filtros y edición de movimientos ----
r = await call('GET', '/transacciones?tipo=GASTO&limit=100'); ok(r.j.items.length > 0 && r.j.items.every((t) => t.tipo === 'GASTO'), 'filtro por tipo', r.j.items.map((t) => t.tipo));
r = await call('GET', '/transacciones?q=compra'); ok(r.j.total === 1 && r.j.items[0].nota === 'compra', 'búsqueda por nota', r.j.total);
r = await call('GET', '/transacciones?q=Supermercado'); ok(r.j.total >= 1, 'búsqueda por nombre de categoría', r.j.total);
r = await call('GET', '/transacciones?q=zzzz'); ok(r.j.total === 0, 'búsqueda sin resultados', r.j.total);
r = await call('GET', '/transacciones?tipo=TRANSFERENCIA'); ok(r.j.total === 1 && r.j.items[0].cuenta_destino?.nombre === 'Efectivo', 'transferencia trae cuenta destino', r.j.items[0]);
const compraTx = (await call('GET', '/transacciones?q=compra')).j.items[0];
r = await call('PUT', `/transacciones/${compraTx.id}`, { tipo: 'GASTO', monto: 25000, fecha: hoy, cuentaId: banco, categoriaId: catSuper.id, nota: 'compra editada' }); ok(r.s === 200, 'editar movimiento', r);
r = await call('GET', '/transacciones?q=editada'); ok(r.j.items[0]?.monto === '25000.00' || Number(r.j.items[0]?.monto) === 25000, 'la edición se guardó', r.j.items[0]);
r = await call('GET', '/cuentas'); ok(r.j.find((c) => c.nombre === 'Banco').saldo === 75000, 'el saldo refleja la edición (80000 - 5000)', r.j);
r = await call('PUT', `/transacciones/${compraTx.id}`, { tipo: 'GASTO', monto: 100, fecha: hoy, cuentaId: banco, categoriaId: catSueldo.id }); ok(r.s === 400, 'categoría de otro tipo -> 400', r);
r = await call('POST', '/transacciones', { tipo: 'GASTO', monto: 100, fecha: hoy, cuentaId: banco, categoriaId: catSueldo.id }); ok(r.s === 400, 'alta con categoría de otro tipo -> 400', r);
r = await call('PUT', '/transacciones/99999', { tipo: 'GASTO', monto: 1, fecha: hoy, cuentaId: banco }); ok(r.s === 404, 'editar inexistente -> 404', r);
tok = ''; r = await call('POST', '/auth/login', { username: 'otro', password: 'password123' }); tok = r.j.token;
r = await call('PUT', `/transacciones/${compraTx.id}`, { tipo: 'GASTO', monto: 1, fecha: hoy, cuentaId: banco }); ok(r.s === 404, 'no puede editar movimientos de otro usuario', r);
tok = tokFede;
// Un pago confirmado no puede cambiar de tipo
const cuotaConf = await call('POST', '/calendario/confirmar', { origen: 'CUOTA', id: compra, nro_cuota: 1 });
r = await call('PUT', `/transacciones/${cuotaConf.j.id}`, { tipo: 'INGRESO', monto: 30000, fecha: hoy, cuentaId: visa }); ok(r.s === 400, 'pago confirmado no cambia de tipo', r);
r = await call('PUT', `/transacciones/${cuotaConf.j.id}`, { tipo: 'GASTO', monto: 31000, fecha: hoy, cuentaId: visa, categoriaId: catSuper.id }); ok(r.s === 200, 'pago confirmado sí admite corregir el monto', r);
