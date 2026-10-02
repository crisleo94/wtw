import { MovieFilters } from './movie-filters.interface';
import { Movie } from './movie.interface';

export const WATCHLIST_NAME = 'Watchlist';

export interface SessionHistoryEntry {
  movie: Movie;
  filters?: MovieFilters;
  generatedAt: string;
}

export interface SessionList {
  name: string;
  isSystem?: boolean;
  items: number[];
}

// Shape of `wtw.session.v1`, also the body of POST /api/me/import.
export interface SessionData {
  history: SessionHistoryEntry[];
  watched: number[];
  lists: SessionList[];
  movies: Record<string, Movie>;
}

export interface ImportSummary {
  history: number;
  watched: number;
  lists: number;
  items: number;
}

export interface HistoryEntry {
  id?: string;
  movie: Movie;
  filters?: MovieFilters | Record<string, unknown>;
  generatedAt: string;
  watched: boolean;
}

export interface HistoryPage {
  items: HistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface MovieListItem {
  tmdbId: number;
  position: number;
  addedAt?: string;
  watched: boolean;
  movie: Movie;
}

export interface MovieList {
  id?: string;
  name: string;
  isSystem: boolean;
  position: number;
  items: MovieListItem[];
}
