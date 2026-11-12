import { errorStatusOf } from '@/core/lib/utils/error-feedback';

/** The text an error carries: the platform's own message for a refusal it explained, as the API client keeps it. */
function messageTextOf(error: unknown): string {
	if (!error || typeof error !== 'object') return '';
	const message = (error as { message?: unknown }).message;
	if (typeof message === 'string') return message.trim();
	if (Array.isArray(message)) return message.filter((part) => typeof part === 'string').join(' ').trim();
	return '';
}

/**
 * Whether the platform does not have the route at all (a version older than the feature): its framework answers 404
 * with `Cannot PATCH /api/…`. A 404 the route itself answers (a message not found) is not one.
 */
export function isMissingRouteError(error: unknown): boolean {
	return errorStatusOf(error) === 404 && /^Cannot (GET|POST|PUT|PATCH|DELETE) \//.test(messageTextOf(error));
}

/**
 * The platform's explanation of a refusal (a 4xx with a message of its own), to show as it is; null for a failure it
 * did not explain (a network error, a 5xx, the API client's own wording), which the caller words itself.
 */
export function platformMessageOf(error: unknown): string | null {
	const status = errorStatusOf(error);
	if (status === null || status < 400 || status >= 500) return null;
	const text = messageTextOf(error);
	// The API client's own description of a transport error (`Error (Network Error) – …`) is no explanation.
	if (!text || /^Error \(|^Request failed with status code/.test(text) || isMissingRouteError(error)) return null;
	return text.length > 300 ? `${text.slice(0, 299)}…` : text;
}
