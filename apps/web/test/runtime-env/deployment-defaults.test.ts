/**
 * Deployment-specific defaults a reused Docker image must let its operator escape (server side, where
 * readRuntimeEnv() reads the live process env): Ever's hosts, demo accounts, GitHub App and branding
 * links are either derived from the deployment's own settings or can be replaced / turned off at runtime,
 * while an unset value keeps what Ever's deployments had.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ORIGINAL_ENV = process.env;
const WARNINGS_REGISTRY = '__everTeamsConfigWarnings';

// Every key these tests exercise starts unset: next/jest loads apps/web/.env, which sets several of them.
const CONTROLLED_KEYS = [
	'GAUZY_API_SERVER_URL',
	'NEXT_PUBLIC_GAUZY_API_SERVER_URL',
	'IS_DESKTOP_APP',
	'NEXT_PHASE',
	'APP_LINK',
	'APP_LOGO_URL',
	'APP_FAVICON_URL',
	'APP_SLOGAN_TEXT',
	'COMPANY_LINK',
	'TERMS_LINK',
	'PRIVACY_POLICY_LINK',
	'NEXT_PUBLIC_DEMO',
	'NEXT_PUBLIC_DEMO_ACCOUNTS',
	'NEXT_PUBLIC_POSTHOG_KEY',
	'NEXT_PUBLIC_POSTHOG_HOST',
	'NEXT_PUBLIC_GITHUB_APP_NAME'
];

type Constants = typeof import('@/core/constants/config/constants');

function loadConstants(env: Record<string, string> = {}): Constants {
	Object.assign(process.env, env);
	let constants!: Constants;
	jest.isolateModules(() => {
		constants = require('@/core/constants/config/constants');
	});
	return constants;
}

let warn: jest.SpyInstance;

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' };
	for (const key of CONTROLLED_KEYS) delete process.env[key];
	delete (globalThis as Record<string, unknown>)[WARNINGS_REGISTRY];
	warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
	warn.mockRestore();
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
	delete (globalThis as Record<string, unknown>)[WARNINGS_REGISTRY];
});

describe('GAUZY_API_SERVER_URL (server base of the /api proxy routes)', () => {
	it('uses GAUZY_API_SERVER_URL when it is set', () => {
		const constants = loadConstants({
			GAUZY_API_SERVER_URL: 'http://gauzy-api:3000',
			NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'https://api.example.org'
		});

		expect(constants.GAUZY_API_SERVER_URL).toBe('http://gauzy-api:3000/api');
	});

	it('falls back to the runtime public API URL before Ever-hosted API', () => {
		const constants = loadConstants({
			GAUZY_API_SERVER_URL: ' ',
			NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'https://api.example.org'
		});

		expect(constants.GAUZY_API_SERVER_URL).toBe('https://api.example.org/api');
		expect(warn).not.toHaveBeenCalled();
	});

	it('keeps https://api.ever.team as the last resort and warns once in production', () => {
		Object.assign(process.env, { NODE_ENV: 'production' });

		const first = loadConstants();
		const second = loadConstants();

		expect(first.GAUZY_API_SERVER_URL).toBe('https://api.ever.team/api');
		expect(second.GAUZY_API_SERVER_URL).toBe('https://api.ever.team/api');
		// Next evaluates the module once per server bundle: still a single line per process.
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toContain('GAUZY_API_SERVER_URL');
	});

	it('does not warn outside production nor while `next build` runs', () => {
		loadConstants();
		Object.assign(process.env, { NODE_ENV: 'production' });
		loadConstants({ NEXT_PHASE: 'phase-production-build' });

		expect(warn).not.toHaveBeenCalled();
	});

	it('keeps the IS_DESKTOP_APP line that .scripts/configure.electron.ts rewrites', () => {
		const source = readFileSync(resolve(__dirname, '../../core/constants/config/constants.tsx'), 'utf8');

		expect(source).toContain("export const IS_DESKTOP_APP = process.env.IS_DESKTOP_APP === 'true';");
	});
});

describe('APP_LOGO_URL', () => {
	it("is Ever's hosted logo when nothing is configured (unchanged default)", () => {
		const constants = loadConstants();

		expect(constants.APP_LINK).toBe('https://app.ever.team');
		expect(constants.APP_LOGO_URL).toBe('https://app.ever.team/assets/ever-teams.png');
		expect(constants.APP_LOGO_SRC).toBe('/assets/ever-teams.png');
	});

	it("derives the default from the deployment's APP_LINK (trailing slashes dropped)", () => {
		const constants = loadConstants({ APP_LINK: 'https://teams.example.org//' });

		expect(constants.APP_LOGO_URL).toBe('https://teams.example.org/assets/ever-teams.png');
		// The UI keeps loading the logo from this app.
		expect(constants.APP_LOGO_SRC).toBe('/assets/ever-teams.png');
	});

	it('resolves a configured path against APP_LINK (emails need an absolute URL)', () => {
		const constants = loadConstants({ APP_LINK: 'https://teams.example.org', APP_LOGO_URL: '/assets/acme.png' });

		expect(constants.APP_LOGO_URL).toBe('https://teams.example.org/assets/acme.png');
		expect(constants.APP_LOGO_SRC).toBe('/assets/acme.png');
	});

	it('keeps a configured absolute URL as it is', () => {
		const constants = loadConstants({
			APP_LINK: 'https://teams.example.org',
			APP_LOGO_URL: 'https://cdn.example.org/logo.png'
		});

		expect(constants.APP_LOGO_URL).toBe('https://cdn.example.org/logo.png');
		expect(constants.APP_LOGO_SRC).toBe('https://cdn.example.org/logo.png');
	});

	it('strips a long run of trailing slashes in linear time', () => {
		const started = Date.now();
		const constants = loadConstants({ APP_LINK: 'https://teams.example.org' + '/'.repeat(100_000) });

		expect(constants.APP_LOGO_URL).toBe('https://teams.example.org/assets/ever-teams.png');
		expect(Date.now() - started).toBeLessThan(5_000);
	});
});

describe("optional branding ('none' turns it off)", () => {
	it('keeps the defaults when unset or empty', () => {
		const constants = loadConstants({ TERMS_LINK: '', APP_SLOGAN_TEXT: '' });

		expect(constants.APP_SLOGAN_TEXT).toBe('Real-Time Clarity, Real-Time Reality™.');
		expect(constants.COMPANY_LINK).toBe('https://ever.co');
		expect(constants.TERMS_LINK).toBe('https://ever.team/tos');
		expect(constants.PRIVACY_POLICY_LINK).toBe('https://ever.team/privacy');
	});

	it("turns the slogan, company, terms and privacy links off with 'none' in any case", () => {
		const constants = loadConstants({
			APP_SLOGAN_TEXT: 'none',
			COMPANY_LINK: 'NONE',
			TERMS_LINK: ' None ',
			PRIVACY_POLICY_LINK: 'nOnE'
		});

		expect(constants.APP_SLOGAN_TEXT).toBe('');
		expect(constants.COMPANY_LINK).toBe('');
		expect(constants.TERMS_LINK).toBe('');
		expect(constants.PRIVACY_POLICY_LINK).toBe('');
		// Turned off on purpose: not reported as missing branding.
		expect(constants.getMissingBrandingVars()).toEqual([]);
	});

	it('uses configured values as they are', () => {
		const constants = loadConstants({ TERMS_LINK: 'https://example.org/terms', APP_SLOGAN_TEXT: 'Nonetheless' });

		expect(constants.TERMS_LINK).toBe('https://example.org/terms');
		expect(constants.APP_SLOGAN_TEXT).toBe('Nonetheless');
	});
});

describe('APP_FAVICON_URL', () => {
	it("defaults to this app's favicon and can be replaced at runtime", () => {
		expect(loadConstants().APP_FAVICON_URL).toBe('/favicon.ico');
		expect(loadConstants({ APP_FAVICON_URL: 'https://cdn.example.org/icon.png' }).APP_FAVICON_URL).toBe(
			'https://cdn.example.org/icon.png'
		);
	});
});

describe('DEMO_ACCOUNTS_CONFIG', () => {
	const summary = (constants: Constants) =>
		constants.DEMO_ACCOUNTS_CONFIG.map(({ type, email, password, role, translationKey }) => ({
			type,
			email,
			password,
			role,
			translationKey
		}));
	const DEFAULT_ACCOUNTS = [
		{
			type: 'SUPER_ADMIN',
			email: 'admin@ever.co',
			password: 'admin',
			role: 'Super Admin',
			translationKey: 'DEMO_SUPER_ADMIN'
		},
		{ type: 'ADMIN', email: 'local.admin@ever.co', password: 'admin', role: 'Admin', translationKey: 'DEMO_ADMIN' },
		{
			type: 'EMPLOYEE',
			email: 'employee@ever.co',
			password: '12345678',
			role: 'Employee',
			translationKey: 'DEMO_EMPLOYEE'
		}
	];

	it('is empty outside demo mode', () => {
		expect(loadConstants({ NEXT_PUBLIC_DEMO_ACCOUNTS: '[]' }).DEMO_ACCOUNTS_CONFIG).toEqual([]);
	});

	it('keeps the Gauzy demo seed accounts by default, with their icons', () => {
		const constants = loadConstants({ NEXT_PUBLIC_DEMO: 'true' });

		expect(summary(constants)).toEqual(DEFAULT_ACCOUNTS);
		expect(constants.DEMO_ACCOUNTS_CONFIG.every((account) => typeof account.icon === 'object')).toBe(true);
		expect(warn).not.toHaveBeenCalled();
	});

	it('reads the accounts of a differently seeded demo from NEXT_PUBLIC_DEMO_ACCOUNTS', () => {
		const constants = loadConstants({
			NEXT_PUBLIC_DEMO: 'true',
			NEXT_PUBLIC_DEMO_ACCOUNTS: JSON.stringify([
				{ type: 'EMPLOYEE', email: 'demo@example.org', password: 'demo-pass', role: 'Team member' },
				{ type: 'SUPER_ADMIN', email: 'owner@example.org', password: 'owner-pass' }
			])
		});

		expect(summary(constants)).toEqual([
			{
				type: 'EMPLOYEE',
				email: 'demo@example.org',
				password: 'demo-pass',
				role: 'Team member',
				translationKey: 'DEMO_EMPLOYEE'
			},
			{
				type: 'SUPER_ADMIN',
				email: 'owner@example.org',
				password: 'owner-pass',
				role: 'Super Admin',
				translationKey: 'DEMO_SUPER_ADMIN'
			}
		]);
		// Icons follow the type, as for the default accounts (compared by name: each load has its own copy).
		const defaults = loadConstants({ NEXT_PUBLIC_DEMO_ACCOUNTS: '' }).DEMO_ACCOUNTS_CONFIG;
		expect(constants.DEMO_ACCOUNTS_CONFIG.map((account) => account.icon.displayName)).toEqual(
			['EMPLOYEE', 'SUPER_ADMIN'].map(
				(type) => defaults.find((account) => account.type === type)?.icon.displayName
			)
		);
	});

	it.each([
		['invalid JSON', '[{"type":'],
		['not an array', '{"type":"ADMIN","email":"a@example.org","password":"x"}'],
		['an unknown type', '[{"type":"MANAGER","email":"a@example.org","password":"x"}]'],
		['a missing password', '[{"type":"ADMIN","email":"a@example.org"}]'],
		[
			'a duplicated type',
			'[{"type":"ADMIN","email":"a@example.org","password":"x"},{"type":"ADMIN","email":"b@example.org","password":"y"}]'
		]
	])('falls back to the default accounts on %s, with one warning that never shows the value', (_case, raw) => {
		const first = loadConstants({ NEXT_PUBLIC_DEMO: 'true', NEXT_PUBLIC_DEMO_ACCOUNTS: raw });
		const second = loadConstants();

		expect(summary(first)).toEqual(DEFAULT_ACCOUNTS);
		expect(summary(second)).toEqual(DEFAULT_ACCOUNTS);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(String(warn.mock.calls[0][0])).toContain('NEXT_PUBLIC_DEMO_ACCOUNTS');
		expect(String(warn.mock.calls[0][0])).not.toContain('example.org');
	});
});

describe('third-party integrations', () => {
	it('points PostHog at PostHog Cloud (US) by default, and it stays off without a key', () => {
		const constants = loadConstants();

		expect(constants.POSTHOG_HOST.value).toBe('https://us.i.posthog.com');
		expect(constants.POSTHOG_KEY.value).toBeFalsy();
	});

	it('uses the configured PostHog host', () => {
		const constants = loadConstants({ NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com' });

		expect(constants.POSTHOG_HOST.value).toBe('https://eu.i.posthog.com');
	});

	it("has no GitHub App by default (never Ever's), and uses the configured one", () => {
		expect(loadConstants().GITHUB_APP_NAME.value).toBe('');
		expect(loadConstants({ NEXT_PUBLIC_GITHUB_APP_NAME: 'acme-github' }).GITHUB_APP_NAME.value).toBe('acme-github');
	});
});
