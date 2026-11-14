import { Injectable, signal } from '@angular/core';

/** Permite ocultar los montos en pantalla (por ejemplo, en el transporte público). Se recuerda entre visitas. */
@Injectable({ providedIn: 'root' })
export class PrivacyService {
  oculto = signal(localStorage.getItem('ocultarMontos') === '1');

  alternar() {
    const v = !this.oculto();
    this.oculto.set(v);
    try { localStorage.setItem('ocultarMontos', v ? '1' : '0'); } catch { /* sin almacenamiento */ }
  }
}
