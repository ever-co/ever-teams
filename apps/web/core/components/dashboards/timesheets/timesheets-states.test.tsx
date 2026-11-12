/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { TimesheetsSelectionBar } from './timesheets-states';

function renderBar(overrides: { canEdit: boolean; canDelete?: boolean }) {
	const onEdit = jest.fn();
	render(
		<TimesheetsSelectionBar
			count={3}
			canApprove
			canEdit={overrides.canEdit}
			canDelete={overrides.canDelete ?? true}
			isApproving={false}
			onApprove={jest.fn()}
			onReject={jest.fn()}
			onEdit={onEdit}
			onDelete={jest.fn()}
			onClear={jest.fn()}
		/>
	);
	return { onEdit };
}

function actionNames() {
	const buttons = screen.getAllByRole('button');
	return buttons.map((button) => button.getAttribute('aria-label') ?? button.textContent);
}

describe('TimesheetsSelectionBar', () => {
	it('offers Edit beside the actions it already had', () => {
		const { onEdit } = renderBar({ canEdit: true });

		expect(actionNames()).toEqual([
			'dashboard.timesheets.APPROVE',
			'dashboard.timesheets.REJECT',
			'common.EDIT',
			'common.DELETE',
			'dashboard.timesheets.CLEAR_SELECTION'
		]);

		fireEvent.click(screen.getByRole('button', { name: 'common.EDIT' }));

		expect(onEdit).toHaveBeenCalledTimes(1);
	});

	it('offers no Edit when none of the selected entries may be edited', () => {
		renderBar({ canEdit: false, canDelete: false });

		expect(actionNames()).toEqual([
			'dashboard.timesheets.APPROVE',
			'dashboard.timesheets.REJECT',
			'dashboard.timesheets.CLEAR_SELECTION'
		]);
	});
});
