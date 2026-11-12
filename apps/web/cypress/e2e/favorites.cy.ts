/// <reference types="cypress" />

/**
 * Favourites across the app (#5017): a project starred from its page is listed on the Favorites page, with the
 * favourite tasks of every team and, apart, the favourites whose item is gone. The mock keeps no favourites, so each
 * test serves its own: GET /favorite/employee lists them, POST /favorite files one, DELETE /favorite/:id removes it.
 */

interface StoredFavorite {
	id: string;
	entity: string;
	entityId: string;
	employeeId?: string;
}

const favoriteIdOf = (sequence: number) => `dddddddd-0000-4000-8000-${String(sequence).padStart(12, '0')}`;

const FAVORITE_TASK = {
	id: 'eeeeeeee-0000-4000-8000-000000005017',
	title: 'Ship the favorites',
	number: 5017,
	prefix: 'ET',
	taskNumber: 'ET-5017',
	issueType: 'Task',
	status: 'in-progress'
};

const GONE_PROJECT_ID = 'ffffffff-0000-4000-8000-000000000404';

/** Serves `favorites` as the person's favourites and files the changes into it. */
function serveFavorites(favorites: StoredFavorite[]) {
	let filed = favorites.length;
	cy.intercept('GET', /\/api\/favorite\/employee(\?|$)/, (req) => {
		req.reply({ statusCode: 200, body: { items: favorites, total: favorites.length } });
	}).as('favorites');
	cy.intercept('POST', /\/api\/favorite$/, (req) => {
		filed += 1;
		const { entity, entityId, employeeId, organizationId, tenantId } = req.body;
		const created = { id: favoriteIdOf(filed), entity, entityId, employeeId, organizationId, tenantId };
		favorites.push(created);
		req.reply({ statusCode: 201, body: created });
	}).as('addFavorite');
	cy.intercept('DELETE', /\/api\/favorite\/[0-9a-f-]{36}$/, (req) => {
		const id = new URL(req.url).pathname.split('/').pop();
		const at = favorites.findIndex((favorite) => favorite.id === id);
		if (at >= 0) favorites.splice(at, 1);
		req.reply({ statusCode: 200, body: { affected: 1, raw: [] } });
	}).as('removeFavorite');
}

const pageSection = (heading: string) => cy.contains('h2', heading).closest('section');

describe('favorites', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it('stars a project from its page, lists it on the Favorites page, and removes it from there', () => {
		cy.fixture('bootstrap').then((fixture) => {
			serveFavorites([]);
			cy.hardVisit(`/projects/${fixture.ids.project}`);
			cy.contains('h1', 'Fixture Project', { timeout: 20_000 }).should('be.visible');

			cy.get('button[aria-label="Favorite"]').should('have.attr', 'aria-pressed', 'false').click();
			cy.wait('@addFavorite')
				.its('request.body')
				.should('deep.include', { entity: 'OrganizationProject', entityId: fixture.ids.project });
			cy.get('button[aria-label="Favorite"]').should('have.attr', 'aria-pressed', 'true');

			cy.hardVisit('/favorites');
			cy.contains('h1', 'Favorites', { timeout: 20_000 }).should('be.visible');
			pageSection('Projects').within(() => {
				cy.contains('a', 'Fixture Project')
					.should('have.attr', 'href')
					.and('match', new RegExp(`/projects/${fixture.ids.project}$`));
				cy.get('button[aria-label="Remove Fixture Project from favorites"]').click();
			});
			cy.wait('@removeFavorite');
			cy.contains('No favorites yet', { timeout: 20_000 }).should('be.visible');
		});
	});

	it('lists a favourite task of another team, and apart a favourite whose item is gone, to remove it', () => {
		serveFavorites([
			{ id: favoriteIdOf(1), entity: 'Task', entityId: FAVORITE_TASK.id },
			{ id: favoriteIdOf(2), entity: 'OrganizationProject', entityId: GONE_PROJECT_ID }
		]);
		cy.intercept('GET', /\/api\/favorite\/type(\?|$)/, {
			statusCode: 200,
			body: { items: [FAVORITE_TASK], total: 1 }
		}).as('favoriteTasks');

		cy.hardVisit('/favorites');
		cy.wait('@favoriteTasks')
			.its('request.url')
			.then((url: string) => expect(decodeURIComponent(url)).to.include('where[entity]=Task'));
		pageSection('Tasks').within(() => {
			cy.contains('a', 'Ship the favorites')
				.should('have.attr', 'href')
				.and('match', new RegExp(`/task/${FAVORITE_TASK.id}$`));
			cy.contains('#ET-5017').should('be.visible');
		});
		pageSection('No longer available').within(() => {
			cy.contains('A project you can no longer open').should('be.visible');
			cy.get('button[aria-label="Remove from favorites"]').click();
		});
		cy.wait('@removeFavorite').its('request.url').should('include', favoriteIdOf(2));
		cy.contains('h2', 'No longer available').should('not.exist');
	});
});
