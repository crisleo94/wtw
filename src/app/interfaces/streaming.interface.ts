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
