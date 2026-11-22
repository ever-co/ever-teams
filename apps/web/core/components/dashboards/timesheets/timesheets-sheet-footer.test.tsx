/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import type { SheetPendingActions, SheetSelectionActions } from './timesheets-sheet-footer';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		const parts = Object.entries(values).map(([name, value]) => `${name}=${String(value)}`);
		return `${key}(${parts.join(',')})`;
	}
}));

import { TimesheetsSheetFooter } from './timesheets-sheet-footer';

const APPROVE_RONAN = 'dashboard.timesheets.SHEET.APPROVE_PENDING(name=Ronan B.)';
const REJECT_RONAN = 'dashboard.timesheets.SHEET.REJECT_PENDING(name=Ronan B.)';
const WHOLE_TIMESHEETS = 'dashboard.timesheets.SHEET.WHOLE_TIMESHEETS';

function selectionOf(count: number, canApprove: boolean): SheetSelectionActions {
	return {
		count,
		seconds: 1800 * count,
		canApprove,
		canDelete: false,
		onApprove: jest.fn(),
		onReject: jest.fn(),
		onDelete: jest.fn(),
		onClear: jest.fn()
	};
}

function pendingOf(canApprove: boolean): SheetPendingActions {
	return {
		count: 4,
		seconds: 4 * 3600,
		memberName: 'Ronan B.',
		canApprove,
		onApprove: jest.fn(),
		onReject: jest.fn()
	};
}

function renderFooter(selection: SheetSelectionActions, pending: SheetPendingActions) {
	render(<TimesheetsSheetFooter selection={selection} pending={pending} isApproving={false} />);
}

describe("TimesheetsSheetFooter, the review of a member's pending time (#5622)", () => {
	it('offers Approve and Reject on the pending time the reader may review, as a team manager on a member', () => {
		const pending = pendingOf(true);
		renderFooter(selectionOf(0, false), pending);

		expect(screen.getByText('dashboard.timesheets.SHEET.PENDING_SUMMARY(count=4)')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: APPROVE_RONAN }));
		fireEvent.click(screen.getByRole('button', { name: REJECT_RONAN }));
		expect(pending.onApprove).toHaveBeenCalledTimes(1);
		expect(pending.onReject).toHaveBeenCalledTimes(1);
		expect(screen.getByText(WHOLE_TIMESHEETS)).toBeTruthy();
	});

	it('keeps the pending summary without Approve or Reject where the reader may not review, as on his own week', () => {
		renderFooter(selectionOf(0, false), pendingOf(false));

		expect(screen.getByText('dashboard.timesheets.SHEET.PENDING_SUMMARY(count=4)')).toBeTruthy();
		expect(screen.queryByRole('button', { name: APPROVE_RONAN })).toBeNull();
		expect(screen.queryByRole('button', { name: REJECT_RONAN })).toBeNull();
		expect(screen.queryByText(WHOLE_TIMESHEETS)).toBeNull();
	});

	it('acts on the selection by the rule of the selected logs, whatever the pending time allows', () => {
		const reviewableSelection = selectionOf(2, true);
		renderFooter(reviewableSelection, pendingOf(false));

		fireEvent.click(screen.getByRole('button', { name: 'dashboard.timesheets.APPROVE' }));
		expect(reviewableSelection.onApprove).toHaveBeenCalledTimes(1);
	});

	it('offers no Approve on a selection the reader may not review, even when the pending time allows it', () => {
		renderFooter(selectionOf(2, false), pendingOf(true));

		expect(screen.queryByRole('button', { name: 'dashboard.timesheets.APPROVE' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'dashboard.timesheets.REJECT' })).toBeNull();
	});
});
