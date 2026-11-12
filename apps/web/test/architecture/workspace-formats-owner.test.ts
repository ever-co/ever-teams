import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MAIN_PAGES = resolve(__dirname, '../../app/[locale]/(main)');

/**
 * The pages whose figures and dates follow the workspace's formats. The formats come with the organisation, which
 * a page loads through its owner hook: without it a direct visit, or a reload, shows the reader's own formats.
 */
const PAGES_WITH_WORKSPACE_FORMATS = [
	'reports/time-and-activity/page.tsx',
	'reports/timesheet/[memberId]/page.tsx',
	'reports/actual-and-expected-hours/page.tsx',
	'reports/manual-time-edits/page.tsx',
	'reports/weekly-limit/page.tsx',
	'reports/payments-due/page.tsx',
	'reports/project-budget/page.tsx',
	'work-diary/page.tsx'
];

describe('pages that follow the workspace formats', () => {
	it.each(PAGES_WITH_WORKSPACE_FORMATS)('%s loads the organisation its formats come from', (page) => {
		const source = readFileSync(resolve(MAIN_PAGES, page), 'utf8');

		expect(source).toContain('useCurrentOrganizationOwner()');
	});
});
