/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { ProjectVisibilityRow } from './project-visibility-row';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => {
		const messages: Record<string, string> = {
			'pages.projects.visibility.LABEL': 'Visibility',
			'pages.projects.visibility.EVERYONE_TITLE': 'Everyone in the organization',
			'pages.projects.visibility.EVERYONE_DETAIL': 'Listed to everyone who sees projects.',
			'pages.projects.visibility.PRIVATE_TITLE': 'Members and managers only',
			'pages.projects.visibility.PRIVATE_DETAIL': 'Listed only to its members and managers, and to admins.',
			'pages.projects.visibility.NOT_ENFORCED': 'Everyone still sees it until an admin turns on Private projects.'
		};
		return messages[key] ?? key;
	}
}));

function renderRow(props: Partial<Parameters<typeof ProjectVisibilityRow>[0]> = {}) {
	const onChange = jest.fn();
	render(<ProjectVisibilityRow visibility={null} isEnforced onChange={onChange} {...props} />);
	return {
		onChange,
		everyone: screen.getByRole('radio', { name: /Everyone in the organization/ }),
		private: screen.getByRole('radio', { name: /Members and managers only/ })
	};
}

describe('the Visibility property of the project form', () => {
	it('is one group named Visibility, with Everyone picked for a project that never chose', () => {
		const row = renderRow();

		expect(screen.getByRole('group', { name: 'Visibility' })).toBeTruthy();
		expect((row.everyone as HTMLInputElement).checked).toBe(true);
		expect((row.private as HTMLInputElement).checked).toBe(false);
	});

	it('shows a private project as Members and managers only', () => {
		const row = renderRow({ visibility: 'private' });

		expect((row.private as HTMLInputElement).checked).toBe(true);
	});

	it('hands the picked choice to the form', () => {
		const row = renderRow();

		fireEvent.click(row.private);

		expect(row.onChange).toHaveBeenCalledWith('private');
	});

	it('says the choice waits for the workspace setting while it is off, and nothing once it is on', () => {
		renderRow({ isEnforced: false });
		expect(screen.getByText('Everyone still sees it until an admin turns on Private projects.')).toBeTruthy();
	});

	it('says nothing more once the workspace keeps private projects private', () => {
		renderRow({ isEnforced: true });
		expect(screen.queryByText('Everyone still sees it until an admin turns on Private projects.')).toBeNull();
	});

	it('takes no choice while the project saves', () => {
		const row = renderRow({ disabled: true });

		expect(row.private.closest('fieldset')?.disabled).toBe(true);
	});
});
