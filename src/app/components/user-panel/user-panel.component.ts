import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Observable, switchMap, throwError } from 'rxjs';
import {
  MovieList,
  MovieListItem,
} from '../../interfaces/library.interface';
import { AuthDialogService } from '../../services/auth-dialog.service';
import { AuthStore } from '../../stores/auth.store';
import { LibraryStore, listKey } from '../../stores/library.store';
import { apiErrorMessage, LibraryError } from '../../utils/api-error';
import { posterUrl } from '../../utils/image-url';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../confirm-dialog/confirm-dialog.component';

export type WatchedFilter = 'all' | 'watched' | 'unwatched';

interface PanelList {
  list: MovieList;
  key: string;
  items: MovieListItem[];
}

@Component({
  selector: 'app-user-panel',
  imports: [
    FormsModule,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  templateUrl: './user-panel.component.html',
  styleUrl: './user-panel.component.sass',
})
export class UserPanelComponent {
  private library = inject(LibraryStore);
  private authDialog = inject(AuthDialogService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private injector = inject(Injector);
  private host = inject(ElementRef);
  private transloco = inject(TranslocoService);
  private renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');
  authStore = inject(AuthStore);

  closed = output<void>();

  filter = signal<WatchedFilter>('all');
  newListName = signal('');
  editingKey = signal<string | null>(null);
  editingName = signal('');

  panelLists = computed<PanelList[]>(() => {
    const filter = this.filter();
    return this.library.lists().map((list) => ({
      list,
      key: listKey(list),
      items: list.items.filter(
        (item) =>
          filter === 'all' || (filter === 'watched') === item.watched
      ),
    }));
  });

  posterUrl(path?: string): string {
    return posterUrl(path);
  }

  openAuth(): void {
    this.authDialog.open().subscribe();
  }

  logout(): void {
    this.authStore.logout().subscribe({
      next: () => this.notify(this.transloco.translate('panel.loggedOut')),
      error: (error) => this.notify(apiErrorMessage(error, this.transloco)),
    });
  }

  createList(): void {
    const name = this.newListName();
    const created = this.transloco.translate('panel.listCreated', { name: name.trim() });
    this.run(() => this.library.createList(name), created, () =>
      this.newListName.set('')
    );
  }

  startRename(panelList: PanelList): void {
    this.editingKey.set(panelList.key);
    this.editingName.set(panelList.list.name);
    afterNextRender(() => this.renameInput()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  cancelRename(): void {
    const key = this.editingKey();
    this.editingKey.set(null);
    this.focusLater(`[data-list-options="${CSS.escape(key ?? '')}"]`);
  }

  saveRename(list: MovieList): void {
    const name = this.editingName().trim();
    this.run(
      () => this.withList(list, (current) => this.library.renameList(current, name)),
      this.transloco.translate('panel.listRenamed'),
      () => {
        this.editingKey.set(null);
        const renamed = this.findList(name);
        this.focusLater(
          `[data-list-options="${CSS.escape(renamed ? listKey(renamed) : '')}"]`
        );
      }
    );
  }

  deleteList(list: MovieList): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data: {
          title: this.transloco.translate('panel.deleteListTitle'),
          message: this.transloco.translate('panel.deleteListMessage', { name: list.name }),
          confirmLabel: this.transloco.translate('panel.deleteListConfirm'),
        },
        ariaDescribedBy: 'confirm-dialog-message',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.run(
            () => this.withList(list, (current) => this.library.deleteList(current)),
            this.transloco.translate('panel.listDeleted', { name: list.name }),
            () => this.focusLater('.new-list input')
          );
        }
      });
  }

  drop(event: CdkDragDrop<PanelList, PanelList, MovieListItem>): void {
    const from = event.previousContainer.data;
    const to = event.container.data;
    if (from === to && event.previousIndex === event.currentIndex) {
      return;
    }
    const target = to.items[event.currentIndex];
    const position = target ? to.list.items.indexOf(target) : to.list.items.length;
    this.move(from.list, event.item.data, to.list, position);
  }

  moveTo(from: MovieList, item: MovieListItem, to: MovieList): void {
    this.move(from, item, to, to.items.length, () =>
      this.focusLater(
        `[data-item-actions="${CSS.escape(`${listKey(to)}:${item.tmdbId}`)}"]`
      )
    );
  }

  // Up/down moves are the keyboard friendly alternative to dragging; they
  // follow the visible (filtered) order, like dropping does.
  shift(panelList: PanelList, item: MovieListItem, offset: number): void {
    const target = panelList.items[panelList.items.indexOf(item) + offset];
    if (target) {
      const list = panelList.list;
      this.move(list, item, list, list.items.indexOf(target), () =>
        this.focusLater(
          `[data-item-actions="${CSS.escape(`${panelList.key}:${item.tmdbId}`)}"]`
        )
      );
    }
  }

  toggleWatched(item: MovieListItem): void {
    this.run(
      () => this.library.setWatched(item.movie, !item.watched),
      this.transloco.translate(item.watched ? 'card.markedNotWatched' : 'card.markedWatched')
    );
  }

  removeItem(list: MovieList, item: MovieListItem): void {
    this.run(
      () => this.withList(list, (current) => this.library.removeFromList(current, item.tmdbId)),
      this.transloco.translate('panel.removedFrom', { name: this.displayName(list) })
    );
  }

  otherLists(list: MovieList): MovieList[] {
    return this.library.lists().filter((other) => listKey(other) !== listKey(list));
  }

  // "Move to" can't target a list that already has the movie.
  contains(list: MovieList, item: MovieListItem): boolean {
    return list.items.some((other) => other.tmdbId === item.tmdbId);
  }

  isFirst(panelList: PanelList, item: MovieListItem): boolean {
    return panelList.items.indexOf(item) === 0;
  }

  isLast(panelList: PanelList, item: MovieListItem): boolean {
    return panelList.items.indexOf(item) === panelList.items.length - 1;
  }

  private move(
    from: MovieList,
    item: MovieListItem,
    to: MovieList,
    position: number,
    done?: () => void
  ): void {
    const sameList = listKey(from) === listKey(to);
    this.run(
      () =>
        this.withList(from, (source) =>
          this.withList(to, (target) =>
            this.library.moveItem(source, item.tmdbId, target, position)
          )
        ),
      sameList ? null : this.transloco.translate('panel.movedTo', { name: this.displayName(to) }),
      done
    );
  }

  // Same rule as the cards: ask for a session, wait for the library, then act.
  private run(action: () => Observable<void>, success: string | null, done?: () => void): void {
    this.authDialog.ensureSession(this.transloco.translate('auth.reasonPanel')).subscribe((result) => {
      if (!result) {
        return;
      }
      this.library
        .whenReady()
        .pipe(switchMap(action))
        .subscribe({
          next: () => {
            done?.();
            if (success) {
              this.notify(success);
            }
          },
          error: (error) => this.notify(apiErrorMessage(error, this.transloco)),
        });
    });
  }

  // After a login the lists are the account's ones: look them up again by name.
  private withList(list: MovieList, action: (current: MovieList) => Observable<void>): Observable<void> {
    const current = this.findList(list.name);
    return current
      ? action(current)
      : throwError(
          () => new LibraryError(this.transloco.translate('errors.listUnavailable', { name: list.name }))
        );
  }

  // The Watchlist keeps its English name in the data; show the translated one.
  private displayName(list: MovieList): string {
    return list.isSystem ? this.transloco.translate('overview.watchlistTab') : list.name;
  }

  private findList(name: string): MovieList | undefined {
    const lowered = name.toLowerCase();
    return this.library.lists().find((list) => list.name.toLowerCase() === lowered);
  }

  // Moves focus once the view reflects the change (the old element may be gone).
  private focusLater(selector: string): void {
    afterNextRender(
      () => {
        const host = this.host.nativeElement as HTMLElement;
        const target =
          host.querySelector<HTMLElement>(selector) ??
          host.querySelector<HTMLElement>('.new-list input');
        target?.focus();
      },
      { injector: this.injector }
    );
  }

  private notify(message: string): void {
    this.snackBar.open(message, this.transloco.translate('common.dismiss'), { duration: 2500 });
  }
}
