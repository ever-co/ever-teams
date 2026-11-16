import { describe, expect, it } from '@jest/globals';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { statusKeepingSavedLabels } from './timer-status-labels';

const meeting = { id: 'meeting', name: 'meeting', color: '#2563eb' };
const support = { id: 'support', name: 'support', color: '#16a34a' };

function runningStatus(logId: string, tags: Array<typeof meeting>): ITimerStatus {
	return { running: true, lastLog: { id: logId, tags } } as unknown as ITimerStatus;
}

describe('a timer status read and the labels saved on its run (#5368)', () => {
	const saved = { logId: 'run-1', tags: [meeting, support], savedAt: 2_000 };

	it('keeps the saved labels against a read asked before the save landed', () => {
		const olderRead = runningStatus('run-1', [meeting]);

		const kept = statusKeepingSavedLabels(olderRead, saved, 1_500);

		expect(kept?.lastLog?.tags).toEqual([meeting, support]);
	});

	it('takes the labels of a read asked after the save landed', () => {
		const laterRead = runningStatus('run-1', [support]);

		expect(statusKeepingSavedLabels(laterRead, saved, 2_500)).toBe(laterRead);
	});

	it('leaves the read of another run, or of no run, as it came', () => {
		const otherRun = runningStatus('run-2', [meeting]);
		const stopped = { running: false, lastLog: null } as unknown as ITimerStatus;

		expect(statusKeepingSavedLabels(otherRun, saved, 1_500)).toBe(otherRun);
		expect(statusKeepingSavedLabels(stopped, saved, 1_500)).toBe(stopped);
		expect(statusKeepingSavedLabels(null, saved, 1_500)).toBeNull();
	});

	it('leaves every read as it came while nothing was saved', () => {
		const read = runningStatus('run-1', [meeting]);

		expect(statusKeepingSavedLabels(read, null, 1_500)).toBe(read);
	});
});
