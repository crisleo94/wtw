import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTranslocoTestingModule } from '../../testing/transloco-testing';
import { LANGUAGE_KEY, LanguageStore } from '../../stores/language.store';
import { THEME_KEY, ThemeStore } from '../../stores/theme.store';
import { SettingsMenuComponent } from './settings-menu.component';

describe('SettingsMenuComponent', () => {
  let fixture: ComponentFixture<SettingsMenuComponent>;

  beforeEach(async () => {
    localStorage.setItem(LANGUAGE_KEY, 'en');
    localStorage.setItem(THEME_KEY, 'light');
    await TestBed.configureTestingModule({
      imports: [SettingsMenuComponent, getTranslocoTestingModule()],
    }).compileComponents();
    fixture = TestBed.createComponent(SettingsMenuComponent);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.removeItem(LANGUAGE_KEY);
    localStorage.removeItem(THEME_KEY);
    document.documentElement.style.colorScheme = '';
    document.documentElement.lang = 'en';
  });

  const trigger = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  const items = () =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));

  async function openMenu(): Promise<void> {
    trigger().click();
    await fixture.whenStable();
  }

  it('should have an accessible gear trigger', () => {
    expect(trigger().getAttribute('aria-label')).toBe('Settings');
    expect(trigger().textContent).toContain('settings');
  });

  it('should mark the active language and theme', async () => {
    await openMenu();
    const checked = items()
      .filter((item) => item.getAttribute('aria-checked') === 'true')
      .map((item) => item.textContent!.trim());
    expect(checked.length).toBe(2);
    expect(checked[0]).toContain('English');
    expect(checked[1]).toContain('Light');
  });

  it('should switch language and translate the menu right away', async () => {
    await openMenu();
    items().find((item) => item.textContent!.includes('Español'))!.click();
    await fixture.whenStable();
    expect(TestBed.inject(LanguageStore).lang()).toBe('es');
    expect(trigger().getAttribute('aria-label')).toBe('Ajustes');
  });

  it('should switch to dark mode', async () => {
    await openMenu();
    items().find((item) => item.textContent!.includes('Dark'))!.click();
    expect(TestBed.inject(ThemeStore).isDark()).toBeTrue();
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });
});
