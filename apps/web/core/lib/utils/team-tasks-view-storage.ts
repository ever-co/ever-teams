import {
	DEFAULT_TEAM_TASKS_VIEW,
	TEAM_TASK_PROPERTIES,
	type TeamTaskProperty,
	type TeamTasksGrouping,
	type TeamTasksLayout,
	type TeamTasksOrdering,
	type TeamTasksScope,
	type TeamTasksViewSettings
} from './team-tasks-view';

const GROUPINGS: TeamTasksGrouping[] = ['status', 'priority', 'assignee', 'project', 'issueType', 'none'];

const LAYOUTS: TeamTasksLayout[] = ['list', 'board', 'timeline', 'calendar', 'table'];

const ORDERINGS: TeamTasksOrdering[] = ['priority', 'updated', 'created', 'dueDate', 'number', 'title'];

/** A saved view may also follow its own manual order; the device's view never does (it has no order to follow). */
export const SAVED_VIEW_ORDERINGS: TeamTasksOrdering[] = [...ORDERINGS, 'manual'];

const SCOPES: TeamTasksScope[] = ['active', 'done', 'all'];

function isObject(value: unknown): value is Record<string, unknown> {
	const isNonNull = value !== null;
	return isNonNull && typeof value === 'object';
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
	const isAllowed = allowed.includes(value as T);
	if (!isAllowed) {
		return fallback;
	}
	return value as T;
}

function booleanOr(value: unknown, fallback: boolean) {
	if (typeof value !== 'boolean') {
		return fallback;
	}
	return value;
}

function propertiesFrom(value: unknown) {
	const properties = { ...DEFAULT_TEAM_TASKS_VIEW.properties };
	if (!isObject(value)) {
		return properties;
	}
	for (const property of TEAM_TASK_PROPERTIES) {
		properties[property] = booleanOr(value[property], properties[property]);
	}
	return properties;
}

/**
 * A stored view from an older version or edited by hand falls back on the defaults field by field. `orderings` are
 * the ones the reader takes (a saved view's include the manual one).
 */
export function viewSettingsFromStorage(
	stored: unknown,
	orderings: readonly TeamTasksOrdering[] = ORDERINGS
): TeamTasksViewSettings {
	if (!isObject(stored)) {
		return DEFAULT_TEAM_TASKS_VIEW;
	}
	const defaults = DEFAULT_TEAM_TASKS_VIEW;
	const layout = pick(stored.layout, LAYOUTS, 'list');
	return {
		// A board or a timeline is kept: a list is what a view without a layout has always been, so nothing else changes.
		...(layout !== 'list' ? { layout } : {}),
		grouping: pick(stored.grouping, GROUPINGS, defaults.grouping),
		ordering: pick(stored.ordering, orderings, defaults.ordering),
		isDescending: booleanOr(stored.isDescending, defaults.isDescending),
		showsSubTasks: booleanOr(stored.showsSubTasks, defaults.showsSubTasks),
		showsEmptyGroups: booleanOr(stored.showsEmptyGroups, defaults.showsEmptyGroups),
		properties: propertiesFrom(stored.properties)
	};
}

export function scopeFromStorage(stored: unknown): TeamTasksScope {
	return pick(stored, SCOPES, 'active');
}

export function collapsedKeysFromStorage(stored: unknown) {
	const isList = Array.isArray(stored);
	if (!isList) {
		return [];
	}
	return (stored as unknown[]).filter((key): key is string => typeof key === 'string');
}

export function withToggledProperty(settings: TeamTasksViewSettings, property: TeamTaskProperty) {
	const isShown = settings.properties[property];
	const properties = { ...settings.properties, [property]: !isShown };
	return { ...settings, properties };
}

/**
 * The settings with a layout picked. A list is what a view without a layout is, so only another layout is written
 * down, and first, where a stored view reads it back: two definitions are compared key by key, in order.
 */
export function withLayout(settings: TeamTasksViewSettings, layout: TeamTasksLayout): TeamTasksViewSettings {
	const next = { ...settings };
	delete next.layout;
	if (layout === 'list') {
		return next;
	}
	return { layout, ...next };
}

/** Whether what the Display popover holds is the default: everything but the layout, picked from the page's switch. */
export function hasDefaultDisplayOptions(settings: TeamTasksViewSettings) {
	const defaults = DEFAULT_TEAM_TASKS_VIEW;
	const sameShape = [
		settings.grouping === defaults.grouping,
		settings.ordering === defaults.ordering,
		settings.isDescending === defaults.isDescending,
		settings.showsSubTasks === defaults.showsSubTasks,
		settings.showsEmptyGroups === defaults.showsEmptyGroups
	];
	const sameProperties = TEAM_TASK_PROPERTIES.every(
		(property) => settings.properties[property] === defaults.properties[property]
	);
	return sameShape.every(Boolean) && sameProperties;
}

export function isDefaultView(settings: TeamTasksViewSettings) {
	const isList = (settings.layout ?? 'list') === 'list';
	return isList && hasDefaultDisplayOptions(settings);
}
