import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { DatosService } from '../core/datos.service';
import { ToastService } from '../core/toast.service';

import { MoneyPipe } from '../core/money.pipe';
import { SheetComponent } from '../ui/sheet';
import { primerVencimiento } from '../core/tarjeta.util';

import { Categoria, CompraCuotas, Cuenta, ResumenCuotas } from '../core/models';

@Component({
  selector: 'app-cuotas',
  imports: [MoneyPipe, DatePipe, FormsModule, RouterLink, SheetComponent],
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">Compras en cuotas</h1>
      <button class="btn" (click)="abrir()">+ Nueva</button>
    </div>

    @if (resumen(); as r) {
      <div class="mb-4 grid grid-cols-2 gap-2 sm:gap-4">
        <div class="card bg-brand-600 !text-white">
          <div class="text-xs opacity-80">A pagar este mes</div>
          <div class="text-2xl font-bold">{{ r.total_mes_actual | money }}</div>
        </div>
        <div class="card">
          <div class="text-xs text-slate-500">Deuda total en cuotas</div>
          <div class="text-2xl font-bold">{{ r.deuda_total | money }}</div>
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
              <span class="w-24 shrink-0 text-right font-medium">{{ p.total | money }}</span>
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
              <div class="truncate text-xs text-slate-500">{{ c.cuenta?.nombre ?? 'Sin cuenta' }} · total {{ c.monto_total | money }}</div>
              @if (c.cuenta?.tipo === 'TARJETA') { <a [routerLink]="['/tarjetas', c.cuenta!.id]" class="text-xs text-brand-700">Se paga con el resumen de la tarjeta ›</a> }
            </div>
            <button class="text-slate-300 hover:text-rose-600" (click)="borrar(c)" aria-label="Eliminar">✕</button>
          </div>
          <div class="mt-3 h-2 overflow-hidden rounded bg-slate-100">
            <div class="h-full rounded bg-brand-500" [style.width.%]="(c.cuotas_pagadas / c.cantidad_cuotas) * 100"></div>
          </div>
          <div class="mt-2 flex flex-wrap items-center justify-between gap-x-3 text-sm">
            <span>{{ c.cuotas_pagadas }} de {{ c.cantidad_cuotas }} pagas
              @if (!c.finalizada) { · <b>faltan {{ c.cuotas_restantes }}</b> }</span>
            <span class="text-slate-500">{{ c.monto_cuota | money }}/mes</span>
          </div>
          @if (!c.finalizada) {
            <div class="mt-1 text-xs text-slate-500">
              Próxima: {{ c.proximo_vencimiento | date: 'dd/MM/yyyy' }} · Resta pagar {{ c.monto_restante | money }}
            </div>
          }
        </div>
      } @empty { <p class="card py-8 text-center text-slate-400">{{ verFinalizadas() ? 'Ninguna finalizada' : 'No tenés compras en cuotas activas' }}</p> }
    </div>

    @if (modal()) {
      <app-sheet [abierto]="true" (cerrar)="modal.set(false)">
        <form class="space-y-3" (ngSubmit)="guardar()">
          <h2 class="text-lg font-bold">Nueva compra en cuotas</h2>
          <div><label class="label">Descripción</label><input class="input" name="d" [(ngModel)]="f.descripcion" required maxlength="120" placeholder="Ej: Heladera" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Monto total (ARS)</label>
              <input class="input" type="number" inputmode="decimal" step="0.01" min="0.01" name="m" [(ngModel)]="f.monto_total" required /></div>
            <div><label class="label">Cantidad de cuotas</label>
              <input class="input" type="number" inputmode="numeric" min="1" max="60" name="n" [(ngModel)]="f.cantidad_cuotas" required /></div>
          </div>
          @if (f.monto_total && f.cantidad_cuotas) {
            <p class="text-sm text-slate-500">≈ {{ f.monto_total / f.cantidad_cuotas | money }} por cuota</p>
          }
          <div><label class="label">Tarjeta / cuenta</label>
            <select class="input" name="c" [(ngModel)]="f.cuentaId" (ngModelChange)="recalcular()">
              <option [ngValue]="null">Sin cuenta</option>
              @for (c of cuentas(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}{{ c.tipo === 'TARJETA' ? ' (tarjeta)' : '' }}</option> }
            </select></div>
          @if (tarjetaElegida(); as t) {
            <div><label class="label">Fecha de la compra</label><input class="input" type="date" name="fc" [(ngModel)]="f.fecha_compra" (ngModelChange)="recalcular()" /></div>
            <div><label class="label">La 1.ª cuota vence</label><input class="input" type="date" name="fp" [(ngModel)]="f.fecha_primera_cuota" required /></div>
            <p class="text-xs text-slate-500">
              @if (t.dia_cierre) { Calculado con el cierre de {{ t.nombre }} (día {{ t.dia_cierre }}). }
              @else { Cargá el día de cierre en la tarjeta para que se calcule solo. }
              Las cuotas aparecerán solas en cada resumen y bajan tu límite desde hoy.
            </p>
          } @else {
            <div><label class="label">Vencimiento de la 1.ª cuota</label><input class="input" type="date" name="fp" [(ngModel)]="f.fecha_primera_cuota" required /></div>
          }
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
      </app-sheet>
    }
  `,
})
export class CuotasPage {
  private api = inject(ApiService);
  private datos = inject(DatosService);
  private toast = inject(ToastService);
  compras = signal<CompraCuotas[]>([]);
  resumen = signal<ResumenCuotas | null>(null);
  cuentas = signal<Cuenta[]>([]);
  categorias = signal<Categoria[]>([]);
  verFinalizadas = signal(false);
  modal = signal(false);
  error = signal('');

  // `f` es un objeto simple (no una señal), por eso es un método y no un computed
  tarjetaElegida() { return this.cuentas().find((c) => c.id === this.f.cuentaId && c.tipo === 'TARJETA') ?? null; }
  visibles = computed(() => this.compras().filter((c) => c.finalizada === this.verFinalizadas()));
  maximo = computed(() => Math.max(0, ...(this.resumen()?.proyeccion.map((p) => p.total) ?? [])));
  f = this.vacio();

  constructor() {
    this.api.cuentas().subscribe((c) => this.cuentas.set(c));
    this.api.categorias().subscribe((c) => this.categorias.set(c.filter((x) => x.tipo === 'GASTO')));
    this.cargar();
    if (inject(ActivatedRoute).snapshot.queryParamMap.get('nueva')) this.abrir();
  }

  private vacio() {
    const hoy = new Date().toLocaleDateString('en-CA');
    return { descripcion: '', monto_total: null as number | null, cantidad_cuotas: 12 as number | null, fecha_compra: hoy,
      fecha_primera_cuota: hoy, cuentaId: null as number | null, categoriaId: null as number | null };
  }

  /** Con tarjeta, la 1.ª cuota se sugiere según el cierre; se puede ajustar a mano. */
  recalcular() {
    const t = this.tarjetaElegida();
    if (t?.dia_cierre && this.f.fecha_compra) this.f.fecha_primera_cuota = primerVencimiento(this.f.fecha_compra, t.dia_cierre, t.dia_vencimiento ?? null);
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
    const { fecha_compra, ...datos } = this.f;
    this.api.crearCompraCuotas(datos).subscribe({
      next: () => { this.modal.set(false); this.cargar(); this.datos.notificar(); this.toast.mostrar('Compra en cuotas guardada'); },
      error: (e) => this.error.set(e.error?.message ?? 'No se pudo guardar'),
    });
  }

  borrar(c: CompraCuotas) {
    if (!confirm(`¿Eliminar "${c.descripcion}"?`)) return;
    this.api.borrarCompraCuotas(c.id).subscribe(() => { this.cargar(); this.toast.mostrar('Compra eliminada'); });
  }
}
