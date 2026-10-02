import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Movie } from '../../interfaces/movie.interface';
import { LibraryStore } from '../../stores/library.store';
import { SESSION_KEY } from '../../stores/session.store';
import { UserPanelComponent } from './user-panel.component';

const movie = (tmdbId: number) =>
  ({ tmdbId, title: `Movie ${tmdbId}`, posterPath: '/p.jpg' }) as Movie;

describe('UserPanelComponent', () => {
  let component: UserPanelComponent;
  let fixture: ComponentFixture<UserPanelComponent>;
  let library: LibraryStore;

  beforeEach(async () => {
    sessionStorage.removeItem(SESSION_KEY);
    await TestBed.configureTestingModule({
      imports: [UserPanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(UserPanelComponent);
    component = fixture.componentInstance;
    library = TestBed.inject(LibraryStore);
    library.addToWatchlist(movie(1)).subscribe();
    library.addToWatchlist(movie(2)).subscribe();
    library.setWatched(movie(2), true).subscribe();
    await fixture.whenStable();
  });

  afterEach(() => sessionStorage.removeItem(SESSION_KEY));

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

  it('should reorder with move up', () => {
    const watchlist = library.watchlist()!;
    component.shift(watchlist, watchlist.items[1], -1);
    expect(library.watchlist()!.items.map((item) => item.tmdbId)).toEqual([2, 1]);
  });
});
