import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'cypress';

import { createMockGauzyServer } from './cypress/support/mock-gauzy-server.mjs';
import {
	assertDeterministicApiOrigins,
	resolvePerformanceOutput
} from '../../tools/performance/cypress-performance-config.mjs';

type LiveAuthResult = {
	accessToken: string;
	refreshToken?: string;
	teamId?: string;
	tenantId?: string;
	organizationId?: string;
	userId?: string;
};

function requiredEnvironment(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Live authentication requires ${name}.`);
	return value;
}

async function liveAuthenticate(): Promise<LiveAuthResult> {
	const apiUrl = requiredEnvironment('CYPRESS_AUTH_API_URL').replace(/\/$/, '');
	const email = requiredEnvironment('CYPRESS_AUTH_EMAIL');
	const password = requiredEnvironment('CYPRESS_AUTH_PASSWORD');
	const endpoint = apiUrl.endsWith('/api')
		? `${apiUrl}/auth/signin.email.password`
		: `${apiUrl}/api/auth/signin.email.password`;
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: { accept: 'application/json', 'content-type': 'application/json' },
		body: JSON.stringify({ email, password, includeTeams: true })
	});
	if (!response.ok) throw new Error(`Live authentication failed at signin stage (HTTP ${response.status}).`);
	const payload = await response.json();
	const accessToken = payload.token ?? payload.access_token ?? payload.data?.token ?? payload.data?.access_token;
	if (typeof accessToken !== 'string' || !accessToken) {
		throw new Error('Live authentication failed at response-validation stage.');
	}
	const user = payload.user ?? payload.data?.user ?? {};
	return {
		accessToken,
		refreshToken: payload.refresh_token?.token ?? payload.refresh_token ?? payload.data?.refresh_token?.token,
		teamId: process.env.CYPRESS_AUTH_TEAM_ID ?? user.lastTeamId ?? user.defaultTeamId,
		tenantId: user.tenantId,
		organizationId: user.lastOrganizationId ?? user.defaultOrganizationId,
		userId: user.id
	};
}

export default defineConfig({
	e2e: {
		baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://127.0.0.1:3030',
		fixturesFolder: 'apps/web/cypress/fixtures',
		specPattern: 'apps/web/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
		supportFile: 'apps/web/cypress/support/e2e.ts',
		async setupNodeEvents(on, config) {
			const fixture = JSON.parse(
				readFileSync(resolve(config.projectRoot, 'apps/web/cypress/fixtures/bootstrap.json'), 'utf8')
			);
			const mockServer = await createMockGauzyServer({ fixture, port: 3988 });
			try {
				assertDeterministicApiOrigins(mockServer.origin, {
					GAUZY_API_SERVER_URL: process.env.GAUZY_API_SERVER_URL,
					NEXT_PUBLIC_GAUZY_API_SERVER_URL: process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL
				});
			} catch (error) {
				await mockServer.close();
				throw error;
			}
			config.env.GAUZY_API_ORIGIN = mockServer.origin;
			config.env.FAST_APP_BOOTSTRAP = process.env.NEXT_PUBLIC_FAST_APP_BOOTSTRAP === 'true';
			config.env.PRELOAD_YEAR_TIME_LOGS = process.env.NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS === 'true';

			on('task', {
				'auth:live': liveAuthenticate,
				'mock:requests': () => mockServer.requests(),
				'mock:reset': () => {
					mockServer.reset();
					return null;
				},
				'mock:scenario': (scenario: Record<string, unknown>) => {
					mockServer.setScenario(scenario);
					return null;
				},
				'mock:state': () => mockServer.state(),
				'performance:write': (candidate: { mode: string; samples: Array<Record<string, unknown>> }) => {
					const safeCandidate = {
						version: 1,
						mode: candidate.mode,
						samples: candidate.samples.map((sample) => ({
							index: sample.index,
							shellReadyMs: sample.shellReadyMs,
							requests: (sample.requests as Array<Record<string, unknown>>).map((request) => ({
								method: request.method,
								routeKey: request.routeKey,
								fingerprint: createHash('sha256').update(String(request.key)).digest('hex'),
								startMs: request.startMs,
								endMs: request.endMs,
								richGlobalRead: request.richGlobalRead === true
							}))
						}))
					};
					const output = resolvePerformanceOutput(config.projectRoot, process.env.CYPRESS_PERFORMANCE_OUT);
					mkdirSync(dirname(output), { recursive: true });
					writeFileSync(output, `${JSON.stringify(safeCandidate, null, 2)}\n`, 'utf8');
					return { samples: safeCandidate.samples.length };
				}
			});
			on('after:run', async () => {
				await mockServer.close();
			});
			return config;
		}
	},
	chromeWebSecurity: true,
	defaultCommandTimeout: 15_000,
	requestTimeout: 15_000,
	responseTimeout: 20_000,
	retries: 0,
	screenshotOnRunFailure: false,
	video: false,
	viewportHeight: 900,
	viewportWidth: 1440
});
