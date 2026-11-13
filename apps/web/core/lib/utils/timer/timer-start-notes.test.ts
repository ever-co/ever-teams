import { TIMER_NOTES_MAX_LENGTH } from './timer-notes';
import { notesForStartOf, startNotesOf } from './timer-start-notes';

const HANDED_AT = Date.UTC(2026, 10, 12, 9, 0, 0);

describe('startNotesOf', () => {
	it('hands the notes of an entry to the next start of its task, without the spaces around them', () => {
		expect(startNotesOf('task-1', '  Review the invoices ', HANDED_AT)).toEqual({
			taskId: 'task-1',
			description: 'Review the invoices',
			handedAt: HANDED_AT
		});
	});

	it('hands the notes of a long entry cut to the length a start takes, as the timer sends its own', () => {
		const savedNotes = `  ${'a'.repeat(TIMER_NOTES_MAX_LENGTH + 500)}  `;

		const handed = startNotesOf('task-1', savedNotes, HANDED_AT);

		expect(handed?.description).toBe('a'.repeat(TIMER_NOTES_MAX_LENGTH));
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
		expect(notesForStartOf(pending, 'task-1')).toBe('Review the invoices');
	});

	it('gives nothing to the start of another task', () => {
		expect(notesForStartOf(pending, 'task-2')).toBeUndefined();
	});

	it('still gives the notes to a start held back for long, by a daily plan dialog filled in first', () => {
		const anHourLater = { ...pending, handedAt: HANDED_AT - 60 * 60_000 };

		expect(notesForStartOf(anHourLater, 'task-1')).toBe('Review the invoices');
	});

	it('gives nothing when no notes wait', () => {
		expect(notesForStartOf(null, 'task-1')).toBeUndefined();
	});
});
