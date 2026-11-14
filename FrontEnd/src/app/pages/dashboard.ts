import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { DatosService } from '../core/datos.service';
import { MoneyPipe, pesos } from '../core/money.pipe';
import { PrivacyService } from '../core/privacy.service';
import { QuickAddService } from '../core/quick-add.service';
import { ToastService } from '../core/toast.service';
import { Calendario, EventoCalendario, Presupuestos, Resumen, ResumenCuotas, Transaccion } from '../core/models';
import { IconComponent } from '../ui/icon';

const fechaLocal = (dias = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('en-CA');
};

/** Inicio: el centro de control. Todo lo importante del mes y las acciones frecuentes, sin cambiar de pantalla. */
@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink, MoneyPipe, IconComponent],
  template: `
    <div class="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Hola, {{ primerNombre() }}</h1>
        <p class="text-sm text-slate-500 first-letter:uppercase">{{ hoyTexto }}</p>
      </div>
    </div>

    @if (cargando()) {
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="min-w-0 space-y-4 lg:col-span-2"><div class="skeleton h-44"></div><div class="skeleton h-24"></div><div class="skeleton h-56"></div></div>
        <div class="space-y-4"><div class="skeleton h-40"></div><div class="skeleton h-40"></div></div>
      </div>
    } @else {
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <!-- Columna principal -->
        <div class="min-w-0 space-y-4 lg:col-span-2">
          <!-- Saldo -->
          <section class="rounded-3xl bg-gradient-to-br from-brand-600 to-emerald-800 p-5 text-white shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-sm opacity-80">Saldo total</span>
              <button class="rounded-full p-1.5 opacity-80 hover:bg-white/10 hover:opacity-100" (click)="privacy.alternar()"
                      [attr.aria-label]="privacy.oculto() ? 'Mostrar montos' : 'Ocultar montos'">
                <app-icon [nombre]="privacy.oculto() ? 'eye-off' : 'eye'" [tam]="18" />
              </button>
            </div>
            <div class="mt-1 text-4xl font-bold tracking-tight">{{ saldoTotal() | money }}</div>
            <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-2xl bg-white/10 p-3">
                <div class="flex items-center gap-1 opacity-80"><app-icon nombre="arrow-down" [tam]="14" /> Ingresos</div>
                <div class="mt-0.5 text-lg font-semibold">{{ resumen()?.ingresos ?? 0 | money }}</div>
              </div>
              <div class="rounded-2xl bg-white/10 p-3">
                <div class="flex items-center gap-1 opacity-80"><app-icon nombre="arrow-up" [tam]="14" /> Gastos</div>
                <div class="mt-0.5 text-lg font-semibold">{{ resumen()?.gastos ?? 0 | money }}</div>
              </div>
            </div>
            @if (presu()?.diario; as d) {
              <a routerLink="/presupuestos" class="mt-3 flex items-center justify-between rounded-2xl bg-white/15 px-3 py-2.5 text-sm">
                <span>Hoy podés gastar <b class="text-base">{{ redondear(d.por_dia) | money }}</b></span>
                <span class="flex items-center gap-1 text-xs opacity-80">{{ d.dias_restantes }} día(s) <app-icon nombre="chevron-right" [tam]="14" /></span>
              </a>
            }
          </section>

          <!-- Acciones rápidas -->
          <section class="grid grid-cols-4 gap-2" aria-label="Acciones rápidas">
            @for (a of acciones; track a.l) {
              <button class="card tap flex flex-col items-center gap-1.5 !px-1 !py-3 text-xs font-medium transition active:scale-95" (click)="a.fn()">
                <span class="grid h-10 w-10 place-items-center rounded-full" [class]="a.color"><app-icon [nombre]="a.icono" [tam]="20" /></span>
                {{ a.l }}
              </button>
            }
          </section>

          <!-- Primeros pasos (solo mientras no hay movimientos) -->
          @if (sinMovimientos()) {
            <section class="card border-l-4 border-brand-500">
              <h2 class="font-semibold">Empezá en 3 pasos</h2>
              <p class="mb-3 text-sm text-slate-500">Con esto tu panel se llena de información útil.</p>
              <ol class="space-y-2 text-sm">
                <li class="flex items-center justify-between gap-2"><span>1. Cargá tu primer gasto o ingreso</span>
                  <button class="btn !px-3 !py-1.5" (click)="qa.abrir()">Cargar</button></li>
                <li class="flex items-center justify-between gap-2"><span>2. Definí cuánto querés gastar por mes</span>
                  <a routerLink="/presupuestos" class="btn-ghost !px-3 !py-1.5 text-brand-700">Presupuesto</a></li>
                <li class="flex items-center justify-between gap-2"><span>3. Cargá tu sueldo y gastos fijos</span>
                  <a routerLink="/calendario" class="btn-ghost !px-3 !py-1.5 text-brand-700">Calendario</a></li>
              </ol>
            </section>
          }

          <!-- Próximos pagos -->
          <section class="card">
            <div class="mb-2 flex items-center justify-between">
              <h2 class="font-semibold">Próximos 7 días</h2>
              <a routerLink="/calendario" class="flex items-center text-sm text-brand-700">Calendario <app-icon nombre="chevron-right" [tam]="16" /></a>
            </div>
            @for (e of proximos(); track e.origen + e.origenId + e.fecha + e.nroCuota) {
              <div class="flex items-center justify-between gap-2 border-t border-slate-100 py-2.5 first:border-0">
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ e.descripcion }}</div>
                  <div class="text-xs" [class.text-amber-600]="e.fecha < hoy" [class.text-slate-500]="e.fecha >= hoy">
                    {{ e.fecha < hoy ? 'Vencido · ' : '' }}{{ e.fecha | date: 'EEE d MMM' }}{{ e.detalle ? ' · ' + e.detalle : '' }}
                  </div>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <span class="font-semibold" [class.text-emerald-600]="e.tipo === 'INGRESO'">{{ e.tipo === 'INGRESO' ? '+' : '' }}{{ e.monto | money }}</span>
                  @if (e.tarjeta && e.cuentaId) {
                    <a class="btn-ghost tap !px-3 !py-1.5 text-sm" [routerLink]="['/tarjetas', e.cuentaId]" [queryParams]="{ mes: e.fecha.slice(0, 7) }">Resumen</a>
                  } @else {
                    <button class="btn tap !px-3 !py-1.5 text-sm" [disabled]="confirmando() === clave(e)" (click)="confirmar(e)">
                      {{ e.tipo === 'INGRESO' ? 'Cobrado' : 'Pagado' }}
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <p class="py-4 text-center text-sm text-slate-400">No tenés pagos ni cobros previstos para esta semana</p>
            }
          </section>

          <!-- Últimos movimientos -->
          <section class="card">
            <div class="mb-2 flex items-center justify-between">
              <h2 class="font-semibold">Últimos movimientos</h2>
              <a routerLink="/movimientos" class="flex items-center text-sm text-brand-700">Ver todos <app-icon nombre="chevron-right" [tam]="16" /></a>
            </div>
            @for (t of recientes(); track t.id) {
              <button class="flex w-full items-center gap-3 border-t border-slate-100 py-2.5 text-left first:border-0" (click)="qa.abrir({ editar: t })">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                      [class]="t.tipo === 'INGRESO' ? 'bg-emerald-50 text-emerald-600' : t.tipo === 'GASTO' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'">
                  <app-icon [nombre]="t.tipo === 'INGRESO' ? 'arrow-down' : t.tipo === 'GASTO' ? 'arrow-up' : 'swap'" [tam]="18" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-medium">{{ t.categoria?.nombre ?? (t.tipo === 'TRANSFERENCIA' ? 'Transferencia' : 'Sin categoría') }}</span>
                  <span class="block truncate text-xs text-slate-500">{{ t.fecha | date: 'd MMM' }} · {{ t.cuenta.nombre }}{{ t.nota ? ' · ' + t.nota : '' }}</span>
                </span>
                <span class="font-semibold" [class.text-emerald-600]="t.tipo === 'INGRESO'" [class.text-rose-600]="t.tipo === 'GASTO'">
                  {{ t.tipo === 'INGRESO' ? '+' : t.tipo === 'GASTO' ? '-' : '' }}{{ +t.monto | money }}
                </span>
              </button>
            } @empty {
              <div class="py-6 text-center">
                <p class="text-sm text-slate-500">Todavía no cargaste movimientos.</p>
                <button class="btn mt-3" (click)="qa.abrir()">Cargar el primero</button>
              </div>
            }
          </section>
        </div>

        <!-- Columna lateral -->
        <div class="min-w-0 space-y-4">
          <!-- Presupuestos -->
          <section class="card">
            <div class="mb-2 flex items-center justify-between">
              <h2 class="font-semibold">Presupuestos</h2>
              <a routerLink="/presupuestos" class="flex items-center text-sm text-brand-700">Ver <app-icon nombre="chevron-right" [tam]="16" /></a>
            </div>
            @for (p of presupuestosTop(); track p.id) {
              <div class="py-1.5">
                <div class="flex items-baseline justify-between text-sm">
                  <span class="truncate font-medium">{{ p.categoria?.nombre ?? 'Total del mes' }}</span>
                  <span [class.text-rose-600]="p.restante < 0" class="text-xs text-slate-500">
                    {{ p.restante >= 0 ? 'Quedan ' : 'Excedido ' }}{{ abs(p.restante) | money }}</span>
                </div>
                <div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full" [style.width.%]="min(p.porcentaje, 100)"
                       [class.bg-brand-500]="p.estado === 'OK'" [class.bg-amber-500]="p.estado === 'ATENCION'" [class.bg-rose-500]="p.estado === 'EXCEDIDO'"></div>
                </div>
              </div>
            } @empty {
              <p class="py-2 text-sm text-slate-500">Poné un límite mensual y mirá cuánto te queda.</p>
              <a routerLink="/presupuestos" class="btn-ghost -ml-3 text-brand-700">Definir presupuesto</a>
            }
          </section>

          <!-- Cuentas -->
          <section class="card">
            <div class="mb-2 flex items-center justify-between">
              <h2 class="font-semibold">Cuentas</h2>
              <a routerLink="/cuentas" class="flex items-center text-sm text-brand-700">Gestionar <app-icon nombre="chevron-right" [tam]="16" /></a>
            </div>
            @for (c of datos.cuentas(); track c.id) {
              @if (c.tipo === 'TARJETA') {
                <a [routerLink]="['/tarjetas', c.id]" class="flex items-center justify-between border-t border-slate-100 py-2 text-sm first:border-0">
                  <span class="flex items-center gap-2"><app-icon nombre="card" [tam]="16" /> {{ c.nombre }}</span>
                  <span class="text-right">
                    @if (c.disponible != null) { <span class="font-semibold">{{ c.disponible | money }}</span> <span class="ml-1 text-xs text-slate-500">disp.</span> }
                    @else { <span class="font-semibold">{{ c.deuda_cuotas ?? 0 | money }}</span> <span class="ml-1 text-xs text-slate-500">en cuotas</span> }
                  </span>
                </a>
              } @else {
                <div class="flex items-center justify-between border-t border-slate-100 py-2 text-sm first:border-0">
                  <span class="flex items-center gap-2"><app-icon nombre="wallet" [tam]="16" /> {{ c.nombre }}</span>
                  <span class="font-semibold" [class.text-rose-600]="c.saldo < 0">{{ c.saldo | money }}</span>
                </div>
              }
            }
          </section>

          <!-- Cuotas -->
          @if (cuotas(); as q) {
            @if (q.compras_activas > 0) {
              <a routerLink="/cuotas" class="card block">
                <div class="mb-1 flex items-center justify-between">
                  <h2 class="font-semibold">Compras en cuotas</h2>
                  <app-icon nombre="chevron-right" [tam]="16" />
                </div>
                <div class="flex items-baseline justify-between text-sm"><span class="text-slate-500">Este mes</span><b>{{ q.total_mes_actual | money }}</b></div>
                <div class="flex items-baseline justify-between text-sm"><span class="text-slate-500">Deuda total</span><b>{{ q.deuda_total | money }}</b></div>
              </a>
            }
          }

          <!-- Gastos por categoría -->
          <section class="card">
            <h2 class="mb-2 font-semibold">En qué gastás este mes</h2>
            @for (c of categoriasTop(); track c.nombre) {
              <div class="py-1.5">
                <div class="flex items-baseline justify-between text-sm"><span class="truncate">{{ c.nombre }}</span><span class="font-medium">{{ c.monto | money }}</span></div>
                <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-brand-500" [style.width.%]="c.pct"></div></div>
              </div>
            } @empty { <p class="py-2 text-sm text-slate-400">Sin gastos este mes</p> }
          </section>
        </div>
      </div>
    }
  `,
})
export class DashboardPage {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private router = inject(Router);
  datos = inject(DatosService);
  qa = inject(QuickAddService);
  privacy = inject(PrivacyService);

  hoy = fechaLocal();
  hoyTexto = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  min = Math.min;
  redondear = Math.round;
  abs = Math.abs;

  cargando = signal(true);
  resumen = signal<Resumen | null>(null);
  presu = signal<Presupuestos | null>(null);
  cuotas = signal<ResumenCuotas | null>(null);
  eventos = signal<EventoCalendario[]>([]);
  recientes = signal<Transaccion[]>([]);
  totalMovimientos = signal(0);
  confirmando = signal('');

  primerNombre = computed(() => this.auth.nombre().split(' ')[0] || 'bienvenido');
  saldoTotal = computed(() => this.datos.cuentas().reduce((s, c) => s + c.saldo, 0));
  sinMovimientos = computed(() => !this.cargando() && this.totalMovimientos() === 0);
  presupuestosTop = computed(() => (this.presu()?.items ?? []).slice(0, 4));

  /** Pagos y cobros sin confirmar que vencieron o vencen en los próximos 7 días. */
  proximos = computed(() => {
    const limite = fechaLocal(7);
    return this.eventos().filter((e) => !e.confirmado && e.fecha <= limite).slice(0, 6);
  });

  categoriasTop = computed(() => {
    const por = this.resumen()?.porCategoria ?? {};
    const filas = Object.entries(por).map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto).slice(0, 5);
    const max = filas[0]?.monto ?? 0;
    return filas.map((f) => ({ ...f, pct: max ? (f.monto / max) * 100 : 0 }));
  });

  acciones = [
    { l: 'Gasto', icono: 'arrow-up' as const, color: 'bg-rose-50 text-rose-600', fn: () => this.qa.abrir({ tipo: 'GASTO' }) },
    { l: 'Ingreso', icono: 'arrow-down' as const, color: 'bg-emerald-50 text-emerald-600', fn: () => this.qa.abrir({ tipo: 'INGRESO' }) },
    { l: 'Transferir', icono: 'swap' as const, color: 'bg-sky-50 text-sky-600', fn: () => this.qa.abrir({ tipo: 'TRANSFERENCIA' }) },
    { l: 'En cuotas', icono: 'card' as const, color: 'bg-violet-50 text-violet-600', fn: () => this.router.navigate(['/cuotas'], { queryParams: { nueva: 1 } }) },
  ];

  constructor() {
    effect(() => { this.datos.version(); untracked(() => this.cargar()); });
  }

  clave(e: EventoCalendario) { return `${e.origen}-${e.origenId}-${e.fecha}-${e.nroCuota}`; }

  private cargar() {
    const mes = this.hoy.slice(0, 7);
    const [y, m] = mes.split('-').map(Number);
    const siguiente = new Date(y, m, 1).toLocaleDateString('en-CA').slice(0, 7);
    let pendientes = 6;
    const listo = () => { if (--pendientes === 0) this.cargando.set(false); };

    this.api.resumen(mes).subscribe({ next: (r) => this.resumen.set(r), complete: listo, error: listo });
    this.api.presupuestos(mes).subscribe({ next: (p) => this.presu.set(p), complete: listo, error: listo });
    this.api.resumenCuotas(1).subscribe({ next: (q) => this.cuotas.set(q), complete: listo, error: listo });
    this.api.transacciones({ limit: 6 }).subscribe({ next: (r) => { this.recientes.set(r.items); this.totalMovimientos.set(r.total); }, complete: listo, error: listo });
    // Este mes y el siguiente, para que los pagos de fin de mes muestren también los del comienzo del próximo
    let cal: Calendario[] = [];
    const juntar = (c: Calendario) => { cal = [...cal, c]; this.eventos.set(cal.flatMap((x) => x.eventos).sort((a, b) => a.fecha.localeCompare(b.fecha))); };
    this.api.calendario(mes).subscribe({ next: juntar, complete: listo, error: listo });
    this.api.calendario(siguiente).subscribe({ next: juntar, complete: listo, error: listo });
  }

  /** Confirma el pago en un toque con los datos previstos; se puede deshacer desde el aviso. */
  confirmar(e: EventoCalendario) {
    const cuentaId = e.cuentaId ?? this.datos.cuentas()[0]?.id ?? null;
    if (!cuentaId) { this.toast.error('Primero creá una cuenta'); return; }
    this.confirmando.set(this.clave(e));
    this.api.confirmarPago({ origen: e.origen, id: e.origenId, fecha: e.fecha, nro_cuota: e.nroCuota, cuentaId, monto: e.monto, fecha_real: this.hoy }).subscribe({
      next: (r) => {
        this.confirmando.set('');
        this.toast.mostrar(`${e.tipo === 'INGRESO' ? 'Cobro' : 'Pago'} de ${pesos(e.monto)} registrado`, {
          accion: { etiqueta: 'Deshacer', ejecutar: () => this.api.borrarTransaccion(r.id).subscribe(() => this.datos.notificar()) },
        });
        this.datos.notificar();
      },
      error: (er) => { this.confirmando.set(''); this.toast.error(er.error?.message ?? 'No se pudo confirmar'); },
    });
  }
}
