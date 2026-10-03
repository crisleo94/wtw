import { IMAGE_URL, PLACEHOLDER_IMG } from '../constants';

// TMDB paths start with `/`; joining them must not leave `w500//abc.jpg`.
export function posterUrl(path?: string | null, base = IMAGE_URL): string {
  const file = path?.replace(/^\/+/, '');
  return file ? `${base}/${file}` : PLACEHOLDER_IMG;
}
