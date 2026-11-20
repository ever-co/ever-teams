#!/usr/bin/env node
/**
 * Provisions a throwaway Ever Teams tenant on the DEMO API and writes the credentials
 * OUTSIDE the repository: to E2E_DEMO_CREDENTIALS_FILE, or by default to
 * ~/.ever-teams/playwright-demo-tenant.json (owner-only on POSIX).
 *
 * It repeats exactly what the web app does when a person signs up (see
 * apps/web/core/services/client/api/auth/register.service.ts):
 *   POST /api/auth/register -> /api/auth/login -> /api/tenant -> /api/organization
 *   -> /api/employee -> /api/organization-team -> /api/auth/refresh-token
 *
 * Never run this against a production API. Refuses api.ever.team for that reason.
 *
 * Usage:
 *   node apps/web/playwright/scripts/provision-demo-tenant.mjs [--fresh] [--label <name>]
 *
 * Writes: E2E_DEMO_CREDENTIALS_FILE (default ~/.ever-teams/playwright-demo-tenant.json)
 * Prints: only ids and non-secret labels, never the password or a token.
 */
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

const CREDENTIALS_FILE = resolve(
	process.env.E2E_DEMO_CREDENTIALS_FILE || resolve(homedir(), '.ever-teams', 'playwright-demo-tenant.json')
);

const API = new URL(process.env.E2E_DEMO_API_URL || 'https://apidev.ever.team').origin;
// By parsed hostname, so `https://api.ever.team:443` or `API.EVER.TEAM.` is refused too (same list as test-servers.ts).
const PRODUCTION_HOSTS = ['api.ever.team', 'app.ever.team', 'api.gauzy.co', 'app.gauzy.co'];
if (PRODUCTION_HOSTS.includes(new URL(API).hostname.toLowerCase().replace(/\.$/, ''))) {
	console.error(`Refusing to provision against ${API}: that is a production API.`);
	process.exit(1);
}

const args = process.argv.slice(2);
const fresh = args.includes('--fresh');
const labelAt = args.indexOf('--label');
const label = labelAt >= 0 ? args[labelAt + 1] : 'playwright-e2e';

async function call(method, path, { body, token, note } = {}) {
	const url = `${API}/api${path}`;
	const headers = { accept: 'application/json', 'content-type': 'application/json' };
	if (token) headers.authorization = `Bearer ${token}`;
	const response = await fetch(url, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const text = await response.text();
	let payload;
	try {
		payload = JSON.parse(text);
	} catch {
		payload = { raw: text.slice(0, 300) };
	}
	if (!response.ok) {
		const detail = Array.isArray(payload.message) ? payload.message.join('; ') : (payload.message ?? payload.raw);
		throw new Error(`${note ?? path} failed: HTTP ${response.status} ${safeLog(detail)}`);
	}
	return payload;
}

const unwrap = (payload) => payload?.data ?? payload;

/** A server-supplied value made safe to print on one line: no control characters (no forged log lines), no JWT. */
const safeLog = (value) =>
	String(value ?? '')
		.replace(/\p{Cc}+/gu, ' ')
		.replace(/eyJ[A-Za-z0-9_.-]+/g, '<token>');

/**
 * The password sign-in, as the web app itself attempts it: `/auth/login` (register.service.ts
 * `loginUser`, right after a sign-up) and then `/auth/signin.email.password` (what the sign-in page
 * posts to). Both answers are tried so a refusal names both, rather than the one that happened first.
 */
async function signIn(email, password) {
	const attempts = [
		['/auth/login', { email, password }],
		['/auth/signin.email.password', { email, password, includeTeams: true }]
	];
	const failures = [];

	for (const [path, body] of attempts) {
		try {
			const payload = unwrap(await call('POST', path, { body, note: `sign in ${path}` }));
			if (payload?.token ?? payload?.access_token) return payload;
			failures.push(`${path} answered ${Object.keys(payload ?? {}).join(', ') || 'nothing'}`);
		} catch (error) {
			failures.push(String(error.message).replace(/eyJ[A-Za-z0-9_.-]+/g, '<token>'));
		}
	}

	throw new Error(`no password sign-in route accepted the new account: ${failures.join(' | ')}`);
}

async function main() {
	if (!fresh && existsSync(CREDENTIALS_FILE)) {
		const saved = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8'));
		try {
			await signIn(saved.email, saved.password);
			console.log(`reusing test tenant ${saved.tenantId} as ${saved.email}`);
			console.log(JSON.stringify({ ...saved, password: undefined, token: undefined }, null, 2));
			return;
		} catch (error) {
			console.log(`existing account no longer usable (${error.message}); provisioning a new one`);
		}
	}

	const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
	const runId = randomBytes(3).toString('hex');
	const email = `${label}-${stamp}-${runId}@ever-teams.test`;
	const password = `E2e!${randomBytes(9).toString('base64url')}`;

	// Field names only: a register answer can carry a token, and a token is never printed.
	const registered = await call('POST', '/auth/register', {
		body: {
			password,
			confirmPassword: password,
			user: {
				firstName: 'Playwright',
				lastName: `E2E ${runId}`,
				email,
				timeZone: 'Etc/UTC'
			},
			appEmailConfirmationUrl: 'https://demo.ever.team/verify-email'
		},
		note: 'register'
	});
	console.log(`register answered with: ${safeLog(Object.keys(registered ?? {}).join(', '))}`);
	// Never a value that could be a token: only the outcome and its message, with any JWT scrubbed.
	const notice = Array.isArray(registered?.message) ? registered.message.join('; ') : registered?.message;
	console.log(
		`register outcome: success=${safeLog(registered?.success ?? 'not stated')} message=${safeLog(notice).slice(0, 160)}`
	);

	const user = unwrap(registered);
	const login = await signIn(email, password);
	const accessToken = login.token ?? login.access_token;
	if (!accessToken) throw new Error('login returned no access token');

	const tenant = unwrap(
		await call('POST', '/tenant', {
			body: { name: `Playwright E2E ${runId}` },
			token: accessToken,
			note: 'tenant'
		})
	);

	const organization = unwrap(
		await call('POST', '/organization', {
			body: { currency: 'USD', name: `Playwright Org ${runId}`, tenantId: tenant.id, invitesAllowed: true },
			token: accessToken,
			note: 'organization'
		})
	);

	const employee = unwrap(
		await call('POST', '/employee', {
			body: {
				organizationId: organization.id,
				startedWorkOn: new Date().toISOString(),
				userId: user.id,
				tenantId: tenant.id
			},
			token: accessToken,
			note: 'employee'
		})
	);

	const team = unwrap(
		await call('POST', '/organization-team', {
			body: {
				name: `Playwright Team ${runId}`,
				tenantId: tenant.id,
				organizationId: organization.id,
				managerIds: [employee.id],
				public: true
			},
			token: accessToken,
			note: 'organization-team'
		})
	);

	const record = {
		apiUrl: API,
		webUrl: process.env.E2E_DEMO_WEB_URL || 'https://demo.ever.team',
		email,
		password,
		userId: user.id,
		employeeId: employee.id,
		tenantId: tenant.id,
		organizationId: organization.id,
		teamId: team.id,
		createdAt: new Date().toISOString()
	};

	mkdirSync(dirname(CREDENTIALS_FILE), { recursive: true, mode: 0o700 });
	writeFileSync(CREDENTIALS_FILE, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
	try {
		// `mode` only applies when the file is created; this keeps an overwritten file owner-only too.
		// Windows ignores it.
		chmodSync(CREDENTIALS_FILE, 0o600);
	} catch {
		/* best effort */
	}

	console.log('provisioned a fresh demo tenant:');
	console.log(JSON.stringify({ ...record, password: '<written to the credentials file>' }, null, 2));
	console.log(`credentials: ${CREDENTIALS_FILE}`);
}

main().catch((error) => {
	console.error(`provisioning failed: ${error.message}`);
	process.exit(1);
});
