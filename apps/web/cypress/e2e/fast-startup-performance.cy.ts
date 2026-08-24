/// <reference types="cypress" />

import {
	normalizeGauzyRequest,
	type NormalizedGauzyRequest
} from '../../../../tools/performance/normalize-gauzy-request.mjs';

type CapturedRequest = NormalizedGauzyRequest & { startMs: number; endMs: number };
type Sample = { index: number; startedAt: number; shellReadyMs: number; requests: CapturedRequest[] };
const SHELL_READY_BUDGET_MS = 5_000;

describe('five-sample cold-start performance budget', () => {
	it('meets normalized Gauzy request budgets without rich global reports', () => {
		if (!Cypress.env('FAST_APP_BOOTSTRAP')) {
			cy.mockReset();
			cy.syntheticLogin();
			cy.intercept('GET', /\/api\/tasks\/team(?:\?.*)?$/).as('legacyTasks');
			cy.intercept('GET', /\/api\/daily-plan\/me(?:\?.*)?$/).as('legacyPlans');
			cy.hardVisit('/team/tasks');
			cy.wait(['@legacyTasks', '@legacyPlans'], { timeout: 20_000 });
			cy.mockRequests().then((requests) => {
				expect(requests.some((request) => request.path === '/api/task-metadata/bootstrap')).to.equal(false);
				expect(
					requests.some((request) => request.path === '/api/timesheet/statistics/profile-activity')
				).to.equal(false);
			});
			return;
		}

		const samples: Sample[] = [];
		let activeSample: Sample | undefined;
		const apiOrigin = String(Cypress.env('GAUZY_API_ORIGIN'));
		cy.intercept({ url: `${apiOrigin}/api/**`, middleware: true }, (request) => {
			const normalized = normalizeGauzyRequest(
				{
					method: request.method,
					resourceType: (request as any).resourceType ?? 'xhr',
					url: request.url
				},
				{ apiOrigins: [apiOrigin] }
			);
			const sample = activeSample;
			if (!normalized || !sample) {
				request.continue();
				return;
			}
			const captured: CapturedRequest = {
				...normalized,
				startMs: Date.now() - sample.startedAt,
				endMs: Date.now() - sample.startedAt
			};
			sample.requests.push(captured);
			request.on('response', () => {
				captured.endMs = Date.now() - sample.startedAt;
			});
			request.continue();
		});

		for (let index = 1; index <= 5; index += 1) {
			cy.clearBrowserState();
			cy.mockReset();
			cy.syntheticLogin();
			cy.then(() => {
				activeSample = { index, startedAt: Date.now(), shellReadyMs: 0, requests: [] };
				samples.push(activeSample);
			});
			cy.visit('/team/tasks', {
				onBeforeLoad(window) {
					window.localStorage.clear();
					window.sessionStorage.clear();
					window.performance.clearMarks();
				}
			});
			cy.waitForShellReady().then(() => {
				const sample = activeSample!;
				sample.shellReadyMs = Date.now() - sample.startedAt;
				expect(sample.shellReadyMs, `sample ${index} shell-ready`).to.be.at.most(SHELL_READY_BUDGET_MS);
			});
			cy.wait(5_000, { log: false });
			cy.then(() => {
				const sample = activeSample!;
				const criticalReads = sample.requests.filter(
					(request) => request.method === 'GET' && request.startMs <= sample.shellReadyMs
				);
				const firstFiveSeconds = sample.requests.filter((request) => request.startMs <= 5_000);
				const getKeys = sample.requests
					.filter((request) => request.method === 'GET')
					.map((request) => request.key);
				const duplicates = getKeys.filter((key, requestIndex) => getKeys.indexOf(key) !== requestIndex);

				expect(criticalReads.length, `sample ${index} critical reads`).to.be.at.most(12);
				expect(firstFiveSeconds.length, `sample ${index} first-five-second reads`).to.be.at.most(20);
				expect(duplicates, `sample ${index} duplicate GETs`).to.deep.equal([]);
				expect(
					sample.requests.filter((request) => request.richGlobalRead),
					`sample ${index} rich reports`
				).to.deep.equal([]);
				activeSample = undefined;
			});
		}

		cy.then(() => {
			const candidate = {
				mode: Cypress.env('LIVE_AUTH') ? 'live' : 'deterministic',
				samples: samples.map(({ startedAt: _startedAt, ...sample }) => sample)
			};
			return cy.task('performance:write', candidate, { log: false }).then((written: any) => {
				expect(written.samples).to.equal(5);
			});
		});
	});
});
