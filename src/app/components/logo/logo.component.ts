import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoService } from '@jsverse/transloco';

// Round placeholder until the real logo exists.
@Component({
  selector: 'app-logo',
  imports: [MatIconModule],
  host: {
    role: 'img',
    '[attr.aria-label]': 'label()',
  },
  template: `<mat-icon aria-hidden="true">movie</mat-icon>`,
  styles: `
    :host
      display: grid
      place-items: center
      width: 48px
      height: 48px
      border-radius: 50%
      border: 2px solid var(--mat-sys-primary)
      background: var(--mat-sys-primary-container)
      color: var(--mat-sys-on-primary-container)
  `,
})
export class LogoComponent {
  label = toSignal(inject(TranslocoService).selectTranslate('header.logo'), {
    initialValue: '',
  });
}
