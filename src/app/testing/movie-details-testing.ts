import { MovieDetails } from '../interfaces/movie-details.interface';

// A complete GET /api/movies/:id/details answer (WTW-44 contract) for specs.
export function movieDetails(overrides: Partial<MovieDetails> = {}): MovieDetails {
  return {
    movie: {
      tmdbId: 550,
      title: 'Fight Club',
      overview: 'An insomniac office worker meets a soap salesman.',
      posterPath: '/poster.jpg',
      backdropPath: '/backdrop.jpg',
      releaseDate: '1999-10-15',
      voteAverage: 8.438,
      voteCount: 30000,
      genreIds: [18],
      runtime: 139,
      tagline: 'Mischief. Mayhem. Soap.',
      genres: [{ id: 18, name: 'Drama' }, { id: 53, name: 'Thriller' }],
      originalTitle: 'Fight Club',
      originalLanguage: 'en',
    },
    certification: '18',
    cast: [
      { id: 819, name: 'Edward Norton', character: 'Narrator', profilePath: '/norton.jpg' },
      { id: 287, name: 'Brad Pitt', character: 'Tyler Durden', profilePath: null },
    ],
    crew: [
      { id: 7467, name: 'David Fincher', job: 'Director' },
      { id: 7469, name: 'Jim Uhls', job: 'Screenplay' },
      { id: 7468, name: 'Chuck Palahniuk', job: 'Novel' },
    ],
    trailer: { key: 'SUXWAEX2jlg', name: 'Official Trailer', site: 'YouTube' },
    recommendations: [
      { tmdbId: 807, title: 'Se7en', overview: '', posterPath: '/se7en.jpg', backdropPath: null, releaseDate: '1995-09-22', voteAverage: 8.4, voteCount: 20000, genreIds: [] },
    ],
    backdrops: ['/backdrop.jpg'],
    externalIds: { imdbId: 'tt0137523' },
    watchProviders: {
      region: 'EC',
      link: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=EC',
      flatrate: [{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }],
      free: [], ads: [], rent: [], buy: [],
    },
    ...overrides,
  };
}
