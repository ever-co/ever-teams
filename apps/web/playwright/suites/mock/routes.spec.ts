import { expect, test, type BootstrapFixture } from '../../fixtures';
import { devOverlayErrors } from '../../helpers';

/**
 * Every authenticated route in the app, loaded as a signed-in person against the mock API.
 *
 * What each one proves, without depending on a single widget's markup:
 *   - the shell reaches its ready mark (hardVisit waits for it, so a hang here is a render failure)
 *   - nothing crashed: no uncaught page error, no app console error
 *   - no Next.js dev overlay appeared
 *   - the app was sent no 4xx/5xx by the API, apart from the 404 of a path the case names as absent (`absentPaths`)
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
	/**
	 * Mock paths the route reads that a supported Gauzy may not have, which the mock answers 404 by default (a Gauzy
	 * without the route): that 404 is the page's answer, not an API failure. The console gate still holds, so the page
	 * must take it quietly.
	 */
	absentPaths?: string[];
};

const ROUTES: RouteCase[] = [
	{ label: 'team tasks', path: () => `/team/tasks` },
	{ label: 'team tasks trash', path: () => `/team/tasks/trash` },
	{ label: 'team board (public team page)', path: (f) => `/team/${f.ids.teamA}/${f.profileLink}` },
	{ label: 'all teams', path: () => `/all-teams` },
	{ label: 'task detail', path: (f) => `/task/${f.ids.task}` },
	{ label: 'kanban', path: () => `/kanban` },
	{ label: 'my week', path: () => `/my-week` },
	{ label: 'work diary', path: () => `/work-diary` },
	{ label: 'favorites', path: () => `/favorites` },
	{ label: 'views', path: () => `/views` },
	{ label: 'calendar', path: () => `/calendar` },
	{ label: 'goals', path: () => `/goals` },
	{ label: 'inbox', path: () => `/inbox` },
	{ label: 'clients', path: () => `/clients` },
	{ label: 'projects', path: () => `/projects` },
	{ label: 'project detail', path: (f) => `/projects/${f.ids.project}` },
	{ label: 'member profile', path: (f) => `/profile/${f.ids.employee}` },
	{ label: 'assistant', path: () => `/assistant` },
	{ label: 'docs', path: () => `/docs` },
	{ label: 'docs trash', path: () => `/docs/trash` },
	{ label: 'chat', path: () => `/chat` },
	{ label: 'chat threads', path: () => `/chat/threads` },
	{ label: 'chat unreads', path: () => `/chat/unreads` },
	{ label: 'invoices', path: () => `/invoices` },
	{ label: 'new invoice', path: () => `/invoices/new` },
	{ label: 'reports time and activity', path: () => `/reports/time-and-activity` },
	{ label: 'reports actual and expected hours', path: () => `/reports/actual-and-expected-hours` },
	{ label: 'reports manual time edits', path: () => `/reports/manual-time-edits` },
	{ label: 'reports payments due', path: () => `/reports/payments-due` },
	{ label: 'reports project budget', path: () => `/reports/project-budget` },
	{ label: 'reports weekly limit', path: () => `/reports/weekly-limit` },
	{ label: 'reports timesheet', path: (f) => `/reports/timesheet/${f.ids.employee}` },
	{ label: 'settings root', path: () => `/settings` },
	{ label: 'settings personal', path: () => `/settings/personal` },
	{ label: 'settings personal notifications', path: () => `/settings/personal/notifications` },
	{ label: 'settings personal preferences', path: () => `/settings/personal/preferences` },
	// "Sites you signed in from" (#5595) reads GET /embed/grants: off by default on the mock, as on a Gauzy without the
	// route, and listed with the `siteGrants` scenario
	{
		label: 'settings personal security',
		path: () => `/settings/personal/security`,
		absentPaths: ['/api/embed/grants']
	},
	{
		label: 'settings personal security (sites signed in from)',
		path: () => `/settings/personal/security`,
		scenario: { siteGrants: true }
	},
	{ label: 'settings personal working hours', path: () => `/settings/personal/working-hours` },
	{ label: 'settings personal api tokens', path: () => `/settings/personal/api-tokens` },
	{ label: 'settings team', path: () => `/settings/team` },
	{ label: 'settings team members', path: () => `/settings/team/members` },
	{ label: 'settings team statuses', path: () => `/settings/team/statuses` },
	{ label: 'settings team labels', path: () => `/settings/team/labels` },
	{ label: 'settings team priorities', path: () => `/settings/team/priorities` },
	{ label: 'settings team sizes', path: () => `/settings/team/sizes` },
	{ label: 'settings team versions', path: () => `/settings/team/versions` },
	{ label: 'settings team issue types', path: () => `/settings/team/issue-types` },
	{ label: 'settings team automations', path: () => `/settings/team/automations` },
	{ label: 'settings team import', path: () => `/settings/team/import` },
	{ label: 'settings team integrations', path: () => `/settings/team/integrations` },
	{ label: 'settings workspace', path: () => `/settings/workspace` },
	{ label: 'settings workspace embeds', path: () => `/settings/workspace/embeds` },
	{ label: 'dashboard team', path: (f) => `/dashboard/team-dashboard/${f.ids.teamA}` },
	{ label: 'dashboard app url', path: (f) => `/dashboard/app-url/${f.ids.teamA}` },
	{ label: 'about', path: () => `/about` },
	{ label: 'workspace welcome', path: () => `/workspace/welcome` },
	{ label: 'permissions', path: () => `/permissions` },
	{ label: 'team plans (personal plan page)', path: () => `/my-week`, scenario: { requirePlanToTrack: true } }
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
		expect(await devOverlayErrors(page), `the Next dev overlay shows an error on ${route.label}`).toEqual([]);

		// The app keeps the person on the route: no bounce to sign-in, no /unauthorized, no 404 page.
		expect(page.url(), `landed on ${route.label}`).not.toMatch(/\/auth\/(passcode|password|signup|error)/);
		expect(page.url(), `landed on ${route.label}`).not.toMatch(/\/unauthorized/);

		const isAbsentPath = (request: { path: string; status: number }) =>
			request.status === 404 && (route.absentPaths ?? []).includes(request.path);
		const failures = (await mock.failures()).filter((request) => !isAbsentPath(request));
		expect(failures, `API failures while loading ${route.label}`).toEqual([]);
		expect((await mock.requests()).length, `${route.label} asked the API for its data`).toBeGreaterThan(0);

		await expect(page.locator('body')).not.toHaveText('');
	});
}
