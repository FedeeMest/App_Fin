import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { DatosService } from '../core/datos.service';
import { MoneyPipe } from '../core/money.pipe';
import { QuickAddService } from '../core/quick-add.service';
import { Resumen, Transaccion } from '../core/models';
import { IconComponent } from '../ui/icon';

type FiltroTipo = '' | 'GASTO' | 'INGRESO' | 'TRANSFERENCIA';
const POR_PAGINA = 30;

@Component({
  selector: 'app-movimientos',
  imports: [FormsModule, MoneyPipe, IconComponent],
  template: `
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-2xl font-bold">Movimientos</h1>
      <div class="flex items-center">
        <button class="btn-ghost tap !px-2" (click)="mover(-1)" aria-label="Mes anterior"><app-icon nombre="chevron-left" /></button>
        <span class="w-40 whitespace-nowrap text-center font-medium first-letter:uppercase">{{ tituloMes() }}</span>
        <button class="btn-ghost tap !px-2" (click)="mover(1)" aria-label="Mes siguiente"><app-icon nombre="chevron-right" /></button>
      </div>
    </div>

    <!-- Resumen del mes -->
    <div class="mb-3 grid grid-cols-3 gap-2">
      <div class="card !p-3"><div class="text-xs text-slate-500">Ingresos</div><div class="font-semibold text-emerald-600">{{ resumen()?.ingresos ?? 0 | money }}</div></div>
      <div class="card !p-3"><div class="text-xs text-slate-500">Gastos</div><div class="font-semibold text-rose-600">{{ resumen()?.gastos ?? 0 | money }}</div></div>
      <div class="card !p-3"><div class="text-xs text-slate-500">Balance</div><div class="font-semibold">{{ resumen()?.balance ?? 0 | money }}</div></div>
    </div>

    <!-- Filtros -->
    <div class="mb-3 space-y-2">
      <div class="relative">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><app-icon nombre="search" [tam]="18" /></span>
        <input class="input !pl-10" type="search" placeholder="Buscar por nota o categoría" [ngModel]="busqueda()" (ngModelChange)="buscar($event)" aria-label="Buscar movimientos" />
      </div>
      <div class="flex gap-2 overflow-x-auto pb-1" role="tablist">
        @for (f of filtros; track f.v) {
          <button class="chip" [class.chip-on]="tipo() === f.v" role="tab" [attr.aria-selected]="tipo() === f.v" (click)="tipo.set(f.v)">{{ f.l }}</button>
        }
      </div>
    </div>

    <!-- Lista agrupada por día -->
    @if (cargando()) {
      <div class="space-y-2"><div class="skeleton h-16"></div><div class="skeleton h-16"></div><div class="skeleton h-16"></div></div>
    } @else {
      @for (g of grupos(); track g.fecha) {
        <div class="mb-1 mt-4 flex items-baseline justify-between px-1 text-sm">
          <span class="font-semibold first-letter:uppercase">{{ g.titulo }}</span>
          @if (g.neto !== 0) { <span class="text-xs text-slate-500">{{ g.neto > 0 ? '+' : '' }}{{ g.neto | money }}</span> }
        </div>
        <div class="card divide-y divide-slate-100 !p-0">
          @for (t of g.items; track t.id) {
            <button class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50" (click)="qa.abrir({ editar: t })">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                    [class]="t.tipo === 'INGRESO' ? 'bg-emerald-50 text-emerald-600' : t.tipo === 'GASTO' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'">
                <app-icon [nombre]="t.tipo === 'INGRESO' ? 'arrow-down' : t.tipo === 'GASTO' ? 'arrow-up' : 'swap'" [tam]="18" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ t.categoria?.nombre ?? (t.tipo === 'TRANSFERENCIA' ? 'Transferencia' : 'Sin categoría') }}</span>
                <span class="block truncate text-xs text-slate-500">
                  {{ t.tipo === 'TRANSFERENCIA' ? t.cuenta.nombre + ' → ' + (t.cuenta_destino?.nombre ?? '') : t.cuenta.nombre }}{{ t.nota ? ' · ' + t.nota : '' }}
                </span>
              </span>
              <span class="font-semibold" [class.text-emerald-600]="t.tipo === 'INGRESO'" [class.text-rose-600]="t.tipo === 'GASTO'">
                {{ t.tipo === 'INGRESO' ? '+' : t.tipo === 'GASTO' ? '-' : '' }}{{ +t.monto | money }}
              </span>
            </button>
          }
        </div>
      } @empty {
        <div class="card mt-4 py-10 text-center">
          @if (busqueda() || tipo()) {
            <p class="text-slate-500">No hay movimientos con ese filtro.</p>
            <button class="btn-ghost mt-2 text-brand-700" (click)="limpiar()">Quitar filtros</button>
          } @else {
            <p class="text-slate-500">No hay movimientos en {{ tituloMes() }}.</p>
            <button class="btn mt-3" (click)="qa.abrir()">Cargar un movimiento</button>
          }
        </div>
      }

      @if (total() > items().length) {
        <button class="btn-ghost tap mt-4 w-full" (click)="cargarMas()">Ver más ({{ total() - items().length }})</button>
      }
    }
  `,
})
export class MovimientosPage {
  private api = inject(ApiService);
  private datos = inject(DatosService);
  qa = inject(QuickAddService);

  filtros: { v: FiltroTipo; l: string }[] = [
    { v: '', l: 'Todos' }, { v: 'GASTO', l: 'Gastos' }, { v: 'INGRESO', l: 'Ingresos' }, { v: 'TRANSFERENCIA', l: 'Transferencias' },
  ];
  mes = signal(new Date().toLocaleDateString('en-CA').slice(0, 7));
  tipo = signal<FiltroTipo>('');
  busqueda = signal('');
  private consulta = signal('');   // la búsqueda se aplica unos instantes después de escribir
  private temporizador?: ReturnType<typeof setTimeout>;

  items = signal<Transaccion[]>([]);
  total = signal(0);
  resumen = signal<Resumen | null>(null);
  cargando = signal(true);
  private pagina = 1;

  tituloMes = computed(() => {
    const [y, m] = this.mes().split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  });

  grupos = computed(() => {
    const hoy = new Date().toLocaleDateString('en-CA');
    const ayerD = new Date(); ayerD.setDate(ayerD.getDate() - 1);
    const ayer = ayerD.toLocaleDateString('en-CA');
    const mapa = new Map<string, Transaccion[]>();
    for (const t of this.items()) mapa.set(t.fecha, [...(mapa.get(t.fecha) ?? []), t]);
    return [...mapa.entries()].map(([fecha, items]) => {
      const [y, m, d] = fecha.split('-').map(Number);
      const titulo = fecha === hoy ? 'Hoy' : fecha === ayer ? 'Ayer'
        : new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });
      const neto = items.reduce((s, t) => s + (t.tipo === 'INGRESO' ? Number(t.monto) : t.tipo === 'GASTO' ? -Number(t.monto) : 0), 0);
      return { fecha, titulo, items, neto };
    });
  });

  constructor() {
    // Recarga al cambiar mes, filtro, búsqueda o cuando algo se creó/editó/borró en cualquier parte
    effect(() => {
      this.mes(); this.tipo(); this.consulta(); this.datos.version();
      untracked(() => this.cargar());
    });
  }

  buscar(texto: string) {
    this.busqueda.set(texto);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.consulta.set(texto.trim()), 300);
  }

  limpiar() { this.busqueda.set(''); this.consulta.set(''); this.tipo.set(''); }

  mover(delta: number) {
    const [y, m] = this.mes().split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.mes.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  private filtros_() {
    const [y, m] = this.mes().split('-').map(Number);
    const ultimo = new Date(y, m, 0).getDate();
    return { desde: `${this.mes()}-01`, hasta: `${this.mes()}-${String(ultimo).padStart(2, '0')}`, tipo: this.tipo(), q: this.consulta() };
  }

  private cargar() {
    this.pagina = 1;
    this.api.transacciones({ ...this.filtros_(), page: 1, limit: POR_PAGINA }).subscribe({
      next: (r) => { this.items.set(r.items); this.total.set(r.total); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
    this.api.resumen(this.mes()).subscribe((r) => this.resumen.set(r));
  }

  cargarMas() {
    this.pagina += 1;
    this.api.transacciones({ ...this.filtros_(), page: this.pagina, limit: POR_PAGINA }).subscribe((r) => {
      this.items.set([...this.items(), ...r.items]);
      this.total.set(r.total);
    });
  }
}
