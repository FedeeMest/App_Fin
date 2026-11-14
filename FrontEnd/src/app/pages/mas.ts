import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PrivacyService } from '../core/privacy.service';
import { IconComponent, NombreIcono } from '../ui/icon';

@Component({
  selector: 'app-mas',
  imports: [RouterLink, IconComponent],
  template: `
    <h1 class="text-2xl font-bold">Más</h1>
    <p class="mb-4 text-sm text-slate-500">{{ auth.nombre() }}</p>

    <div class="grid grid-cols-2 gap-3">
      @for (o of opciones; track o.path) {
        <a [routerLink]="o.path" class="card tap flex flex-col gap-2 transition active:scale-95">
          <span class="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-700"><app-icon [nombre]="o.icono" /></span>
          <span class="font-semibold">{{ o.label }}</span>
          <span class="text-xs text-slate-500">{{ o.desc }}</span>
        </a>
      }
    </div>

    <div class="card mt-4 divide-y divide-slate-100 !p-0">
      <button class="tap flex w-full items-center gap-3 px-4 py-3 text-left" (click)="privacy.alternar()">
        <app-icon [nombre]="privacy.oculto() ? 'eye-off' : 'eye'" /> {{ privacy.oculto() ? 'Mostrar montos' : 'Ocultar montos' }}
      </button>
      <button class="tap flex w-full items-center gap-3 px-4 py-3 text-left text-rose-600" (click)="auth.logout()">
        <app-icon nombre="logout" /> Cerrar sesión
      </button>
    </div>
  `,
})
export class MasPage {
  auth = inject(AuthService);
  privacy = inject(PrivacyService);
  opciones: { path: string; label: string; desc: string; icono: NombreIcono }[] = [
    { path: '/presupuestos', label: 'Presupuestos', desc: 'Límites por categoría y gasto diario', icono: 'target' },
    { path: '/cuotas', label: 'Compras en cuotas', desc: 'Cuánto debés y cuándo termina cada una', icono: 'card' },
    { path: '/cuentas', label: 'Cuentas', desc: 'Efectivo, bancos y billeteras', icono: 'wallet' },
    { path: '/categorias', label: 'Categorías', desc: 'Organizá tus ingresos y gastos', icono: 'tag' },
  ];
}
