export type Semaforo = 'OK' | 'ATENCION' | 'EXCEDIDO';

const r2 = (n: number) => Number(n.toFixed(2));

/** Estado de un presupuesto: lo gastado y lo previsto pendiente se descuentan del límite. */
export function estadoPresupuesto(limite: number, gastado: number, previsto: number) {
  const comprometido = gastado + previsto;
  const porcentaje = limite > 0 ? (comprometido / limite) * 100 : 0;
  return {
    gastado: r2(gastado),
    previsto: r2(previsto),
    restante: r2(limite - comprometido),
    porcentaje: Math.round(porcentaje * 10) / 10,
    estado: (porcentaje >= 100 ? 'EXCEDIDO' : porcentaje >= 80 ? 'ATENCION' : 'OK') as Semaforo,
  };
}

/** Cuánto se puede gastar por día hasta fin de mes (hoy incluido). Nunca negativo. */
export function presupuestoDiario(restante: number, hoyStr: string, finMes: string) {
  const dia = (s: string) => Number(s.slice(8, 10));
  const diasRestantes = Math.max(1, dia(finMes) - dia(hoyStr) + 1);
  return { dias_restantes: diasRestantes, por_dia: r2(Math.max(0, restante) / diasRestantes) };
}
