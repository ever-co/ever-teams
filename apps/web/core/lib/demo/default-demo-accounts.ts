import { DEMO_ACCOUNTS_WARNING, parseDemoAccountsJson, type DemoAccountCredentials } from './demo-accounts';

/**
 * Server only (imported by instrumentation.ts, never by browser code): the default demo sign-in presets,
 * the accounts of the Gauzy demo seed, which Ever's demo runs on.
 */
const DEFAULT_DEMO_ACCOUNTS: DemoAccountCredentials[] = [
	{ type: 'SUPER_ADMIN', email: 'admin@ever.co', password: 'admin' },
	{ type: 'ADMIN', email: 'local.admin@ever.co', password: 'admin' },
	// The Gauzy demo seed creates this account with '12345678', not '123456'. Verified against
	// the live demo API on 2026-08-17: 123456 -> 401, 12345678 -> 200. With the wrong value the
	// Employee Demo one-click login on Ever's demo failed with 401 for every visitor.
	{ type: 'EMPLOYEE', email: 'employee@ever.co', password: '12345678' }
];

/** One warning per process (the registry the other configuration warnings use). */
function warnOnce(key: string, message: string): void {
	const registry = globalThis as typeof globalThis & { __everTeamsConfigWarnings?: Set<string> };
	registry.__everTeamsConfigWarnings ??= new Set<string>();
	if (registry.__everTeamsConfigWarnings.has(key)) return;
	registry.__everTeamsConfigWarnings.add(key);
	console.warn(message);
}

/**
 * At server start, on a demo deployment (NEXT_PUBLIC_DEMO=true): NEXT_PUBLIC_DEMO_ACCOUNTS as the
 * deployment set it, or the default accounts when it is unset, blank or unusable (with one warning that
 * never shows the value). The server then reads the list from its env and publishes it to every page
 * with the rest of the public runtime env. Nothing changes on any other deployment.
 */
export function applyDemoAccountDefaults(env: Record<string, string | undefined> = process.env): void {
	if (env.NEXT_PUBLIC_DEMO !== 'true') return;
	const raw = env.NEXT_PUBLIC_DEMO_ACCOUNTS;
	if (raw !== undefined && raw.trim() !== '') {
		if (parseDemoAccountsJson(raw)) return;
		warnOnce('NEXT_PUBLIC_DEMO_ACCOUNTS', DEMO_ACCOUNTS_WARNING);
	}
	env.NEXT_PUBLIC_DEMO_ACCOUNTS = JSON.stringify(DEFAULT_DEMO_ACCOUNTS);
}
