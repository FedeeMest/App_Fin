import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen md:flex">
      <!-- Sidebar (escritorio/tablet) -->
      <aside class="hidden md:flex md:w-60 md:flex-col md:gap-1 md:border-r md:border-slate-200 md:bg-white md:p-4">
        <div class="mb-6 px-2 text-xl font-bold text-brand-700">💰 App Fin</div>
        @for (l of links; track l.path) {
          <a [routerLink]="l.path" routerLinkActive="bg-brand-50 text-brand-700 font-semibold"
             class="rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">{{ l.icon }} {{ l.label }}</a>
        }
        <div class="mt-auto border-t border-slate-100 pt-3">
          <div class="truncate px-2 text-sm text-slate-500">{{ auth.nombre() }}</div>
          <button class="btn-ghost w-full justify-start" (click)="auth.logout()">Cerrar sesión</button>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <!-- Top bar (móvil) -->
        <header class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <span class="font-bold text-brand-700">💰 App Fin</span>
          <button class="text-sm text-slate-500" (click)="auth.logout()">Salir</button>
        </header>

        <main class="mx-auto w-full max-w-4xl flex-1 p-4 pb-24 md:p-8 md:pb-8">
          <router-outlet />
        </main>
      </div>

      <!-- Bottom nav (móvil) -->
      <nav class="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        @for (l of links; track l.path) {
          <a [routerLink]="l.path" routerLinkActive="text-brand-700 font-semibold"
             class="flex flex-col items-center py-2 text-xs text-slate-500">
            <span class="text-xl leading-none">{{ l.icon }}</span>{{ l.label }}
          </a>
        }
      </nav>
    </div>
  `,
})
export class MainLayout {
  auth = inject(AuthService);
  links = [
    { path: '/inicio', label: 'Inicio', icon: '🏠' },
    { path: '/movimientos', label: 'Movimientos', icon: '🧾' },
    { path: '/cuentas', label: 'Cuentas', icon: '🏦' },
    { path: '/categorias', label: 'Categorías', icon: '🏷️' },
  ];
}
