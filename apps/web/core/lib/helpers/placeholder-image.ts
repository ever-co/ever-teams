import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

/**
 * URL of a placeholder PNG served by the Gauzy API itself (`GET /api/placeholder/:size/:background`).
 * Public and safe to embed cross-origin, so no third-party placeholder service is needed.
 *
 * @param size `<width>x<height>`, e.g. `330x300`
 * @param background hex colour without `#`, e.g. `0ecc9D`
 * @param text up to 4 letters or digits drawn on the image
 */
export function getPlaceholderImageUrl(size: string, background: string, text?: string): string {
	const origin = (GAUZY_API_BASE_SERVER_URL.value || '').replace(/\/+$/, '');
	const query = text ? `?text=${encodeURIComponent(text.slice(0, 4))}` : '';
	return `${origin}/api/placeholder/${size}/${background}${query}`;
}
