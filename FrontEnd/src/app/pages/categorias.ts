import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { DatosService } from '../core/datos.service';
import { ToastService } from '../core/toast.service';

import { Categoria } from '../core/models';

@Component({
  selector: 'app-categorias',
  imports: [FormsModule],
  template: `
    <h1 class="mb-4 text-xl font-bold">Categorías</h1>
    <div class="mb-6 grid gap-4 sm:grid-cols-2">
      @for (g of grupos; track g.tipo) {
        <div class="card">
          <h2 class="mb-2 font-semibold">{{ g.titulo }}</h2>
          <div class="flex flex-wrap gap-2">
            @for (c of porTipo(g.tipo); track c.id) {
              <span class="rounded-full bg-slate-100 px-3 py-1 text-sm">{{ c.nombre }}</span>
            } @empty { <span class="text-sm text-slate-400">Sin categorías</span> }
          </div>
        </div>
      }
    </div>

    <form class="card space-y-3" (ngSubmit)="crear()">
      <h2 class="font-semibold">Nueva categoría</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <div><label class="label">Nombre</label><input class="input" name="n" [(ngModel)]="nombre" required /></div>
        <div><label class="label">Tipo</label>
          <select class="input" name="t" [(ngModel)]="tipo"><option value="GASTO">Gasto</option><option value="INGRESO">Ingreso</option></select></div>
      </div>
      @if (error()) { <p class="text-sm text-red-700">{{ error() }}</p> }
      <button class="btn">Agregar</button>
    </form>
  `,
})
export class CategoriasPage {
  private api = inject(ApiService);
  private datos = inject(DatosService);
  private toast = inject(ToastService);
  categorias = signal<Categoria[]>([]);
  error = signal('');
  nombre = ''; tipo = 'GASTO';
  grupos = [{ tipo: 'GASTO', titulo: 'Gastos' }, { tipo: 'INGRESO', titulo: 'Ingresos' }];

  constructor() { this.cargar(); }
  porTipo(t: string) { return this.categorias().filter((c) => c.tipo === t); }
  cargar() { this.api.categorias().subscribe((c) => this.categorias.set(c)); }

  crear() {
    this.api.crearCategoria({ nombre: this.nombre, tipo: this.tipo }).subscribe({
      next: () => { this.nombre = ''; this.error.set(''); this.cargar(); this.datos.notificar(); this.toast.mostrar('Categoría creada'); },
      error: (e) => this.error.set(e.error?.message ?? 'No se pudo crear'),
    });
  }
}
