import { timeImportReadingOf } from './time-import-columns';
import {
	chooseImportLabels,
	importLabelIdsOf,
	importLabelNamesOf,
	importLabelNamesOfRows,
	manualTimeRequestOf,
	type TimeImportEntry,
	type TimeImportRow
} from './time-import-rows';

const SCOPE = { tenantId: 'tenant', organizationId: 'organization', organizationTeamId: 'team' };

const entryOf = (labelNames: string[]): TimeImportEntry => ({
	employeeId: 'marie',
	memberName: null,
	start: new Date('2026-11-03T09:00:00.000Z'),
	end: new Date('2026-11-03T11:00:00.000Z'),
	seconds: 7200,
	projectId: null,
	projectName: null,
	taskId: null,
	taskTitle: null,
	notes: '',
	isBillable: false,
	labelNames
});

const rowOf = (labelNames: string[]): TimeImportRow =>
	({ row: 2, cells: {}, entry: entryOf(labelNames), problems: [] }) as unknown as TimeImportRow;

describe('the labels of imported time entries (#5368)', () => {
	it('reads a Tags or Labels column as the entry labels, in place of leaving it out', () => {
		const reading = timeImportReadingOf('date,start time,duration,tags\n2026-11-03,09:00,2h,"meeting; Support"\n');
		if (reading.kind !== 'sheet') {
			throw new Error(reading.kind);
		}

		expect(reading.sheet.ignoredHeaders).toEqual([]);
		expect(reading.sheet.rows[0].cells.labels).toBe('meeting; Support');
	});

	it('splits a labels cell on commas and semicolons, each name once', () => {
		expect(importLabelNamesOf(' meeting, Support ;support,, design ')).toEqual(['meeting', 'Support', 'design']);
		expect(importLabelNamesOf('')).toEqual([]);
	});

	it("files the entry under the team's labels it names, in any case, and leaves out a name the team has none of", () => {
		const labelIdsByName = new Map([
			['meeting', 'label-meeting'],
			['support', 'label-support']
		]);
		const entry = entryOf(['Meeting', 'support', 'unknown']);

		expect(importLabelIdsOf(entry, labelIdsByName)).toEqual(['label-meeting', 'label-support']);
		expect(manualTimeRequestOf(entry, { ...SCOPE, labelIdsByName }).tags).toEqual([
			'label-meeting',
			'label-support'
		]);
	});

	it('writes an entry without labels as before: no tags in the request', () => {
		expect(manualTimeRequestOf(entryOf([]), SCOPE)).not.toHaveProperty('tags');
		expect(manualTimeRequestOf(entryOf(['meeting']), SCOPE)).not.toHaveProperty('tags');
	});

	it('gathers the names the rows use, the first spelling of each', () => {
		expect(importLabelNamesOfRows([rowOf(['Meeting']), rowOf(['meeting', 'design'])])).toEqual([
			'Meeting',
			'design'
		]);
	});

	it('finds the labels the team has, and creates the others when the role may add labels', async () => {
		const create = jest.fn(async (name: string) => `created-${name}`);

		const choice = await chooseImportLabels(['Meeting', 'design'], [{ id: 'label-meeting', name: 'meeting' }], {
			isSupported: true,
			canCreate: true,
			create
		});

		expect(create).toHaveBeenCalledTimes(1);
		expect(Object.fromEntries(choice.labelIdsByName)).toEqual({
			meeting: 'label-meeting',
			design: 'created-design'
		});
		expect(choice.notAttached).toEqual([]);
	});

	it('lists as not attached a label the role may not add, or one whose creation failed, and goes on', async () => {
		const refused = await chooseImportLabels(['design'], [], {
			isSupported: true,
			canCreate: false,
			create: jest.fn()
		});
		const failed = await chooseImportLabels(['design'], [], {
			isSupported: true,
			canCreate: true,
			create: jest.fn(async () => {
				throw new Error('refused');
			})
		});

		expect(refused.notAttached).toEqual(['design']);
		expect(failed.notAttached).toEqual(['design']);
	});

	it('attaches nothing against an API without labels on entries, and says so', async () => {
		const create = jest.fn();

		const choice = await chooseImportLabels(['meeting'], [{ id: 'label-meeting', name: 'meeting' }], {
			isSupported: false,
			canCreate: true,
			create
		});

		expect(create).not.toHaveBeenCalled();
		expect(choice.labelIdsByName.size).toBe(0);
		expect(choice.notAttached).toEqual(['meeting']);
	});
});
