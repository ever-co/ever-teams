'use client';

import { useTranslations } from 'next-intl';
import moment from 'moment';
import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import type { TaskActivityChange } from '@/core/types/interfaces/task/task-discussion';

type Translate = ReturnType<typeof useTranslations>;

const SKELETON_KEYS = ['activity-1', 'activity-2', 'activity-3', 'activity-4'];

/** The field names a log carries, read with the labels the task pages already use; others are spaced out. */
const FIELD_LABEL_KEYS: Record<string, string> = {
	status: 'common.STATUS',
	taskStatusId: 'common.STATUS',
	priority: 'pages.taskDetails.PRIORITY',
	size: 'pages.taskDetails.SIZE',
	issueType: 'common.ISSUE_TYPE',
	description: 'common.DESCRIPTION',
	dueDate: 'pages.taskDetails.DUE_DATE',
	startDate: 'pages.taskDetails.START_DATE',
	estimate: 'common.ESTIMATE',
	projectId: 'pages.taskDetails.PROJECT',
	members: 'pages.taskDetails.ASSIGNEES',
	tags: 'common.LABELS'
};

function spacedFieldName(field: string) {
	const spaced = field.replace(/([a-z])([A-Z])/g, '$1 $2');
	return spaced.toLowerCase();
}

export function fieldLabelOf(field: string, t: Translate) {
	const key = FIELD_LABEL_KEYS[field];
	if (!key) {
		return spacedFieldName(field);
	}
	const label = t(key as Parameters<Translate>[0]);
	return label.toLowerCase();
}

/** Values as people read them: an estimate in hours and minutes, a status or size name without its dashes. */
export function displayValueOf(field: string, value: string | null) {
	if (!value) {
		return value;
	}
	if (field === 'estimate') {
		const seconds = Number(value);
		const isNumber = Number.isFinite(seconds);
		if (isNumber) {
			const { hours, minutes } = secondsToTime(seconds);
			return `${hours}h ${minutes}m`;
		}
	}
	return value.split('-').join(' ');
}

export function changeSentence(rawChange: TaskActivityChange, t: Translate) {
	const change = {
		...rawChange,
		from: displayValueOf(rawChange.field, rawChange.from),
		to: displayValueOf(rawChange.field, rawChange.to)
	};
	const field = fieldLabelOf(change.field, t);
	const hasFrom = Boolean(change.from);
	const hasTo = Boolean(change.to);
	if (hasFrom && hasTo) {
		return t('taskDrawer.ACTIVITY_CHANGED', { field, from: change.from as string, to: change.to as string });
	}
	if (hasTo) {
		return t('taskDrawer.ACTIVITY_SET', { field, to: change.to as string });
	}
	return t('taskDrawer.ACTIVITY_CLEARED', { field });
}

export function actionSentence(action: string, t: Translate) {
	const normalized = action.toLowerCase();
	if (normalized === 'created') {
		return t('taskDrawer.ACTIVITY_CREATED');
	}
	if (normalized === 'deleted') {
		return t('taskDrawer.ACTIVITY_DELETED');
	}
	return t('taskDrawer.ACTIVITY_UPDATED');
}

export function dayLabelOf(date: Date, t: Translate) {
	const day = moment(date);
	if (day.isSame(moment(), 'day')) {
		return t('common.TODAY');
	}
	if (day.isSame(moment().subtract(1, 'day'), 'day')) {
		return t('common.YESTERDAY');
	}
	return day.format('D MMMM YYYY');
}

export function ActivitySkeleton() {
	return (
		<output className="flex flex-col gap-4">
			{SKELETON_KEYS.map((key) => (
				<span key={key} className="flex gap-3">
					<span className="size-6 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
					<span className="flex flex-1 flex-col gap-2 pt-1">
						<span className="h-3 w-3/4 animate-pulse rounded-full bg-foreground/[0.06]" />
						<span className="h-2.5 w-10 animate-pulse rounded-full bg-foreground/[0.06]" />
					</span>
				</span>
			))}
		</output>
	);
}
