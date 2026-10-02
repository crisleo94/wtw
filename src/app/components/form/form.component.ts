import { Component, inject, OnInit, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { debounceTime, Subject } from 'rxjs';
import {
  GenreMode,
  MovieFilters,
} from '../../interfaces/movie-filters.interface';
import { Movie } from '../../interfaces/movie.interface';
import { GenresService } from '../../services/genres.service';
import { MoviesService } from '../../services/movies.service';
import { rangeValidator } from '../../validators/range.validator';

export const MIN_YEAR = 1900;
export const DEFAULT_YEAR_FROM = 1990;
export const DEFAULT_VOTES_MIN = 5000;

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
    MatButtonToggleModule,
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
  errorEvent = output<void>();

  minYear = MIN_YEAR;
  currentYear = new Date().getFullYear();

  genres = this.genreService.genres;

  private yearValidators = [
    Validators.required,
    Validators.min(MIN_YEAR),
    Validators.max(this.currentYear),
  ];

  dataForm = this.fBuilder.nonNullable.group(
    {
      yearFrom: [DEFAULT_YEAR_FROM, this.yearValidators],
      yearTo: [this.currentYear, this.yearValidators],
      genres: [[] as number[]],
      genreMode: ['all' as GenreMode],
      ratingMin: [6],
      ratingMax: [10],
      votesMin: [DEFAULT_VOTES_MIN, [Validators.required, Validators.min(0)]],
      votesMax: [null as number | null, [Validators.min(0)]],
    },
    {
      validators: [
        rangeValidator('yearFrom', 'yearTo', 'yearRange'),
        rangeValidator('votesMin', 'votesMax', 'votesRange'),
      ],
    }
  );

  constructor() {
    this.debounceSubmit$
      .pipe(debounceTime(200), takeUntilDestroyed())
      .subscribe(() => this.generateMovies());
  }

  ngOnInit(): void {
    this.getGenres();
  }

  onSubmit(): void {
    if (this.dataForm.invalid) {
      this.dataForm.markAllAsTouched();
      return;
    }
    this.isLoadingEvent.emit(true);
    this.debounceSubmit$.next();
  }

  buildFilters(): MovieFilters {
    const value = this.dataForm.getRawValue();
    return {
      ...value,
      votesMax: value.votesMax ?? undefined,
    };
  }

  generateMovies(): void {
    this.movieService.generateMovie(this.buildFilters()).subscribe({
      next: (movie) => {
        // Keeps the spinner visible for a moment, as before.
        setTimeout(() => {
          this.isLoadingEvent.emit(false);
          this.onMovieSelected(movie);
        }, movie ? 1000 : 0);
      },
      error: () => {
        this.isLoadingEvent.emit(false);
        this.errorEvent.emit();
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
