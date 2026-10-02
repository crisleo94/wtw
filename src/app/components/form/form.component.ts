import { Component, inject, OnInit, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { debounceTime, Subject } from 'rxjs';
import { Movie } from '../../interfaces/movie.interface';
import { GenresService } from '../../services/genres.service';
import { MoviesService } from '../../services/movies.service';

@Component({
  selector: 'app-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatButtonModule,
  ],
  templateUrl: './form.component.html',
  styleUrl: './form.component.sass',
})
export class FormComponent implements OnInit {
  private fBuilder = inject(FormBuilder);
  private genreService = inject(GenresService);
  private movieService = inject(MoviesService);

  debounceSubmit$ = new Subject<void>();
  movieEvent = output<Movie | null>();
  isLoadingEvent = output<boolean>();

  currentYear = new Date().getFullYear();

  genres = this.genreService.genres;

  dataForm = this.fBuilder.group({
    year: [
      1990,
      [
        Validators.required,
        Validators.min(1900),
        Validators.max(this.currentYear),
      ],
    ],
    genre: [null as number | null, [Validators.required]],
    rating: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
  });

  constructor() {
    this.debounceSubmit$
      .pipe(debounceTime(200), takeUntilDestroyed())
      .subscribe(() => this.generateMovies());
  }

  ngOnInit(): void {
    this.getGenres();
  }

  onSubmit(): void {
    this.isLoadingEvent.emit(true);
    this.debounceSubmit$.next();
  }

  generateMovies(): void {
    const { year, genre, rating } = this.dataForm.value;
    this.movieService
      .generateMovie({
        yearFrom: Number(year),
        yearTo: Number(year),
        genres: genre ? [Number(genre)] : [],
        ratingMin: Number(rating),
      })
      .subscribe({
        next: (movie) => {
          // Keeps the spinner visible for a moment, as before.
          setTimeout(() => {
            this.isLoadingEvent.emit(false);
            this.onMovieSelected(movie);
          }, movie ? 1000 : 0);
        },
        error: () => {
          this.isLoadingEvent.emit(false);
          this.onMovieSelected(null);
        },
      });
  }

  getGenres(): void {
    this.genreService.getGenres().subscribe();
  }

  reset(): void {
    this.dataForm.reset();
  }

  onMovieSelected(movie: Movie | null): void {
    this.movieEvent.emit(movie);
  }
}
