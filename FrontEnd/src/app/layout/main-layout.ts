import { Component, HostListener, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PrivacyService } from '../core/privacy.service';
import { QuickAddService } from '../core/quick-add.service';
import { IconComponent, NombreIcono } from '../ui/icon';
import { QuickAddComponent } from '../ui/quick-add';
import { ToastHostComponent } from '../ui/toast-host';

interface Enlace { path: string; label: string; icon: NombreIcono }

@Component({
  selector: 'app-main-layout',
  imports: [NgTemplateOutlet, RouterOutlet, RouterLink, RouterLinkActive, IconComponent, QuickAddComponent, ToastHostComponent],
  template: `
    <div class="min-h-screen md:flex">
      <!-- Barra lateral (tablet y escritorio) -->
      <aside class="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:gap-1 md:overflow-y-auto md:border-r md:border-slate-200 md:bg-white md:p-4">
        <div class="mb-4 px-2 text-xl font-bold text-brand-700">App Fin</div>
        <button class="btn mb-4 w-full gap-2" (click)="qa.abrir()">
          <app-icon nombre="plus" [tam]="18" /> Nuevo movimiento
          <kbd class="ml-auto rounded bg-white/20 px-1.5 text-xs">N</kbd>
        </button>
        @for (g of grupos; track g.titulo) {
          <div class="mb-1 mt-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{{ g.titulo }}</div>
          @for (l of g.enlaces; track l.path) {
            <a [routerLink]="l.path" routerLinkActive="bg-brand-50 text-brand-700 font-semibold"
               class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-50">
              <app-icon [nombre]="l.icon" [tam]="20" /> {{ l.label }}
            </a>
          }
        }
        <div class="mt-auto space-y-1 border-t border-slate-100 pt-3">
          <button class="btn-ghost w-full justify-start gap-3" (click)="privacy.alternar()">
            <app-icon [nombre]="privacy.oculto() ? 'eye-off' : 'eye'" /> {{ privacy.oculto() ? 'Mostrar montos' : 'Ocultar montos' }}
          </button>
          <div class="truncate px-3 text-sm text-slate-500">{{ auth.nombre() }}</div>
          <button class="btn-ghost w-full justify-start gap-3" (click)="auth.logout()"><app-icon nombre="logout" /> Cerrar sesión</button>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <!-- Barra superior (celular) -->
        <header class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur md:hidden">
          <span class="text-lg font-bold text-brand-700">App Fin</span>
          <button class="btn-ghost tap !px-3" (click)="privacy.alternar()" [attr.aria-label]="privacy.oculto() ? 'Mostrar montos' : 'Ocultar montos'">
            <app-icon [nombre]="privacy.oculto() ? 'eye-off' : 'eye'" />
          </button>
        </header>

        <main class="mx-auto w-full max-w-6xl flex-1 p-4 pb-28 md:p-8 md:pb-10">
          <router-outlet />
        </main>
      </div>

      <!-- Barra inferior (celular) con botón + central -->
      <nav class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Principal">
        <div class="relative grid grid-cols-5">
          @for (l of izquierda; track l.path) { <ng-container *ngTemplateOutlet="tab; context: { l: l }" /> }
          <div></div>
          @for (l of derecha; track l.path) { <ng-container *ngTemplateOutlet="tab; context: { l: l }" /> }
          <button class="absolute -top-6 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-brand-600 text-white shadow-lg ring-4 ring-slate-50 transition active:scale-95"
                  (click)="qa.abrir()" aria-label="Nuevo movimiento"><app-icon nombre="plus" [tam]="28" /></button>
        </div>
      </nav>
    </div>

    <app-quick-add />
    <app-toast-host />

    <ng-template #tab let-l="l">
      <a [routerLink]="l.path" routerLinkActive="text-brand-700 font-semibold" class="tap flex flex-col items-center gap-0.5 py-2 text-[11px] text-slate-500">
        <app-icon [nombre]="l.icon" [tam]="22" />{{ l.label }}
      </a>
    </ng-template>
  `,
})
export class MainLayout {
  auth = inject(AuthService);
  privacy = inject(PrivacyService);
  qa = inject(QuickAddService);

  grupos: { titulo: string; enlaces: Enlace[] }[] = [
    { titulo: 'Principal', enlaces: [
      { path: '/inicio', label: 'Inicio', icon: 'home' },
      { path: '/movimientos', label: 'Movimientos', icon: 'list' },
      { path: '/calendario', label: 'Calendario', icon: 'calendar' },
    ] },
    { titulo: 'Planificar', enlaces: [
      { path: '/presupuestos', label: 'Presupuestos', icon: 'target' },
      { path: '/cuotas', label: 'Compras en cuotas', icon: 'card' },
    ] },
    { titulo: 'Configuración', enlaces: [
      { path: '/cuentas', label: 'Cuentas', icon: 'wallet' },
      { path: '/categorias', label: 'Categorías', icon: 'tag' },
    ] },
  ];
  izquierda: Enlace[] = [{ path: '/inicio', label: 'Inicio', icon: 'home' }, { path: '/movimientos', label: 'Movimientos', icon: 'list' }];
  derecha: Enlace[] = [{ path: '/calendario', label: 'Calendario', icon: 'calendar' }, { path: '/mas', label: 'Más', icon: 'dots' }];

  /** Atajo de teclado: N abre la carga rápida (si no se está escribiendo en un campo). */
  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const el = e.target as HTMLElement;
    if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable || this.qa.abierto()) return;
    e.preventDefault();
    this.qa.abrir();
  }
}
