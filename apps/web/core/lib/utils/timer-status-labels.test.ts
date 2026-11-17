import { describe, expect, it } from '@jest/globals';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { labelSavesLanded, landLabelSave, statusKeepingSavedLabels } from './timer-status-labels';

const meeting = { id: 'meeting', name: 'meeting', color: '#2563eb' };
const support = { id: 'support', name: 'support', color: '#16a34a' };

function runningStatus(logId: string, tags: Array<typeof meeting>): ITimerStatus {
	return { running: true, lastLog: { id: logId, tags } } as unknown as ITimerStatus;
}

describe('a timer status read and the labels saved on its run (#5368)', () => {
	it('keeps the saved labels against a read asked before the save landed', () => {
		const askedAt = labelSavesLanded();
		const saved = { logId: 'run-1', tags: [meeting, support], saveNumber: landLabelSave() };

		const kept = statusKeepingSavedLabels(runningStatus('run-1', [meeting]), saved, askedAt);

		expect(kept?.lastLog?.tags).toEqual([meeting, support]);
	});

	it('takes the labels of a read asked once the save had landed, however close the two moments', () => {
		const saved = { logId: 'run-1', tags: [meeting, support], saveNumber: landLabelSave() };
		// Asked right after the save landed: a count, unlike two times of the same millisecond, tells them apart
		const askedAt = labelSavesLanded();
		const laterRead = runningStatus('run-1', [support]);

		expect(statusKeepingSavedLabels(laterRead, saved, askedAt)).toBe(laterRead);
	});

	it('leaves the read of another run, or of no run, as it came', () => {
		const askedAt = labelSavesLanded();
		const saved = { logId: 'run-1', tags: [meeting, support], saveNumber: landLabelSave() };
		const otherRun = runningStatus('run-2', [meeting]);
		const stopped = { running: false, lastLog: null } as unknown as ITimerStatus;

		expect(statusKeepingSavedLabels(otherRun, saved, askedAt)).toBe(otherRun);
		expect(statusKeepingSavedLabels(stopped, saved, askedAt)).toBe(stopped);
		expect(statusKeepingSavedLabels(null, saved, askedAt)).toBeNull();
	});

	it('leaves every read as it came while nothing was saved', () => {
		const read = runningStatus('run-1', [meeting]);

		expect(statusKeepingSavedLabels(read, null, labelSavesLanded())).toBe(read);
	});
});
