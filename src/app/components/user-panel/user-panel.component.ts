import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { IMAGE_URL, PLACEHOLDER_IMG } from '../../constants';
import {
  MovieList,
  MovieListItem,
} from '../../interfaces/library.interface';
import { AuthDialogService } from '../../services/auth-dialog.service';
import { AuthStore } from '../../stores/auth.store';
import { LibraryStore, listKey } from '../../stores/library.store';
import { apiErrorMessage } from '../../utils/api-error';

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
  ],
  templateUrl: './user-panel.component.html',
  styleUrl: './user-panel.component.sass',
})
export class UserPanelComponent {
  private library = inject(LibraryStore);
  private authDialog = inject(AuthDialogService);
  private snackBar = inject(MatSnackBar);
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
    return path ? `${IMAGE_URL}/${path}` : PLACEHOLDER_IMG;
  }

  openAuth(): void {
    this.authDialog.open().subscribe();
  }

  logout(): void {
    this.run(this.authStore.logout(), 'You have logged out.');
  }

  createList(): void {
    const name = this.newListName();
    this.run(this.library.createList(name), `List "${name.trim()}" created.`, () =>
      this.newListName.set('')
    );
  }

  startRename(panelList: PanelList): void {
    this.editingKey.set(panelList.key);
    this.editingName.set(panelList.list.name);
  }

  cancelRename(): void {
    this.editingKey.set(null);
  }

  saveRename(list: MovieList): void {
    this.run(
      this.library.renameList(list, this.editingName()),
      'List renamed.',
      () => this.editingKey.set(null)
    );
  }

  deleteList(list: MovieList): void {
    if (!confirm(`Delete the list "${list.name}"? Its movies will be removed from it.`)) {
      return;
    }
    this.run(this.library.deleteList(list), `List "${list.name}" deleted.`);
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
    this.move(from, item, to, to.items.length);
  }

  // Up/down moves are the keyboard friendly alternative to dragging.
  shift(list: MovieList, item: MovieListItem, offset: number): void {
    const position = list.items.indexOf(item) + offset;
    if (position >= 0 && position < list.items.length) {
      this.move(list, item, list, position);
    }
  }

  toggleWatched(item: MovieListItem): void {
    this.run(
      this.library.setWatched(item.movie, !item.watched),
      item.watched ? 'Marked as not watched.' : 'Marked as watched.'
    );
  }

  removeItem(list: MovieList, item: MovieListItem): void {
    this.run(
      this.library.removeFromList(list, item.tmdbId),
      `Removed from ${list.name}.`
    );
  }

  otherLists(list: MovieList): MovieList[] {
    return this.library.lists().filter((other) => listKey(other) !== listKey(list));
  }

  isFirst(list: MovieList, item: MovieListItem): boolean {
    return list.items.indexOf(item) === 0;
  }

  isLast(list: MovieList, item: MovieListItem): boolean {
    return list.items.indexOf(item) === list.items.length - 1;
  }

  private move(from: MovieList, item: MovieListItem, to: MovieList, position: number): void {
    const sameList = listKey(from) === listKey(to);
    this.run(
      this.library.moveItem(from, item.tmdbId, to, position),
      sameList ? null : `Moved to ${to.name}.`
    );
  }

  private run(action: Observable<void>, success: string | null, done?: () => void): void {
    action.subscribe({
      next: () => {
        done?.();
        if (success) {
          this.notify(success);
        }
      },
      error: (error) => this.notify(apiErrorMessage(error)),
    });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 2500 });
  }
}
