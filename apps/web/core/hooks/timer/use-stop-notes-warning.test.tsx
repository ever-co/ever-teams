/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

const mockWarning = jest.fn();
const mockGetLastTimerLog = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { warning: (...args: unknown[]) => mockWarning(...args) } }));
jest.mock('@/core/services/client/api/timers', () => ({
	timerService: { getLastTimerLog: (...args: unknown[]) => mockGetLastTimerLog(...args) }
}));
jest.mock('@/core/lib/helpers/error-message', () => ({ logErrorInDev: jest.fn() }));

import { useStopNotesWarning } from './use-stop-notes-warning';

const STOPPED_LOG_ID = 'log-1';
const SENT_NOTES = 'Review the invoice export, then the totals';
const KEPT_EARLIER_NOTES = { id: STOPPED_LOG_ID, description: 'Review the invoice export' };
const KEPT_SENT_NOTES = { id: STOPPED_LOG_ID, description: SENT_NOTES };
const ANOTHER_LOG_OF_TODAY = { id: 'log-of-today', description: 'Something else' };

function lastLogAnswerOf(lastLog: { id: string; description?: string | null } | null) {
	return { data: [{ lastLog }] };
}

function warnWhenStopLostNotes() {
	return renderHook(() => useStopNotesWarning()).result.current;
}

describe('useStopNotesWarning', () => {
	it('says nothing, and reads nothing, when the stop sent no notes', async () => {
		await warnWhenStopLostNotes()({
			sentNotes: undefined,
			stoppedLogId: STOPPED_LOG_ID,
			answeredLog: null,
			employeeId: 'employee-1'
		});

		expect(mockWarning).not.toHaveBeenCalled();
		expect(mockGetLastTimerLog).not.toHaveBeenCalled();
	});

	it('warns when the stopped entry the stop answers with kept its earlier notes', async () => {
		await warnWhenStopLostNotes()({
			sentNotes: SENT_NOTES,
			stoppedLogId: STOPPED_LOG_ID,
			answeredLog: KEPT_EARLIER_NOTES,
			employeeId: 'employee-1'
		});

		expect(mockWarning).toHaveBeenCalledWith('toasts.timer.NOTES_NOT_SAVED', {
			id: 'timer-notes-not-saved',
			description: 'toasts.timer.NOTES_NOT_SAVED_HINT'
		});
		expect(mockGetLastTimerLog).not.toHaveBeenCalled();
	});

	it('says nothing when the stopped entry the stop answers with carries the notes sent', async () => {
		await warnWhenStopLostNotes()({
			sentNotes: SENT_NOTES,
			stoppedLogId: STOPPED_LOG_ID,
			answeredLog: KEPT_SENT_NOTES,
			employeeId: 'employee-1'
		});

		expect(mockWarning).not.toHaveBeenCalled();
	});

	it('reads the last log of any day when the answer shows another entry, and warns when it kept its earlier notes', async () => {
		mockGetLastTimerLog.mockResolvedValue(lastLogAnswerOf(KEPT_EARLIER_NOTES));

		await warnWhenStopLostNotes()({
			sentNotes: SENT_NOTES,
			stoppedLogId: STOPPED_LOG_ID,
			answeredLog: ANOTHER_LOG_OF_TODAY,
			employeeId: 'employee-1'
		});

		expect(mockGetLastTimerLog).toHaveBeenCalledWith('employee-1');
		expect(mockWarning).toHaveBeenCalledTimes(1);
	});

	it('reads the last log of any day when the answer shows no entry at all', async () => {
		mockGetLastTimerLog.mockResolvedValue(lastLogAnswerOf(KEPT_EARLIER_NOTES));

		await warnWhenStopLostNotes()({
			sentNotes: SENT_NOTES,
			stoppedLogId: STOPPED_LOG_ID,
			answeredLog: null,
			employeeId: 'employee-1'
		});

		expect(mockWarning).toHaveBeenCalledTimes(1);
	});

	it('says nothing when the last log of any day carries the notes sent', async () => {
		mockGetLastTimerLog.mockResolvedValue(lastLogAnswerOf(KEPT_SENT_NOTES));

		await warnWhenStopLostNotes()({
			sentNotes: SENT_NOTES,
			stoppedLogId: STOPPED_LOG_ID,
			answeredLog: ANOTHER_LOG_OF_TODAY,
			employeeId: 'employee-1'
		});

		expect(mockWarning).not.toHaveBeenCalled();
	});

	it('says nothing when the stopped entry cannot be read: nothing proves the notes were lost', async () => {
		mockGetLastTimerLog.mockRejectedValue(new Error('offline'));
		const stoppedNotes = { sentNotes: SENT_NOTES, stoppedLogId: STOPPED_LOG_ID, answeredLog: null };

		await warnWhenStopLostNotes()({ ...stoppedNotes, employeeId: 'employee-1' });
		await warnWhenStopLostNotes()({ ...stoppedNotes, employeeId: undefined });

		expect(mockWarning).not.toHaveBeenCalled();
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(1);
	});
});
