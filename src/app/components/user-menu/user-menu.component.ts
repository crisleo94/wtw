import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthDialogService } from '../../services/auth-dialog.service';
import { AuthStore } from '../../stores/auth.store';

@Component({
  selector: 'app-user-menu',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.sass',
})
export class UserMenuComponent {
  private authDialog = inject(AuthDialogService);
  private snackBar = inject(MatSnackBar);
  authStore = inject(AuthStore);

  openAuth(): void {
    this.authDialog.open().subscribe();
  }

  logout(): void {
    this.authStore.logout().subscribe({
      next: () =>
        this.snackBar.open('You have logged out.', 'Dismiss', { duration: 2000 }),
      error: () =>
        this.snackBar.open('Could not log out. Please try again.', 'Dismiss', {
          duration: 3000,
        }),
    });
  }
}
