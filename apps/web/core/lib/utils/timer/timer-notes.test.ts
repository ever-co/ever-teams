import {
	EMPTY_TIMER_NOTES,
	TIMER_NOTES_MAX_LENGTH,
	entryNotesOf,
	normalizedTimerNotes,
	notesToSendAtStart,
	notesToSendAtStop,
	readTimerNotes,
	timerNotesFor,
	wereNotesLostAtStop
} from './timer-notes';

const RUNNING_LOG = { id: 'log-1', description: 'Review the invoice export' };

describe('normalizedTimerNotes', () => {
	it('trims the text and reads a missing one as empty', () => {
		expect(normalizedTimerNotes('  Call with the client \n')).toBe('Call with the client');
		expect(normalizedTimerNotes(null)).toBe('');
		expect(normalizedTimerNotes(undefined)).toBe('');
	});

	it('cuts the text at the longest notes an entry takes', () => {
		const tooLong = 'a'.repeat(TIMER_NOTES_MAX_LENGTH + 20);

		expect(normalizedTimerNotes(tooLong)).toHaveLength(TIMER_NOTES_MAX_LENGTH);
	});
});

describe('timerNotesFor', () => {
	it('keeps a draft while no timer runs', () => {
		const draft = { text: 'Fix the login page', timeLogId: null };

		expect(timerNotesFor(draft, null)).toBe(draft);
	});

	it('ties a draft to the entry that starts', () => {
		const draft = { text: 'Fix the login page', timeLogId: null };

		expect(timerNotesFor(draft, { id: 'log-1', description: null })).toEqual({
			text: 'Fix the login page',
			timeLogId: 'log-1'
		});
	});

	it('reads the notes of a running entry found without a draft, as after a reload', () => {
		expect(timerNotesFor(EMPTY_TIMER_NOTES, RUNNING_LOG)).toEqual({
			text: 'Review the invoice export',
			timeLogId: 'log-1'
		});
	});

	it('leaves the notes being edited on the running entry alone', () => {
		const edited = { text: 'Review the invoice export, then the totals', timeLogId: 'log-1' };

		expect(timerNotesFor(edited, RUNNING_LOG)).toBe(edited);
	});

	it('keeps notes the member emptied on the running entry empty', () => {
		const emptied = { text: '', timeLogId: 'log-1' };

		expect(timerNotesFor(emptied, RUNNING_LOG)).toBe(emptied);
	});

	it('drops the notes of an entry that ended, so the next start does not reuse them', () => {
		const ended = { text: 'Review the invoice export', timeLogId: 'log-1' };

		expect(timerNotesFor(ended, null)).toBe(EMPTY_TIMER_NOTES);
	});

	it('replaces the notes of an earlier entry with those of the entry now running', () => {
		const earlier = { text: 'Old notes', timeLogId: 'log-0' };

		expect(timerNotesFor(earlier, { id: 'log-1' })).toEqual({ text: '', timeLogId: 'log-1' });
	});
});

describe('notesToSendAtStart', () => {
	it('sends a draft, trimmed', () => {
		expect(notesToSendAtStart({ text: ' Fix the login page ', timeLogId: null })).toBe('Fix the login page');
	});

	it('sends nothing without notes, so a start without notes stays what it was', () => {
		expect(notesToSendAtStart(EMPTY_TIMER_NOTES)).toBeUndefined();
		expect(notesToSendAtStart({ text: '   ', timeLogId: null })).toBeUndefined();
	});

	it('never sends the notes of an earlier entry', () => {
		expect(notesToSendAtStart({ text: 'Old notes', timeLogId: 'log-0' })).toBeUndefined();
	});
});

describe('notesToSendAtStop', () => {
	it('sends nothing when the notes did not change during the run', () => {
		const unchanged = { text: 'Review the invoice export', timeLogId: 'log-1' };

		expect(notesToSendAtStop(unchanged, RUNNING_LOG)).toBeUndefined();
	});

	it('sends the notes changed during the run', () => {
		const edited = { text: 'Review the invoice export, then the totals', timeLogId: 'log-1' };

		expect(notesToSendAtStop(edited, RUNNING_LOG)).toBe('Review the invoice export, then the totals');
	});

	it('sends empty notes when the member removed them during the run', () => {
		expect(notesToSendAtStop({ text: '', timeLogId: 'log-1' }, RUNNING_LOG)).toBe('');
	});

	it('sends nothing for notes that belong to another entry or to no running entry', () => {
		const other = { text: 'Other notes', timeLogId: 'log-0' };

		expect(notesToSendAtStop(other, RUNNING_LOG)).toBeUndefined();
		expect(notesToSendAtStop(other, null)).toBeUndefined();
	});
});

describe('wereNotesLostAtStop', () => {
	it('is false when the stop sent no notes', () => {
		expect(wereNotesLostAtStop(undefined, 'log-1', RUNNING_LOG)).toBe(false);
	});

	it('is false when the stopped entry carries the notes sent', () => {
		const answered = { id: 'log-1', description: 'New notes' };

		expect(wereNotesLostAtStop('New notes', 'log-1', answered)).toBe(false);
	});

	it('is true when the stopped entry kept its earlier notes', () => {
		expect(wereNotesLostAtStop('New notes', 'log-1', RUNNING_LOG)).toBe(true);
	});

	it('is false when the answer does not show the stopped entry', () => {
		expect(wereNotesLostAtStop('New notes', 'log-1', null)).toBe(false);
		expect(wereNotesLostAtStop('New notes', 'log-1', { id: 'log-2', description: 'Else' })).toBe(false);
	});
});

describe('readTimerNotes', () => {
	it('reads a body without notes as valid, with nothing to forward', () => {
		expect(readTimerNotes(undefined)).toEqual({ isValid: true });
	});

	it('reads the notes of a body, empty ones included', () => {
		expect(readTimerNotes('Fix the login page')).toEqual({ isValid: true, description: 'Fix the login page' });
		expect(readTimerNotes('')).toEqual({ isValid: true, description: '' });
	});

	it('refuses notes that are not text or are longer than an entry takes', () => {
		const tooLong = 'a'.repeat(TIMER_NOTES_MAX_LENGTH + 1);

		expect(readTimerNotes(42)).toEqual({ isValid: false });
		expect(readTimerNotes(null)).toEqual({ isValid: false });
		expect(readTimerNotes(tooLong)).toEqual({ isValid: false });
	});
});

describe('entryNotesOf', () => {
	it('gives the notes of an entry, trimmed', () => {
		expect(entryNotesOf({ description: ' Fix the login page ' })).toBe('Fix the login page');
	});

	it('gives nothing for an entry without notes', () => {
		expect(entryNotesOf({})).toBeNull();
		expect(entryNotesOf({ description: null })).toBeNull();
		expect(entryNotesOf({ description: '   ' })).toBeNull();
	});
});
