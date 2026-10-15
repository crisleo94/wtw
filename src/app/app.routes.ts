import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'movie/:tmdbId',
    loadComponent: () =>
      import('./pages/movie-detail/movie-detail.component').then((m) => m.MovieDetailComponent),
  },
  { path: '**', redirectTo: '' },
];
