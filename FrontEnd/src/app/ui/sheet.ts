import { Component, HostListener, input, output } from '@angular/core';

/** Panel que sube desde abajo en el celular y se centra en pantallas grandes. Se cierra con Esc o tocando afuera. */
@Component({
  selector: 'app-sheet',
  template: `
    @if (abierto()) {
      <div class="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 sm:items-center" (click)="cerrar.emit()">
        <div role="dialog" aria-modal="true" [attr.aria-label]="titulo()"
             class="sheet max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl"
             (click)="$event.stopPropagation()">
          <div class="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden"></div>
          @if (titulo()) { <h2 class="mb-3 text-lg font-bold">{{ titulo() }}</h2> }
          <ng-content />
        </div>
      </div>
    }
  `,
})
export class SheetComponent {
  abierto = input(true);
  titulo = input('');
  cerrar = output<void>();

  @HostListener('document:keydown.escape') onEsc() { if (this.abierto()) this.cerrar.emit(); }
}
