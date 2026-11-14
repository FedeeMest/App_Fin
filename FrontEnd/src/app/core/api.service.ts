import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Calendario, Categoria, CompraCuotas, Cuenta, Pagina, Presupuestos, Recurrente, Resumen, ResumenCuotas, Transaccion } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  cuentas() { return this.http.get<Cuenta[]>(`${this.base}/cuentas`); }
  crearCuenta(d: { nombre: string; tipo: string; saldo_inicial: number }) { return this.http.post(`${this.base}/cuentas`, d); }

  categorias() { return this.http.get<Categoria[]>(`${this.base}/categorias`); }
  crearCategoria(d: { nombre: string; tipo: string }) { return this.http.post(`${this.base}/categorias`, d); }

  transacciones(f: { page?: number; limit?: number; desde?: string; hasta?: string; cuentaId?: number; categoriaId?: number; tipo?: string; q?: string } = {}) {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    return this.http.get<Pagina<Transaccion>>(`${this.base}/transacciones`, { params: p });
  }
  crearTransaccion(d: unknown) { return this.http.post<{ id: number }>(`${this.base}/transacciones`, d); }
  actualizarTransaccion(id: number, d: unknown) { return this.http.put(`${this.base}/transacciones/${id}`, d); }
  borrarTransaccion(id: number) { return this.http.delete(`${this.base}/transacciones/${id}`); }
  resumen(mes: string) { return this.http.get<Resumen>(`${this.base}/transacciones/resumen`, { params: { mes } }); }

  cuotas(estado?: 'activas' | 'finalizadas') {
    return this.http.get<CompraCuotas[]>(`${this.base}/cuotas`, { params: estado ? { estado } : {} });
  }
  resumenCuotas(meses = 12) { return this.http.get<ResumenCuotas>(`${this.base}/cuotas/resumen`, { params: { meses } }); }
  crearCompraCuotas(d: unknown) { return this.http.post(`${this.base}/cuotas`, d); }
  borrarCompraCuotas(id: number) { return this.http.delete(`${this.base}/cuotas/${id}`); }

  recurrentes() { return this.http.get<Recurrente[]>(`${this.base}/recurrentes`); }
  crearRecurrente(d: unknown) { return this.http.post(`${this.base}/recurrentes`, d); }
  pausarRecurrente(id: number, activo: boolean) { return this.http.patch(`${this.base}/recurrentes/${id}/activo`, { activo }); }
  borrarRecurrente(id: number) { return this.http.delete(`${this.base}/recurrentes/${id}`); }
  calendario(mes: string) { return this.http.get<Calendario>(`${this.base}/calendario`, { params: { mes } }); }

  presupuestos(mes: string) { return this.http.get<Presupuestos>(`${this.base}/presupuestos`, { params: { mes } }); }
  guardarPresupuesto(d: { categoriaId: number | null; monto_limite: number }) { return this.http.post(`${this.base}/presupuestos`, d); }
  borrarPresupuesto(id: number) { return this.http.delete(`${this.base}/presupuestos/${id}`); }

  confirmarPago(d: { origen: 'RECURRENTE' | 'CUOTA'; id: number; fecha?: string; nro_cuota?: number | null; cuentaId?: number | null; monto?: number; fecha_real?: string }) {
    return this.http.post<{ id: number }>(`${this.base}/calendario/confirmar`, d);
  }
}
