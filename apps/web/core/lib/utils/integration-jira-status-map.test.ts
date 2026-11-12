import {
	categoryOfStatus,
	effectiveCategoryMap,
	invalidCategories,
	invalidStatusFields,
	STATUS_BY_CATEGORY,
	statusFieldsOf,
	statusMapOf,
	statusOverrideCount
} from './integration-jira-status-map';

const STATUSES = [
	{ id: '1', name: 'To Do', statusCategory: { key: 'new' } },
	{ id: '3', name: 'In Review', statusCategory: { key: 'indeterminate' } },
	{ id: '10001', name: 'Done', statusCategory: { key: 'done' } }
];
const OPTIONS = [{ name: 'open' }, { name: 'In Progress' }, { name: 'completed' }, { name: 'in-review' }];

describe('integration-jira-status-map', () => {
	it('fills the categories from the platform defaults, then the mapping, skipping blanks', () => {
		expect(
			effectiveCategoryMap({ indeterminate: 'doing', done: '' }, { indeterminate: 'In Progress', new: '  ' })
		).toEqual({
			new: 'open',
			indeterminate: 'In Progress',
			done: 'completed'
		});
		expect(effectiveCategoryMap(null, null)).toEqual({
			new: 'open',
			indeterminate: 'in-progress',
			done: 'completed'
		});
	});

	it('turns a stored map into one field per project status, and back, leaving "by its category" out', () => {
		const fields = statusFieldsOf(STATUSES, { done: 'completed', 'status:3': 'in-review', 'status:999': 'open' });
		expect(fields).toEqual({ '1': STATUS_BY_CATEGORY, '3': 'in-review', '10001': STATUS_BY_CATEGORY });
		const map = statusMapOf(
			{ new: 'open', indeterminate: ' In Progress ', done: 'completed' },
			{ ...fields, '10001': ' completed ', bogus: 'open' }
		);
		// A status the project no longer has (999) and a key that is no status id are left out.
		expect(map).toEqual({
			new: 'open',
			indeterminate: 'In Progress',
			done: 'completed',
			'status:3': 'in-review',
			'status:10001': 'completed'
		});
	});

	it('counts the statuses named on their own', () => {
		expect(statusOverrideCount({ new: 'open', 'status:3': 'in-review', 'status:4': ' ' })).toBe(1);
		expect(statusOverrideCount(null)).toBe(0);
	});

	it('names the categories and the statuses whose value is no status, case ignored, never one left to its category', () => {
		expect(invalidCategories({ new: 'OPEN', indeterminate: 'doing', done: '' }, OPTIONS)).toEqual([
			'indeterminate',
			'done'
		]);
		expect(
			invalidStatusFields({ '1': STATUS_BY_CATEGORY, '3': 'In-Review', '10001': 'finished' }, OPTIONS)
		).toEqual(['10001']);
		expect(invalidStatusFields({ '1': STATUS_BY_CATEGORY }, [])).toEqual([]);
	});

	it('reads a status category only when it is one of the three', () => {
		expect(categoryOfStatus(STATUSES[1])).toBe('indeterminate');
		expect(categoryOfStatus({ id: '9', name: 'Odd', statusCategory: { key: 'undefined' } })).toBeNull();
	});
});
