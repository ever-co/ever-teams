import { invalidListFields, LIST_BY_NAME, listFieldsOf, listFieldValue, listMapOfFields, tokenOfHash } from './integration-trello-list-map';

const LISTS = [
	{ id: 'l-todo', name: 'To do', closed: false, pos: 1 },
	{ id: 'l-doing', name: 'Doing', closed: false, pos: 2 },
	{ id: 'l-done', name: 'Done', closed: false, pos: 3 }
];
const OPTIONS = [{ name: 'open' }, { name: 'In Progress' }, { name: 'completed' }];

describe('integration-trello-list-map', () => {
	it('turns a stored map into fields for the board lists, and back, leaving "by name" out', () => {
		const fields = listFieldsOf(LISTS, { 'l-doing': 'in-progress', 'l-gone': 'open' });
		expect(fields).toEqual({ 'l-todo': LIST_BY_NAME, 'l-doing': 'in-progress', 'l-done': LIST_BY_NAME });
		expect(listMapOfFields({ ...fields, 'l-done': ' completed ' })).toEqual({ 'l-doing': 'in-progress', 'l-done': 'completed' });
		expect(listFieldValue({ 'l-x': '  ' }, 'l-x')).toBe(LIST_BY_NAME);
	});

	it('names the lists whose status is no status, case ignored, never one left to its name', () => {
		expect(invalidListFields({ 'l-todo': LIST_BY_NAME, 'l-doing': 'in progress', 'l-done': 'finished' }, OPTIONS)).toEqual(['l-done']);
		expect(invalidListFields({ 'l-todo': LIST_BY_NAME }, [])).toEqual([]);
	});

	it('reads the token Trello returns in the fragment, and nothing else', () => {
		expect(tokenOfHash('#token=abc123')).toBe('abc123');
		expect(tokenOfHash('token=abc123&other=1')).toBe('abc123');
		expect(tokenOfHash('#error=denied')).toBeNull();
		expect(tokenOfHash('#token=not safe!')).toBeNull();
		expect(tokenOfHash('')).toBeNull();
	});
});
