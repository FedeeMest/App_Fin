import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { DatosService } from '../core/datos.service';
import { ToastService } from '../core/toast.service';
import { MoneyPipe, pesos } from '../core/money.pipe';
import { SheetComponent } from '../ui/sheet';
import { IconComponent } from '../ui/icon';
import { ResumenTarjeta } from '../core/models';

@Component({
  selector: 'app-tarjeta',
  imports: [MoneyPipe, DatePipe, FormsModule, RouterLink, SheetComponent, IconComponent],
  template: `
    <a routerLink="/cuentas" class="mb-2 inline-flex items-center gap-1 text-sm text-slate-500"><app-icon nombre="chevron-left" [tam]="16" /> Cuentas</a>

    @if (r(); as d) {
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-2xl font-bold">{{ d.cuenta.nombre }}</h1>
        <button class="btn-ghost tap text-sm" (click)="abrirConfig()">Editar tarjeta</button>
      </div>

      <!-- Límite -->
      <section class="mb-4 rounded-2xl bg-brand-600 p-5 text-white">
        @if (d.cuenta.limite_credito != null) {
          <div class="text-sm opacity-80">Límite disponible</div>
          <div class="text-3xl font-bold">{{ d.cuenta.disponible! | money }}</div>
          <div class="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
            <div class="h-full rounded-full bg-white" [style.width.%]="usado()"></div>
          </div>
          <div class="mt-2 flex flex-wrap justify-between gap-x-4 text-xs opacity-90">
            <span>Límite {{ d.cuenta.limite_credito | money }}</span>
            <span>En cuotas por pagar {{ d.cuenta.deuda_cuotas! | money }}</span>
          </div>
          @if (d.cuenta.consumos_sin_pagar) { <div class="mt-1 text-xs opacity-90">Consumos sin pagar {{ d.cuenta.consumos_sin_pagar | money }}</div> }
        } @else {
          <div class="text-sm opacity-80">En cuotas por pagar</div>
          <div class="text-3xl font-bold">{{ d.cuenta.deuda_cuotas! | money }}</div>
          <button class="mt-2 text-sm underline" (click)="abrirConfig()">Cargá el límite para ver cuánto te queda</button>
        }
      </section>

      <!-- Mes -->
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-semibold">Resumen</h2>
        <div class="flex items-center">
          <button class="btn-ghost tap !px-2" (click)="mover(-1)" aria-label="Mes anterior"><app-icon nombre="chevron-left" /></button>
          <span class="w-40 whitespace-nowrap text-center font-medium first-letter:uppercase">{{ tituloMes() }}</span>
          <button class="btn-ghost tap !px-2" (click)="mover(1)" aria-label="Mes siguiente"><app-icon nombre="chevron-right" /></button>
        </div>
      </div>

      <section class="card">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-sm text-slate-500">Total del resumen</div>
            <div class="text-2xl font-bold">{{ d.total | money }}</div>
            @if (d.vencimiento) { <div class="text-xs text-slate-500">Vence el {{ d.vencimiento | date: 'd/MM/yyyy' }}</div> }
          </div>
          @if (d.items.length) {
            <span class="chip" [class.chip-on]="d.pendiente === 0">{{ d.pendiente === 0 ? 'Pagado' : 'Pendiente' }}</span>
          }
        </div>

        <div class="mt-3">
          @for (i of d.items; track i.compraId + '-' + i.nro_cuota) {
            <div class="flex items-center justify-between gap-2 border-t border-slate-100 py-2.5 first:border-0">
              <div class="min-w-0">
                <div class="truncate font-medium" [class.text-slate-400]="i.pagada">{{ i.descripcion }}</div>
                <div class="text-xs text-slate-500">Cuota {{ i.nro_cuota }}/{{ i.cantidad_cuotas }}@if (i.pagada) { · <span class="text-emerald-600">✓ pagada</span> }</div>
              </div>
              <span class="font-semibold" [class.text-slate-400]="i.pagada">{{ i.monto | money }}</span>
            </div>
          } @empty {
            <p class="py-6 text-center text-sm text-slate-400">No hay cuotas en este resumen</p>
          }
        </div>

        @if (d.pendiente > 0) {
          <button class="btn mt-3 w-full" (click)="abrirPago()">Pagar resumen · {{ d.pendiente | money }}</button>
        }
      </section>
      <p class="mt-3 text-xs text-slate-500">Las cuotas entran solas en cada resumen. Al pagarlo se registran todas juntas y se libera ese importe de tu límite.</p>
    } @else if (cargando()) {
      <div class="skeleton h-40 rounded-2xl"></div>
    }

    @if (pago() && r(); as d) {
      <app-sheet [abierto]="true" (cerrar)="pago.set(false)">
        <form class="space-y-3" (ngSubmit)="pagar()">
          <h2 class="text-lg font-bold">Pagar resumen</h2>
          <p class="text-sm text-slate-500">{{ d.cuenta.nombre }} · {{ tituloMes() }}</p>
          <div class="text-3xl font-bold">{{ d.pendiente | money }}</div>
          <div><label class="label">Pagar desde</label>
            <select class="input" name="o" [(ngModel)]="origenId" required>
              @for (c of origenes(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }} ({{ c.saldo | money }})</option> }
            </select></div>
          <div><label class="label">Fecha de pago</label><input class="input" type="date" name="f" [(ngModel)]="fechaPago" required /></div>
          @if (error()) { <p class="rounded-lg bg-red-50 p-2 text-sm text-red-700">{{ error() }}</p> }
          <div class="flex gap-2 pt-1">
            <button type="button" class="btn-ghost flex-1" (click)="pago.set(false)">Cancelar</button>
            <button class="btn flex-1" [disabled]="guardando()">Confirmar pago</button>
          </div>
        </form>
      </app-sheet>
    }

    @if (config() && r(); as d) {
      <app-sheet [abierto]="true" (cerrar)="config.set(false)">
        <form class="space-y-3" (ngSubmit)="guardarConfig()">
          <h2 class="text-lg font-bold">Editar tarjeta</h2>
          <div><label class="label">Límite de compra (ARS)</label>
            <input class="input" type="number" inputmode="decimal" min="0" step="0.01" name="l" [(ngModel)]="cfg.limite" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Día de cierre</label><input class="input" type="number" inputmode="numeric" min="1" max="31" name="c" [(ngModel)]="cfg.cierre" /></div>
            <div><label class="label">Día de vencimiento</label><input class="input" type="number" inputmode="numeric" min="1" max="31" name="v" [(ngModel)]="cfg.venc" /></div>
          </div>
          @if (error()) { <p class="rounded-lg bg-red-50 p-2 text-sm text-red-700">{{ error() }}</p> }
          <div class="flex gap-2 pt-1">
            <button type="button" class="btn-ghost flex-1" (click)="config.set(false)">Cancelar</button>
            <button class="btn flex-1">Guardar</button>
          </div>
        </form>
      </app-sheet>
    }
  `,
})
export class TarjetaPage {
  private api = inject(ApiService);
  private datos = inject(DatosService);
  private toast = inject(ToastService);
  private ruta = inject(ActivatedRoute);

  private id = Number(this.ruta.snapshot.paramMap.get('id'));
  mes = signal(this.ruta.snapshot.queryParamMap.get('mes') ?? new Date().toLocaleDateString('en-CA').slice(0, 7));
  r = signal<ResumenTarjeta | null>(null);
  cargando = signal(true);
  pago = signal(false);
  config = signal(false);
  guardando = signal(false);
  error = signal('');
  origenId: number | null = null;
  fechaPago = new Date().toLocaleDateString('en-CA');
  cfg = { limite: null as number | null, cierre: null as number | null, venc: null as number | null };

  origenes = computed(() => this.datos.cuentas().filter((c) => c.tipo !== 'TARJETA'));
  usado = computed(() => {
    const c = this.r()?.cuenta;
    if (!c?.limite_credito) return 0;
    return Math.min(100, Math.max(0, (((c.deuda_cuotas ?? 0) + (c.consumos_sin_pagar ?? 0)) / c.limite_credito) * 100));
  });
  tituloMes = computed(() => {
    const [y, m] = this.mes().split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  });

  constructor() {
    effect(() => { this.mes(); this.datos.version(); untracked(() => this.cargar()); });
  }

  cargar() {
    this.api.resumenTarjeta(this.id, this.mes()).subscribe({
      next: (d) => { this.r.set(d); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  mover(n: number) {
    const [y, m] = this.mes().split('-').map(Number);
    this.mes.set(new Date(y, m - 1 + n, 1).toLocaleDateString('en-CA').slice(0, 7));
  }

  abrirPago() {
    this.error.set('');
    this.fechaPago = new Date().toLocaleDateString('en-CA');
    this.origenId = this.origenes()[0]?.id ?? null;
    this.pago.set(true);
  }

  pagar() {
    const d = this.r();
    if (!d || this.origenId == null) { this.error.set('Elegí desde qué cuenta pagás'); return; }
    this.guardando.set(true);
    this.api.pagarResumen(this.id, { mes: this.mes(), cuentaOrigenId: this.origenId, fecha: this.fechaPago }).subscribe({
      next: (res) => {
        this.guardando.set(false); this.pago.set(false);
        this.toast.mostrar(`Resumen pagado: ${pesos(res.total)} (${res.cuotas_pagadas} cuota${res.cuotas_pagadas === 1 ? '' : 's'})`);
        this.datos.notificar();
      },
      error: (e) => { this.guardando.set(false); this.error.set(e.error?.message ?? 'No se pudo pagar el resumen'); },
    });
  }

  abrirConfig() {
    const c = this.r()?.cuenta;
    this.cfg = { limite: c?.limite_credito ?? null, cierre: c?.dia_cierre ?? null, venc: c?.dia_vencimiento ?? null };
    this.error.set('');
    this.config.set(true);
  }

  guardarConfig() {
    this.api.actualizarCuenta(this.id, { limite_credito: this.cfg.limite, dia_cierre: this.cfg.cierre, dia_vencimiento: this.cfg.venc }).subscribe({
      next: () => { this.config.set(false); this.toast.mostrar('Tarjeta actualizada'); this.datos.notificar(); },
      error: (e) => this.error.set(e.error?.message ?? 'No se pudo guardar'),
    });
  }
}
