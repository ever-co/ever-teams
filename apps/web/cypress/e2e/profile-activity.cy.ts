/// <reference types="cypress" />

const PROFILE_PATH = '/api/timesheet/statistics/profile-activity';

function profileReads(requests: Array<{ path: string; query: string }>) {
	return requests.filter((request) => request.path === PROFILE_PATH);
}

/** Polls the mock until it has seen at least `count` profile reads, for up to 10 s (a busy runner mounts Stats late). */
function waitForProfileReads(count: number, deadline = Date.now() + 10_000): void {
	cy.mockRequests().then((requests) => {
		if (profileReads(requests).length < count && Date.now() < deadline) {
			cy.wait(100, { log: false });
			waitForProfileReads(count, deadline);
		}
	});
}

describe('employee-scoped profile activity', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it('preserves self, manager, shared teammate, and denied profile access', () => {
		cy.fixture('bootstrap').then((fixture) => {
			const cases = [
				{ memberId: fixture.ids.user, employeeId: fixture.ids.employee, scenario: { manager: false } },
				{
					memberId: fixture.ids.teammateUser,
					employeeId: fixture.ids.teammateEmployee,
					scenario: { manager: true }
				},
				{
					memberId: fixture.ids.teammateUser,
					employeeId: fixture.ids.teammateEmployee,
					scenario: { manager: false, shareProfileView: true }
				},
				{
					memberId: fixture.ids.deniedUser,
					employeeId: fixture.ids.deniedEmployee,
					scenario: { manager: false, shareProfileView: false },
					denied: true
				}
			];

			for (const testCase of cases) {
				cy.mockReset();
				cy.mockScenario(testCase.scenario);
				cy.syntheticLogin();
				cy.hardVisit(`/profile/${testCase.memberId}`);
				cy.wait(200);
				cy.mockRequests().then((requests) => {
					const reads = profileReads(requests);
					if (testCase.denied) {
						expect(reads).to.have.length(0);
					} else {
						expect(reads).to.have.length(1);
						expect(new URLSearchParams(reads[0].query).get('employeeId')).to.equal(testCase.employeeId);
					}
				});
			}
		});
	});

	it('adds one month summary and one selected-year lightweight read when Stats mounts', () => {
		cy.fixture('bootstrap').then((fixture) => {
			cy.mockScenario({ manager: false, shareProfileView: true });
			cy.hardVisit(`/profile/${fixture.ids.teammateUser}`);
			cy.contains('button', /^stats/i, { timeout: 15_000 }).click();
			waitForProfileReads(2);
			// Still exactly two a moment later: a third read is the regression this guards
			cy.wait(300);
			cy.mockRequests().then((requests) => {
				const reads = profileReads(requests);
				expect(reads).to.have.length(2);
				const params = reads.map((request) => new URLSearchParams(request.query));
				expect(params.filter((query) => query.get('includeDaily') === 'false')).to.have.length(1);
				expect(params.filter((query) => query.get('includeDaily') === 'true')).to.have.length(1);
				expect(params.every((query) => query.get('employeeId') === fixture.ids.teammateEmployee)).to.equal(
					true
				);
			});
		});
	});

	it('keeps employee A and B request scopes isolated', () => {
		cy.fixture('bootstrap').then((fixture) => {
			cy.mockScenario({ manager: true });
			cy.hardVisit(`/profile/${fixture.ids.teammateUser}`);
			cy.hardVisit(`/profile/${fixture.ids.deniedUser}`);
			cy.wait(250);
			cy.mockRequests().then((requests) => {
				const employees = profileReads(requests).map((request) =>
					new URLSearchParams(request.query).get('employeeId')
				);
				expect(new Set(employees)).to.deep.equal(
					new Set([fixture.ids.teammateEmployee, fixture.ids.deniedEmployee])
				);
			});
		});
	});
});
