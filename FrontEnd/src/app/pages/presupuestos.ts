import { Component, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Categoria, ItemPresupuesto, Presupuestos } from '../core/models';

@Component({
  selector: 'app-presupuestos',
  imports: [CurrencyPipe, FormsModule],
  template: `
    <div class="mb-4 flex items-center justify-between gap-2">
      <h1 class="text-xl font-bold">Presupuestos</h1>
      <div class="flex items-center gap-1">
        <button class="btn-ghost" (click)="mover(-1)" aria-label="Mes anterior">‹</button>
        <span class="w-32 text-center font-medium capitalize">{{ tituloMes() }}</span>
        <button class="btn-ghost" (click)="mover(1)" aria-label="Mes siguiente">›</button>
      </div>
    </div>

    @if (data()?.diario; as d) {
      <div class="card mb-4 bg-brand-600 !text-white">
        <div class="text-sm opacity-80">Podés gastar hoy</div>
        <div class="text-3xl font-bold">{{ d.por_dia | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</div>
        <div class="mt-1 text-xs opacity-80">
          Te quedan {{ d.restante_mes | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }} para {{ d.dias_restantes }} día(s), descontando pagos previstos
        </div>
      </div>
    } @else if (!tieneTotal()) {
      <div class="card mb-4 text-sm text-slate-500">Definí un <b>presupuesto total del mes</b> para ver cuánto podés gastar por día.</div>
    }

    <div class="mb-3 flex items-center justify-between">
      <h2 class="font-semibold">Límites del mes</h2>
      <button class="btn" (click)="abrir()">+ Límite</button>
    </div>

    <div class="space-y-2">
      @for (p of data()?.items ?? []; track p.id) {
        <div class="card">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="truncate font-medium">{{ p.categoria?.nombre ?? 'Total del mes' }}</div>
              <div class="text-xs text-slate-500">Límite {{ p.monto_limite | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</div>
            </div>
            <div class="flex items-center gap-2">
              <button class="text-xs text-brand-700 underline" (click)="abrir(p)">Editar</button>
              <button class="text-slate-300 hover:text-rose-600" (click)="borrar(p)" aria-label="Eliminar">✕</button>
            </div>
          </div>
          <div class="mt-3 h-2.5 overflow-hidden rounded bg-slate-100">
            <div class="h-full rounded" [style.width.%]="min(p.porcentaje, 100)"
                 [class.bg-brand-500]="p.estado === 'OK'" [class.bg-amber-500]="p.estado === 'ATENCION'" [class.bg-rose-500]="p.estado === 'EXCEDIDO'"></div>
          </div>
          <div class="mt-2 flex flex-wrap items-center justify-between gap-x-3 text-sm">
            <span>Gastado {{ p.gastado | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}
              @if (p.previsto > 0) { <span class="text-slate-500">+ previsto {{ p.previsto | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</span> }</span>
            <span class="font-semibold" [class.text-rose-600]="p.restante < 0">
              {{ p.restante >= 0 ? 'Quedan ' : 'Excedido ' }}{{ abs(p.restante) | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</span>
          </div>
        </div>
      } @empty { <p class="card py-8 text-center text-slate-400">Todavía no definiste presupuestos</p> }
    </div>

    @if (modal()) {
      <div class="fixed inset-0 z-30 flex items-end bg-black/40 sm:items-center sm:justify-center" (click)="modal.set(false)">
        <form class="w-full space-y-3 rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl" (click)="$event.stopPropagation()" (ngSubmit)="guardar()">
          <h2 class="text-lg font-bold">Límite mensual</h2>
          <div><label class="label">Para</label>
            <select class="input" name="c" [(ngModel)]="f.categoriaId">
              <option [ngValue]="null">Total del mes (todas las categorías)</option>
              @for (c of categorias(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
            </select></div>
          <div><label class="label">Límite (ARS)</label>
            <input class="input" type="number" inputmode="decimal" step="0.01" min="0.01" name="m" [(ngModel)]="f.monto_limite" required /></div>
          <p class="text-xs text-slate-500">Rige todos los meses. Si ya existe uno para esa categoría, se actualiza.</p>
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
export class PresupuestosPage {
  private api = inject(ApiService);
  mes = signal(new Date().toLocaleDateString('en-CA').slice(0, 7));
  data = signal<Presupuestos | null>(null);
  categorias = signal<Categoria[]>([]);
  modal = signal(false);
  error = signal('');
  f = { categoriaId: null as number | null, monto_limite: null as number | null };

  tieneTotal = computed(() => (this.data()?.items ?? []).some((i) => i.categoria === null));
  tituloMes = computed(() => {
    const [y, m] = this.mes().split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  });

  min = Math.min;
  abs = Math.abs;

  constructor() {
    this.api.categorias().subscribe((c) => this.categorias.set(c.filter((x) => x.tipo === 'GASTO')));
    effect(() => this.api.presupuestos(this.mes()).subscribe((d) => this.data.set(d)));
  }

  mover(delta: number) {
    const [y, m] = this.mes().split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.mes.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  recargar() { this.api.presupuestos(this.mes()).subscribe((d) => this.data.set(d)); }

  abrir(p?: ItemPresupuesto) {
    this.f = { categoriaId: p?.categoria?.id ?? null, monto_limite: p?.monto_limite ?? null };
    this.error.set('');
    this.modal.set(true);
  }

  guardar() {
    this.api.guardarPresupuesto({ categoriaId: this.f.categoriaId, monto_limite: Number(this.f.monto_limite) }).subscribe({
      next: () => { this.modal.set(false); this.recargar(); },
      error: (e) => this.error.set(e.error?.message ?? 'No se pudo guardar'),
    });
  }

  borrar(p: ItemPresupuesto) {
    if (!confirm(`¿Eliminar el límite de "${p.categoria?.nombre ?? 'Total del mes'}"?`)) return;
    this.api.borrarPresupuesto(p.id).subscribe(() => this.recargar());
  }
}
