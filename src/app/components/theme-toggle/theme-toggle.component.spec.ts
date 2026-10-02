import { TestBed } from '@angular/core/testing';
import { THEME_KEY } from '../../stores/theme.store';
import { ThemeToggleComponent } from './theme-toggle.component';

describe('ThemeToggleComponent', () => {
  afterEach(() => localStorage.removeItem(THEME_KEY));

  it('should reveal the saved theme icon only after hydration', async () => {
    localStorage.setItem(THEME_KEY, 'dark');
    const fixture = TestBed.createComponent(ThemeToggleComponent);
    const button = () => fixture.nativeElement.querySelector('button') as HTMLElement;
    expect(fixture.componentInstance.hydrated()).toBeFalse();
    await fixture.whenStable();
    expect(fixture.componentInstance.hydrated()).toBeTrue();
    expect(button().style.visibility).toBe('');
    expect(button().textContent).toContain('dark_mode');
    expect(button().getAttribute('aria-label')).toBe('Theme: Dark');
  });
});
