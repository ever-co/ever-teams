/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		const parts = Object.entries(values).map(([name, value]) => `${name}=${String(value)}`);
		return `${key}(${parts.join(',')})`;
	}
}));
// Every dialog of the page is loaded on demand; a stand-in shows the props each one receives.
jest.mock('next/dynamic', () => () => (props: Record<string, unknown>) => {
	if ('selectTimesheetId' in props) {
		return (
			<div
				data-testid="reject-dialog"
				data-description={String(props.description ?? '')}
				data-note={String(props.note ?? '')}
			/>
		);
	}
	if ('countID' in props) {
		return <div data-testid="delete-dialog" data-count={String(props.countID)} />;
	}
	return null;
});

import {
	type TimesheetDialogsState,
	useTimesheetDialogs
} from '@/core/hooks/dashboards/timesheets/use-timesheet-dialogs';
import { TimesheetsDialogs } from './timesheets-dialogs';

function logOf(id: string): ITimeLog {
	return {
		id,
		duration: 3600,
		version: '1',
		timesheetId: `sheet-${id}`,
		timesheet: { id: `sheet-${id}` }
	} as ITimeLog;
}

const GROUP_LOGS = [logOf('a'), logOf('b'), logOf('c')];

function Harness({ onOpen }: Readonly<{ onOpen: (dialogs: TimesheetDialogsState) => void }>) {
	const dialogs = useTimesheetDialogs();
	return (
		<>
			<button type="button" onClick={() => onOpen(dialogs)}>
				open
			</button>
			<TimesheetsDialogs
				dialogs={dialogs}
				canAddTime={false}
				isDeleting={false}
				onRejected={jest.fn()}
				onDeleteConfirmed={jest.fn()}
			/>
		</>
	);
}

function openWith(onOpen: (dialogs: TimesheetDialogsState) => void) {
	render(<Harness onOpen={onOpen} />);
	fireEvent.click(screen.getByRole('button', { name: 'open' }));
}

describe('TimesheetsDialogs for a group of similar entries', () => {
	it('shows how many entries a group delete removes', () => {
		openWith((dialogs) => dialogs.openDelete(GROUP_LOGS, 'group'));

		expect(screen.getByTestId('delete-dialog').getAttribute('data-count')).toBe('3');
	});

	it('shows no count for the delete of one entry', () => {
		openWith((dialogs) => dialogs.openDelete([logOf('a')], 'row'));

		expect(screen.getByTestId('delete-dialog').getAttribute('data-count')).toBe('0');
	});

	it('says how many entries a group reject rejects', () => {
		openWith((dialogs) => dialogs.openReject(GROUP_LOGS, 'group'));

		expect(screen.getByTestId('reject-dialog').getAttribute('data-description')).toBe(
			'dashboard.timesheets.SIMILAR.REJECT_COUNT(count=3)'
		);
	});

	it('warns that a group reject changes whole timesheets', () => {
		openWith((dialogs) => dialogs.openReject(GROUP_LOGS, 'group'));

		expect(screen.getByTestId('reject-dialog').getAttribute('data-note')).toBe(
			'dashboard.timesheets.SHEET.WHOLE_TIMESHEETS'
		);
	});

	it("keeps the reject dialog's own words for one entry", () => {
		openWith((dialogs) => dialogs.openReject([logOf('a')], 'row'));

		expect(screen.getByTestId('reject-dialog').getAttribute('data-description')).toBe('');
		expect(screen.getByTestId('reject-dialog').getAttribute('data-note')).toBe('');
	});
});
