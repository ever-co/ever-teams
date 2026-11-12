/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import type { TOrganizationProject } from '@/core/types/schemas';
import { ProjectFacts } from './project-properties';

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string) => {
		const messages: Record<string, string> = {
			'pages.projects.billable.LABEL': 'Billable by default',
			'common.YES': 'Yes',
			'common.NO': 'No'
		};
		return messages[key] ?? key;
	}
}));

function projectOf(billable: boolean | null | undefined): TOrganizationProject {
	return { id: 'project-1', name: 'Website', public: null, owner: null, code: null, billable };
}

function shownValueOf(billable: boolean | null | undefined) {
	const project = projectOf(billable);
	render(<ProjectFacts project={project} />);
	const label = screen.getByText('Billable by default');
	return label.nextElementSibling?.textContent;
}

describe('the billable line of the project details', () => {
	it('says Yes for a project that is billable by default', () => {
		expect(shownValueOf(true)).toBe('Yes');
	});

	it.each([
		['chose not billable', false],
		['never chose, the API holding null', null],
		['came without the field', undefined]
	])('says No for a project that %s', (_case, billable) => {
		expect(shownValueOf(billable)).toBe('No');
	});
});
