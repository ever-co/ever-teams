/// <reference types="cypress" />

/**
 * Settings › Labels › Browse labels (#5016): the catalog of common labels, added to the team in one request, and no
 * two labels of one name. The mock keeps no labels, so each test holds its team's labels: the metadata bootstrap
 * answers them, and POST /tags/bulk and POST /tags add to them as Gauzy would, refusing a name the team has.
 */

interface TeamLabel {
	id: string;
	name: string;
	color: string;
	isSystem: boolean;
}

interface LabelCreate {
	name: string;
	color: string;
	organizationTeamId?: string;
}

const LABELS_PAGE = '/settings/team/labels';
const ROW_MENU = '[data-row-menu]';
const CATALOG = '[role="dialog"]';
const SEARCH = 'input[type="search"]';
const NAME_INPUT = 'input[placeholder="Label name"]';
const TAKEN_MESSAGE = 'The team already has a label with this name.';

const checkbox = (name: string) => `[role="checkbox"][aria-label="${name}"]`;

/** Gauzy's key for a tag name: lower case, dashes and runs of spaces as one space, trimmed. */
const nameKeyOf = (name: string) => name.toLowerCase().replaceAll('-', ' ').replaceAll(/\s+/g, ' ').trim();

const labelOf = (name: string, color: string, sequence: number): TeamLabel => ({
	id: `cccccccc-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
	name,
	color,
	isSystem: false
});

/** Serves `labels` as the team's labels and files new ones into it, refusing a name the team has already. */
function serveTeamLabels(labels: TeamLabel[]) {
	const isTaken = (name: string) => labels.some((label) => nameKeyOf(label.name) === nameKeyOf(name));
	const add = (item: LabelCreate) => {
		const label = labelOf(item.name, item.color, labels.length + 1);
		labels.push(label);
		return label;
	};

	cy.intercept('GET', /\/api\/task-metadata\/bootstrap(\?|$)/, (req) => {
		req.continue((res) => {
			res.body = { ...res.body, taskLabels: { items: labels, total: labels.length } };
		});
	});
	cy.intercept('POST', /\/api\/tags\/bulk$/, (req) => {
		const items: LabelCreate[] = req.body?.items ?? [];
		const succeeded: Array<{ index: number; id: string }> = [];
		const failed: Array<{ index: number; code: string; message: string }> = [];
		items.forEach((item, index) => {
			if (isTaken(item.name)) {
				failed.push({ index, code: 'UNIQUE_CONSTRAINT_VIOLATION', message: `"${item.name}" is taken` });
			} else {
				succeeded.push({ index, id: add(item).id });
			}
		});
		req.reply({
			statusCode: 201,
			body: {
				succeededCount: succeeded.length,
				failedCount: failed.length,
				total: items.length,
				succeeded,
				failed
			}
		});
	}).as('bulkCreate');
	cy.intercept('POST', /\/api\/tags(\?.*)?$/, (req) => {
		const item: LabelCreate = req.body;
		if (isTaken(item.name)) {
			req.reply({ statusCode: 409, body: { statusCode: 409, message: `"${item.name}" is taken` } });
			return;
		}
		req.reply({ statusCode: 201, body: add(item) });
	}).as('createLabel');
}

describe('label catalog', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it('fills an empty list from the catalog: the picked labels go in one request, as labels of the team', () => {
		serveTeamLabels([]);
		cy.hardVisit(LABELS_PAGE);
		cy.contains('No labels yet', { timeout: 20_000 }).should('be.visible');

		// The empty list offers the catalog next to Add label, as the header does
		cy.get('button:contains("Browse labels")').should('have.length', 2).last().click();
		cy.get(CATALOG)
			.should('be.visible')
			.within(() => {
				cy.contains('Pick the labels your team needs.').should('be.visible');
				cy.get('fieldset[data-testid^="label-category-"]').should('have.length', 7);
				cy.get('[role="checkbox"]').should('have.length', 70);
				cy.get('button[aria-label="Select all: Priority"]').click();
				cy.get(checkbox('Frontend')).click();
				cy.contains('6 labels picked').should('be.visible');
				cy.contains('button', 'Add 6 labels').click();
			});

		cy.fixture('bootstrap').then((fixture) => {
			cy.wait('@bulkCreate').then(({ request }) => {
				const items: LabelCreate[] = request.body.items;
				expect(items.map((item) => item.name)).to.deep.equal([
					'Priority: Critical',
					'Priority: High',
					'Priority: Medium',
					'Priority: Low',
					'Priority: None',
					'Frontend'
				]);
				expect(items.find((item) => item.name === 'Frontend')?.color).to.equal('#3B82F6');
				for (const item of items) {
					expect(item.organizationTeamId).to.equal(fixture.ids.teamA);
				}
			});
		});
		cy.contains('[data-sonner-toast]', '6 labels added').should('be.visible');
		cy.get(CATALOG).should('not.exist');
		cy.get(ROW_MENU, { timeout: 20_000 }).should('have.length', 6);
		cy.get('@createLabel.all').should('have.length', 0);

		cy.get('[data-testid="browse-labels"]').click();
		cy.get(CATALOG).within(() => {
			cy.get(checkbox('Priority: High'))
				.should('have.attr', 'aria-checked', 'true')
				.and('have.attr', 'data-disabled');
			cy.get('button[aria-label="Select all: Priority"]').should('not.exist');
		});
	});

	it('marks the labels the team has, whatever their case or dashes, and narrows by label or category', () => {
		serveTeamLabels([labelOf('bug', '#D73A4A', 1), labelOf('Follow up', '#0891B2', 2)]);
		cy.hardVisit(LABELS_PAGE);
		cy.get(ROW_MENU, { timeout: 20_000 }).should('have.length', 2);

		cy.get('[data-testid="browse-labels"]').click();
		cy.get(CATALOG).within(() => {
			for (const name of ['Bug', 'Follow-up']) {
				cy.get(checkbox(name)).should('have.attr', 'aria-checked', 'true').and('have.attr', 'data-disabled');
			}
			cy.get(checkbox('Feature')).should('not.have.attr', 'data-disabled');
			cy.contains('button', 'Add labels').should('be.disabled');

			cy.get(SEARCH).type('priority');
			cy.get('[role="checkbox"]').should('have.length', 5);
			cy.get(SEARCH).clear().type('review');
			cy.get('[role="checkbox"]').should('have.length', 1).and('have.attr', 'aria-label', 'Needs Review');
			cy.get(SEARCH).clear().type('zzz');
			cy.contains('No label matches this search.').should('be.visible');
		});
	});

	it('refuses a label name the team has, whatever its case or dashes, and sends nothing', () => {
		serveTeamLabels([labelOf('Follow-up', '#0891B2', 1)]);
		cy.hardVisit(LABELS_PAGE);
		cy.get(ROW_MENU, { timeout: 20_000 }).should('have.length', 1);

		cy.contains('button', 'Add label').click();
		cy.get(NAME_INPUT).type('  follow up {enter}');
		cy.contains(TAKEN_MESSAGE).should('be.visible');
		cy.get('@createLabel.all').should('have.length', 0);

		cy.get(NAME_INPUT).clear().type('Feature{enter}');
		cy.wait('@createLabel').its('request.body.name').should('equal', 'Feature');
		cy.get(ROW_MENU, { timeout: 20_000 }).should('have.length', 2);
		cy.contains(TAKEN_MESSAGE).should('not.exist');
	});
});
