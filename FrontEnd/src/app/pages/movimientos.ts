import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Categoria, Cuenta, TipoTransaccion, Transaccion } from '../core/models';

@Component({
  selector: 'app-movimientos',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">Movimientos</h1>
      <button class="btn" (click)="abrir()">+ Nuevo</button>
    </div>

    <div class="space-y-2">
      @for (t of items(); track t.id) {
        <div class="card flex items-center justify-between gap-3 !p-3">
          <div class="min-w-0">
            <div class="truncate font-medium">{{ t.categoria?.nombre ?? (t.tipo === 'TRANSFERENCIA' ? 'Transferencia' : 'Sin categoría') }}</div>
            <div class="truncate text-xs text-slate-500">{{ t.fecha | date: 'dd/MM/yyyy' }} · {{ t.cuenta.nombre }}{{ t.nota ? ' · ' + t.nota : '' }}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-semibold" [class.text-emerald-600]="t.tipo === 'INGRESO'" [class.text-rose-600]="t.tipo === 'GASTO'">
              {{ t.tipo === 'INGRESO' ? '+' : t.tipo === 'GASTO' ? '-' : '' }}{{ +t.monto | currency: 'ARS' : 'symbol-narrow' : '1.0-2' }}
            </span>
            <button class="text-slate-300 hover:text-rose-600" (click)="borrar(t)" aria-label="Eliminar">✕</button>
          </div>
        </div>
      } @empty { <p class="card py-8 text-center text-slate-400">Todavía no cargaste movimientos</p> }
    </div>

    @if (total() > items().length) {
      <button class="btn-ghost mt-3 w-full" (click)="cargar(true)">Ver más</button>
    }

    @if (modal()) {
      <div class="fixed inset-0 z-30 flex items-end bg-black/40 sm:items-center sm:justify-center" (click)="modal.set(false)">
        <form class="max-h-[92vh] w-full space-y-3 overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl"
              (click)="$event.stopPropagation()" (ngSubmit)="guardar()">
          <h2 class="text-lg font-bold">Nuevo movimiento</h2>
          <div class="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-center text-sm">
            @for (t of tipos; track t.v) {
              <button type="button" class="rounded-lg py-2" [class.bg-white]="f.tipo === t.v" [class.font-semibold]="f.tipo === t.v"
                      (click)="f.tipo = t.v">{{ t.l }}</button>
            }
          </div>
          <div><label class="label">Monto (ARS)</label>
            <input class="input" type="number" inputmode="decimal" step="0.01" min="0.01" name="monto" [(ngModel)]="f.monto" required /></div>
          <div><label class="label">{{ f.tipo === 'TRANSFERENCIA' ? 'Cuenta origen' : 'Cuenta' }}</label>
            <select class="input" name="cuenta" [(ngModel)]="f.cuentaId" required>
              @for (c of cuentas(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
            </select></div>
          @if (f.tipo === 'TRANSFERENCIA') {
            <div><label class="label">Cuenta destino</label>
              <select class="input" name="destino" [(ngModel)]="f.cuentaDestinoId" required>
                @for (c of cuentas(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
              </select></div>
          } @else {
            <div><label class="label">Categoría</label>
              <select class="input" name="categoria" [(ngModel)]="f.categoriaId">
                <option [ngValue]="null">Sin categoría</option>
                @for (c of categoriasFiltradas(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
              </select></div>
          }
          <div><label class="label">Fecha</label><input class="input" type="date" name="fecha" [(ngModel)]="f.fecha" required /></div>
          <div><label class="label">Nota</label><input class="input" name="nota" [(ngModel)]="f.nota" maxlength="200" /></div>
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
export class MovimientosPage {
  private api = inject(ApiService);
  items = signal<Transaccion[]>([]);
  total = signal(0);
  cuentas = signal<Cuenta[]>([]);
  categorias = signal<Categoria[]>([]);
  modal = signal(false);
  error = signal('');
  private page = 1;

  tipos: { v: TipoTransaccion; l: string }[] = [
    { v: 'GASTO', l: 'Gasto' }, { v: 'INGRESO', l: 'Ingreso' }, { v: 'TRANSFERENCIA', l: 'Transf.' },
  ];
  f = this.vacio();

  constructor() {
    this.api.cuentas().subscribe((c) => this.cuentas.set(c));
    this.api.categorias().subscribe((c) => this.categorias.set(c));
    this.cargar();
  }

  private vacio() {
    return { tipo: 'GASTO' as TipoTransaccion, monto: null as number | null, cuentaId: null as number | null,
      cuentaDestinoId: null as number | null, categoriaId: null as number | null,
      fecha: new Date().toLocaleDateString('en-CA'), nota: '' };
  }

  categoriasFiltradas() { return this.categorias().filter((c) => c.tipo === this.f.tipo); }

  cargar(mas = false) {
    this.page = mas ? this.page + 1 : 1;
    this.api.transacciones({ page: this.page, limit: 20 }).subscribe((r) => {
      this.items.set(mas ? [...this.items(), ...r.items] : r.items);
      this.total.set(r.total);
    });
  }

  abrir() {
    this.f = this.vacio();
    this.f.cuentaId = this.cuentas()[0]?.id ?? null;
    this.error.set('');
    this.modal.set(true);
  }

  guardar() {
    this.api.crearTransaccion(this.f).subscribe({
      next: () => { this.modal.set(false); this.cargar(); },
      error: (e) => this.error.set(e.error?.message ?? 'No se pudo guardar'),
    });
  }

  borrar(t: Transaccion) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    this.api.borrarTransaccion(t.id).subscribe(() => this.cargar());
  }
}
