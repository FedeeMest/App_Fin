import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { DatosService } from '../core/datos.service';
import { QuickAddService } from '../core/quick-add.service';
import { ToastService } from '../core/toast.service';
import { pesos } from '../core/money.pipe';
import { TipoTransaccion } from '../core/models';
import { SheetComponent } from './sheet';

const fechaLocal = (diasAtras = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toLocaleDateString('en-CA');
};
const leer = <T,>(clave: string, defecto: T): T => {
  try { return JSON.parse(localStorage.getItem(clave) ?? '') as T; } catch { return defecto; }
};
const guardar = (clave: string, valor: unknown) => { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ } };

/** Carga rápida: monto grande, categoría en un toque, cuenta y fecha recordadas. Sirve también para editar. */
@Component({
  selector: 'app-quick-add',
  imports: [FormsModule, SheetComponent],
  template: `
    <app-sheet [abierto]="qa.abierto()" [titulo]="editandoId() ? 'Editar movimiento' : 'Nuevo movimiento'" (cerrar)="qa.cerrar()">
      <form (ngSubmit)="enviar(false)" class="space-y-4">
        <div class="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 text-center text-sm font-medium" role="tablist">
          @for (t of tipos; track t.v) {
            <button type="button" role="tab" [attr.aria-selected]="tipo() === t.v" class="tap rounded-xl transition"
                    [class.bg-white]="tipo() === t.v" [class.shadow-sm]="tipo() === t.v" [class.text-slate-500]="tipo() !== t.v"
                    [class.text-rose-600]="tipo() === t.v && t.v === 'GASTO'" [class.text-emerald-600]="tipo() === t.v && t.v === 'INGRESO'"
                    (click)="cambiarTipo(t.v)">{{ t.l }}</button>
          }
        </div>

        <div class="flex items-baseline justify-center gap-1 py-1">
          <span class="text-3xl font-semibold text-slate-300">$</span>
          <input id="qa-monto" name="monto" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0" autocomplete="off"
                 class="w-56 bg-transparent text-center text-5xl font-bold outline-none placeholder:text-slate-200"
                 [class.text-rose-600]="tipo() === 'GASTO'" [class.text-emerald-600]="tipo() === 'INGRESO'"
                 [(ngModel)]="monto" aria-label="Monto en pesos" />
        </div>

        @if (tipo() !== 'TRANSFERENCIA') {
          <div>
            <div class="label">Categoría</div>
            <div class="flex flex-wrap gap-2">
              @for (c of categoriasTipo(); track c.id) {
                <button type="button" class="chip" [class.chip-on]="categoriaId === c.id" (click)="categoriaId = categoriaId === c.id ? null : c.id">{{ c.nombre }}</button>
              } @empty { <span class="text-sm text-slate-400">Todavía no tenés categorías de este tipo</span> }
            </div>
          </div>
        }

        <div class="grid gap-3" [class.grid-cols-2]="tipo() === 'TRANSFERENCIA'">
          <div>
            <label class="label" for="qa-cuenta">{{ tipo() === 'TRANSFERENCIA' ? 'Desde' : 'Cuenta' }}</label>
            <select id="qa-cuenta" class="input" name="cuenta" [(ngModel)]="cuentaId">
              @for (c of datos.cuentas(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
            </select>
          </div>
          @if (tipo() === 'TRANSFERENCIA') {
            <div>
              <label class="label" for="qa-destino">Hacia</label>
              <select id="qa-destino" class="input" name="destino" [(ngModel)]="cuentaDestinoId">
                <option [ngValue]="null">Elegí…</option>
                @for (c of datos.cuentas(); track c.id) { @if (c.id !== cuentaId) { <option [ngValue]="c.id">{{ c.nombre }}</option> } }
              </select>
            </div>
          }
        </div>

        <div>
          <div class="label">Fecha</div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="chip" [class.chip-on]="fecha === hoy" (click)="fecha = hoy; otraFecha.set(false)">Hoy</button>
            <button type="button" class="chip" [class.chip-on]="fecha === ayer" (click)="fecha = ayer; otraFecha.set(false)">Ayer</button>
            <button type="button" class="chip" [class.chip-on]="otraFecha() || (fecha !== hoy && fecha !== ayer)" (click)="otraFecha.set(true)">Otra</button>
            @if (otraFecha() || (fecha !== hoy && fecha !== ayer)) {
              <input type="date" class="input !w-auto" name="fecha" [(ngModel)]="fecha" aria-label="Fecha" />
            }
          </div>
        </div>

        @if (mostrarNota() || nota) {
          <div><label class="label" for="qa-nota">Nota</label>
            <input id="qa-nota" class="input" name="nota" maxlength="200" [(ngModel)]="nota" placeholder="Ej: cena con amigos" /></div>
        } @else {
          <button type="button" class="text-sm font-medium text-brand-700" (click)="mostrarNota.set(true)">+ Agregar nota</button>
        }

        @if (error()) { <p class="rounded-xl bg-rose-50 p-2.5 text-sm text-rose-700" role="alert">{{ error() }}</p> }

        <div class="space-y-2 pt-1">
          <button class="btn tap w-full text-base" [disabled]="guardando()">{{ editandoId() ? 'Guardar cambios' : 'Guardar' }}</button>
          @if (!editandoId()) {
            <button type="button" class="btn-ghost tap w-full" [disabled]="guardando()" (click)="enviar(true)">Guardar y cargar otro</button>
          } @else {
            <button type="button" class="tap w-full rounded-xl py-2 text-sm font-medium text-rose-600 hover:bg-rose-50" (click)="eliminar()">Eliminar movimiento</button>
          }
        </div>
      </form>
    </app-sheet>
  `,
})
export class QuickAddComponent {
  qa = inject(QuickAddService);
  datos = inject(DatosService);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  tipos: { v: TipoTransaccion; l: string }[] = [{ v: 'GASTO', l: 'Gasto' }, { v: 'INGRESO', l: 'Ingreso' }, { v: 'TRANSFERENCIA', l: 'Transferencia' }];
  hoy = fechaLocal();
  ayer = fechaLocal(1);

  tipo = signal<TipoTransaccion>('GASTO');
  editandoId = signal<number | null>(null);
  error = signal('');
  guardando = signal(false);
  mostrarNota = signal(false);
  otraFecha = signal(false);

  monto: number | null = null;
  cuentaId: number | null = null;
  cuentaDestinoId: number | null = null;
  categoriaId: number | null = null;
  fecha = this.hoy;
  nota = '';

  /** Las categorías más usadas aparecen primero. */
  categoriasTipo = computed(() => {
    const uso = leer<Record<number, number>>('usoCategorias', {});
    return this.datos.categorias()
      .filter((c) => c.tipo === this.tipo())
      .sort((a, b) => (uso[b.id] ?? 0) - (uso[a.id] ?? 0) || a.nombre.localeCompare(b.nombre));
  });

  constructor() {
    effect(() => { if (this.qa.abierto()) untracked(() => this.preparar()); });
  }

  private preparar() {
    const { editar, tipo } = this.qa.preset();
    this.hoy = fechaLocal();
    this.ayer = fechaLocal(1);
    this.error.set('');
    this.guardando.set(false);
    this.otraFecha.set(false);
    if (editar) {
      this.editandoId.set(editar.id);
      this.tipo.set(editar.tipo);
      this.monto = Number(editar.monto);
      this.cuentaId = editar.cuenta.id;
      this.cuentaDestinoId = editar.cuenta_destino?.id ?? null;
      this.categoriaId = editar.categoria?.id ?? null;
      this.fecha = editar.fecha;
      this.nota = editar.nota ?? '';
      this.mostrarNota.set(!!editar.nota);
    } else {
      this.editandoId.set(null);
      this.tipo.set(tipo ?? 'GASTO');
      this.monto = null;
      this.categoriaId = null;
      this.cuentaDestinoId = null;
      this.fecha = this.hoy;
      this.nota = '';
      this.mostrarNota.set(false);
      const ultima = leer<number | null>('ultimaCuenta', null);
      const cuentas = this.datos.cuentas();
      this.cuentaId = cuentas.find((c) => c.id === ultima)?.id ?? cuentas[0]?.id ?? null;
    }
    this.enfocarMonto();
  }

  private enfocarMonto() { setTimeout(() => document.getElementById('qa-monto')?.focus(), 60); }

  cambiarTipo(t: TipoTransaccion) {
    this.tipo.set(t);
    if (!this.categoriasTipo().some((c) => c.id === this.categoriaId)) this.categoriaId = null;
  }

  private payload() {
    return {
      tipo: this.tipo(), monto: this.monto, fecha: this.fecha, cuentaId: this.cuentaId,
      cuentaDestinoId: this.tipo() === 'TRANSFERENCIA' ? this.cuentaDestinoId : null,
      categoriaId: this.tipo() === 'TRANSFERENCIA' ? null : this.categoriaId, nota: this.nota || null,
    };
  }

  enviar(cargarOtro: boolean) {
    const monto = Number(this.monto);
    if (!Number.isFinite(monto) || monto <= 0) { this.error.set('Ingresá un monto mayor a 0'); this.enfocarMonto(); return; }
    if (!this.cuentaId) { this.error.set('Elegí una cuenta'); return; }
    if (this.tipo() === 'TRANSFERENCIA' && !this.cuentaDestinoId) { this.error.set('Elegí la cuenta de destino'); return; }
    this.error.set('');
    this.guardando.set(true);
    const datos = this.payload();
    const id = this.editandoId();

    if (id) {
      this.api.actualizarTransaccion(id, datos).subscribe({
        next: () => { this.toast.mostrar('Movimiento actualizado'); this.qa.cerrar(); this.datos.notificar(); },
        error: (e) => { this.error.set(e.error?.message ?? 'No se pudo guardar'); this.guardando.set(false); },
      });
      return;
    }

    this.api.crearTransaccion(datos).subscribe({
      next: (r) => {
        guardar('ultimaCuenta', this.cuentaId);
        if (this.categoriaId) {
          const uso = leer<Record<number, number>>('usoCategorias', {});
          uso[this.categoriaId] = (uso[this.categoriaId] ?? 0) + 1;
          guardar('usoCategorias', uso);
        }
        const etiqueta = { GASTO: 'Gasto', INGRESO: 'Ingreso', TRANSFERENCIA: 'Transferencia' }[this.tipo()];
        this.toast.mostrar(`${etiqueta} de ${pesos(monto)} guardado`, {
          accion: { etiqueta: 'Deshacer', ejecutar: () => this.api.borrarTransaccion(r.id).subscribe(() => { this.datos.notificar(); this.toast.mostrar('Movimiento deshecho'); }) },
        });
        this.datos.notificar();
        if (cargarOtro) {
          this.monto = null; this.nota = ''; this.categoriaId = null; this.mostrarNota.set(false);
          this.guardando.set(false);
          this.enfocarMonto();
        } else this.qa.cerrar();
      },
      error: (e) => { this.error.set(e.error?.message ?? 'No se pudo guardar'); this.guardando.set(false); },
    });
  }

  eliminar() {
    const id = this.editandoId();
    const original = this.qa.preset().editar;
    if (!id || !original) return;
    const vinculado = !!(original.recurrente || original.compra_cuotas);
    if (vinculado && !confirm('Este movimiento confirma un pago previsto. Si lo eliminás, el pago vuelve a figurar como pendiente. ¿Continuar?')) return;
    const datos = this.payload();
    this.api.borrarTransaccion(id).subscribe(() => {
      this.qa.cerrar();
      this.datos.notificar();
      this.toast.mostrar('Movimiento eliminado', vinculado ? {} : {
        accion: { etiqueta: 'Deshacer', ejecutar: () => this.api.crearTransaccion(datos).subscribe(() => { this.datos.notificar(); this.toast.mostrar('Movimiento restaurado'); }) },
      });
    });
  }
}
