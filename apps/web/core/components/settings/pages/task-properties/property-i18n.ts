import type { DottedLanguageObjectStringPaths } from 'next-intl';
import {
	statusTemplateKeyOf,
	type StatusGroupId,
	type StatusTemplateKey
} from '@/core/lib/utils/settings-task-properties';
import type { ETaskStatusName } from '@/core/types/generics/enums/task';
import type { PropertyIconCategory } from '@/core/components/icons/property-icon-catalog';

export const STATUS_GROUP_LABEL_KEYS: Record<StatusGroupId, DottedLanguageObjectStringPaths> = {
	todo: 'settings.taskProperties.groups.todo',
	inProgress: 'settings.taskProperties.groups.inProgress',
	done: 'settings.taskProperties.groups.done',
	other: 'settings.taskProperties.groups.other'
};

export const STATUS_TYPE_LABEL_KEYS: Record<StatusTemplateKey, DottedLanguageObjectStringPaths> = {
	backlog: 'settings.taskProperties.statusTypes.backlog',
	open: 'settings.taskProperties.statusTypes.open',
	inProgress: 'settings.taskProperties.statusTypes.inProgress',
	readyForReview: 'settings.taskProperties.statusTypes.readyForReview',
	inReview: 'settings.taskProperties.statusTypes.inReview',
	blocked: 'settings.taskProperties.statusTypes.blocked',
	done: 'settings.taskProperties.statusTypes.done',
	completed: 'settings.taskProperties.statusTypes.completed',
	cancelled: 'settings.taskProperties.statusTypes.cancelled',
	custom: 'settings.taskProperties.statusTypes.custom'
};

export function statusTypeLabelKeyOf(template: ETaskStatusName): DottedLanguageObjectStringPaths {
	const key = statusTemplateKeyOf(template);
	return STATUS_TYPE_LABEL_KEYS[key];
}

export const ICON_CATEGORY_LABEL_KEYS: Record<PropertyIconCategory, DottedLanguageObjectStringPaths> = {
	progress: 'settings.taskProperties.iconLibrary.progress',
	priority: 'settings.taskProperties.iconLibrary.priority',
	size: 'settings.taskProperties.iconLibrary.size',
	work: 'settings.taskProperties.iconLibrary.work',
	objects: 'settings.taskProperties.iconLibrary.objects',
	symbols: 'settings.taskProperties.iconLibrary.symbols'
};

export const CLASSIC_ICONS_LABEL_KEY: DottedLanguageObjectStringPaths = 'settings.taskProperties.iconGroups.classic';
