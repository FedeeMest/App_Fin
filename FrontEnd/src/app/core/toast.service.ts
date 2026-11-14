import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number; texto: string; tipo: 'ok' | 'error';
  accion?: { etiqueta: string; ejecutar: () => void };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  avisos = signal<Aviso[]>([]);
  private seq = 0;

  /** Muestra un aviso. Con `accion` (ej. Deshacer) dura más para dar tiempo a usarla. */
  mostrar(texto: string, opts: { tipo?: 'ok' | 'error'; accion?: Aviso['accion'] } = {}) {
    const aviso: Aviso = { id: ++this.seq, texto, tipo: opts.tipo ?? 'ok', accion: opts.accion };
    this.avisos.update((a) => [...a.slice(-2), aviso]);
    setTimeout(() => this.cerrar(aviso.id), opts.accion ? 6000 : 3500);
  }

  error(texto: string) { this.mostrar(texto, { tipo: 'error' }); }

  cerrar(id: number) { this.avisos.update((a) => a.filter((x) => x.id !== id)); }
}
