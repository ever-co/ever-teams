import { tasksStatusSvgCacheDuration } from '@/core/constants/config/constants';

/**
 * Kept out of core/services/server/fetch.ts: the settings chips load it in the browser, and that module imports
 * server-only code (client-ip.ts: node:crypto, node:net, next/headers).
 */

/** Tasks status SVG icons fetch */

// In memory cache for performance

const tasksStatusSvgCache = new Map<
	string,
	{
		content: Response;
		timestamp: number;
	}
>();

export async function svgFetch(url: string): Promise<Response> {
	try {
		//Url validation
		new URL(url);

		const cached = tasksStatusSvgCache.get(url);
		const now = Date.now();

		if (cached && now - cached.timestamp < tasksStatusSvgCacheDuration) {
			return cached.content.clone();
		}

		// Fetch the SVG
		const response = await fetch(url);

		tasksStatusSvgCache.set(url, {
			content: response.clone(),
			timestamp: now
		});
		return response;
	} catch {
		throw new Error('Invalid URL provided');
	}
}
