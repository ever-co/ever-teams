/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { ProjectNotBillableChip } from './project-billable-chip';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => {
		const messages: Record<string, string> = { 'pages.projects.billable.NOT_BILLABLE': 'Not billable' };
		return messages[key] ?? key;
	}
}));

describe('the mark of a project that is not billable', () => {
	it.each([
		['chose not billable', { billable: false }],
		['never chose, the API holding null', { billable: null }],
		['came without the field', {}]
	])('says Not billable for a project that %s', (_case, project) => {
		render(<ProjectNotBillableChip project={project} />);

		expect(screen.getByText('Not billable')).toBeTruthy();
	});

	it('shows nothing for a project that is billable by default', () => {
		const { container } = render(<ProjectNotBillableChip project={{ billable: true }} />);

		expect(container.childElementCount).toBe(0);
	});
});
