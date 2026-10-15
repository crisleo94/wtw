// Countries and platforms come from TMDB, whose streaming data is from JustWatch.
export interface Region {
  code: string;
  name: string;
}

export interface WatchProvider {
  id: number;
  name: string;
  logoPath: string | null;
  priority?: number;
}

export interface StreamingPreferences {
  region: string | null;
  providerIds: number[];
  includeRentBuy: boolean;
}

export const MAX_PROVIDERS = 50;

export type Monetization = 'flatrate' | 'free' | 'ads' | 'rent' | 'buy';
export const MONETIZATIONS: Monetization[] = ['flatrate', 'free', 'ads', 'rent', 'buy'];

// "Where to watch" in one country; `link` is the TMDB page (there are no deep links).
export interface WatchProviders extends Record<Monetization, WatchProvider[]> {
  region: string;
  link: string | null;
}

// Extra params of GET /api/movies/generate.
export interface StreamingQuery {
  region?: string;
  providers?: number[];
  monetization?: Monetization[];
}
