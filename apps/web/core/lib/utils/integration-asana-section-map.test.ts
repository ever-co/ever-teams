import { invalidSectionFields, SECTION_BY_NAME, sectionFieldsOf, sectionFieldValue, sectionMapOfFields } from './integration-asana-section-map';

const SECTIONS = [
	{ gid: 's-todo', name: 'To do' },
	{ gid: 's-doing', name: 'Doing' },
	{ gid: 's-done', name: 'Done' }
];
const OPTIONS = [{ name: 'open' }, { name: 'In Progress' }, { name: 'completed' }];

describe('integration-asana-section-map', () => {
	it('turns a stored map into fields for the project sections, and back, leaving "by name" out', () => {
		const fields = sectionFieldsOf(SECTIONS, { 's-doing': 'in-progress', 's-gone': 'open' });
		expect(fields).toEqual({ 's-todo': SECTION_BY_NAME, 's-doing': 'in-progress', 's-done': SECTION_BY_NAME });
		expect(sectionMapOfFields({ ...fields, 's-done': ' completed ' })).toEqual({ 's-doing': 'in-progress', 's-done': 'completed' });
		expect(sectionFieldValue({ 's-x': '  ' }, 's-x')).toBe(SECTION_BY_NAME);
	});

	it('names the sections whose status is no status, case ignored, never one left to its name', () => {
		expect(invalidSectionFields({ 's-todo': SECTION_BY_NAME, 's-doing': 'in progress', 's-done': 'finished' }, OPTIONS)).toEqual(['s-done']);
		expect(invalidSectionFields({ 's-todo': SECTION_BY_NAME }, [])).toEqual([]);
	});
});
