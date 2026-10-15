import { WatchProviders } from './streaming.interface';

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
  // Only on generated movies, when a country was sent.
  watchProviders?: WatchProviders;
}
