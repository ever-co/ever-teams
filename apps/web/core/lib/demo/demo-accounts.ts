/**
 * The demo sign-in presets of a demo deployment (NEXT_PUBLIC_DEMO=true), shared by the server and the
 * browser. The list itself reaches the browser through NEXT_PUBLIC_DEMO_ACCOUNTS (the runtime env the
 * server publishes to every page); the default list lives on the server only (default-demo-accounts.ts),
 * so a deployment that is not a demo never ships demo credentials in its client code.
 */

const DEMO_ACCOUNT_TYPE_NAMES = ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] as const;
type DemoAccountType = (typeof DEMO_ACCOUNT_TYPE_NAMES)[number];
export type DemoAccountCredentials = { type: DemoAccountType; email: string; password: string; role?: string };

const isDemoAccountCredentials = (value: unknown): value is DemoAccountCredentials => {
	if (!value || typeof value !== 'object') return false;
	const { type, email, password, role } = value as Record<string, unknown>;
	return (
		typeof type === 'string' &&
		(DEMO_ACCOUNT_TYPE_NAMES as readonly string[]).includes(type) &&
		typeof email === 'string' &&
		email.trim() !== '' &&
		typeof password === 'string' &&
		password !== '' &&
		(role === undefined || typeof role === 'string')
	);
};

/**
 * NEXT_PUBLIC_DEMO_ACCOUNTS parsed: a JSON array of `{ type, email, password, role? }` with at most one
 * account per type, or `null` when the value is anything else.
 */
export function parseDemoAccountsJson(raw: string): DemoAccountCredentials[] | null {
	try {
		const accounts: unknown = JSON.parse(raw);
		if (
			Array.isArray(accounts) &&
			accounts.every(isDemoAccountCredentials) &&
			new Set(accounts.map((account) => account.type)).size === accounts.length
		) {
			return accounts;
		}
	} catch {
		// Invalid JSON: the caller reports it like any other invalid value.
	}
	return null;
}

/** The warning for an unusable NEXT_PUBLIC_DEMO_ACCOUNTS (never the value itself). */
export const DEMO_ACCOUNTS_WARNING =
	'NEXT_PUBLIC_DEMO_ACCOUNTS is ignored: expected a JSON array of { type, email, password, role? } with ' +
	`one account per type (${DEMO_ACCOUNT_TYPE_NAMES.join(', ')}).`;
