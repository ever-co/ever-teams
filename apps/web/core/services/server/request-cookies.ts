import { TOKEN_COOKIE_NAME } from '@/core/constants/config/constants';
import { tokenCookieChunkCount } from '@/core/lib/helpers/cookies/token-chunks';

/**
 * The cookies of a request, read from its `Cookie` header. The route handlers need them synchronously, and the
 * cookies helper answers a promise on the server (cookies-next 6), so they do not go through it.
 */
export function requestCookies(req: Request): Map<string, string> {
	const cookies = new Map<string, string>();
	for (const part of (req.headers.get('cookie') ?? '').split(';')) {
		const at = part.indexOf('=');
		if (at <= 0) continue;
		const name = part.slice(0, at).trim();
		if (!name || cookies.has(name)) continue;
		const raw = part.slice(at + 1).trim();
		try {
			cookies.set(name, decodeURIComponent(raw));
		} catch {
			cookies.set(name, raw);
		}
	}
	return cookies;
}

/** The access token: one cookie, or the chunks the sign-in writes for a long one (`auth-token_totalChunks`). */
export function requestAccessToken(cookies: Map<string, string>): string | null {
	const total = tokenCookieChunkCount(cookies.get(`${TOKEN_COOKIE_NAME}_totalChunks`));
	if (total) {
		const chunks: string[] = [];
		for (let index = 0; index < total; index += 1) {
			const chunk = cookies.get(`${TOKEN_COOKIE_NAME}${index}`);
			if (!chunk) return null;
			chunks.push(chunk);
		}
		return chunks.join('');
	}
	return cookies.get(TOKEN_COOKIE_NAME) || null;
}
