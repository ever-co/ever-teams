/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { ProjectBillableMark } from './project-billable-mark';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => {
		const messages: Record<string, string> = {
			'pages.projects.billable.LABEL': 'Billable by default'
		};
		return messages[key] ?? key;
	}
}));

describe('the billable mark of a project', () => {
	it.each([
		['chose not billable', { billable: false }],
		['never chose, the API holding null', { billable: null }],
		['came without the field', {}]
	])('is not drawn for a project that %s', (_case, project) => {
		const { container } = render(<ProjectBillableMark project={project} />);

		expect(container.firstChild).toBeNull();
	});

	it('is the brand tint around a dollar for a project billable by default', () => {
		render(<ProjectBillableMark project={{ billable: true }} />);

		const mark = screen.getByRole('img', { name: 'Billable by default' });

		expect(mark.classList.contains('bg-primary/10')).toBe(true);
		expect(mark.classList.contains('text-primary-ink')).toBe(true);
		expect(mark.querySelector('svg')).not.toBeNull();
	});
});
