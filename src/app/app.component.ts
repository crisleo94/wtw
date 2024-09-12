import { KeyValuePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { MovieCardComponent } from './components/movie-card/movie-card.component';
import { Genre } from './interfaces/genre.interface';
import { Movie } from './interfaces/movie.interface';
import { GenresService } from './services/genres.service';
import { MoviesService } from './services/movies.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ReactiveFormsModule,
    HttpClientModule,
    NgFor,
    NgIf,
    NgClass,
    KeyValuePipe,
    MovieCardComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass',
})
export class AppComponent implements OnInit {
  debounceSubmit$ = new Subject<void>();

  generatedMovies: Movie[] = [];
  randomizedMovie: Movie = {} as Movie;
  title = 'wtw';
  currentYear = new Date().getFullYear();

  genres: Genre[] = [];

  dataForm = this.fBuilder.group({
    year: [
      1900,
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
    this.debounceSubmit$.pipe(debounceTime(200)).subscribe(() => this.generateMovies());
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
  }
}
