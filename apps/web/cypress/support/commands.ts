/// <reference types="cypress" />

type FixtureIds = Record<string, string>;
type StubRequest = { method: string; path: string; query: string; startMs: number; endMs: number; status: number };

function base64Url(value: object): string {
	return btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function syntheticAccessToken(userId: string, rotation = 'initial'): string {
	const now = Math.floor(Date.now() / 1000);
	return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: userId, iat: now, exp: now + 86_400, jti: rotation })}.fixture`;
}

function setQuietCookie(name: string, value: string | undefined) {
	if (!value) return;
	cy.setCookie(name, value, { log: false, sameSite: 'lax' });
}

Cypress.Commands.add('mockReset', () => cy.task('mock:reset', null, { log: false }));
Cypress.Commands.add('mockScenario', (scenario) => cy.task('mock:scenario', scenario, { log: false }));
Cypress.Commands.add(
	'mockRequests',
	() => cy.task('mock:requests', null, { log: false }) as Cypress.Chainable<StubRequest[]>
);
Cypress.Commands.add('mockState', () => cy.task('mock:state', null, { log: false }));

Cypress.Commands.add('syntheticLogin', (scope: 'A' | 'B' = 'A') => {
	cy.fixture('bootstrap').then((fixture: { ids: FixtureIds }) => {
		const suffix = scope === 'B' ? 'B' : 'A';
		cy.clearCookies({ log: false });
		setQuietCookie('auth-token', syntheticAccessToken(fixture.ids.user));
		setQuietCookie('auth-refresh-token', 'synthetic-refresh-token');
		setQuietCookie('auth-active-team', fixture.ids[`team${suffix}`]);
		setQuietCookie('auth-tenant-id', fixture.ids[`tenant${suffix}`]);
		setQuietCookie('auth-organization-id', fixture.ids[`organization${suffix}`]);
		setQuietCookie('auth-active-language', 'en');
		setQuietCookie('auth-user-id', fixture.ids.user);
		setQuietCookie('auth-active-task', fixture.ids.task);
		setQuietCookie('auth-active-project', fixture.ids.project);
		setQuietCookie('no-team-popup-show', 'true');
	});
});

Cypress.Commands.add('liveLogin', () => {
	cy.task('auth:live', null, { log: false }).then((auth: any) => {
		cy.clearCookies({ log: false });
		setQuietCookie('auth-token', auth.accessToken);
		setQuietCookie('auth-refresh-token', auth.refreshToken);
		setQuietCookie('auth-active-team', auth.teamId);
		setQuietCookie('auth-tenant-id', auth.tenantId);
		setQuietCookie('auth-organization-id', auth.organizationId);
		setQuietCookie('auth-user-id', auth.userId);
		setQuietCookie('no-team-popup-show', 'true');
	});
});

Cypress.Commands.add('rotateSyntheticAccessToken', () => {
	cy.fixture('bootstrap').then((fixture: { ids: FixtureIds }) => {
		setQuietCookie('auth-token', syntheticAccessToken(fixture.ids.user, 'rotation-2'));
		cy.window({ log: false }).then((window) => {
			window.dispatchEvent(new Event('ever-teams:access-token-refreshed'));
		});
	});
});

Cypress.Commands.add('waitForShellReady', () => {
	return cy
		.window({ log: false, timeout: 20_000 })
		.should((window) => {
			expect(window.performance.getEntriesByName('ever-teams:shell-ready')).to.have.length.greaterThan(0);
		})
		.then((window) => window.performance.getEntriesByName('ever-teams:shell-ready').at(-1) as PerformanceEntry);
});

Cypress.Commands.add('hardVisit', (path: string) => {
	cy.visit(path, {
		onBeforeLoad(window) {
			window.localStorage.clear();
			window.sessionStorage.clear();
			window.performance.clearMarks();
		}
	});
	cy.get('body', { timeout: 20_000 }).should('be.visible');
	cy.waitForShellReady();
});

Cypress.Commands.add('clearBrowserState', () => {
	cy.window({ log: false }).then(async (window) => {
		window.localStorage.clear();
		window.sessionStorage.clear();
		const registrations = await window.navigator.serviceWorker?.getRegistrations();
		await Promise.all((registrations ?? []).map((registration) => registration.unregister()));
	});
	cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Network.clearBrowserCache', params: {} }));
});

declare global {
	namespace Cypress {
		interface Chainable {
			mockReset(): Chainable<unknown>;
			mockScenario(scenario: Record<string, unknown>): Chainable<unknown>;
			mockRequests(): Chainable<StubRequest[]>;
			mockState(): Chainable<any>;
			syntheticLogin(scope?: 'A' | 'B'): Chainable<void>;
			liveLogin(): Chainable<void>;
			rotateSyntheticAccessToken(): Chainable<void>;
			waitForShellReady(): Chainable<PerformanceEntry>;
			hardVisit(path: string): Chainable<void>;
			clearBrowserState(): Chainable<void>;
		}
	}
}

export {};
