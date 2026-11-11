import {
	catalogGroupsOf,
	LABEL_CATALOG,
	type LabelCategoryKey,
	labelNameKeyOf,
	labelNameKeysOf
} from './task-label-catalog';

const CATEGORY_NAMES: Record<LabelCategoryKey, string> = {
	type: 'Task type',
	priority: 'Priority',
	workflow: 'Status & workflow',
	area: 'Technical area',
	release: 'Release & compatibility',
	feedback: 'Customer & product feedback',
	project: 'Project management'
};
const categoryNameOf = (key: LabelCategoryKey) => CATEGORY_NAMES[key];

describe('LABEL_CATALOG', () => {
	it("holds the issue's seven categories and their 70 labels, each with a hex colour", () => {
		expect(LABEL_CATALOG.map((category) => [category.key, category.labels.length])).toEqual([
			['type', 15],
			['priority', 5],
			['workflow', 12],
			['area', 16],
			['release', 8],
			['feedback', 6],
			['project', 8]
		]);
		for (const { labels } of LABEL_CATALOG) {
			for (const { color } of labels) {
				expect(color).toMatch(/^#[0-9A-F]{6}$/);
			}
		}
	});

	it('names every label once, as a team may have each name once', () => {
		const keys = LABEL_CATALOG.flatMap((category) => category.labels.map((item) => labelNameKeyOf(item.name)));

		expect(new Set(keys).size).toBe(keys.length);
	});
});

describe('labelNameKeyOf', () => {
	it('reads a name trimmed, in lower case, with dashes and runs of spaces as one space', () => {
		expect(labelNameKeyOf('  Follow-up ')).toBe('follow up');
		expect(labelNameKeyOf('follow   UP')).toBe('follow up');
		expect(labelNameKeyOf(null)).toBe('');
		expect(labelNameKeysOf(['Bug', ' ', null])).toEqual(new Set(['bug']));
	});

	it('trims after the dashes become spaces, so a leading or trailing dash tells no names apart', () => {
		expect(labelNameKeyOf('Bug-')).toBe('bug');
		expect(labelNameKeyOf('-bug ')).toBe('bug');
	});
});

describe('catalogGroupsOf', () => {
	it('lists every category without a search', () => {
		const groups = catalogGroupsOf('', new Set(), categoryNameOf);

		expect(groups.map((group) => group.key)).toEqual([
			'type',
			'priority',
			'workflow',
			'area',
			'release',
			'feedback',
			'project'
		]);
	});

	it('keeps the labels whose name matches, and a whole category whose name does', () => {
		const byName = catalogGroupsOf('review', new Set(), categoryNameOf);
		expect(byName.flatMap((group) => group.entries.map((entry) => entry.label.name))).toEqual(['Needs Review']);

		const byCategory = catalogGroupsOf('priority', new Set(), categoryNameOf);
		expect(byCategory.map((group) => group.key)).toEqual(['priority']);
		expect(byCategory[0].entries).toHaveLength(5);
	});

	it('marks the labels the team has already, whatever their case or dashes', () => {
		const groups = catalogGroupsOf('', labelNameKeysOf(['bug', 'Follow up']), categoryNameOf);
		const added = groups.flatMap((group) =>
			group.entries.filter((entry) => entry.isAdded).map((entry) => entry.label.name)
		);

		expect(added).toEqual(['Bug', 'Follow-up']);
	});

	it('has nothing for a search no label or category matches', () => {
		expect(catalogGroupsOf('zzz', new Set(), categoryNameOf)).toEqual([]);
	});
});
