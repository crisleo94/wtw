import { Genre } from './genre.interface';
import { Movie } from './movie.interface';
import { WatchProviders } from './streaming.interface';

export interface CastMember {
  id: number;
  name: string;
  character: string | null;
  profilePath: string | null;
}

// Only directing and writing jobs come from the API.
export interface CrewMember {
  id: number;
  name: string;
  job: string;
}

export interface Trailer {
  key: string;
  name: string;
  site: 'YouTube';
}

export interface MovieDetailsUser {
  watched: boolean;
  watchedAt: string | null;
  rating: number | null;
  inWatchlist: boolean;
  lists: { id: string; name: string }[];
}

// GET /api/movies/:tmdbId/details (WTW-44).
export interface MovieDetails {
  movie: Movie & {
    runtime: number | null;
    tagline: string | null;
    genres: Genre[];
    originalTitle: string | null;
    originalLanguage: string | null;
  };
  certification: string | null;
  cast: CastMember[];
  crew: CrewMember[];
  trailer: Trailer | null;
  recommendations: Movie[];
  backdrops: string[];
  externalIds: { imdbId: string | null };
  watchProviders?: WatchProviders | null;
  user?: MovieDetailsUser;
}
