import type { DottedLanguageObjectStringPaths } from 'next-intl';
import { ETaskBuiltInView, ETaskViewVisibility, type ITaskView } from '@/core/types/interfaces/common/task-views';

/** The i18n key of a built-in view's name. */
export function builtInViewLabelKey(key: string): DottedLanguageObjectStringPaths {
	const name = key.toUpperCase().split('-').join('_');
	return `taskViews.BUILT_IN_${name}` as DottedLanguageObjectStringPaths;
}

/** Which saved views the index lists: all of them, the person's own, or the ones shared with the team. */
export type SavedViewsFilter = 'all' | 'personal' | 'shared';

function isPersonal(view: ITaskView): boolean {
	return view.visibility === ETaskViewVisibility.PERSONAL;
}

/** The saved views a search and a visibility filter keep, in the order they came (the sidebar's). */
export function savedViewsShownOf(views: readonly ITaskView[], query: string, filter: SavedViewsFilter): ITaskView[] {
	const needle = query.trim().toLocaleLowerCase();
	return views.filter((view) => {
		const matchesFilter = filter === 'all' || (filter === 'personal' ? isPersonal(view) : !isPersonal(view));
		if (!matchesFilter) {
			return false;
		}
		if (!needle) {
			return true;
		}
		const text = `${view.name} ${view.description ?? ''}`.toLocaleLowerCase();
		return text.includes(needle);
	});
}

/** How many saved views each filter holds, for the counts beside the filter. */
export function savedViewCountsOf(views: readonly ITaskView[]): Record<SavedViewsFilter, number> {
	const personal = views.filter(isPersonal).length;
	return { all: views.length, personal, shared: views.length - personal };
}

const BUILT_IN_TEXT_KEYS: Record<
	ETaskBuiltInView,
	{ rule: DottedLanguageObjectStringPaths; empty: DottedLanguageObjectStringPaths }
> = {
	[ETaskBuiltInView.MINE]: { rule: 'taskViews.RULE_MINE', empty: 'taskViews.EMPTY_MINE' },
	[ETaskBuiltInView.THIS_WEEK]: { rule: 'taskViews.RULE_THIS_WEEK', empty: 'taskViews.EMPTY_THIS_WEEK' },
	[ETaskBuiltInView.OVERDUE]: { rule: 'taskViews.RULE_OVERDUE', empty: 'taskViews.EMPTY_OVERDUE' },
	[ETaskBuiltInView.DUE_SOON]: { rule: 'taskViews.RULE_DUE_SOON', empty: 'taskViews.EMPTY_DUE_SOON' }
};

/**
 * What a built-in view keeps, in one line (the rule Ever Gauzy applies, `tasks/built-in-views.ts`), and what its
 * list says when nothing matches it.
 */
export function builtInViewTextKeysOf(key: ETaskBuiltInView) {
	return BUILT_IN_TEXT_KEYS[key];
}
