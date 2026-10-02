export interface Movie {
  tmdbId: number;
  title: string;
  overview: string;
  posterPath: string;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
  voteCount: number;
  genreIds: number[];
}
