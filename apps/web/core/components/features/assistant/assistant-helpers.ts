export const ASSISTANT_COLUMN = 'mx-auto w-full max-w-[720px]';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function errorFromJsonBody(message: string) {
	try {
		const body: unknown = JSON.parse(message);
		if (!isRecord(body)) {
			return null;
		}
		if (typeof body.error !== 'string') {
			return null;
		}
		return body.error;
	} catch {
		return null;
	}
}

/** The chat route answers refusals as `{ "error": "..." }`, which the SDK surfaces as the raw response text. */
export function readableChatError(error: Error, fallback: string) {
	const message = error.message.trim();
	if (!message) {
		return fallback;
	}
	const bodyError = errorFromJsonBody(message);
	if (bodyError) {
		return bodyError;
	}
	return message;
}

function isSameDay(left: Date, right: Date) {
	const sameYear = left.getFullYear() === right.getFullYear();
	const sameMonth = left.getMonth() === right.getMonth();
	const sameDate = left.getDate() === right.getDate();
	return sameYear && sameMonth && sameDate;
}

export function formatSessionTime(updatedAt: number, locale: string) {
	const date = new Date(updatedAt);
	const now = new Date();
	if (isSameDay(date, now)) {
		const timeFormat = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
		return timeFormat.format(date);
	}
	const dayFormat = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
	return dayFormat.format(date);
}

export function displayNameOf(
	user: { firstName?: string | null; name?: string | null } | null | undefined,
	fallback: string
) {
	if (user?.firstName) {
		return user.firstName;
	}
	if (user?.name) {
		return user.name;
	}
	return fallback;
}
