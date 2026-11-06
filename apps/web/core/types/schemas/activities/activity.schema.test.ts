/**
 * The Timesheet card of the task page parses every row of GET /timesheet/activity with activitySchema, and a single
 * rejected row leaves the card empty. Gauzy answers null for a row with no metadata, time slot or task (the MikroORM
 * branch also sends the null relation itself), the desktop app stores the window data as metaData with no
 * description, the agent stores its keyboard and mouse counts as an array, and SQLite keeps metaData as a string.
 */
// The zod schema modules import each other in a cycle; loading the barrel first (as the app does)
// sets a working evaluation order.
import '@/core/types/schemas';
import { activitySchema } from './activity.schema';

const TENANT_ID = 'ec3b6673-d045-4d59-a307-a79521500a81';
const ORGANIZATION_ID = '06dea660-2426-4c79-a5aa-05f3434287d9';
const EMPLOYEE_ID = '1c1a3b5e-8f2d-4d3a-9b7e-2f6c5d4e3a21';
const TASK_ID = '938816fb-9f91-425a-893a-63468dade965';
const TIME_SLOT_ID = '7b0e4c2a-5d1f-4e8b-a3c6-9d2f1e0b8c47';
const RECORDED_AT = '2026-10-24T09:12:31.000Z';

// An activity row as the TypeORM branch answers it, without its metaData.
const baseRow = {
	id: 'a3f1c2d4-6b7e-4f8a-9c0d-1e2f3a4b5c6d',
	createdAt: RECORDED_AT,
	updatedAt: RECORDED_AT,
	isActive: true,
	isArchived: false,
	archivedAt: null,
	deletedAt: null,
	createdByUserId: null,
	updatedByUserId: null,
	deletedByUserId: null,
	tenantId: TENANT_ID,
	organizationId: ORGANIZATION_ID,
	title: 'Code',
	description: null,
	date: '2026-10-24',
	time: '09:12:31',
	duration: 120,
	type: 'APP',
	source: 'DESKTOP',
	recordedAt: RECORDED_AT,
	employeeId: EMPLOYEE_ID,
	projectId: null,
	timeSlotId: TIME_SLOT_ID,
	taskId: TASK_ID
};

/** The issues zod reports for a row, none when the row is accepted. */
function issuesOf(row: unknown) {
	const result = activitySchema.safeParse(row);
	return result.error?.issues ?? [];
}

describe('activitySchema (rows of GET /timesheet/activity)', () => {
	it('accepts a desktop timer row, whose metaData is the window data with no description', () => {
		const row = { ...baseRow, metaData: { app: 'Code', title: 'activity.schema.ts - ever-teams' } };

		expect(issuesOf(row)).toEqual([]);
	});

	it('accepts a row with no metadata and no time slot, as the MikroORM branch sends a Hubstaff row', () => {
		const row = {
			...baseRow,
			title: 'github.com',
			type: 'URL',
			source: 'WEB_TIMER',
			metaData: null,
			project: null,
			timeSlotId: null,
			timeSlot: null
		};

		expect(issuesOf(row)).toEqual([]);
	});

	it('accepts an agent row, with no task and the keyboard and mouse counts as a metaData array', () => {
		const row = {
			...baseRow,
			title: 'Keyboard and Mouse',
			taskId: null,
			task: null,
			metaData: [{ kbPressCount: 42, mouseLeftClickCount: 7, mouseRightClickCount: 1, mouseMovementsCount: 120 }]
		};

		expect(issuesOf(row)).toEqual([]);
	});

	it('still accepts a SQLite row, whose metaData is a JSON string', () => {
		const row = { ...baseRow, metaData: '{"app":"Code","title":"activity.schema.ts - ever-teams"}' };

		expect(issuesOf(row)).toEqual([]);
	});

	it('parses a row it already accepted to the same output', () => {
		const row = { ...baseRow, metaData: { title: 'Ever Teams', description: null, url: 'https://ever.team' } };

		expect(activitySchema.parse(row)).toEqual({
			...row,
			createdAt: new Date(RECORDED_AT),
			updatedAt: new Date(RECORDED_AT),
			recordedAt: new Date(RECORDED_AT)
		});
	});

	it('control: still rejects a task id that is not a uuid and a metaData of another type', () => {
		expect(issuesOf({ ...baseRow, taskId: 'task-1' })).not.toEqual([]);
		expect(issuesOf({ ...baseRow, metaData: 42 })).not.toEqual([]);
	});
});
