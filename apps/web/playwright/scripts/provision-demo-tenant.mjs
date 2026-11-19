#!/usr/bin/env node
/**
 * Provisions a throwaway Ever Teams tenant on the DEMO API and writes the credentials
 * OUTSIDE the repository, into the git-ignored homelab .config folder.
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
 * Writes: <root>/workspace/.config/ever-teams-playwright-demo.json
 * Prints: only ids and non-secret labels, never the password or a token.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const CREDENTIALS_FILE = resolve(repoRoot, '../workspace/.config/ever-teams-playwright-demo.json');

const API = (process.env.E2E_DEMO_API_URL || 'https://apidev.ever.team').replace(/\/$/, '');
const PRODUCTION_APIS = ['https://api.ever.team', 'https://api.gauzy.co'];
if (PRODUCTION_APIS.includes(API)) {
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
		const detail = Array.isArray(payload.message) ? payload.message.join('; ') : payload.message ?? payload.raw;
		throw new Error(`${note ?? path} failed: HTTP ${response.status} ${detail}`);
	}
	return payload;
}

const unwrap = (payload) => payload?.data ?? payload;

async function main() {
	if (!fresh && existsSync(CREDENTIALS_FILE)) {
		const saved = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8'));
		try {
			const login = await call('POST', '/auth/login', {
				body: { email: saved.email, password: saved.password },
				note: 'reuse existing test account'
			});
			console.log(`reusing test tenant ${saved.tenantId} as ${saved.email}`);
			console.log(JSON.stringify({ ...saved, password: undefined, token: undefined }, null, 2));
			void login;
			return;
		} catch (error) {
			console.log(`existing account no longer usable (${error.message}); provisioning a new one`);
		}
	}

	const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
	const runId = randomBytes(3).toString('hex');
	const email = `${label}-${stamp}-${runId}@ever-teams.test`;
	const password = `E2e!${randomBytes(9).toString('base64url')}`;

	const user = unwrap(
		await call('POST', '/auth/register', {
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
		})
	);

	const login = unwrap(
		await call('POST', '/auth/login', { body: { email, password }, note: 'login' })
	);
	const accessToken = login.token ?? login.access_token;
	const refreshToken = login.refresh_token?.token ?? login.refresh_token;
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

	mkdirSync(dirname(CREDENTIALS_FILE), { recursive: true });
	writeFileSync(CREDENTIALS_FILE, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
	chmodIfNeeded();

	console.log('provisioned a fresh demo tenant:');
	console.log(JSON.stringify({ ...record, password: '<written to the credentials file>' }, null, 2));
	console.log(`credentials: ${CREDENTIALS_FILE}`);

	void refreshToken;
}

function chmodIfNeeded() {
	// Windows ignores this; on a POSIX shell it keeps the credentials file owner-only.
	try {
		import('node:fs').then(({ chmodSync }) => chmodSync(CREDENTIALS_FILE, 0o600));
	} catch {
		/* best effort */
	}
}

main().catch((error) => {
	console.error(`provisioning failed: ${error.message}`);
	process.exit(1);
});
