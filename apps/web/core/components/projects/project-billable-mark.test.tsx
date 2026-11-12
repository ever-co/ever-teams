/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { ProjectBillableMark } from './project-billable-mark';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => {
		const messages: Record<string, string> = {
			'pages.projects.billable.LABEL': 'Billable by default',
			'pages.projects.billable.NOT_BILLABLE': 'Not billable'
		};
		return messages[key] ?? key;
	}
}));

describe('the billable mark of a project', () => {
	it.each([
		['chose not billable', { billable: false }],
		['never chose, the API holding null', { billable: null }],
		['came without the field', {}]
	])('says Not billable for a project that %s', (_case, project) => {
		render(<ProjectBillableMark project={project} />);

		expect(screen.getByRole('img', { name: 'Not billable' })).toBeTruthy();
	});

	it('says Billable by default for a project that is billable by default', () => {
		render(<ProjectBillableMark project={{ billable: true }} />);

		expect(screen.getByRole('img', { name: 'Billable by default' })).toBeTruthy();
	});
});
