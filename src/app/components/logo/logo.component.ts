import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';

// The WtW logo cut to a circle; 96/144px copies of the 2048px original keep it light.
@Component({
  selector: 'app-logo',
  template: `<img
    src="assets/images/logo.svg"
    width="48"
    height="48"
    [alt]="label()"
  />`,
  styles: `
    :host
      display: block
      width: 48px
      height: 48px
      border-radius: 50%
      overflow: hidden
      border: 2px solid var(--mat-sys-primary)
      background: var(--mat-sys-primary-container)
      box-sizing: border-box
    img
      display: block
      width: 100%
      height: 100%
      object-fit: cover
  `,
})
export class LogoComponent {
  label = toSignal(inject(TranslocoService).selectTranslate('header.logo'), {
    initialValue: '',
  });
}
