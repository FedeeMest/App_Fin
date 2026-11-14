import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { DatosService } from '../core/datos.service';
import { ToastService } from '../core/toast.service';

import { MoneyPipe } from '../core/money.pipe';
import { SheetComponent } from '../ui/sheet';

import { Calendario, Categoria, Cuenta, EventoCalendario, Recurrente } from '../core/models';

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

@Component({
  selector: 'app-calendario',
  imports: [MoneyPipe, DatePipe, FormsModule, RouterLink, SheetComponent],
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-xl font-bold">Calendario</h1>
      <div class="flex items-center gap-1">
        <button class="btn-ghost" (click)="mover(-1)" aria-label="Mes anterior">‹</button>
        <span class="w-40 whitespace-nowrap text-center font-medium first-letter:uppercase">{{ tituloMes() }}</span>
        <button class="btn-ghost" (click)="mover(1)" aria-label="Mes siguiente">›</button>
      </div>
    </div>

    @if (cal(); as c) {
      <div class="mb-4 grid grid-cols-3 gap-2 sm:gap-4">
        <div class="card"><div class="text-xs text-slate-500">Ingresos previstos</div>
          <div class="font-semibold text-emerald-600">{{ c.total_ingresos | money }}</div></div>
        <div class="card"><div class="text-xs text-slate-500">Pagos previstos</div>
          <div class="font-semibold text-rose-600">{{ c.total_gastos | money }}</div></div>
        <div class="card"><div class="text-xs text-slate-500">Balance</div>
          <div class="font-semibold">{{ c.balance_previsto | money }}</div></div>
      </div>
      @if (c.pendiente_gastos > 0 || c.pendiente_ingresos > 0) {
        <p class="mb-4 text-xs text-slate-500">Sin confirmar: pagos {{ c.pendiente_gastos | money }} · ingresos {{ c.pendiente_ingresos | money }}</p>
      }
    }

    <div class="card mb-4 !p-2 sm:!p-4">
      <div class="grid grid-cols-7 text-center text-xs text-slate-400">
        @for (d of dias; track $index) { <div class="py-1">{{ d }}</div> }
      </div>
      <div class="grid grid-cols-7 gap-1">
        @for (celda of celdas(); track $index) {
          @if (celda) {
            <button type="button" class="relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm"
                    [class.bg-brand-600]="celda.fecha === seleccion()" [class.text-white]="celda.fecha === seleccion()"
                    [class.ring-1]="celda.fecha === hoy && celda.fecha !== seleccion()" [class.ring-brand-500]="celda.fecha === hoy"
                    (click)="seleccion.set(celda.fecha)">
              {{ celda.dia }}
              <span class="absolute bottom-1 flex gap-0.5">
                @if (celda.ingreso) { <i class="h-1.5 w-1.5 rounded-full bg-emerald-500"></i> }
                @if (celda.gasto) { <i class="h-1.5 w-1.5 rounded-full bg-rose-500"></i> }
              </span>
            </button>
          } @else { <div></div> }
        }
      </div>
    </div>

    <div class="card mb-6">
      <h2 class="mb-2 font-semibold">{{ seleccion() | date: "EEEE d 'de' MMMM" }}</h2>
      @for (e of eventosDelDia(); track $index) {
        <div class="flex items-center justify-between gap-2 border-t border-slate-100 py-2 first:border-0">
          <div class="min-w-0">
            <div class="truncate" [class.line-through]="e.confirmado" [class.text-slate-400]="e.confirmado">{{ e.descripcion }}</div>
            <div class="text-xs text-slate-500">
              {{ e.origen === 'CUOTA' ? e.detalle : 'Recurrente' }}
              @if (e.confirmado) { · <span class="text-emerald-600">✓ Confirmado</span> }
              @else if (e.fecha < hoy) { · <span class="text-amber-600">Vencido sin confirmar</span> }
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <span class="font-semibold" [class.text-emerald-600]="e.tipo === 'INGRESO'" [class.text-rose-600]="e.tipo === 'GASTO'">
              {{ e.tipo === 'INGRESO' ? '+' : '-' }}{{ e.monto | money }}
            </span>
            @if (!e.confirmado) {
              @if (e.tarjeta && e.cuentaId) {
                <a class="btn-ghost !px-3 !py-1.5 text-sm" [routerLink]="['/tarjetas', e.cuentaId]" [queryParams]="{ mes: e.fecha.slice(0, 7) }">Ver resumen</a>
              } @else { <button class="btn !px-3 !py-1.5 text-sm" (click)="abrirConfirmar(e)">Confirmar</button> }
            }
          </div>
        </div>
      } @empty { <p class="py-3 text-center text-sm text-slate-400">Sin eventos este día</p> }
    </div>

    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-lg font-bold">Ingresos y gastos fijos</h2>
      <button class="btn" (click)="abrir()">+ Nuevo</button>
    </div>
    <div class="space-y-2">
      @for (r of recurrentes(); track r.id) {
        <div class="card flex items-center justify-between gap-2" [class.opacity-50]="!r.activo">
          <div class="min-w-0">
            <div class="truncate font-medium">{{ r.descripcion }}</div>
            <div class="truncate text-xs text-slate-500">
              {{ etiquetaFrecuencia(r.frecuencia) }}
              @if (r.proxima_fecha) { · próximo {{ r.proxima_fecha | date: 'dd/MM/yyyy' }} } @else { · sin próximos }
              @if (!r.activo) { · pausado }
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <span class="font-semibold" [class.text-emerald-600]="r.tipo === 'INGRESO'" [class.text-rose-600]="r.tipo === 'GASTO'">
              {{ r.monto | money }}</span>
            <button class="btn-ghost !px-2" (click)="pausar(r)" [attr.aria-label]="r.activo ? 'Pausar' : 'Reanudar'">{{ r.activo ? '⏸' : '▶' }}</button>
            <button class="text-slate-300 hover:text-rose-600" (click)="borrar(r)" aria-label="Eliminar">✕</button>
          </div>
        </div>
      } @empty { <p class="card py-6 text-center text-slate-400">Cargá tu sueldo, alquiler o suscripciones para verlos acá</p> }
    </div>

    @if (confirmando(); as ev) {
      <app-sheet [abierto]="true" (cerrar)="confirmando.set(null)">
        <form class="space-y-3" (ngSubmit)="confirmar(ev)">
          <h2 class="text-lg font-bold">Confirmar {{ ev.tipo === 'INGRESO' ? 'cobro' : 'pago' }}</h2>
          <p class="text-sm text-slate-500">{{ ev.descripcion }}{{ ev.detalle ? ' · ' + ev.detalle : '' }} — se registra como movimiento real.</p>
          <div><label class="label">Monto real (ARS)</label>
            <input class="input" type="number" inputmode="decimal" step="0.01" min="0.01" name="cm" [(ngModel)]="c.monto" required /></div>
          <div><label class="label">Fecha en que ocurrió</label><input class="input" type="date" name="cf" [(ngModel)]="c.fecha" required /></div>
          <div><label class="label">Cuenta</label>
            <select class="input" name="cc" [(ngModel)]="c.cuentaId" required>
              @for (cu of cuentas(); track cu.id) { <option [ngValue]="cu.id">{{ cu.nombre }}</option> }
            </select></div>
          @if (errorConfirmar()) { <p class="rounded-lg bg-red-50 p-2 text-sm text-red-700">{{ errorConfirmar() }}</p> }
          <div class="flex gap-2 pt-1">
            <button type="button" class="btn-ghost flex-1" (click)="confirmando.set(null)">Cancelar</button>
            <button class="btn flex-1">Confirmar</button>
          </div>
        </form>
      </app-sheet>
    }

    @if (modal()) {
      <app-sheet [abierto]="true" (cerrar)="modal.set(false)">
        <form class="space-y-3" (ngSubmit)="guardar()">
          <h2 class="text-lg font-bold">Nuevo ingreso/gasto fijo</h2>
          <div class="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-center text-sm">
            <button type="button" class="rounded-lg py-2" [class.bg-white]="f.tipo === 'GASTO'" [class.font-semibold]="f.tipo === 'GASTO'" (click)="f.tipo = 'GASTO'">Gasto</button>
            <button type="button" class="rounded-lg py-2" [class.bg-white]="f.tipo === 'INGRESO'" [class.font-semibold]="f.tipo === 'INGRESO'" (click)="f.tipo = 'INGRESO'">Ingreso</button>
          </div>
          <div><label class="label">Descripción</label><input class="input" name="d" [(ngModel)]="f.descripcion" required maxlength="120" placeholder="Ej: Alquiler" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Monto (ARS)</label>
              <input class="input" type="number" inputmode="decimal" step="0.01" min="0.01" name="m" [(ngModel)]="f.monto" required /></div>
            <div><label class="label">Frecuencia</label>
              <select class="input" name="fr" [(ngModel)]="f.frecuencia">
                <option value="MENSUAL">Mensual</option><option value="SEMANAL">Semanal</option><option value="ANUAL">Anual</option>
              </select></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Primera fecha</label><input class="input" type="date" name="fi" [(ngModel)]="f.fecha_inicio" required /></div>
            <div><label class="label">Hasta (opcional)</label><input class="input" type="date" name="ff" [(ngModel)]="f.fecha_fin" /></div>
          </div>
          <div><label class="label">Cuenta</label>
            <select class="input" name="c" [(ngModel)]="f.cuentaId">
              <option [ngValue]="null">Sin cuenta</option>
              @for (c of cuentas(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
            </select></div>
          <div><label class="label">Categoría</label>
            <select class="input" name="cat" [(ngModel)]="f.categoriaId">
              <option [ngValue]="null">Sin categoría</option>
              @for (c of categoriasFiltradas(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
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
export class CalendarioPage {
  private api = inject(ApiService);
  private datos = inject(DatosService);
  private toast = inject(ToastService);
  dias = DIAS;
  hoy = new Date().toLocaleDateString('en-CA');
  mes = signal(this.hoy.slice(0, 7));
  seleccion = signal(this.hoy);
  cal = signal<Calendario | null>(null);
  recurrentes = signal<Recurrente[]>([]);
  cuentas = signal<Cuenta[]>([]);
  categorias = signal<Categoria[]>([]);
  modal = signal(false);
  error = signal('');
  f = this.vacio();
  confirmando = signal<EventoCalendario | null>(null);
  errorConfirmar = signal('');
  c = { monto: null as number | null, fecha: this.hoy, cuentaId: null as number | null };

  tituloMes = computed(() => {
    const [y, m] = this.mes().split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  });

  celdas = computed(() => {
    const [y, m] = this.mes().split('-').map(Number);
    const primero = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lunes = 0
    const total = new Date(y, m, 0).getDate();
    const eventos = this.cal()?.eventos ?? [];
    const out: ({ dia: number; fecha: string; ingreso: boolean; gasto: boolean } | null)[] = Array(primero).fill(null);
    for (let d = 1; d <= total; d++) {
      const fecha = `${this.mes()}-${String(d).padStart(2, '0')}`;
      const del = eventos.filter((e) => e.fecha === fecha);
      out.push({ dia: d, fecha, ingreso: del.some((e) => e.tipo === 'INGRESO'), gasto: del.some((e) => e.tipo === 'GASTO') });
    }
    return out;
  });

  eventosDelDia = computed(() => (this.cal()?.eventos ?? []).filter((e) => e.fecha === this.seleccion()));
  categoriasFiltradas = () => this.categorias().filter((c) => c.tipo === this.f.tipo);

  constructor() {
    this.api.cuentas().subscribe((c) => this.cuentas.set(c));
    this.api.categorias().subscribe((c) => this.categorias.set(c));
    this.cargarRecurrentes();
    effect(() => {
      const mes = this.mes();
      this.api.calendario(mes).subscribe((c) => this.cal.set(c));
    });
  }

  private vacio() {
    return { tipo: 'GASTO' as 'GASTO' | 'INGRESO', descripcion: '', monto: null as number | null, frecuencia: 'MENSUAL',
      fecha_inicio: new Date().toLocaleDateString('en-CA'), fecha_fin: '', cuentaId: null as number | null, categoriaId: null as number | null };
  }

  mover(delta: number) {
    const [y, m] = this.mes().split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const nuevo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.mes.set(nuevo);
    this.seleccion.set(nuevo === this.hoy.slice(0, 7) ? this.hoy : `${nuevo}-01`);
  }

  etiquetaFrecuencia(f: string) { return { SEMANAL: 'Semanal', MENSUAL: 'Mensual', ANUAL: 'Anual' }[f] ?? f; }

  cargarRecurrentes() { this.api.recurrentes().subscribe((r) => this.recurrentes.set(r)); }
  recargar() { this.cargarRecurrentes(); this.api.calendario(this.mes()).subscribe((c) => this.cal.set(c)); }

  abrir() { this.f = this.vacio(); this.error.set(''); this.modal.set(true); }

  guardar() {
    this.api.crearRecurrente({ ...this.f, fecha_fin: this.f.fecha_fin || null }).subscribe({
      next: () => { this.modal.set(false); this.recargar(); this.toast.mostrar('Guardado'); },
      error: (e) => this.error.set(e.error?.message ?? 'No se pudo guardar'),
    });
  }

  abrirConfirmar(e: EventoCalendario) {
    // Si todavía no llegó la fecha, se propone hoy igualmente: lo normal es confirmar cuando el pago ya ocurrió.
    this.c = { monto: e.monto, fecha: this.hoy, cuentaId: e.cuentaId ?? this.cuentas()[0]?.id ?? null };
    this.errorConfirmar.set('');
    this.confirmando.set(e);
  }

  confirmar(e: EventoCalendario) {
    this.api.confirmarPago({
      origen: e.origen, id: e.origenId, fecha: e.fecha, nro_cuota: e.nroCuota,
      cuentaId: this.c.cuentaId, monto: Number(this.c.monto), fecha_real: this.c.fecha,
    }).subscribe({
      next: (r) => {
        this.confirmando.set(null); this.recargar(); this.datos.notificar();
        this.toast.mostrar('Registrado como movimiento', { accion: { etiqueta: 'Deshacer', ejecutar: () => this.api.borrarTransaccion(r.id).subscribe(() => { this.recargar(); this.datos.notificar(); }) } });
      },
      error: (er) => this.errorConfirmar.set(er.error?.message ?? 'No se pudo confirmar'),
    });
  }

  pausar(r: Recurrente) { this.api.pausarRecurrente(r.id, !r.activo).subscribe(() => this.recargar()); }

  borrar(r: Recurrente) {
    if (!confirm(`¿Eliminar "${r.descripcion}"?`)) return;
    this.api.borrarRecurrente(r.id).subscribe(() => this.recargar());
  }
}
