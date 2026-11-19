import { expect, test, type BootstrapFixture } from '../../fixtures';

/**
 * Every authenticated route in the app, loaded as a signed-in person against the mock API.
 *
 * What each one proves, without depending on a single widget's markup:
 *   - the shell reaches its ready mark (hardVisit waits for it, so a hang here is a render failure)
 *   - nothing crashed: no uncaught page error, no app console error
 *   - no Next.js dev overlay appeared
 *   - the app was sent no 4xx/5xx by the API
 *   - the route did not bounce the person to sign-in, to /unauthorized, or to the not-found page
 *   - the route asked the API for something (a route that renders while calling nothing is a stub)
 */

type RouteCase = {
	/** Route family label, shown in the test title. */
	label: string;
	/** Resolved against the fixture ids so path params are real entities, not placeholders. */
	path: (fixture: BootstrapFixture) => string;
	/** Set before the visit; a route may legitimately need a scenario to render at all. */
	scenario?: Record<string, unknown>;
};

const ROUTES: RouteCase[] = [
	{ label: 'team tasks', path: (f) => `/team/tasks` },
	{ label: 'team tasks trash', path: (f) => `/team/tasks/trash` },
	{ label: 'team board (public team page)', path: (f) => `/team/${f.ids.teamA}/${f.profileLink}` },
	{ label: 'all teams', path: (f) => `/all-teams` },
	{ label: 'task detail', path: (f) => `/task/${f.ids.task}` },
	{ label: 'kanban', path: (f) => `/kanban` },
	{ label: 'my week', path: (f) => `/my-week` },
	{ label: 'work diary', path: (f) => `/work-diary` },
	{ label: 'favorites', path: (f) => `/favorites` },
	{ label: 'views', path: (f) => `/views` },
	{ label: 'calendar', path: (f) => `/calendar` },
	{ label: 'goals', path: (f) => `/goals` },
	{ label: 'inbox', path: (f) => `/inbox` },
	{ label: 'clients', path: (f) => `/clients` },
	{ label: 'projects', path: (f) => `/projects` },
	{ label: 'project detail', path: (f) => `/projects/${f.ids.project}` },
	{ label: 'member profile', path: (f) => `/profile/${f.ids.employee}` },
	{ label: 'assistant', path: (f) => `/assistant` },
	{ label: 'docs', path: (f) => `/docs` },
	{ label: 'docs trash', path: (f) => `/docs/trash` },
	{ label: 'chat', path: (f) => `/chat` },
	{ label: 'chat threads', path: (f) => `/chat/threads` },
	{ label: 'chat unreads', path: (f) => `/chat/unreads` },
	{ label: 'invoices', path: (f) => `/invoices` },
	{ label: 'new invoice', path: (f) => `/invoices/new` },
	{ label: 'reports time and activity', path: (f) => `/reports/time-and-activity` },
	{ label: 'reports actual and expected hours', path: (f) => `/reports/actual-and-expected-hours` },
	{ label: 'reports manual time edits', path: (f) => `/reports/manual-time-edits` },
	{ label: 'reports payments due', path: (f) => `/reports/payments-due` },
	{ label: 'reports project budget', path: (f) => `/reports/project-budget` },
	{ label: 'reports weekly limit', path: (f) => `/reports/weekly-limit` },
	{ label: 'reports timesheet', path: (f) => `/reports/timesheet/${f.ids.employee}` },
	{ label: 'settings root', path: (f) => `/settings` },
	{ label: 'settings personal', path: (f) => `/settings/personal` },
	{ label: 'settings personal notifications', path: (f) => `/settings/personal/notifications` },
	{ label: 'settings personal preferences', path: (f) => `/settings/personal/preferences` },
	{ label: 'settings personal security', path: (f) => `/settings/personal/security` },
	{ label: 'settings personal working hours', path: (f) => `/settings/personal/working-hours` },
	{ label: 'settings personal api tokens', path: (f) => `/settings/personal/api-tokens` },
	{ label: 'settings team', path: (f) => `/settings/team` },
	{ label: 'settings team members', path: (f) => `/settings/team/members` },
	{ label: 'settings team statuses', path: (f) => `/settings/team/statuses` },
	{ label: 'settings team labels', path: (f) => `/settings/team/labels` },
	{ label: 'settings team priorities', path: (f) => `/settings/team/priorities` },
	{ label: 'settings team sizes', path: (f) => `/settings/team/sizes` },
	{ label: 'settings team versions', path: (f) => `/settings/team/versions` },
	{ label: 'settings team issue types', path: (f) => `/settings/team/issue-types` },
	{ label: 'settings team automations', path: (f) => `/settings/team/automations` },
	{ label: 'settings team import', path: (f) => `/settings/team/import` },
	{ label: 'settings team integrations', path: (f) => `/settings/team/integrations` },
	{ label: 'settings workspace', path: (f) => `/settings/workspace` },
	{ label: 'settings workspace embeds', path: (f) => `/settings/workspace/embeds` },
	{ label: 'dashboard team', path: (f) => `/dashboard/team-dashboard/${f.ids.teamA}` },
	{ label: 'dashboard app url', path: (f) => `/dashboard/app-url/${f.ids.teamA}` },
	{ label: 'about', path: (f) => `/about` },
	{ label: 'workspace welcome', path: (f) => `/workspace/welcome` },
	{ label: 'permissions', path: (f) => `/permissions` },
	{ label: 'team plans (personal plan page)', path: (f) => `/my-week`, scenario: { requirePlanToTrack: true } }
];

for (const route of ROUTES) {
	test(`${route.label} renders for a signed-in person`, async ({ app, mock, shield, fixture }) => {
		const page = await app(route.path(fixture), { scenario: route.scenario });

		const documents = shield.documents();
		expect(
			documents[documents.length - 1]?.status,
			`the server answered for ${route.label} (${documents.map((d) => d.status).join(', ')})`
		).toBe(200);

		expect(shield.pageErrors(), `uncaught errors on ${route.label}`).toEqual([]);
		expect(shield.consoleErrors(), `app console errors on ${route.label}`).toEqual([]);

		// A Next.js error overlay means the route threw during render.
		await expect(page.locator('nextjs-portal'), `dev overlay on ${route.label}`).toHaveCount(0);

		// The app keeps the person on the route: no bounce to sign-in, no /unauthorized, no 404 page.
		expect(page.url(), `landed on ${route.label}`).not.toMatch(/\/auth\/(passcode|password|signup|error)/);
		expect(page.url(), `landed on ${route.label}`).not.toMatch(/\/unauthorized/);

		expect(await mock.failures(), `API failures while loading ${route.label}`).toEqual([]);
		expect((await mock.requests()).length, `${route.label} asked the API for its data`).toBeGreaterThan(0);

		await expect(page.locator('body')).not.toHaveText('');
	});
}
