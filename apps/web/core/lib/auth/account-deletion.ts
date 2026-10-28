/**
 * Account deletion by e-mail link: the public pages and the token the link carries.
 *
 * The flow (shared contract with the Gauzy API, ever-co/ever-gauzy `POST /api/account-deletion/*`):
 * 1. `/delete-account` asks for an e-mail address and calls `request` with this page's confirm URL as `callbackUrl`.
 * 2. The e-mail links to `/delete-account/confirm#token=<token>`. The token travels in the URL FRAGMENT, which the
 *    browser never sends to a server (no access log, no `Referer`).
 * 3. The confirm page reads the token, removes it from the address bar at once, calls `verify` to show what will be
 *    deleted, and calls `confirm` only after an explicit confirmation.
 *
 * Kept dependency-free on purpose: Sentry's and PostHog's start-up code import `isAccountDeletionPath` before the app
 * bundle runs, to stay off on these pages (they would otherwise record the address with the token in it).
 */

/** The public request form. */
export const ACCOUNT_DELETION_PATH = '/delete-account';

/** The page the e-mailed link opens. */
export const ACCOUNT_DELETION_CONFIRM_PATH = '/delete-account/confirm';

/** What the confirm page asks the visitor to type. Not translated: one word that reads the same in every locale. */
export const ACCOUNT_DELETION_CONFIRM_WORD = 'DELETE';

/** Lifetime of an e-mailed link, as the API sets it by default (ACCOUNT_DELETION_TOKEN_TTL_MINUTES). */
export const ACCOUNT_DELETION_LINK_TTL_MINUTES = 30;

// An optional two-letter locale segment (every APPLICATION_LANGUAGES_CODE entry is one), then /delete-account.
const ACCOUNT_DELETION_PATH_PATTERN = /^(?:\/[a-z]{2})?\/delete-account(?:\/|$)/i;

/** True for `/delete-account`, `/delete-account/confirm` and their locale-prefixed forms (`/fr/delete-account`). */
export function isAccountDeletionPath(pathname: string | null | undefined): boolean {
	return !!pathname && ACCOUNT_DELETION_PATH_PATTERN.test(pathname);
}

/**
 * The confirm page URL for `callbackUrl`: `<origin>/delete-account/confirm`, with the locale prefix when the visitor
 * uses another locale than the default one (the app's routing is `localePrefix: 'as-needed'`).
 */
export function accountDeletionConfirmUrl(origin: string, locale?: string | null, defaultLocale = 'en'): string {
	const prefix = locale && locale !== defaultLocale ? `/${locale}` : '';
	return `${origin.replace(/\/+$/, '')}${prefix}${ACCOUNT_DELETION_CONFIRM_PATH}`;
}

/**
 * Reads the deletion token from the address the confirm page was opened with, and removes it from the address bar.
 *
 * The token is expected in the fragment (`#token=…`); a `?token=` query parameter is accepted too (and removed) so a
 * mail client that moved it still works. The address is replaced with `null` history state on purpose: Next.js treats
 * a `replaceState` without its own state as an external change and updates its router to the new address, so it does
 * not write the old one (with the token) back on its next history update.
 */
export function takeAccountDeletionToken(
	location: Pick<Location, 'hash' | 'search' | 'pathname'> = window.location,
	history: Pick<History, 'replaceState'> = window.history
): string | null {
	const fragment = new URLSearchParams(location.hash.replace(/^#/, ''));
	const query = new URLSearchParams(location.search);
	const token = (fragment.get('token') || query.get('token') || '').trim() || null;

	const hadTokenInQuery = query.has('token');
	if (location.hash || hadTokenInQuery) {
		query.delete('token');
		const search = query.toString();
		history.replaceState(null, '', `${location.pathname}${search ? `?${search}` : ''}`);
	}

	return token;
}

/** What happens to one account (one workspace) when the deletion is confirmed. */
export type TAccountDeletionOutcome = 'workspace-deleted' | 'account-removed';

/** One account of the e-mail address, as `verify` describes it. */
export interface IAccountDeletionAccount {
	workspace: string;
	role?: string | null;
	organizations?: string[];
	otherMembers?: number;
	outcome: TAccountDeletionOutcome;
	/** The account is the only admin of a workspace that keeps other members. */
	soleAdmin?: boolean;
}

/** `POST /account-deletion/verify` and `GET /account-deletion/me` (200). */
export interface IAccountDeletionVerifyResponse {
	/** The address, masked (`j***@example.com`). */
	email: string;
	expiresAt: string;
	accounts: IAccountDeletionAccount[];
	/**
	 * Fingerprint of this preview (accounts and outcomes). The deletion sends back the one it showed: when the accounts
	 * changed since (a member joined or left), the API answers 409 and deletes nothing, so the new preview is shown and
	 * confirmed again.
	 */
	planHash?: string;
}

/** `POST /account-deletion/confirm` (200). */
export interface IAccountDeletionConfirmResponse {
	deleted: boolean;
	accounts: number;
	workspacesDeleted: number;
}

/** `POST /account-deletion/request` body. Only `email` is required. */
export interface IAccountDeletionRequestBody {
	email: string;
	callbackUrl?: string;
	locale?: string;
	appName?: string;
	appLogo?: string;
	appSignature?: string;
	appLink?: string;
	companyName?: string;
	companyLink?: string;
}

/** True when the account is the only admin of a workspace that keeps other members: they lose their admin. */
export function leavesWorkspaceWithoutAdmin(account: IAccountDeletionAccount): boolean {
	return !!account.soleAdmin && (account.otherMembers ?? 0) > 0;
}
