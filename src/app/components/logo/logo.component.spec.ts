import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { getTranslocoTestingModule } from '../../testing/transloco-testing';
import { LogoComponent } from './logo.component';

describe('LogoComponent', () => {
  it('should show the WtW logo cut to a circle with a translated alt', async () => {
    TestBed.configureTestingModule({
      imports: [LogoComponent, getTranslocoTestingModule()],
    });
    const fixture = TestBed.createComponent(LogoComponent);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const img = host.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('assets/images/wtwlogo-96.jpg');
    expect(img.getAttribute('srcset')).toContain('wtwlogo-144.jpg 3x');
    expect(img.alt).toBe('What to Watch logo');
    expect(getComputedStyle(img).objectFit).toBe('cover');
    expect(getComputedStyle(host).borderRadius).toBe('50%');
    expect(host.getBoundingClientRect().width).toBe(48);

    TestBed.inject(TranslocoService).setActiveLang('es');
    await fixture.whenStable();
    expect(img.alt).toBe('Logo de What to Watch');
  });
});
