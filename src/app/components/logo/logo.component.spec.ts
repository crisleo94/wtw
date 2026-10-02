import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { getTranslocoTestingModule } from '../../testing/transloco-testing';
import { LogoComponent } from './logo.component';

describe('LogoComponent', () => {
  it('should be a round image with a translated label', async () => {
    TestBed.configureTestingModule({
      imports: [LogoComponent, getTranslocoTestingModule()],
    });
    const fixture = TestBed.createComponent(LogoComponent);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('What to Watch logo');

    TestBed.inject(TranslocoService).setActiveLang('es');
    await fixture.whenStable();
    expect(host.getAttribute('aria-label')).toBe('Logo de What to Watch');
  });
});
