import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Cuenta } from '../core/models';

@Component({
  selector: 'app-cuentas',
  imports: [CurrencyPipe, FormsModule],
  template: `
    <h1 class="mb-4 text-xl font-bold">Cuentas</h1>
    <div class="mb-6 grid gap-2 sm:grid-cols-2">
      @for (c of cuentas(); track c.id) {
        <div class="card flex items-center justify-between">
          <div><div class="font-medium">{{ c.nombre }}</div><div class="text-xs text-slate-500">{{ c.tipo }}</div></div>
          <div class="font-semibold" [class.text-rose-600]="c.saldo < 0">{{ c.saldo | currency: 'ARS' : 'symbol-narrow' : '1.0-2' }}</div>
        </div>
      }
    </div>

    <form class="card space-y-3" (ngSubmit)="crear()">
      <h2 class="font-semibold">Nueva cuenta</h2>
      <div class="grid gap-3 sm:grid-cols-3">
        <div><label class="label">Nombre</label><input class="input" name="n" [(ngModel)]="nombre" required /></div>
        <div><label class="label">Tipo</label>
          <select class="input" name="t" [(ngModel)]="tipo">
            <option value="EFECTIVO">Efectivo</option><option value="BANCO">Banco</option>
            <option value="BILLETERA">Billetera virtual</option><option value="TARJETA">Tarjeta</option>
          </select></div>
        <div><label class="label">Saldo inicial</label><input class="input" type="number" inputmode="decimal" step="0.01" name="s" [(ngModel)]="saldo" /></div>
      </div>
      @if (error()) { <p class="text-sm text-red-700">{{ error() }}</p> }
      <button class="btn">Agregar</button>
    </form>
  `,
})
export class CuentasPage {
  private api = inject(ApiService);
  cuentas = signal<Cuenta[]>([]);
  error = signal('');
  nombre = ''; tipo = 'BANCO'; saldo = 0;

  constructor() { this.cargar(); }
  cargar() { this.api.cuentas().subscribe((c) => this.cuentas.set(c)); }

  crear() {
    this.api.crearCuenta({ nombre: this.nombre, tipo: this.tipo, saldo_inicial: this.saldo ?? 0 }).subscribe({
      next: () => { this.nombre = ''; this.saldo = 0; this.error.set(''); this.cargar(); },
      error: (e) => this.error.set(e.error?.message ?? 'No se pudo crear'),
    });
  }
}
