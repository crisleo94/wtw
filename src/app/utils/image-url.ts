import { IMAGE_URL, PLACEHOLDER_IMG } from '../constants';

// TMDB paths start with `/`; joining them must not leave `w500//abc.jpg`.
export function posterUrl(path?: string | null): string {
  const file = path?.replace(/^\/+/, '');
  return file ? `${IMAGE_URL}/${file}` : PLACEHOLDER_IMG;
}
