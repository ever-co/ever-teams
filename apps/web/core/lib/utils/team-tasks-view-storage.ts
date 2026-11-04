import {
	DEFAULT_TEAM_TASKS_VIEW,
	TEAM_TASK_PROPERTIES,
	type TeamTaskProperty,
	type TeamTasksGrouping,
	type TeamTasksOrdering,
	type TeamTasksScope,
	type TeamTasksViewSettings
} from './team-tasks-view';

const GROUPINGS: TeamTasksGrouping[] = ['status', 'priority', 'assignee', 'project', 'issueType', 'none'];

const ORDERINGS: TeamTasksOrdering[] = ['priority', 'updated', 'created', 'dueDate', 'number', 'title'];

const SCOPES: TeamTasksScope[] = ['active', 'done', 'all'];

function isObject(value: unknown): value is Record<string, unknown> {
	const isNonNull = value !== null;
	return isNonNull && typeof value === 'object';
}

function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
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

/** A stored view from an older version or edited by hand falls back on the defaults field by field. */
export function viewSettingsFromStorage(stored: unknown): TeamTasksViewSettings {
	if (!isObject(stored)) {
		return DEFAULT_TEAM_TASKS_VIEW;
	}
	const defaults = DEFAULT_TEAM_TASKS_VIEW;
	return {
		grouping: pick(stored.grouping, GROUPINGS, defaults.grouping),
		ordering: pick(stored.ordering, ORDERINGS, defaults.ordering),
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

export function isDefaultView(settings: TeamTasksViewSettings) {
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
