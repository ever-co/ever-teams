import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	supportedEntryLabelsOf,
	NO_LABEL_VALUE,
	entryLabelGroupsOverlap,
	entryLabelNamesOf,
	entryLabelsOf,
	entryLabelsOfLogs,
	groupLogsByEntryLabel,
	labelNamesOf,
	logMatchesEntryLabels
} from './time-log-labels';

const meeting = { id: 'meeting', name: 'meeting', color: '#f59e0b' };
const support = { id: 'support', name: 'support', color: '#10b981' };
const design = { id: 'design', name: 'Design', color: null };

// Marie's Tuesday on "Q4 support": 2 h of meetings, 3 h of support and design, 3 h without a label
const meetingLog = { id: 'a', duration: 7200, tags: [meeting] } as unknown as ITimeLog;
const supportLog = { id: 'b', duration: 10800, tags: [support, design] } as unknown as ITimeLog;
const unlabelledLog = { id: 'c', duration: 10800, tags: [] } as unknown as ITimeLog;
const answeredWithoutLabels = { id: 'd', duration: 600 } as unknown as ITimeLog;

describe('time entry labels', () => {
	it("reads an entry's own labels, each once, by name, and none when the API answered none", () => {
		expect(entryLabelsOf({ tags: [support, design, support] } as unknown as ITimeLog)).toEqual([
			{ id: 'design', name: 'Design', color: null },
			{ id: 'support', name: 'support', color: '#10b981' }
		]);
		expect(entryLabelsOf(answeredWithoutLabels)).toEqual([]);
		expect(entryLabelsOf(null)).toEqual([]);
	});

	it('lists the labels the entries carry between them', () => {
		expect(entryLabelsOfLogs([meetingLog, supportLog, unlabelledLog]).map((label) => label.id)).toEqual([
			'design',
			'meeting',
			'support'
		]);
	});

	it('keeps an entry carrying a picked label, or none with "No label"', () => {
		expect(logMatchesEntryLabels(meetingLog, [])).toBe(true);
		expect(logMatchesEntryLabels(meetingLog, ['meeting'])).toBe(true);
		expect(logMatchesEntryLabels(supportLog, ['meeting'])).toBe(false);
		expect(logMatchesEntryLabels(supportLog, ['design'])).toBe(true);
		expect(logMatchesEntryLabels(unlabelledLog, ['meeting'])).toBe(false);
		expect(logMatchesEntryLabels(unlabelledLog, [NO_LABEL_VALUE])).toBe(true);
		expect(logMatchesEntryLabels(meetingLog, [NO_LABEL_VALUE])).toBe(false);
	});

	it('counts an entry with two labels under each, and gathers the rest under "No label"', () => {
		const groups = groupLogsByEntryLabel([meetingLog, supportLog, unlabelledLog, answeredWithoutLabels]);

		expect(groups.map((group) => [group.key, group.logs.map((log) => log.id)])).toEqual([
			['design', ['b']],
			['meeting', ['a']],
			['support', ['b']],
			[NO_LABEL_VALUE, ['c', 'd']]
		]);
		expect(groups[3].label).toBeNull();
	});

	it('says when the groups overlap', () => {
		expect(entryLabelGroupsOverlap([meetingLog, unlabelledLog])).toBe(false);
		expect(entryLabelGroupsOverlap([meetingLog, supportLog])).toBe(true);
	});

	it('writes the labels of an entry as one export cell', () => {
		expect(entryLabelNamesOf(supportLog)).toBe('Design, support');
		expect(entryLabelNamesOf(unlabelledLog)).toBe('');
	});

	it('writes the same cell for the same labels in any order, each once', () => {
		expect(labelNamesOf([support, design, support])).toBe('Design, support');
		expect(labelNamesOf([design, support])).toBe('Design, support');
		expect(labelNamesOf([])).toBe('');
	});

	it("keeps a link's entry labels only where the API stores labels on entries (#5368)", () => {
		expect(supportedEntryLabelsOf(['meeting', 'no-label'], true)).toEqual(['meeting', 'no-label']);
		expect(supportedEntryLabelsOf(['meeting'], false)).toEqual([]);
	});
});
