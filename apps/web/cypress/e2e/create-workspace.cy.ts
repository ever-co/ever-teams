/// <reference types="cypress" />

/**
 * #5025: a signed-in person creates another workspace from the workspace menu without signing out. Gauzy opens the
 * account it is created with; the sign-up's steps set it up and the browser opens it, signed in.
 */
interface WorkspaceCreationState {
	openings: number;
	tenant: string | null;
	organization: string | null;
	employeeUserId: string | null;
	team: { name: string | null; managerIds: string[] } | null;
	invites: { emails: string[]; teamIds: string[] } | null;
}

const NEW_TENANT_ID = '50250000-0000-4000-8000-000000000002';
const NEW_TEAM_ID = '50250000-0000-4000-8000-000000000005';

function creationState(): Cypress.Chainable<WorkspaceCreationState> {
	return cy.mockState().then((state) => (state as { workspaceCreation: WorkspaceCreationState }).workspaceCreation);
}

describe('workspace creation', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it('creates a workspace with its first team and invitations, and opens it signed in', () => {
		cy.hardVisit('/workspace/new');
		cy.get('#workspace-name', { timeout: 20_000 }).type('Lovelace Studio');
		cy.get('#workspace-team').should('have.value', 'Lovelace Studio').clear().type('Design');
		cy.get('#workspace-invites').type('grace@example.test, ada@example.test');
		cy.contains('button', 'Create workspace').click();

		cy.location('pathname', { timeout: 30_000 }).should('match', /\/workspace\/welcome$/);
		cy.location('search').should('eq', '?invited=2');
		cy.getCookie('auth-tenant-id').its('value').should('eq', NEW_TENANT_ID);
		cy.getCookie('auth-active-team').its('value').should('eq', NEW_TEAM_ID);
		cy.contains('Your workspace is ready').should('be.visible');
		cy.get('[aria-label^="Current workspace: Lovelace Studio."]', { timeout: 20_000 }).should('exist');
		creationState().then((created) => {
			expect(created.openings).to.equal(1);
			expect(created.tenant).to.equal('Lovelace Studio');
			expect(created.organization).to.equal('Lovelace Studio');
			expect(created.team?.name).to.equal('Design');
			expect(created.invites).to.deep.equal({
				emails: ['grace@example.test', 'ada@example.test'],
				teamIds: [NEW_TEAM_ID]
			});
		});
	});

	it('says so when the server allows no new workspace, and stays signed in where the person is', () => {
		cy.mockScenario({ tenantRegistrationClosed: true });
		cy.getCookie('auth-tenant-id').then((cookie) => {
			cy.hardVisit('/workspace/new');
			cy.get('#workspace-name', { timeout: 20_000 }).type('Lovelace Studio');
			cy.contains('button', 'Create workspace').click();

			cy.contains('New workspaces are turned off on this server', { timeout: 20_000 }).should('be.visible');
			cy.location('pathname').should('match', /\/workspace\/new$/);
			cy.getCookie('auth-tenant-id').its('value').should('eq', cookie?.value);
			creationState().then((created) => expect(created.tenant).to.equal(null));
			// The page says it: no generic failure toast on top
			cy.contains('That change was not saved').should('not.exist');
		});
	});

	it('waits for a running timer to stop: the new workspace would leave it counting out of sight', () => {
		cy.mockScenario({ timerRunning: true });
		cy.hardVisit('/workspace/new');

		cy.contains('Stop your timer first', { timeout: 20_000 }).should('be.visible');
		cy.get('#workspace-name').type('Lovelace Studio');
		cy.contains('button', 'Create workspace').should('be.disabled');
		creationState().then((created) => expect(created.openings).to.equal(0));
	});

	it('says a workspace created but not opened exists, and offers no retry that would create a second one', () => {
		cy.mockScenario({ newWorkspaceRefreshFails: true });
		cy.getCookie('auth-tenant-id').then((cookie) => {
			cy.hardVisit('/workspace/new');
			cy.get('#workspace-name', { timeout: 20_000 }).type('Lovelace Studio');
			cy.contains('button', 'Create workspace').click();

			cy.contains('Your workspace was created, but could not be opened', { timeout: 30_000 }).should(
				'be.visible'
			);
			cy.contains('button', 'Create workspace').should('be.disabled');
			cy.getCookie('auth-tenant-id').its('value').should('eq', cookie?.value);
			creationState().then((created) => expect(created.team?.name).to.equal('Lovelace Studio'));
		});
	});
});
