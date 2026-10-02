import { TestBed } from '@angular/core/testing';
import { THEME_KEY } from '../../stores/theme.store';
import { ThemeToggleComponent } from './theme-toggle.component';

describe('ThemeToggleComponent', () => {
  afterEach(() => {
    localStorage.removeItem(THEME_KEY);
    document.documentElement.style.colorScheme = '';
  });

  it('should reveal the icon only after hydration', async () => {
    localStorage.setItem(THEME_KEY, 'dark');
    const fixture = TestBed.createComponent(ThemeToggleComponent);
    const button = () => fixture.nativeElement.querySelector('button') as HTMLElement;
    expect(fixture.componentInstance.hydrated()).toBeFalse();
    await fixture.whenStable();
    expect(button().style.visibility).toBe('');
    expect(button().textContent).toContain('light_mode');
    expect(button().getAttribute('aria-label')).toBe('Switch to light mode');
  });

  it('should switch between dark and light on click', async () => {
    localStorage.setItem(THEME_KEY, 'dark');
    const fixture = TestBed.createComponent(ThemeToggleComponent);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button') as HTMLElement;

    button.click();
    await fixture.whenStable();
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(button.textContent).toContain('dark_mode');

    button.click();
    await fixture.whenStable();
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });
});
