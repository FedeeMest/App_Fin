import { Injectable, signal } from '@angular/core';
import { TipoTransaccion, Transaccion } from './models';

export interface PresetMovimiento { tipo?: TipoTransaccion; editar?: Transaccion }

/** Abre la hoja de carga rápida desde cualquier pantalla (botón +, atajo N, acciones del Inicio). */
@Injectable({ providedIn: 'root' })
export class QuickAddService {
  abierto = signal(false);
  preset = signal<PresetMovimiento>({});

  abrir(preset: PresetMovimiento = {}) {
    this.preset.set(preset);
    this.abierto.set(true);
  }

  cerrar() { this.abierto.set(false); }
}
