/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import type { DurationEntry } from '@/core/hooks/timesheet/use-duration-entry';
import type { DurationPhase } from '@/core/lib/utils/dashboards/manual-time-entry';
import { DurationField } from './duration-field';

// The keys stand for the texts; the values a sentence takes are appended so each message stays distinct
function translate(key: string, values?: Record<string, string>) {
	if (!values) {
		return key;
	}
	const parts = Object.values(values);
	return `${key} ${parts.join(' ')}`;
}

jest.mock('next-intl', () => ({
	useTranslations: () => translate,
	useLocale: () => 'en-GB'
}));

function entryOf(overrides: Partial<DurationEntry>): DurationEntry {
	return {
		text: '',
		phase: { kind: 'idle' },
		change: jest.fn(),
		commit: jest.fn(),
		retry: jest.fn(),
		...overrides
	};
}

function durationInput() {
	return screen.getByLabelText('manualTime.DURATION.LABEL') as HTMLInputElement;
}

describe('DurationField', () => {
	it('asks for the proposal on Enter instead of submitting the form around it', () => {
		const entry = entryOf({ text: '1:30' });
		const submit = jest.fn();
		render(
			<form onSubmit={submit}>
				<DurationField entry={entry} />
			</form>
		);

		const isDefaultKept = fireEvent.keyDown(durationInput(), { key: 'Enter' });

		expect(entry.commit).toHaveBeenCalledTimes(1);
		expect(isDefaultKept).toBe(false);
		expect(submit).not.toHaveBeenCalled();
	});

	it('hands the typed text over, and asks for the proposal when the field is left', () => {
		const entry = entryOf({});
		render(<DurationField entry={entry} />);

		fireEvent.change(durationInput(), { target: { value: '90m' } });
		fireEvent.blur(durationInput());

		expect(entry.change).toHaveBeenCalledWith('90m');
		expect(entry.commit).toHaveBeenCalledTimes(1);
	});

	it('says how to use it while nothing is asked', () => {
		render(<DurationField entry={entryOf({})} />);

		expect(screen.getByText('manualTime.DURATION.HINT')).toBeTruthy();
		expect(durationInput().getAttribute('aria-invalid')).toBe('false');
		expect(durationInput().placeholder).toBe('manualTime.DURATION.PLACEHOLDER');
	});

	it('names the proposed interval in the times of the locale', () => {
		const phase: DurationPhase = {
			kind: 'proposed',
			seconds: 5400,
			interval: { start: new Date(2026, 10, 10, 10, 30), end: new Date(2026, 10, 10, 12, 0) }
		};
		render(<DurationField entry={entryOf({ text: '1h 30m', phase })} />);

		expect(screen.getByText('manualTime.DURATION.PROPOSED 10:30 12:00')).toBeTruthy();
		expect(durationInput().value).toBe('1h 30m');
	});

	const noTimes = { startMinutes: null, endMinutes: null };

	it.each<[string, DurationPhase, string]>([
		[
			'text that is no duration',
			{ kind: 'invalid', text: 'soon', shown: noTimes },
			'dashboard.timesheets.SHEET.EDIT.INVALID'
		],
		['a day without room', { kind: 'noRoom', seconds: 5400 }, 'manualTime.DURATION.NO_ROOM 1h 30m'],
		[
			'a day closed to new time',
			{ kind: 'closedDay', seconds: 5400 },
			'dashboard.timesheets.SHEET.EDIT.LOCK_FUTURE'
		],
		[
			'a form without a member',
			{ kind: 'noMember', seconds: 5400, shown: noTimes },
			'manualTime.DURATION.NO_MEMBER'
		]
	])('marks the field and says why for %s', (_case, phase, message) => {
		render(<DurationField entry={entryOf({ phase })} />);

		expect(screen.getByText(message)).toBeTruthy();
		expect(durationInput().getAttribute('aria-invalid')).toBe('true');
	});

	it('says it is reading the day', () => {
		render(<DurationField entry={entryOf({ phase: { kind: 'reading', seconds: 5400 } })} />);

		expect(screen.getByText('manualTime.DURATION.READING')).toBeTruthy();
		expect(durationInput().getAttribute('aria-invalid')).toBe('false');
	});

	it('offers to try again when the day could not be read', () => {
		const entry = entryOf({ phase: { kind: 'failed', seconds: 5400 } });
		render(<DurationField entry={entry} />);

		expect(screen.getByText('manualTime.DURATION.READ_FAILED')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'manualTime.DURATION.RETRY' }));

		expect(entry.retry).toHaveBeenCalledTimes(1);
	});
});
