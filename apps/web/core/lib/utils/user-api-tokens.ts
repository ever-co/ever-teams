import {
	USER_API_TOKEN_NAME_MAX_LENGTH,
	type TUserApiToken,
	type TUserApiTokenExpiry
} from '@/core/types/schemas/user/user-api-token.schema';

/** Gauzy refuses a new token while the person holds this many working ones (`MAX_ACTIVE_USER_API_TOKENS`). */
export const MAX_ACTIVE_USER_API_TOKENS = 10;

/** Gauzy's public route that trades a personal API token for a short-lived access token. */
const EXCHANGE_PATH = '/api/auth/api-token/exchange';

export type UserApiTokenNameProblem = 'REQUIRED' | 'TOO_LONG';

export type UserApiTokenExpiryState =
	| { kind: 'never' }
	| { kind: 'expires'; date: string }
	| { kind: 'expired'; date: string };

export type UserApiTokenLastUseState = { kind: 'never' } | { kind: 'used'; date: string };

function timeOf(value: string): number {
	return new Date(value).getTime();
}

/** Expired once its end is reached, as Gauzy counts it: a token ending right now no longer works. */
function isExpired(token: TUserApiToken, now: Date): boolean {
	if (!token.expiresAt) {
		return false;
	}
	return timeOf(token.expiresAt) <= now.getTime();
}

export function activeUserApiTokenCount(tokens: ReadonlyArray<TUserApiToken>, now: Date): number {
	return tokens.filter((token) => !isExpired(token, now)).length;
}

export function canCreateUserApiToken(tokens: ReadonlyArray<TUserApiToken>, now: Date): boolean {
	return activeUserApiTokenCount(tokens, now) < MAX_ACTIVE_USER_API_TOKENS;
}

/** The soonest end still to come among the working tokens: the moment their count drops by itself. None without one. */
export function nextUserApiTokenExpiry(tokens: ReadonlyArray<TUserApiToken>, now: Date): Date | null {
	let next: number | null = null;
	for (const token of tokens) {
		if (!token.expiresAt || isExpired(token, now)) {
			continue;
		}
		const end = timeOf(token.expiresAt);
		if (Number.isFinite(end) && (next === null || end < next)) {
			next = end;
		}
	}
	if (next === null) {
		return null;
	}
	return new Date(next);
}

export function userApiTokenNameProblem(name: string): UserApiTokenNameProblem | null {
	const trimmed = name.trim();
	if (!trimmed) {
		return 'REQUIRED';
	}
	if (trimmed.length > USER_API_TOKEN_NAME_MAX_LENGTH) {
		return 'TOO_LONG';
	}
	return null;
}

export function userApiTokenExpiryState(token: TUserApiToken, now: Date): UserApiTokenExpiryState {
	if (!token.expiresAt) {
		return { kind: 'never' };
	}
	if (isExpired(token, now)) {
		return { kind: 'expired', date: token.expiresAt };
	}
	return { kind: 'expires', date: token.expiresAt };
}

export function userApiTokenLastUseState(token: TUserApiToken): UserApiTokenLastUseState {
	if (!token.lastUsedAt) {
		return { kind: 'never' };
	}
	return { kind: 'used', date: token.lastUsedAt };
}

export function formatUserApiTokenDate(value: string, locale: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

/** Working tokens first, newest first; then the expired ones, the latest to expire first. */
export function sortUserApiTokens(tokens: ReadonlyArray<TUserApiToken>, now: Date): TUserApiToken[] {
	const working = tokens.filter((token) => !isExpired(token, now));
	const expired = tokens.filter((token) => isExpired(token, now));
	const newestFirst = [...working].sort((first, second) => timeOf(second.createdAt) - timeOf(first.createdAt));
	const latestExpiredFirst = [...expired].sort(
		(first, second) => timeOf(second.expiresAt ?? '') - timeOf(first.expiresAt ?? '')
	);
	return [...newestFirst, ...latestExpiredFirst];
}

/**
 * Where a script trades its token: on the API the app calls directly when it does (`NEXT_PUBLIC_GAUZY_API_SERVER_URL`),
 * else the route alone, on whatever address the deployment gives its API.
 */
export function exchangeUrlOf(apiOrigin = ''): string {
	let end = apiOrigin.length;
	while (end > 0 && apiOrigin[end - 1] === '/') {
		end -= 1;
	}
	return `${apiOrigin.slice(0, end)}${EXCHANGE_PATH}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The end Gauzy gives a new token (`resolveUserApiTokenExpiry`): 90 or 365 days from now, or none. */
export function expiryDateOf(expiry: TUserApiTokenExpiry, now: Date): Date | null {
	if (expiry === '90d') {
		return new Date(now.getTime() + 90 * DAY_MS);
	}
	if (expiry === '1y') {
		return new Date(now.getTime() + 365 * DAY_MS);
	}
	return null;
}
