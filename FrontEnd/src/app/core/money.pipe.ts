import { Pipe, PipeTransform, inject } from '@angular/core';
import { PrivacyService } from './privacy.service';

const entero = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const conCentavos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Pesos argentinos: sin centavos si el monto es redondo. Respeta el modo "ocultar montos". */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private privacy = inject(PrivacyService);

  transform(valor: number | string | null | undefined): string {
    if (this.privacy.oculto()) return '$ ••••';
    const n = Number(valor ?? 0);
    return Number.isInteger(n) ? entero.format(n) : conCentavos.format(n);
  }
}

/** Formato de pesos sin depender del modo privado (para avisos que el usuario acaba de provocar). */
export const pesos = (n: number) => (Number.isInteger(n) ? entero.format(n) : conCentavos.format(n));
