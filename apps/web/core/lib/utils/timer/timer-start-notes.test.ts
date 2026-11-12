import { notesForStartOf, START_NOTES_LIFETIME_MS, startNotesOf } from './timer-start-notes';

const HANDED_AT = Date.UTC(2026, 10, 12, 9, 0, 0);

describe('startNotesOf', () => {
	it('hands the notes of an entry to the next start of its task, without the spaces around them', () => {
		expect(startNotesOf('task-1', '  Review the invoices ', HANDED_AT)).toEqual({
			taskId: 'task-1',
			description: 'Review the invoices',
			handedAt: HANDED_AT
		});
	});

	it('hands nothing for an entry without notes', () => {
		expect(startNotesOf('task-1', '   ', HANDED_AT)).toBeNull();
		expect(startNotesOf('task-1', null, HANDED_AT)).toBeNull();
		expect(startNotesOf('task-1', undefined, HANDED_AT)).toBeNull();
	});
});

describe('notesForStartOf', () => {
	const pending = { taskId: 'task-1', description: 'Review the invoices', handedAt: HANDED_AT };

	it('gives the notes to the start of their task', () => {
		expect(notesForStartOf(pending, 'task-1', HANDED_AT + 3_000)).toBe('Review the invoices');
	});

	it('gives nothing to the start of another task', () => {
		expect(notesForStartOf(pending, 'task-2', HANDED_AT + 3_000)).toBeUndefined();
	});

	it('gives nothing once the notes waited longer than a held start can take', () => {
		const lastMoment = HANDED_AT + START_NOTES_LIFETIME_MS;

		expect(notesForStartOf(pending, 'task-1', lastMoment)).toBe('Review the invoices');
		expect(notesForStartOf(pending, 'task-1', lastMoment + 1)).toBeUndefined();
	});

	it('gives nothing when no notes wait', () => {
		expect(notesForStartOf(null, 'task-1', HANDED_AT)).toBeUndefined();
	});
});
