import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Movie } from '../../interfaces/movie.interface';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { AuthDialogService } from '../../services/auth-dialog.service';
import { AuthStore } from '../../stores/auth.store';
import { LibraryStore } from '../../stores/library.store';
import { SESSION_KEY } from '../../stores/session.store';
import { UserPanelComponent } from './user-panel.component';
import { getTranslocoTestingModule } from '../../testing/transloco-testing';

const movie = (tmdbId: number) =>
  ({ tmdbId, title: `Movie ${tmdbId}`, posterPath: '/p.jpg' }) as Movie;

describe('UserPanelComponent', () => {
  let component: UserPanelComponent;
  let fixture: ComponentFixture<UserPanelComponent>;
  let library: LibraryStore;

  beforeEach(async () => {
    sessionStorage.removeItem(SESSION_KEY);
    await TestBed.configureTestingModule({
      imports: [UserPanelComponent, getTranslocoTestingModule()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(UserPanelComponent);
    component = fixture.componentInstance;
    library = TestBed.inject(LibraryStore);
    TestBed.inject(AuthStore).continueAsGuest();
    library.addToWatchlist(movie(1)).subscribe();
    library.addToWatchlist(movie(2)).subscribe();
    library.setWatched(movie(2), true).subscribe();
    await fixture.whenStable();
  });

  afterEach(() => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('wtw.guest.v1');
  });

  it('should show the guest lists without a delete option for the Watchlist', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Guest');
    expect(compiled.textContent).toContain('Watchlist');
    expect(compiled.querySelector('[aria-label="Options for Watchlist"]')).toBeNull();
  });

  it('should filter by watched state', () => {
    component.filter.set('watched');
    expect(component.panelLists()[0].items.map((item) => item.tmdbId)).toEqual([2]);
    component.filter.set('unwatched');
    expect(component.panelLists()[0].items.map((item) => item.tmdbId)).toEqual([1]);
  });

  it('should create a list and move a movie with the menu or by dropping', () => {
    component.newListName.set('Later');
    component.createList();
    expect(component.newListName()).toBe('');

    const [watchlist, later] = library.lists();
    component.moveTo(watchlist, watchlist.items[0], later);
    expect(library.lists()[1].items.map((item) => item.tmdbId)).toEqual([1]);

    const panelLists = component.panelLists();
    const item = panelLists[0].items[0];
    component.drop({
      previousContainer: { data: panelLists[0] },
      container: { data: panelLists[1] },
      previousIndex: 0,
      currentIndex: 0,
      item: { data: item },
    } as unknown as Parameters<UserPanelComponent['drop']>[0]);
    expect(library.lists()[1].items.map((entry) => entry.tmdbId)).toEqual([2, 1]);
    expect(library.watchlist()!.items.length).toBe(0);
  });

  it('should not offer to move a movie to a list that already has it', async () => {
    component.newListName.set('Later');
    component.createList();
    library.addToList(library.lists()[1], movie(1)).subscribe();
    const [watchlist, later] = library.lists();
    const item = watchlist.items.find((entry) => entry.tmdbId === 1)!;
    expect(component.contains(later, item)).toBeTrue();
    expect(component.contains(later, watchlist.items.find((entry) => entry.tmdbId === 2)!)).toBeFalse();
    expect(component.posterUrl('/p.jpg')).toBe('https://image.tmdb.org/t/p/w500/p.jpg');
  });

  it('should reorder with move up', () => {
    const panelList = component.panelLists()[0];
    component.shift(panelList, panelList.items[1], -1);
    expect(library.watchlist()!.items.map((item) => item.tmdbId)).toEqual([2, 1]);
  });

  it('should move up within the visible (filtered) items', () => {
    library.addToWatchlist(movie(3)).subscribe();
    library.setWatched(movie(3), true).subscribe();
    component.filter.set('watched');
    const panelList = component.panelLists()[0];
    expect(panelList.items.map((item) => item.tmdbId)).toEqual([2, 3]);
    expect(component.isFirst(panelList, panelList.items[0])).toBeTrue();

    component.shift(panelList, panelList.items[1], -1);
    expect(library.watchlist()!.items.map((item) => item.tmdbId)).toEqual([1, 3, 2]);
  });

  it('should ask for a session before acting', () => {
    const ensure = spyOn(TestBed.inject(AuthDialogService), 'ensureSession').and.returnValue(of(null));
    component.newListName.set('Later');
    component.createList();
    expect(ensure).toHaveBeenCalled();
    expect(library.lists().length).toBe(1);
  });

  it('should confirm with a dialog before deleting a list', () => {
    component.newListName.set('Later');
    component.createList();
    const dialog = TestBed.inject(MatDialog);
    const open = spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(false) } as never);
    component.deleteList(library.lists()[1]);
    expect(library.lists().length).toBe(2);

    open.and.returnValue({ afterClosed: () => of(true) } as never);
    component.deleteList(library.lists()[1]);
    expect(library.lists().length).toBe(1);
  });

  it('should show the panel messages and the delete dialog in Spanish', () => {
    TestBed.inject(TranslocoService).setActiveLang('es');
    const snackBar = spyOn(TestBed.inject(MatSnackBar), 'open');
    component.newListName.set('Later');
    component.createList();
    expect(snackBar).toHaveBeenCalledWith('Lista "Later" creada.', 'Cerrar', jasmine.any(Object));

    const [watchlist, later] = library.lists();
    component.moveTo(watchlist, watchlist.items[0], later);
    expect(snackBar).toHaveBeenCalledWith('Movida a Later.', 'Cerrar', jasmine.any(Object));
    component.removeItem(later, library.lists()[1].items[0]);
    expect(snackBar).toHaveBeenCalledWith('Quitada de Later.', 'Cerrar', jasmine.any(Object));

    const open = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({
      afterClosed: () => of(false),
    } as never);
    component.deleteList(library.lists()[1]);
    expect(open.calls.mostRecent().args[1]?.data).toEqual({
      title: 'Eliminar lista',
      message: '¿Eliminar la lista "Later"? Se quitarán sus películas.',
      confirmLabel: 'Eliminar',
    });
  });

  it('should focus the rename input', async () => {
    component.newListName.set('Later');
    component.createList();
    await fixture.whenStable();
    component.startRename(component.panelLists()[1]);
    await fixture.whenStable();
    expect((document.activeElement as HTMLInputElement).name).toBe('rename');
  });
});
