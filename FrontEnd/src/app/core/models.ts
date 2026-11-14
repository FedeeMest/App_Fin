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

export interface CompraCuotas {
  id: number; descripcion: string; monto_total: number; cantidad_cuotas: number; fecha_primera_cuota: string;
  cuenta: { id: number; nombre: string } | null; categoria: { id: number; nombre: string } | null;
  cuotas_pagadas: number; cuotas_restantes: number; monto_cuota: number; monto_restante: number;
  proximo_vencimiento: string | null; finalizada: boolean;
}
export interface ResumenCuotas {
  mes_actual: string; total_mes_actual: number; deuda_total: number; compras_activas: number;
  proyeccion: { mes: string; total: number }[];
}

export type Frecuencia = 'SEMANAL' | 'MENSUAL' | 'ANUAL';
export interface Recurrente {
  id: number; descripcion: string; tipo: TipoCategoria; monto: number; frecuencia: Frecuencia;
  fecha_inicio: string; fecha_fin: string | null; activo: boolean; proxima_fecha: string | null;
  cuenta: { id: number; nombre: string } | null; categoria: { id: number; nombre: string } | null;
}
export interface EventoCalendario {
  fecha: string; tipo: TipoCategoria; origen: 'RECURRENTE' | 'CUOTA'; descripcion: string; monto: number; detalle?: string;
}
export interface Calendario {
  mes: string; eventos: EventoCalendario[]; total_ingresos: number; total_gastos: number; balance_previsto: number;
}
