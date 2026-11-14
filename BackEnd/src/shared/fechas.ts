export function rangoMes(mes: string): { desde: string; hasta: string } {
  const [anio, nro] = mes.split('-').map(Number);
  const ultimo = new Date(anio, nro, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, '0')}` };
}
export const mesValido = (m: unknown): m is string => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
