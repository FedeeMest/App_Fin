import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Categoria, Cuenta } from './models';

/**
 * Datos que se usan en muchas pantallas (cuentas y categorías) y señal de cambios:
 * cuando algo se crea, edita o borra se llama a `notificar()` y las pantallas se refrescan solas.
 */
@Injectable({ providedIn: 'root' })
export class DatosService {
  private api = inject(ApiService);
  cuentas = signal<Cuenta[]>([]);
  categorias = signal<Categoria[]>([]);
  version = signal(0);

  constructor() { this.cargarCatalogo(); }

  cargarCatalogo() {
    this.api.cuentas().subscribe((c) => this.cuentas.set(c));
    this.api.categorias().subscribe((c) => this.categorias.set(c));
  }

  notificar() {
    this.cargarCatalogo();
    this.version.update((v) => v + 1);
  }
}
