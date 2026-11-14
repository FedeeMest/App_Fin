import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-mas',
  imports: [RouterLink],
  template: `
    <h1 class="mb-1 text-xl font-bold">Más</h1>
    <p class="mb-4 text-sm text-slate-500">{{ auth.nombre() }}</p>
    <div class="space-y-2">
      <a routerLink="/presupuestos" class="card block">🎯 Presupuestos</a>
      <a routerLink="/cuentas" class="card block">🏦 Cuentas</a>
      <a routerLink="/categorias" class="card block">🏷️ Categorías</a>
      <button class="card block w-full text-left text-rose-600" (click)="auth.logout()">Cerrar sesión</button>
    </div>
  `,
})
export class MasPage { auth = inject(AuthService); }
