#!/usr/bin/env node
/**
 * The deterministic test backend for the Playwright suites: one process holding
 *   - the mock Gauzy API   on 127.0.0.1:3988  (the same mock the Cypress suite uses)
 *   - the Ever Platform mock on 127.0.0.1:3989 (the statistics reporter's sink)
 *   - a fake OpenID Connect issuer on 127.0.0.1:3991 (the Ever ID suite's identity provider)
 *   - a control API         on 127.0.0.1:3990  (/health, /scenario, /reset, /state, /requests, /idp/*)
 *
 * Why the control API exists: Cypress can call the mock in-process with `cy.task`, but Playwright
 * runs each test file in its own worker process, so scenario switching and request inspection have
 * to cross a process boundary. The control API is that boundary. It is bound to 127.0.0.1 and
 * serves no page, only JSON.
 *
 * Run: node apps/web/playwright/backend.mjs
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMockGauzyServer } from '../cypress/support/mock-gauzy-server.mjs';
import { createMockPlatform } from '@ever-co/connect-tools/mock-platform';
import { createEverIdIdp } from './ever-id-idp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '../../..');
const FIXTURE = JSON.parse(readFileSync(resolve(projectRoot, 'apps/web/cypress/fixtures/bootstrap.json'), 'utf8'));

const GAUZY_PORT = Number(process.env.E2E_MOCK_API_PORT || 3988);
const PLATFORM_PORT = Number(process.env.E2E_MOCK_PLATFORM_PORT || 3989);
const CONTROL_PORT = Number(process.env.E2E_CONTROL_PORT || 3990);
const EVER_ID_ISSUER_PORT = Number(process.env.E2E_EVER_ID_ISSUER_PORT || 3991);
/** The client id the Ever ID suite configures the app with; minted tokens are addressed to it. */
const EVER_ID_CLIENT_ID = process.env.E2E_EVER_ID_CLIENT_ID || 'playwright-teams-client';

const mock = await createMockGauzyServer({ fixture: FIXTURE, port: GAUZY_PORT });

const platform = createMockPlatform({
	config: {
		clock: { real: true },
		limits: { stats_reports_per_day: 1_000_000, stats_periods_per_day: 100, stats_new_ids_per_address_hour: 1_000 }
	}
});
await platform.listen(PLATFORM_PORT, '127.0.0.1');

// The Ever ID suite's identity provider. Harmless in every other run: nothing talks to it unless the app
// under test was started with EVER_ID_* settings, and the only config that does is
// playwright.ever-id.config.ts.
const idp = await createEverIdIdp({ port: EVER_ID_ISSUER_PORT, clientId: EVER_ID_CLIENT_ID });

function json(res, status, payload) {
	const body = JSON.stringify(payload);
	res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
	res.end(body);
}

class BadRequest extends Error {}

/** A control request's JSON body. Malformed JSON is the test's own bug, so it is a 400, never a silent `{}`. */
function readBody(req) {
	return new Promise((done, fail) => {
		let raw = '';
		req.on('data', (chunk) => (raw += chunk));
		req.on('error', fail);
		req.on('end', () => {
			try {
				done(raw ? JSON.parse(raw) : {});
			} catch (error) {
				fail(new BadRequest(`malformed JSON body: ${error.message}`));
			}
		});
	});
}

const control = createServer((req, res) => {
	handleControl(req, res).catch((error) => {
		if (res.headersSent) return res.end();
		json(res, error instanceof BadRequest ? 400 : 500, { error: String(error?.message ?? error) });
	});
});

async function handleControl(req, res) {
	const url = new URL(req.url ?? '/', `http://127.0.0.1:${CONTROL_PORT}`);

	if (req.method === 'GET' && url.pathname === '/health') {
		return json(res, 200, { ok: true, gauzy: mock.origin, platform: `http://127.0.0.1:${PLATFORM_PORT}` });
	}
	// The ids a test asserts on must be the ids the mock answers with, so the fixture is served from
	// the process that owns it instead of being read from disk by every worker.
	if (req.method === 'GET' && url.pathname === '/fixture') {
		return json(res, 200, FIXTURE);
	}
	if (req.method === 'POST' && url.pathname === '/reset') {
		mock.reset();
		platform.state.reset();
		platform.recorder.clear();
		idp.reset();
		return json(res, 200, { ok: true });
	}
	// The fake issuer, on the same control boundary as the mock: a test asks for a signed logout token and gets
	// the compact JWS, so the private key never leaves the process holding it.
	if (req.method === 'POST' && url.pathname === '/idp/logout-token') {
		return json(res, 200, idp.mint(await readBody(req)));
	}
	if (req.method === 'GET' && url.pathname === '/idp/state') {
		return json(res, 200, idp.state());
	}
	if (req.method === 'POST' && url.pathname === '/scenario') {
		mock.setScenario(await readBody(req));
		return json(res, 200, { ok: true });
	}
	if (req.method === 'GET' && url.pathname === '/state') {
		return json(res, 200, mock.state());
	}
	if (req.method === 'GET' && url.pathname === '/requests') {
		return json(res, 200, mock.requests());
	}
	if (req.method === 'GET' && url.pathname === '/stats') {
		return json(
			res,
			200,
			platform.state.statsReports
				.filter((report) => report.product === 'teams')
				.map((report) => ({ instanceId: report.instance_id, period: report.period, product: report.product }))
		);
	}
	return json(res, 404, { error: `no control route for ${req.method} ${url.pathname}` });
}

await new Promise((done) => control.listen(CONTROL_PORT, '127.0.0.1', done));

console.log(
	JSON.stringify({
		gauzy: mock.origin,
		platform: `http://127.0.0.1:${PLATFORM_PORT}`,
		control: `http://127.0.0.1:${CONTROL_PORT}`,
		ever_id_issuer: idp.issuer
	})
);

async function shutdown() {
	await mock.close();
	await platform.close();
	await idp.close();
	control.close();
	process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
