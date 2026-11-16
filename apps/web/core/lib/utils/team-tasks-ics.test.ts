import type { TTask } from '@/core/types/schemas/task/task.schema';
import { teamTasksIcsOf } from './team-tasks-ics';

const NOW = new Date('2026-11-12T09:30:00.000Z');

function taskOf(id: string, title: string, dueDate?: Date | string | null) {
	return { id, title, dueDate } as unknown as TTask;
}

/** The lines of a file, with the folded ones joined back as a calendar app reads them. */
function unfoldedLinesOf(file: string) {
	return file.replaceAll('\r\n ', '').split('\r\n');
}

describe('teamTasksIcsOf', () => {
	it('writes one all-day event on the day each task is due', () => {
		const file = teamTasksIcsOf(
			[
				taskOf('a1', 'Ship the release', new Date('2026-11-12T00:00:00.000Z')),
				taskOf('b2', 'Write the notes', '2026-12-31')
			],
			NOW
		);

		expect(file).not.toBeNull();
		const lines = unfoldedLinesOf(file as string);
		expect(lines[0]).toBe('BEGIN:VCALENDAR');
		expect(lines).toContain('PRODID:-//Ever Teams//Tasks//EN');
		expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(2);
		expect(lines).toContain('UID:task-a1@ever-teams');
		expect(lines).toContain('DTSTAMP:20261112T093000Z');
		expect(lines).toContain('DTSTART;VALUE=DATE:20261112');
		expect(lines).toContain('DTEND;VALUE=DATE:20261113');
		expect(lines).toContain('SUMMARY:Ship the release');
		// The end of an all-day event is the day after, across a month and a year
		expect(lines).toContain('DTSTART;VALUE=DATE:20261231');
		expect(lines).toContain('DTEND;VALUE=DATE:20270101');
	});

	it('ends every line with CRLF, as the format asks', () => {
		const file = teamTasksIcsOf([taskOf('a1', 'Ship', '2026-11-12')], NOW) as string;

		expect(file.endsWith('END:VCALENDAR\r\n')).toBe(true);
		expect(file.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/);
	});

	it('leaves out a task with no due date or one that cannot be read, and writes nothing when none is left', () => {
		expect(teamTasksIcsOf([], NOW)).toBeNull();
		expect(
			teamTasksIcsOf(
				[
					taskOf('a', 'Never'),
					taskOf('b', 'Null', null),
					taskOf('c', 'Broken', 'not a date'),
					taskOf('d', 'Blank', '')
				],
				NOW
			)
		).toBeNull();

		const file = teamTasksIcsOf([taskOf('a', 'Never'), taskOf('b', 'Dated', '2026-11-12')], NOW) as string;
		const summaries = unfoldedLinesOf(file).filter((line) => line.startsWith('SUMMARY:'));
		expect(summaries).toEqual(['SUMMARY:Dated']);
	});

	it('writes a task once when the view lists it twice', () => {
		const file = teamTasksIcsOf(
			[taskOf('a', 'Twice', '2026-11-12'), taskOf('a', 'Twice', '2026-11-12'), taskOf('b', 'Once', '2026-11-13')],
			NOW
		) as string;

		const uids = unfoldedLinesOf(file).filter((line) => line.startsWith('UID:'));
		expect(uids).toEqual(['UID:task-a@ever-teams', 'UID:task-b@ever-teams']);
	});

	it('keeps a title from ending its line or starting a property of its own', () => {
		const file = teamTasksIcsOf(
			[taskOf('a', 'Plan, review; ship\r\nATTENDEE:mailto:someone@example.com', '2026-11-12')],
			NOW
		) as string;

		const lines = unfoldedLinesOf(file);
		expect(lines).toContain(String.raw`SUMMARY:Plan\, review\; ship\nATTENDEE:mailto:someone@example.com`);
		expect(lines.some((line) => line.startsWith('ATTENDEE'))).toBe(false);
	});

	it('keeps only letters, digits and dashes of an id in the UID', () => {
		const file = teamTasksIcsOf([taskOf('x y\r\nz@1', 'Odd id', '2026-11-12')], NOW) as string;

		expect(unfoldedLinesOf(file)).toContain('UID:task-xyz1@ever-teams');
	});

	it('folds a long title over several lines that read back as one', () => {
		const title = 'A very long task title that goes well beyond the seventy-five octets one line may hold in a file';
		const file = teamTasksIcsOf([taskOf('a', title, '2026-11-12')], NOW) as string;

		expect(file).toContain('\r\n ');
		for (const line of file.split('\r\n')) {
			expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
		}
		expect(unfoldedLinesOf(file)).toContain(`SUMMARY:${title}`);
	});

	it('leaves out a date no calendar can read', () => {
		expect(teamTasksIcsOf([taskOf('a', 'Far away', new Date('+275000-01-01T00:00:00.000Z'))], NOW)).toBeNull();
		expect(teamTasksIcsOf([taskOf('a', 'Long ago', new Date('0001-01-01T00:00:00.000Z'))], NOW)).toBeNull();
	});
});
