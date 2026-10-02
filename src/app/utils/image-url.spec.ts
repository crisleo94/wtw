import { IMAGE_URL, PLACEHOLDER_IMG } from '../constants';
import { posterUrl } from './image-url';

describe('posterUrl', () => {
  it('should join TMDB paths with a single slash', () => {
    expect(posterUrl('/abc.jpg')).toBe(`${IMAGE_URL}/abc.jpg`);
    expect(posterUrl('abc.jpg')).toBe(`${IMAGE_URL}/abc.jpg`);
    expect(posterUrl('/abc.jpg')).not.toContain('//abc');
  });

  it('should use the placeholder without a path', () => {
    expect(posterUrl('')).toBe(PLACEHOLDER_IMG);
    expect(posterUrl(null)).toBe(PLACEHOLDER_IMG);
    expect(posterUrl('/')).toBe(PLACEHOLDER_IMG);
  });
});
