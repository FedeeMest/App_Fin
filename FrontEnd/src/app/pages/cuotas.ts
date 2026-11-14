import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Categoria, CompraCuotas, Cuenta, ResumenCuotas } from '../core/models';

@Component({
  selector: 'app-cuotas',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">Compras en cuotas</h1>
      <button class="btn" (click)="abrir()">+ Nueva</button>
    </div>

    @if (resumen(); as r) {
      <div class="mb-4 grid grid-cols-2 gap-2 sm:gap-4">
        <div class="card bg-brand-600 !text-white">
          <div class="text-xs opacity-80">A pagar este mes</div>
          <div class="text-2xl font-bold">{{ r.total_mes_actual | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</div>
        </div>
        <div class="card">
          <div class="text-xs text-slate-500">Deuda total en cuotas</div>
          <div class="text-2xl font-bold">{{ r.deuda_total | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</div>
          <div class="text-xs text-slate-400">{{ r.compras_activas }} compra(s) activa(s)</div>
        </div>
      </div>

      <div class="card mb-4">
        <h2 class="mb-3 font-semibold">Próximos meses</h2>
        <div class="space-y-1.5">
          @for (p of r.proyeccion; track p.mes) {
            <div class="flex items-center gap-2 text-sm">
              <span class="w-16 shrink-0 text-slate-500">{{ etiquetaMes(p.mes) }}</span>
              <div class="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                <div class="h-full rounded bg-brand-500" [style.width.%]="maximo() ? (p.total / maximo()) * 100 : 0"></div>
              </div>
              <span class="w-24 shrink-0 text-right font-medium">{{ p.total | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</span>
            </div>
          }
        </div>
      </div>
    }

    <div class="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-center text-sm">
      <button class="rounded-lg py-2" [class.bg-white]="!verFinalizadas()" [class.font-semibold]="!verFinalizadas()" (click)="verFinalizadas.set(false)">Activas</button>
      <button class="rounded-lg py-2" [class.bg-white]="verFinalizadas()" [class.font-semibold]="verFinalizadas()" (click)="verFinalizadas.set(true)">Finalizadas</button>
    </div>

    <div class="space-y-2">
      @for (c of visibles(); track c.id) {
        <div class="card">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="truncate font-medium">{{ c.descripcion }}</div>
              <div class="truncate text-xs text-slate-500">{{ c.cuenta?.nombre ?? 'Sin cuenta' }} · total {{ c.monto_total | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</div>
            </div>
            <button class="text-slate-300 hover:text-rose-600" (click)="borrar(c)" aria-label="Eliminar">✕</button>
          </div>
          <div class="mt-3 h-2 overflow-hidden rounded bg-slate-100">
            <div class="h-full rounded bg-brand-500" [style.width.%]="(c.cuotas_pagadas / c.cantidad_cuotas) * 100"></div>
          </div>
          <div class="mt-2 flex flex-wrap items-center justify-between gap-x-3 text-sm">
            <span>{{ c.cuotas_pagadas }} de {{ c.cantidad_cuotas }} pagas
              @if (!c.finalizada) { · <b>faltan {{ c.cuotas_restantes }}</b> }</span>
            <span class="text-slate-500">{{ c.monto_cuota | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}/mes</span>
          </div>
          @if (!c.finalizada) {
            <div class="mt-1 text-xs text-slate-500">
              Próxima: {{ c.proximo_vencimiento | date: 'dd/MM/yyyy' }} · Resta pagar {{ c.monto_restante | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}
            </div>
          }
        </div>
      } @empty { <p class="card py-8 text-center text-slate-400">{{ verFinalizadas() ? 'Ninguna finalizada' : 'No tenés compras en cuotas activas' }}</p> }
    </div>

    @if (modal()) {
      <div class="fixed inset-0 z-30 flex items-end bg-black/40 sm:items-center sm:justify-center" (click)="modal.set(false)">
        <form class="max-h-[92vh] w-full space-y-3 overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl"
              (click)="$event.stopPropagation()" (ngSubmit)="guardar()">
          <h2 class="text-lg font-bold">Nueva compra en cuotas</h2>
          <div><label class="label">Descripción</label><input class="input" name="d" [(ngModel)]="f.descripcion" required maxlength="120" placeholder="Ej: Heladera" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Monto total (ARS)</label>
              <input class="input" type="number" inputmode="decimal" step="0.01" min="0.01" name="m" [(ngModel)]="f.monto_total" required /></div>
            <div><label class="label">Cantidad de cuotas</label>
              <input class="input" type="number" inputmode="numeric" min="1" max="60" name="n" [(ngModel)]="f.cantidad_cuotas" required /></div>
          </div>
          @if (f.monto_total && f.cantidad_cuotas) {
            <p class="text-sm text-slate-500">≈ {{ f.monto_total / f.cantidad_cuotas | currency: 'ARS' : 'symbol-narrow' : '1.0-2' }} por cuota</p>
          }
          <div><label class="label">Vencimiento de la 1.ª cuota</label><input class="input" type="date" name="fp" [(ngModel)]="f.fecha_primera_cuota" required /></div>
          <div><label class="label">Tarjeta / cuenta</label>
            <select class="input" name="c" [(ngModel)]="f.cuentaId">
              <option [ngValue]="null">Sin cuenta</option>
              @for (c of cuentas(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
            </select></div>
          <div><label class="label">Categoría</label>
            <select class="input" name="cat" [(ngModel)]="f.categoriaId">
              <option [ngValue]="null">Sin categoría</option>
              @for (c of categorias(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
            </select></div>
          @if (error()) { <p class="rounded-lg bg-red-50 p-2 text-sm text-red-700">{{ error() }}</p> }
          <div class="flex gap-2 pt-1">
            <button type="button" class="btn-ghost flex-1" (click)="modal.set(false)">Cancelar</button>
            <button class="btn flex-1">Guardar</button>
          </div>
        </form>
      </div>
    }
  `,
})
export class CuotasPage {
  private api = inject(ApiService);
  compras = signal<CompraCuotas[]>([]);
  resumen = signal<ResumenCuotas | null>(null);
  cuentas = signal<Cuenta[]>([]);
  categorias = signal<Categoria[]>([]);
  verFinalizadas = signal(false);
  modal = signal(false);
  error = signal('');

  visibles = computed(() => this.compras().filter((c) => c.finalizada === this.verFinalizadas()));
  maximo = computed(() => Math.max(0, ...(this.resumen()?.proyeccion.map((p) => p.total) ?? [])));
  f = this.vacio();

  constructor() {
    this.api.cuentas().subscribe((c) => this.cuentas.set(c));
    this.api.categorias().subscribe((c) => this.categorias.set(c.filter((x) => x.tipo === 'GASTO')));
    this.cargar();
  }

  private vacio() {
    return { descripcion: '', monto_total: null as number | null, cantidad_cuotas: 12 as number | null,
      fecha_primera_cuota: new Date().toLocaleDateString('en-CA'), cuentaId: null as number | null, categoriaId: null as number | null };
  }

  cargar() {
    this.api.cuotas().subscribe((c) => this.compras.set(c));
    this.api.resumenCuotas(12).subscribe((r) => this.resumen.set(r));
  }

  etiquetaMes(ym: string) {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
  }

  abrir() { this.f = this.vacio(); this.error.set(''); this.modal.set(true); }

  guardar() {
    this.api.crearCompraCuotas(this.f).subscribe({
      next: () => { this.modal.set(false); this.cargar(); },
      error: (e) => this.error.set(e.error?.message ?? 'No se pudo guardar'),
    });
  }

  borrar(c: CompraCuotas) {
    if (!confirm(`¿Eliminar "${c.descripcion}"?`)) return;
    this.api.borrarCompraCuotas(c.id).subscribe(() => this.cargar());
  }
}
