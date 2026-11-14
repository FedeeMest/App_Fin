import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast-host',
  template: `
    <div class="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6" aria-live="polite">
      @for (a of toast.avisos(); track a.id) {
        <div class="toast pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm text-white shadow-lg"
             [class.bg-slate-900]="a.tipo === 'ok'" [class.bg-rose-600]="a.tipo === 'error'">
          <span>{{ a.texto }}</span>
          @if (a.accion; as ac) {
            <button class="shrink-0 font-semibold text-emerald-300 underline-offset-2 hover:underline"
                    (click)="ac.ejecutar(); toast.cerrar(a.id)">{{ ac.etiqueta }}</button>
          }
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent { toast = inject(ToastService); }
