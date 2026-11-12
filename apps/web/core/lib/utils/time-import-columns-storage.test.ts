import { storedColumnsChoiceOf, withColumnsChoiceKept } from './time-import-columns-storage';
import { NO_TIME_IMPORT_COLUMNS, type TimeImportColumnsChoice } from './time-import-sheet';

const HEADERS = ['Datum', 'Beginn', 'Ende', 'Kunde'];

const CHOICE: TimeImportColumnsChoice = {
	mapping: { ...NO_TIME_IMPORT_COLUMNS, date: 0, startTime: 1, endTime: 2 },
	dateOrder: 'dayFirst'
};

describe('the columns this browser keeps for a time import', () => {
	it('finds nothing in a storage that is empty or holds something else', () => {
		expect(storedColumnsChoiceOf(null, HEADERS)).toBeNull();
		expect(storedColumnsChoiceOf('columns', HEADERS)).toBeNull();
		expect(storedColumnsChoiceOf([1, null, { headers: 'Datum' }], HEADERS)).toBeNull();
	});

	it('gives the choice back for the next file of the same headers, letter case and spaces aside', () => {
		const stored = withColumnsChoiceKept(null, HEADERS, CHOICE);

		expect(storedColumnsChoiceOf(stored, [' datum', 'BEGINN', 'Ende ', 'kunde'])).toEqual(CHOICE);
	});

	it('gives nothing back for a file of other headers', () => {
		const stored = withColumnsChoiceKept(null, HEADERS, CHOICE);

		expect(storedColumnsChoiceOf(stored, ['Datum', 'Beginn', 'Ende'])).toBeNull();
		expect(storedColumnsChoiceOf(stored, ['Beginn', 'Datum', 'Ende', 'Kunde'])).toBeNull();
	});

	it('reads a kept column the file does not have, or a date format it does not know, as none', () => {
		const edited = [
			{
				headers: ['datum', 'beginn', 'ende', 'kunde'],
				mapping: { date: 0, startTime: 9, endTime: '2', notes: -1 },
				dateOrder: 'sideways'
			}
		];

		expect(storedColumnsChoiceOf(edited, HEADERS)).toEqual({
			mapping: { ...NO_TIME_IMPORT_COLUMNS, date: 0 },
			dateOrder: null
		});
	});

	it('keeps one choice per set of headers, the latest first, ten at most', () => {
		let stored: unknown = null;
		for (let index = 0; index < 11; index += 1) {
			stored = withColumnsChoiceKept(stored, [`Date ${index}`, 'Start', 'End'], CHOICE);
		}
		const replaced = withColumnsChoiceKept(stored, ['Date 5', 'Start', 'End'], { ...CHOICE, dateOrder: null });

		expect(replaced).toHaveLength(10);
		expect(replaced[0]).toMatchObject({ headers: ['date 5', 'start', 'end'], dateOrder: null });
		expect(storedColumnsChoiceOf(replaced, ['Date 0', 'Start', 'End'])).toBeNull();
		expect(storedColumnsChoiceOf(replaced, ['Date 10', 'Start', 'End'])).toEqual(CHOICE);
	});
});
