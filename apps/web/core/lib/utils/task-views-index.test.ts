import { ETaskBuiltInView, ETaskViewVisibility, type ITaskView } from '@/core/types/interfaces/common/task-views';
import { builtInViewLabelKey, builtInViewTextKeysOf, savedViewCountsOf, savedViewsShownOf } from './task-views-index';

const view = (id: string, name: string, visibility: ETaskViewVisibility, description?: string): ITaskView => ({
	id,
	name,
	visibility,
	description
});

const VIEWS = [
	view('1', 'Bugs this sprint', ETaskViewVisibility.PERSONAL),
	view('2', 'Design review', ETaskViewVisibility.SHARED, 'UI tasks waiting for a REVIEW'),
	view('3', 'Release blockers', ETaskViewVisibility.SHARED)
];

const ids = (views: ITaskView[]) => views.map(({ id }) => id);

describe('the views index', () => {
	it('searches the saved views by name and description, whatever the case, in their order', () => {
		expect(ids(savedViewsShownOf(VIEWS, '  review ', 'all'))).toEqual(['2']);
		expect(ids(savedViewsShownOf(VIEWS, 'BUGS', 'all'))).toEqual(['1']);
		expect(ids(savedViewsShownOf(VIEWS, '', 'all'))).toEqual(['1', '2', '3']);
		expect(savedViewsShownOf(VIEWS, 'roadmap', 'all')).toEqual([]);
	});

	it('keeps the personal views or the ones shared with the team, and searches within them', () => {
		expect(ids(savedViewsShownOf(VIEWS, '', 'personal'))).toEqual(['1']);
		expect(ids(savedViewsShownOf(VIEWS, '', 'shared'))).toEqual(['2', '3']);
		expect(ids(savedViewsShownOf(VIEWS, 'bugs', 'shared'))).toEqual([]);
	});

	it('counts the views each filter holds', () => {
		expect(savedViewCountsOf(VIEWS)).toEqual({ all: 3, personal: 1, shared: 2 });
		expect(savedViewCountsOf([])).toEqual({ all: 0, personal: 0, shared: 0 });
	});

	it('names each built-in view, the rule it lists by, and what its list says when empty', () => {
		expect(builtInViewLabelKey(ETaskBuiltInView.THIS_WEEK)).toBe('taskViews.BUILT_IN_THIS_WEEK');
		expect(builtInViewLabelKey(ETaskBuiltInView.DUE_SOON)).toBe('taskViews.BUILT_IN_DUE_SOON');
		expect(builtInViewTextKeysOf(ETaskBuiltInView.MINE)).toEqual({
			rule: 'taskViews.RULE_MINE',
			empty: 'taskViews.EMPTY_MINE'
		});
		expect(builtInViewTextKeysOf(ETaskBuiltInView.OVERDUE)).toEqual({
			rule: 'taskViews.RULE_OVERDUE',
			empty: 'taskViews.EMPTY_OVERDUE'
		});
	});
});
