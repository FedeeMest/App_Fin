export type TipoTransaccion = 'INGRESO' | 'GASTO' | 'TRANSFERENCIA';
export type TipoCategoria = 'INGRESO' | 'GASTO';
export type TipoCuenta = 'EFECTIVO' | 'BANCO' | 'BILLETERA' | 'TARJETA';

export interface Cuenta { id: number; nombre: string; tipo: TipoCuenta; moneda: string; saldo: number }
export interface Categoria { id: number; nombre: string; tipo: TipoCategoria; icono?: string; color?: string }
export interface Transaccion {
  id: number; tipo: TipoTransaccion; monto: string; fecha: string; nota?: string;
  cuenta: { id: number; nombre: string }; categoria?: { id: number; nombre: string };
}
export interface Pagina<T> { items: T[]; total: number; page: number; limit: number }
export interface Resumen { mes: string; ingresos: number; gastos: number; balance: number; porCategoria: Record<string, number> }
