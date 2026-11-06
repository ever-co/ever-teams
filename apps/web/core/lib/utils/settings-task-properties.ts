import { ETaskStatusName } from '@/core/types/generics/enums/task';

export type TaskPropertySettingsKind = 'status' | 'priority' | 'size' | 'label' | 'issueType' | 'version';

/** Gauzy files a status under one workflow category (`isTodo`, `isInProgress`, `isDone`); `other` holds the rest. */
export type StatusGroupId = 'todo' | 'inProgress' | 'done' | 'other';

export const STATUS_GROUP_ORDER: ReadonlyArray<StatusGroupId> = ['todo', 'inProgress', 'done', 'other'];

export interface PropertyListItem {
	id: string;
	name: string;
	/** Gauzy stores some names with dashes. */
	label: string;
	color: string | null;
	/** The stored icon path, `ever-icons/<group>/<name>.svg`, or a full URL. */
	icon: string | null;
	isDefault: boolean;
	isSystem: boolean;
	order: number | null;
	groupId: StatusGroupId | null;
	/** The team the row belongs to; a row of no team is a default shared by every team. */
	organizationTeamId: string | null;
}

export interface PropertyDraft {
	name: string;
	color: string | null;
	icon: string | null;
	template: ETaskStatusName | null;
}

export interface StatusWorkflowFlags {
	isTodo?: boolean | null;
	isInProgress?: boolean | null;
	isDone?: boolean | null;
}

export interface PropertySource {
	id: string;
	name?: string | null;
	color?: string | null;
	icon?: string | null;
	isDefault?: boolean | null;
	isSystem?: boolean | null;
	organizationTeamId?: string | null;
}

export interface OrderedPropertySource extends PropertySource, StatusWorkflowFlags {
	order?: number | null;
}

export const TASK_PROPERTY_COLOR_SWATCHES: ReadonlyArray<string> = [
	'#6366F1',
	'#0EA5E9',
	'#14B8A6',
	'#22C55E',
	'#EAB308',
	'#F97316',
	'#EF4444',
	'#EC4899',
	'#A855F7',
	'#64748B'
];

export function defaultSwatchFor(itemCount: number): string {
	const index = itemCount % TASK_PROPERTY_COLOR_SWATCHES.length;
	return TASK_PROPERTY_COLOR_SWATCHES[index];
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
	return HEX_COLOR.test(value.trim());
}

export function isSameColor(left: string | null, right: string | null): boolean {
	if (!left) {
		return false;
	}
	if (!right) {
		return false;
	}
	return left.toLowerCase() === right.toLowerCase();
}

export function propertyLabelOf(name: string | null | undefined): string {
	const stored = name ?? '';
	return stored.split('-').join(' ');
}

export function isPropertyNameFilled(name: string): boolean {
	return name.trim().length > 0;
}

function firstTrueGroup(flags: StatusWorkflowFlags): StatusGroupId {
	if (flags.isTodo) {
		return 'todo';
	}
	if (flags.isInProgress) {
		return 'inProgress';
	}
	if (flags.isDone) {
		return 'done';
	}
	return 'other';
}

function hasWorkflowFlag(flags: StatusWorkflowFlags): boolean {
	const group = firstTrueGroup(flags);
	return group !== 'other';
}

export function hasStatusCategories(statuses: ReadonlyArray<StatusWorkflowFlags>): boolean {
	return statuses.some(hasWorkflowFlag);
}

function orderValueOf(order: number | null | undefined): number {
	if (typeof order === 'number') {
		return order;
	}
	return Number.MAX_SAFE_INTEGER;
}

function byOrder(first: OrderedPropertySource, second: OrderedPropertySource): number {
	return orderValueOf(first.order) - orderValueOf(second.order);
}

function numberOrNull(value: number | null | undefined): number | null {
	if (typeof value === 'number') {
		return value;
	}
	return null;
}

export function propertyItemOf(source: OrderedPropertySource, groupId: StatusGroupId | null = null): PropertyListItem {
	const name = source.name ?? '';
	return {
		id: source.id,
		name,
		label: propertyLabelOf(name),
		color: source.color ?? null,
		icon: source.icon ?? null,
		isDefault: Boolean(source.isDefault),
		isSystem: Boolean(source.isSystem),
		order: numberOrNull(source.order),
		groupId,
		organizationTeamId: source.organizationTeamId ?? null
	};
}

export function propertyItemsOf(sources: ReadonlyArray<OrderedPropertySource>): PropertyListItem[] {
	return sources.map((source) => propertyItemOf(source));
}

export function statusItemsOf(statuses: ReadonlyArray<OrderedPropertySource>): PropertyListItem[] {
	const sorted = [...statuses].sort(byOrder);
	return sorted.map((status) => propertyItemOf(status, firstTrueGroup(status)));
}

export function itemsOfGroup(items: ReadonlyArray<PropertyListItem>, groupId: StatusGroupId): PropertyListItem[] {
	return items.filter((item) => item.groupId === groupId);
}

/** Gauzy reads `template` on creation only, to file the status under a workflow category; an update ignores it. */
export const STATUS_TEMPLATES: ReadonlyArray<ETaskStatusName> = [
	ETaskStatusName.BACKLOG,
	ETaskStatusName.OPEN,
	ETaskStatusName.IN_PROGRESS,
	ETaskStatusName.READY_FOR_REVIEW,
	ETaskStatusName.IN_REVIEW_STATUS,
	ETaskStatusName.BLOCKED,
	ETaskStatusName.DONE,
	ETaskStatusName.COMPLETED,
	ETaskStatusName.CANCELLED,
	ETaskStatusName.CUSTOM
];

export type StatusTemplateKey =
	| 'backlog'
	| 'open'
	| 'inProgress'
	| 'readyForReview'
	| 'inReview'
	| 'blocked'
	| 'done'
	| 'completed'
	| 'cancelled'
	| 'custom';

const STATUS_TEMPLATE_KEYS: Partial<Record<ETaskStatusName, StatusTemplateKey>> = {
	[ETaskStatusName.BACKLOG]: 'backlog',
	[ETaskStatusName.OPEN]: 'open',
	[ETaskStatusName.IN_PROGRESS]: 'inProgress',
	[ETaskStatusName.READY_FOR_REVIEW]: 'readyForReview',
	[ETaskStatusName.IN_REVIEW_STATUS]: 'inReview',
	[ETaskStatusName.BLOCKED]: 'blocked',
	[ETaskStatusName.DONE]: 'done',
	[ETaskStatusName.COMPLETED]: 'completed',
	[ETaskStatusName.CANCELLED]: 'cancelled',
	[ETaskStatusName.CUSTOM]: 'custom'
};

export function statusTemplateKeyOf(template: ETaskStatusName): StatusTemplateKey {
	return STATUS_TEMPLATE_KEYS[template] ?? 'custom';
}

const TEMPLATE_GROUPS: Partial<Record<ETaskStatusName, StatusGroupId>> = {
	[ETaskStatusName.BACKLOG]: 'todo',
	[ETaskStatusName.OPEN]: 'todo',
	[ETaskStatusName.IN_PROGRESS]: 'inProgress',
	[ETaskStatusName.READY_FOR_REVIEW]: 'inProgress',
	[ETaskStatusName.IN_REVIEW_STATUS]: 'inProgress',
	[ETaskStatusName.BLOCKED]: 'inProgress',
	[ETaskStatusName.DONE]: 'done',
	[ETaskStatusName.COMPLETED]: 'done'
};

export function groupOfTemplate(template: ETaskStatusName | null): StatusGroupId {
	if (!template) {
		return 'other';
	}
	return TEMPLATE_GROUPS[template] ?? 'other';
}

const GROUP_TEMPLATES: Record<StatusGroupId, ETaskStatusName | null> = {
	todo: ETaskStatusName.OPEN,
	inProgress: ETaskStatusName.IN_PROGRESS,
	done: ETaskStatusName.DONE,
	other: null
};

export function templateOfGroup(groupId: StatusGroupId | null): ETaskStatusName | null {
	if (!groupId) {
		return null;
	}
	return GROUP_TEMPLATES[groupId];
}

/** `TaskPropertyIcon` draws the category glyph from a status name. */
export const STATUS_GROUP_GLYPH: Record<StatusGroupId, string> = {
	todo: 'open',
	inProgress: 'in progress',
	done: 'done',
	other: 'backlog'
};

type IconGroup = 'task-statuses' | 'task-sizes' | 'task-priorities';

export interface PropertyIconOption {
	group: IconGroup;
	name: string;
	path: string;
}

const STATUS_ICONS = ['open', 'in-progress', 'ready', 'in-review', 'blocked', 'completed'];
const SIZE_ICONS = ['x-large', 'large', 'medium', 'small', 'tiny'];
const PRIORITY_ICONS = ['urgent', 'high', 'medium', 'low'];

const ICON_LIBRARY: Record<Exclude<TaskPropertySettingsKind, 'version'>, Record<IconGroup, string[]>> = {
	status: {
		'task-statuses': [...STATUS_ICONS, 'backlog'],
		'task-sizes': SIZE_ICONS,
		'task-priorities': PRIORITY_ICONS
	},
	priority: { 'task-statuses': STATUS_ICONS, 'task-sizes': ['x-large'], 'task-priorities': PRIORITY_ICONS },
	size: { 'task-statuses': STATUS_ICONS, 'task-sizes': SIZE_ICONS, 'task-priorities': PRIORITY_ICONS },
	label: { 'task-statuses': STATUS_ICONS, 'task-sizes': ['x-large'], 'task-priorities': PRIORITY_ICONS },
	issueType: { 'task-statuses': STATUS_ICONS, 'task-sizes': SIZE_ICONS, 'task-priorities': PRIORITY_ICONS }
};

export const ICON_GROUP_ORDER: ReadonlyArray<IconGroup> = ['task-statuses', 'task-sizes', 'task-priorities'];

export function iconPathOf(group: IconGroup, name: string): string {
	return `ever-icons/${group}/${name}.svg`;
}

export function propertyIconOptions(kind: TaskPropertySettingsKind): PropertyIconOption[] {
	if (kind === 'version') {
		return [];
	}
	const library = ICON_LIBRARY[kind];
	const options: PropertyIconOption[] = [];
	for (const group of ICON_GROUP_ORDER) {
		for (const name of library[group]) {
			options.push({ group, name, path: iconPathOf(group, name) });
		}
	}
	return options;
}

export function hasIconLibrary(kind: TaskPropertySettingsKind): boolean {
	return kind !== 'version';
}

const TEMPLATE_ICON_NAMES: Partial<Record<ETaskStatusName, string>> = {
	[ETaskStatusName.READY_FOR_REVIEW]: 'ready'
};

export function iconPathOfTemplate(template: ETaskStatusName | null): string | null {
	if (!template) {
		return null;
	}
	const name = TEMPLATE_ICON_NAMES[template] ?? template;
	const options = propertyIconOptions('status');
	const match = options.find((option) => option.group === 'task-statuses' && option.name === name);
	if (!match) {
		return null;
	}
	return match.path;
}

export function iconOptionLabel(option: PropertyIconOption): string {
	return propertyLabelOf(option.name);
}

export function iconOptionMatches(option: PropertyIconOption, query: string): boolean {
	const needle = query.trim().toLowerCase();
	if (!needle) {
		return true;
	}
	return iconOptionLabel(option).includes(needle);
}

/** Gauzy keeps a status `value` beside its name: the name lowercased with dashes for spaces. */
export function statusValueOf(name: string): string {
	const dashed = name.split(' ').join('-');
	return dashed.toLowerCase();
}

function isNameChanged(item: PropertyListItem, draft: PropertyDraft): boolean {
	const typedName = draft.name.trim();
	const shownName = item.label.trim();
	return typedName !== shownName;
}

/**
 * The row shows `in-progress` as `in progress`: sending that back when nobody renamed it would rename the property,
 * and tasks still carry the stored name.
 */
function editedNameOf(item: PropertyListItem, draft: PropertyDraft): string {
	if (!isNameChanged(item, draft)) {
		return item.name;
	}
	return draft.name.trim();
}

function isLookChanged(item: PropertyListItem, draft: PropertyDraft): boolean {
	const isColorChanged = draft.color !== item.color;
	const isIconChanged = draft.icon !== item.icon;
	return isColorChanged || isIconChanged;
}

export function isDraftChanged(item: PropertyListItem, draft: PropertyDraft): boolean {
	const nameChanged = isNameChanged(item, draft);
	const lookChanged = isLookChanged(item, draft);
	const hasTemplate = draft.template !== null;
	return nameChanged || lookChanged || hasTemplate;
}

export interface PropertyLookBody {
	name: string;
	color?: string;
	icon?: string;
}

function definedOrUndefined(value: string | null): string | undefined {
	if (value === null) {
		return undefined;
	}
	return value;
}

export function propertyLookBodyOf(draft: PropertyDraft): PropertyLookBody {
	return {
		name: draft.name.trim(),
		color: definedOrUndefined(draft.color),
		icon: definedOrUndefined(draft.icon)
	};
}

export function propertyEditBodyOf(item: PropertyListItem, draft: PropertyDraft): PropertyLookBody {
	return {
		name: editedNameOf(item, draft),
		color: definedOrUndefined(draft.color),
		icon: definedOrUndefined(draft.icon)
	};
}

export interface StatusEditBody extends PropertyLookBody {
	template?: ETaskStatusName;
}

export function statusEditBodyOf(item: PropertyListItem, draft: PropertyDraft): StatusEditBody {
	const body: StatusEditBody = propertyEditBodyOf(item, draft);
	if (draft.template) {
		body.template = draft.template;
	}
	return body;
}

export function draftOfItem(item: PropertyListItem): PropertyDraft {
	return { name: item.label, color: item.color, icon: item.icon, template: null };
}

export function idsAfterMove(ids: ReadonlyArray<string>, id: string, toIndex: number): string[] {
	const withoutMoved = ids.filter((candidate) => candidate !== id);
	const cappedIndex = Math.min(toIndex, withoutMoved.length);
	const boundedIndex = Math.max(0, cappedIndex);
	withoutMoved.splice(boundedIndex, 0, id);
	return withoutMoved;
}

export type DropEdge = 'top' | 'bottom';

export function dropIndexOf(sourceIndex: number, targetIndex: number, edge: DropEdge | null): number {
	let index = targetIndex;
	if (edge === 'bottom') {
		index = targetIndex + 1;
	}
	const movesForward = sourceIndex < index;
	if (movesForward) {
		return index - 1;
	}
	return index;
}

export interface StatusOrderEntry {
	id: string;
	order: number;
}

export function orderEntriesOf(ids: ReadonlyArray<string>): StatusOrderEntry[] {
	return ids.map((id, index) => ({ id, order: index }));
}

/** Kinds whose built-in rows Gauzy refuses to delete (`delete ... where isSystem = false`). */
const KINDS_WITH_PROTECTED_ROWS: ReadonlySet<TaskPropertySettingsKind> = new Set([
	'status',
	'priority',
	'size',
	'issueType'
]);

export function isDeletionRefused(kind: TaskPropertySettingsKind, item: PropertyListItem): boolean {
	const kindProtectsRows = KINDS_WITH_PROTECTED_ROWS.has(kind);
	return kindProtectsRows && item.isSystem;
}

export function isSameStatusName(taskStatus: string | null | undefined, statusName: string): boolean {
	const taskValue = taskStatus ?? '';
	return taskValue.toLowerCase() === statusName.toLowerCase();
}

export interface TaskPropertySettingsModel {
	items: PropertyListItem[];
	isLoading: boolean;
	isError: boolean;
	retry: () => void;
	create: (draft: PropertyDraft) => Promise<unknown>;
	update: (item: PropertyListItem, draft: PropertyDraft) => Promise<unknown>;
	remove: (item: PropertyListItem) => Promise<unknown>;
}

export function draftWithTemplate(
	draft: PropertyDraft,
	template: ETaskStatusName | null,
	keepsIcon: boolean
): PropertyDraft {
	if (keepsIcon) {
		return { ...draft, template };
	}
	const icon = iconPathOfTemplate(template) ?? draft.icon;
	return { ...draft, template, icon };
}
