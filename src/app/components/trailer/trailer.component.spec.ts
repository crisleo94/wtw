import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTranslocoTestingModule } from '../../testing/transloco-testing';
import { TrailerComponent } from './trailer.component';

describe('TrailerComponent', () => {
  let fixture: ComponentFixture<TrailerComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrailerComponent, getTranslocoTestingModule()],
    }).compileComponents();
    fixture = TestBed.createComponent(TrailerComponent);
    element = fixture.nativeElement;
  });

  it('should load the youtube-nocookie player only after a click', async () => {
    fixture.componentRef.setInput('trailer', { key: 'SUXWAEX2jlg', name: 'Official Trailer', site: 'YouTube' });
    await fixture.whenStable();
    expect(element.querySelector('iframe')).toBeNull();
    const play = element.querySelector<HTMLButtonElement>('button.play')!;
    expect(play.getAttribute('aria-label')).toBe('Play trailer: Official Trailer');
    expect(element.querySelector('img')!.getAttribute('src')).toBe('https://i.ytimg.com/vi/SUXWAEX2jlg/hqdefault.jpg');

    play.click();
    await fixture.whenStable();
    const iframe = element.querySelector('iframe')!;
    expect(iframe.src).toBe('https://www.youtube-nocookie.com/embed/SUXWAEX2jlg?autoplay=1');
    expect(iframe.title).toBe('Trailer: Official Trailer');
    expect(iframe.getAttribute('allow')).toBe('autoplay; encrypted-media; picture-in-picture');
    expect(iframe.hasAttribute('allowfullscreen')).toBeTrue();
  });

  it('should not embed an unexpected key', async () => {
    fixture.componentRef.setInput('trailer', { key: '"><script>', name: 'Bad', site: 'YouTube' });
    await fixture.whenStable();
    expect(element.querySelector('figure')).toBeNull();
  });
});
