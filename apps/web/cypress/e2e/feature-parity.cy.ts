/// <reference types="cypress" />

const dateInputOf = (date: Date) =>
	[date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, '0')).join('-');

/** When the meeting Schedule proposes starts: the dialog reads its date and time in the fixture user's zone, UTC. */
function rememberTheProposedStart() {
	cy.get('#meeting-date')
		.invoke('val')
		.then((date) => {
			cy.get('#meeting-time')
				.invoke('val')
				.then((time) => {
					cy.wrap(new Date(`${date}T${time}:00Z`)).as('proposedStart');
				});
		});
}

/** The agenda shows one day: Schedule proposes the next half hour, which late in the evening is on the next day. */
function showTheProposedDay() {
	cy.get<Date>('@proposedStart').then((proposedStart) => {
		if (dateInputOf(proposedStart) !== dateInputOf(new Date())) {
			cy.get('button[aria-label="Next day"]').click();
		}
	});
}

describe('feature parity on the authenticated shell', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it('starts the timer and preserves the canonical IN_PROGRESS taskStatusId on task mutation', () => {
		cy.mockScenario({ hasPlan: true, requirePlanToTrack: false });
		cy.hardVisit('/team/tasks');
		cy.window().then((window) => {
			const today = new Date().toISOString().split('T')[0];
			window.localStorage.setItem('daily-plan-suggestion-modal-date', today);
			window.localStorage.setItem('tasks-estimate-hours-modal-date', today);
			window.localStorage.setItem('daily-plan-estimate-hours-modal', today);
		});
		cy.intercept('POST', '**/api/timer/start').as('startTimer');
		cy.intercept('POST', '**/api/timesheet/timer/start').as('startTimer');
		cy.intercept({ method: /PUT|PATCH/, url: '**/api/tasks/**' }).as('updateTask');
		cy.get('button[aria-label="Start timer"]', { timeout: 20_000 })
			.should('have.attr', 'aria-disabled', 'false')
			.click();
		cy.wait(['@startTimer', '@updateTask'], { timeout: 20_000 });
		cy.mockState().then((state) => {
			expect(state.mutationProof).to.deep.equal({
				startedTimer: true,
				updatedTask: true,
				inProgressTaskStatusPreserved: true
			});
		});
	});

	it('starts the timer at once when the team leaves planning to its members', () => {
		cy.mockScenario({ hasPlan: false, requirePlanToTrack: false });
		cy.intercept('POST', '**/api/timesheet/timer/start').as('startTimer');
		cy.hardVisit('/');
		cy.get('button[aria-label="Start timer"]', { timeout: 20_000 })
			.first({ timeout: 20_000 })
			.should('have.attr', 'aria-disabled', 'false')
			.click();
		cy.wait('@startTimer', { timeout: 20_000 });
		cy.contains('Create a plan for today').should('not.exist');
		cy.mockState().then((state) => expect(state.mutationProof.startedTimer).to.equal(true));
	});

	it('starts on the task the task bar shows when no task was chosen on this device', () => {
		cy.clearCookie('auth-active-task', { log: false });
		cy.mockScenario({ hasPlan: false, requirePlanToTrack: false });
		cy.intercept('POST', '**/api/timesheet/timer/start').as('startTimer');
		cy.hardVisit('/');
		cy.fixture('bootstrap').then((fixture) => {
			cy.contains(fixture.names.task, { timeout: 20_000 }).should('be.visible');
			cy.get('button[aria-label="Start timer"]', { timeout: 20_000 })
				.first({ timeout: 20_000 })
				.should('have.attr', 'aria-disabled', 'false')
				.click();
			cy.wait('@startTimer', { timeout: 20_000 }).its('request.body.taskId').should('equal', fixture.ids.task);
		});
	});

	it('blocks timer mutation only when the team requires a missing plan', () => {
		cy.mockScenario({ hasPlan: false, requirePlanToTrack: true });
		cy.hardVisit('/team/tasks');
		cy.get('button[aria-label="Start timer"]', { timeout: 15_000 }).click({ force: true });
		cy.wait(250);
		cy.mockState().then((state) => expect(state.mutationProof.startedTimer).to.equal(false));
	});

	it('creates a label from its name and color, with no icon to pick', () => {
		cy.hardVisit('/');
		cy.contains('button', /^\s*Labels/, { timeout: 20_000 }).click();
		cy.contains(/create label/i).click();
		cy.get('input[placeholder="Create new label"]', { timeout: 15_000 }).should('be.visible').type('Frontend');
		cy.contains('button', /^\s*Icons?\s*$/).should('not.exist');
		cy.contains('Color').should('be.visible');
		// The preview chip shows the label as it will look
		cy.contains('Preview').should('be.visible');
		cy.contains('span', 'Frontend').should('be.visible');
	});

	it('picks a property icon from the library, inside the panel and by search', () => {
		cy.hardVisit('/settings/team/statuses');
		cy.contains('button', 'Add status', { timeout: 20_000 }).click();
		cy.get('button[aria-label="Choose an icon"], button[aria-label^="Icon:"]').first().click();
		cy.get('input[placeholder="Search icons"]', { timeout: 15_000 }).should('be.visible');
		cy.contains('p', 'Progress').should('be.visible');
		// The library draws its icons inside the panel, with no file to load
		cy.get('button[aria-label="done"] svg').should('be.visible');

		cy.get('input[placeholder="Search icons"]').type('defect');
		cy.get('button[aria-label="bug"] svg').should('be.visible');
		cy.get('button[aria-label="done"]').should('not.exist');
	});

	it('keeps roles, permission controls, invitations, and public teams available', () => {
		cy.hardVisit('/permissions');
		cy.contains('Roles & permissions', { timeout: 15_000 }).should('be.visible');
		cy.contains('ADMIN', { timeout: 15_000 }).click();
		cy.contains('Activated').should('exist');

		cy.intercept('GET', '**/api/invite*').as('teamInvites');
		cy.hardVisit('/settings/team/members');
		cy.wait('@teamInvites', { timeout: 20_000 });
		cy.mockRequests().then((requests) => {
			expect(requests.some((request) => request.path === '/api/invite')).to.equal(true);
		});

		cy.fixture('bootstrap').then((fixture) => {
			cy.intercept('GET', '**/api/public/team/**').as('publicTeam');
			cy.clearCookies({ log: false });
			cy.visit(`/team/${fixture.ids.teamA}/${fixture.profileLink}`);
			cy.get('body').should('be.visible');
			cy.wait('@publicTeam', { timeout: 20_000 });
			cy.mockRequests().then((requests) => {
				expect(requests.some((request) => request.path.startsWith('/api/public/team/'))).to.equal(true);
			});
		});
	});

	it('does not let a delayed A owner overwrite the resolved B scope', () => {
		cy.fixture('bootstrap').then((fixture) => {
			cy.mockScenario({
				requirePlanToTrack: true,
				delays: { [`${fixture.ids.tenantA}:/api/daily-plan`]: 900 }
			});
			cy.hardVisit('/team/tasks');
			cy.syntheticLogin('B');
			cy.reload();
			cy.waitForShellReady();
			cy.contains(fixture.names.teamB, { timeout: 15_000 }).should('exist');
			cy.wait(1_000);
			cy.contains(fixture.names.teamB).should('exist');
			cy.mockRequests().then((requests) => {
				const teamPlans = requests.filter((request) => request.path.startsWith('/api/daily-plan'));
				const lastScope = new URLSearchParams(teamPlans.at(-1)?.query).get('where[tenantId]');
				expect(lastScope).to.equal(fixture.ids.tenantB);
			});
		});
	});

	it('schedules a meeting from the meetings home, then joins it from the agenda, devices first', () => {
		// The meeting server signs the room; the room itself never opens here, the pre-join screen comes first
		cy.intercept('GET', '**/api/auth/meet/jwt*', { token: 'synthetic-meet-token', room: 'room_tenant' });
		cy.intercept('POST', '**/api/employee-appointment').as('schedule');
		cy.hardVisit('/meet');
		cy.get('[data-testid="meetings-schedule"]', { timeout: 20_000 }).click();
		cy.get('#meeting-title').type('Sprint review');
		rememberTheProposedStart();
		cy.contains('button', /^Schedule$/).click();
		cy.wait('@schedule')
			.its('request.body')
			.should((body) => {
				expect(body.agenda).to.equal('Sprint review');
				expect(body.location).to.match(/\/meet\/jitsi\?room=.+&title=Sprint%20review$/);
				// Nobody was invited: Gauzy sends no email
				expect(body).not.to.have.property('emails');
			});
		cy.get('[data-testid="meeting-scheduled"]').should('contain', 'Sprint review');
		cy.contains('button', 'Copy invitation').should('be.visible');
		cy.contains('button', 'Add to calendar').should('be.visible');
		cy.contains('button', /^Done$/).click();
		showTheProposedDay();

		cy.get('[data-testid="scheduled-meeting"]', { timeout: 15_000 })
			.should('have.length', 1)
			.and('contain', 'Sprint review')
			.and('contain', 'Host: Fixture Manager');
		// Its menu holds the rest of what one does with a meeting
		cy.get('button[aria-label="Actions for Sprint review"]').click();
		cy.get('[role="menu"]')
			.find('[role="menuitem"]')
			.then((items) => [...items].map((item) => item.textContent?.trim()))
			.should('deep.equal', [
				'Start meeting',
				'Copy invitation',
				'Copy link',
				'Add to calendar',
				'Edit',
				'Delete'
			]);
		cy.get('body').type('{esc}');
		cy.get('[role="menu"]').should('not.exist');
		// A meeting that has not begun yet is started, one that runs is joined
		cy.get('[data-testid="scheduled-meeting"]')
			.contains('button', /^Start$/)
			.click();
		cy.location('pathname', { timeout: 15_000 }).should('match', /\/meet\/jitsi$/);
		cy.contains('h1', 'Sprint review', { timeout: 20_000 }).should('be.visible');
		cy.get('[data-testid="meet-join-now"]').should('be.visible');
		cy.contains('button', 'Back to meetings').click();
		cy.location('pathname', { timeout: 15_000 }).should('match', /\/meet$/);
	});

	it('cancels a scheduled meeting once confirmed, and joins a meeting from a pasted link', () => {
		cy.intercept('GET', '**/api/auth/meet/jwt*', { token: 'synthetic-meet-token', room: 'room_tenant' });
		cy.intercept('DELETE', '**/api/employee-appointment/*').as('cancel');
		cy.hardVisit('/meet');
		cy.get('[data-testid="meetings-schedule"]', { timeout: 20_000 }).click();
		cy.get('#meeting-title').type('Retro');
		rememberTheProposedStart();
		cy.contains('button', /^Schedule$/).click();
		cy.contains('button', /^Done$/).click();
		showTheProposedDay();
		cy.get('[data-testid="scheduled-meeting"]', { timeout: 15_000 }).should('have.length', 1);

		cy.get('button[aria-label="Actions for Retro"]').click();
		cy.contains('[role="menuitem"]', /^Delete$/).click();
		cy.contains('button', /^Cancel meeting$/).click();
		cy.wait('@cancel');
		cy.get('[data-testid="scheduled-meeting"]').should('not.exist');

		cy.get('[data-testid="meetings-join"]').click();
		cy.get('#meeting-join-input').type('not a link');
		cy.contains('button', /^Join$/).click();
		cy.contains('neither a meeting link nor a room name').should('be.visible');
		cy.get('#meeting-join-input').clear().type('design-review');
		cy.contains('button', /^Join$/).click();
		cy.location('pathname', { timeout: 15_000 }).should('match', /\/meet\/jitsi$/);
		cy.get('[data-testid="meet-join-now"]', { timeout: 20_000 }).should('be.visible');
	});

	it("invites a team member and an address typed when scheduling, as the appointment's emails", () => {
		cy.intercept('POST', '**/api/employee-appointment').as('schedule');
		cy.hardVisit('/meet');
		cy.get('[data-testid="meetings-schedule"]', { timeout: 20_000 }).click();
		cy.get('#meeting-title').type('Kick-off');
		cy.get('[data-testid="meeting-team-members"]').click();
		cy.contains('[role="option"]', 'Fixture Teammate').click();
		cy.get('input[placeholder="Add an email address"]').click().type('guest@example.org{enter}');
		cy.get('ul[aria-label="Participants"] li').should('have.length', 2);
		cy.contains('button', /^Schedule$/).click();
		// Gauzy splits the addresses on a comma and a space, and sends each a short notice
		cy.wait('@schedule').its('request.body.emails').should('equal', 'teammate@example.test, guest@example.org');
		cy.get('[data-testid="meeting-scheduled"]').should('contain', 'The people you added get a short email');
	});

	it('reads the date and time typed on the clocks of the time zone picked', () => {
		cy.intercept('POST', '**/api/employee-appointment').as('schedule');
		cy.hardVisit('/meet');
		cy.get('[data-testid="meetings-schedule"]', { timeout: 20_000 }).click();
		cy.get('#meeting-title').type('Tokyo sync');
		// The person's zone comes first: the fixture user's is UTC
		cy.get('[data-testid="meeting-time-zone"]').should('contain', 'UTC');
		cy.get('#meeting-date').clear().type('2030-01-15');
		cy.get('#meeting-time').clear().type('10:00');
		cy.get('[data-testid="meeting-time-zone"]').click();
		cy.get('input[placeholder="Search by city or region"]').type('Asia/Tokyo');
		cy.contains('[role="option"]', 'Asia/Tokyo').click();
		cy.get('[data-testid="meeting-time-zone"]').should('contain', 'Asia/Tokyo').and('contain', 'UTC +09:00');
		cy.contains('button', /^Schedule$/).click();
		cy.wait('@schedule').its('request.body.startDateTime').should('equal', '2030-01-15T01:00:00.000Z');
	});

	it("renames a scheduled meeting and changes its length from Edit in the card's menu", () => {
		cy.intercept('PUT', '**/api/employee-appointment/*').as('reschedule');
		cy.hardVisit('/meet');
		cy.get('[data-testid="meetings-schedule"]', { timeout: 20_000 }).click();
		cy.get('#meeting-title').type('Retro');
		rememberTheProposedStart();
		cy.contains('button', /^Schedule$/).click();
		cy.contains('button', /^Done$/).click();
		showTheProposedDay();

		cy.get('button[aria-label="Actions for Retro"]', { timeout: 15_000 }).click();
		cy.contains('[role="menuitem"]', /^Edit$/).click();
		cy.contains('[role="dialog"]', 'Edit meeting').should('be.visible');
		cy.get('#meeting-title').should('have.value', 'Retro').clear().type('Retro, moved');
		cy.get('#meeting-description').should('not.exist');
		cy.get('[aria-label="Duration"]').click();
		cy.contains('[role="option"]', /^60 min$/).click();
		cy.contains('button', /^Save changes$/).click();
		cy.wait('@reschedule')
			.its('request.body')
			.should((body) => {
				expect(body.agenda).to.equal('Retro, moved');
				expect(body.location).to.match(/&title=Retro%2C%20moved$/);
				const minutes = (Date.parse(body.endDateTime) - Date.parse(body.startDateTime)) / 60_000;
				expect(minutes).to.equal(60);
			});
		cy.get('[data-testid="scheduled-meeting"]').should('contain', 'Retro, moved');
	});

	it('starts a meeting to show the screen: devices first, the screen once in the room', () => {
		cy.intercept('GET', '**/api/auth/meet/jwt*', { token: 'synthetic-meet-token', room: 'room_tenant' });
		cy.hardVisit('/meet');
		cy.get('[data-testid="meetings-share-screen"]', { timeout: 20_000 }).click();
		cy.location('pathname', { timeout: 15_000 }).should('match', /\/meet\/jitsi$/);
		cy.contains('Your screen is shared as soon as you join.', { timeout: 20_000 }).should('be.visible');
		cy.get('[data-testid="meet-join-now"]').should('be.visible');
		// The request leaves the address, which is the link people copy
		cy.location('search')
			.should('match', /^\?room=/)
			.and('not.contain', 'share=');
	});

	it('opens the video and audio settings from the meetings home, and keeps them on the device', () => {
		cy.hardVisit('/meet');
		cy.get('[data-testid="meetings-settings"]', { timeout: 20_000 }).click();
		cy.contains('[role="dialog"]', 'Audio and video')
			.should('be.visible')
			.find('section[aria-label="Camera preview"]')
			.should('exist');
		cy.contains('button', /^Save changes$/).click();
		cy.get('[role="dialog"]').should('not.exist');
		// Where the pre-join check reads them
		cy.window().then((window) => {
			const saved = JSON.parse(window.localStorage.getItem('ever-teams:meeting-devices') ?? 'null');
			expect(saved).to.include({ audioInputId: '', videoInputId: '' });
		});
	});

	it('shows the agenda one day at a time, with the day before, the day after and back to today', () => {
		cy.hardVisit('/meet');
		cy.get('[data-testid="meetings-agenda-day"]', { timeout: 20_000 }).should(
			'contain',
			'No meetings scheduled today'
		);
		cy.contains('h2', /^Today, /).should('be.visible');

		cy.get('button[aria-label="Next day"]').click();
		cy.contains('h2', /^Tomorrow, /).should('be.visible');
		cy.get('[data-testid="meetings-agenda-day"]').should('contain', 'No meetings scheduled this day');
		// "+" schedules on the day shown
		cy.get('[data-testid="meetings-schedule-on-day"]').click();
		cy.get('#meeting-date').should(($date) => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			const pad = (value: number) => String(value).padStart(2, '0');
			const expected = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
			expect($date.val()).to.equal(expected);
		});
		cy.contains('button', /^Cancel$/).click();

		cy.get('button[aria-label="Previous day"]').click();
		cy.contains('h2', /^Today, /).should('be.visible');
		cy.get('button[aria-label="Previous day"]').click();
		cy.contains('h2', /^Yesterday, /).should('be.visible');
		cy.contains('button', /^Today$/).click();
		cy.contains('h2', /^Today, /).should('be.visible');

		// Any day from the month under the header: the 15th is never one of the neighbouring months' days in the grid
		cy.get('[data-testid="meetings-agenda-day-picker"]').click();
		cy.contains('[role="gridcell"]', /^15$/).click();
		cy.get('[data-testid="meetings-agenda-day-picker"]').should('contain', ' 15, ');
		cy.get('[role="gridcell"]').should('not.exist');
	});
});
