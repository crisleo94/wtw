import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
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
import { Genre } from '../../interfaces/genre.interface';
import { Movie } from '../../interfaces/movie.interface';
import { GenresService } from '../../services/genres.service';
import { MoviesService } from '../../services/movies.service';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
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
export class FormComponent {
  debounceSubmit$ = new Subject<void>();
  @Output() movieEvent = new EventEmitter<Movie | null>();
  @Output() isLoadingEvent = new EventEmitter<boolean>();

  generatedMovies: Movie[] = [];
  randomizedMovie: Movie | null = null;
  isLoading = true;
  currentYear = new Date().getFullYear();

  genres: Genre[] = [];

  dataForm = this.fBuilder.group({
    year: [
      1990,
      [
        Validators.required,
        Validators.min(1900),
        Validators.max(this.currentYear),
      ],
    ],
    genre: [1, [Validators.required]],
    rating: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
  });

  constructor(
    private fBuilder: FormBuilder,
    private genreService: GenresService,
    private movieService: MoviesService
  ) {}

  ngOnInit(): void {
    this.debounceSubmit$.pipe(debounceTime(200)).subscribe(() => {
      this.generateMovies();
      setTimeout(() => {
        this.isLoading = false;
      });
    });
    this.getGenres();
  }

  onSubmit(): void {
    this.debounceSubmit$.next();
  }

  generateMovies(): void {
    const { year, genre, rating } = this.dataForm.value;
    const parsedYear = Number(year);
    const parsedGenre = Number(genre);
    const parsedRating = Number(rating);
    this.movieService
      .getFilteredMovie(parsedYear, parsedGenre, parsedRating)
      .subscribe((resp) => {
        this.generatedMovies = resp.results;

        if (this.generatedMovies.length > 0) {
          this.randomizeMovie();
          this.onMovieSelected(this.randomizedMovie);
        }
      });
  }

  randomizeMovie(): void {
    this.randomizedMovie =
      this.generatedMovies[
        Math.floor(Math.random() * this.generatedMovies.length)
      ];
  }

  getGenres(): void {
    this.genreService.getGenres().subscribe((genres) => (this.genres = genres));
  }

  reset(): void {
    this.dataForm.reset();
    this.isLoading = false;
  }

  onMovieSelected(movie: Movie | null): void {
    this.movieEvent.emit(movie);
    this.isLoading = false;
    this.isLoadingEvent.emit(this.isLoading);
  }
}
