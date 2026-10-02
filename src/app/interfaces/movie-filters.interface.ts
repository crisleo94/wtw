export type GenreMode = 'all' | 'any';

export interface MovieFilters {
  yearFrom?: number;
  yearTo?: number;
  genres?: number[];
  genreMode?: GenreMode;
  ratingMin?: number;
  ratingMax?: number;
  votesMin?: number;
  votesMax?: number;
}
