import { Component, input } from '@angular/core';

export type NombreIcono =
  | 'home' | 'list' | 'calendar' | 'plus' | 'dots' | 'wallet' | 'tag' | 'target' | 'card' | 'eye' | 'eye-off'
  | 'arrow-up' | 'arrow-down' | 'swap' | 'x' | 'check' | 'chevron-right' | 'chevron-left' | 'search' | 'logout' | 'clock' | 'alert';

/** Iconos de trazo simple (24x24) que heredan el color del texto. */
@Component({
  selector: 'app-icon',
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
         [attr.width]="tam()" [attr.height]="tam()" aria-hidden="true">
      @switch (nombre()) {
        @case ('home') { <path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/> }
        @case ('list') { <path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/> }
        @case ('calendar') { <rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/> }
        @case ('plus') { <path d="M12 5v14M5 12h14"/> }
        @case ('dots') { <circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/> }
        @case ('wallet') { <path d="M4 7a2 2 0 012-2h11v4"/><rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="16.5" cy="13.5" r="1.2"/> }
        @case ('tag') { <path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.2"/> }
        @case ('target') { <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/> }
        @case ('card') { <rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6 15h4"/> }
        @case ('eye') { <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/> }
        @case ('eye-off') { <path d="M3 3l18 18"/><path d="M10.6 6.1A9.8 9.8 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 3.9M6.5 7.5C3.8 9.3 2 12 2 12s4 7 10 7a9.6 9.6 0 004.2-1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/> }
        @case ('arrow-up') { <path d="M12 19V5M6 11l6-6 6 6"/> }
        @case ('arrow-down') { <path d="M12 5v14M6 13l6 6 6-6"/> }
        @case ('swap') { <path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/> }
        @case ('x') { <path d="M6 6l12 12M18 6L6 18"/> }
        @case ('check') { <path d="M5 12.5l4.5 4.5L19 7.5"/> }
        @case ('chevron-right') { <path d="M9 5l7 7-7 7"/> }
        @case ('chevron-left') { <path d="M15 5l-7 7 7 7"/> }
        @case ('search') { <circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/> }
        @case ('logout') { <path d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4M16 8l4 4-4 4M20 12H9"/> }
        @case ('clock') { <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/> }
        @case ('alert') { <path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.01"/> }
      }
    </svg>
  `,
  host: { class: 'inline-flex shrink-0 items-center justify-center' },
})
export class IconComponent {
  nombre = input.required<NombreIcono>();
  tam = input(20);
}
