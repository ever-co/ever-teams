'use client';

import { useMemo, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { useTaskPrioritiesQuery } from '@/core/hooks/tasks/use-task-priorities-query';
import { useTaskSizesQuery } from '@/core/hooks/tasks/use-task-sizes-query';
import { useTaskLabelsQuery } from '@/core/hooks/tasks/use-task-labels-query';
import { useIssueTypesQuery } from '@/core/hooks/tasks/use-issue-types-query';
import { useVoiceFill, type VoiceFillAdapter, type VoiceFillError } from '@/core/hooks/ai/use-voice-fill';
import {
	codesOf,
	dictatedTextToHtml,
	htmlToDictationText,
	voiceChoice,
	voiceChoices,
	voiceChoiceSetOf,
	voiceText,
	type VoiceChoiceItem
} from '@/core/lib/utils/voice-fill';
import type { TVoiceFillFields } from '@/core/types/schemas/ai/voice-fill.schema';

/** What the task form's property card reads and writes for a dictation; the title and the type live outside it. */
export interface TaskCardVoiceValues {
	descriptionHtml: string;
	priority: string | undefined;
	size: string | undefined;
	labels: string[];
}

export interface TaskCardVoiceTarget {
	read: () => TaskCardVoiceValues;
	write: (patch: Partial<TaskCardVoiceValues>) => void;
}

interface TaskFormAccess {
	readTitle: () => string;
	writeTitle: (title: string) => void;
	readIssueType: () => string | null;
	writeIssueType: (issueType: string | null) => void;
	cardRef: RefObject<TaskCardVoiceTarget | null>;
}

function itemsOf(options: { value?: string | null; name?: string | null }[], valueOfOption: 'value' | 'name') {
	const items: VoiceChoiceItem[] = [];
	for (const option of options) {
		const value = option[valueOfOption];
		const label = option.name;
		if (value && label) {
			items.push({ value, label });
		}
	}
	return items;
}

function cardPatchOf(fields: TVoiceFillFields, sets: TaskVoiceChoiceSets): Partial<TaskCardVoiceValues> {
	const patch: Partial<TaskCardVoiceValues> = {};
	const description = voiceText(fields.description);
	if (description) {
		patch.descriptionHtml = dictatedTextToHtml(description);
	}
	const priority = voiceChoice(sets.priority, fields.priority);
	if (priority) {
		patch.priority = priority;
	}
	const size = voiceChoice(sets.size, fields.size);
	if (size) {
		patch.size = size;
	}
	const labels = voiceChoices(sets.labels, fields.labels);
	if (labels) {
		patch.labels = labels;
	}
	return patch;
}

type TaskVoiceChoiceSets = ReturnType<typeof useTaskVoiceChoiceSets>;

function useTaskVoiceChoiceSets() {
	const { issueTypes } = useIssueTypesQuery();
	const { taskPriorities } = useTaskPrioritiesQuery();
	const { taskSizes } = useTaskSizesQuery();
	const { taskLabels } = useTaskLabelsQuery();
	return useMemo(
		() => ({
			issueType: voiceChoiceSetOf(itemsOf(issueTypes, 'name'), 'I'),
			priority: voiceChoiceSetOf(itemsOf(taskPriorities, 'value'), 'P'),
			size: voiceChoiceSetOf(itemsOf(taskSizes, 'value'), 'S'),
			labels: voiceChoiceSetOf(itemsOf(taskLabels, 'name'), 'L')
		}),
		[issueTypes, taskPriorities, taskSizes, taskLabels]
	);
}

/**
 * Fill the create-task form by voice: title, description, type, priority, size and labels, the fields the form
 * sends to Gauzy. Undo puts back every value the dictation replaced.
 */
export function useTaskVoiceFill(access: TaskFormAccess, onError: (error: VoiceFillError) => void) {
	const t = useTranslations();
	const sets = useTaskVoiceChoiceSets();
	const { readTitle, writeTitle, readIssueType, writeIssueType, cardRef } = access;

	const adapter = useMemo<VoiceFillAdapter>(
		() => ({
			form: 'task',
			snapshot: () => {
				const card = cardRef.current?.read();
				return {
					current: {
						title: readTitle(),
						description: htmlToDictationText(card?.descriptionHtml ?? ''),
						issueType: sets.issueType.codeOf(readIssueType()) ?? null,
						priority: sets.priority.codeOf(card?.priority) ?? null,
						size: sets.size.codeOf(card?.size) ?? null,
						labels: codesOf(sets.labels, card?.labels ?? [])
					},
					choices: {
						issueType: sets.issueType.choices,
						priority: sets.priority.choices,
						size: sets.size.choices,
						labels: sets.labels.choices
					}
				};
			},
			apply: (fields) => {
				const previousTitle = readTitle();
				const previousIssueType = readIssueType();
				const previousCard = cardRef.current?.read();
				const title = voiceText(fields.title);
				if (title) {
					writeTitle(title);
				}
				const issueType = voiceChoice(sets.issueType, fields.issueType);
				if (issueType) {
					writeIssueType(issueType);
				}
				cardRef.current?.write(cardPatchOf(fields, sets));
				const restore = () => {
					writeTitle(previousTitle);
					writeIssueType(previousIssueType);
					if (previousCard) {
						cardRef.current?.write(previousCard);
					}
				};
				return { filledKeys: Object.keys(fields), restore };
			}
		}),
		[cardRef, readIssueType, readTitle, sets, writeIssueType, writeTitle]
	);

	const voice = useVoiceFill({ adapter, onError });

	const fieldLabels = useMemo(
		() => ({
			title: t('common.TITLE'),
			description: t('common.DESCRIPTION'),
			issueType: t('common.ISSUE_TYPE'),
			priority: t('pages.taskDetails.PRIORITY'),
			size: t('pages.taskDetails.SIZE'),
			labels: t('common.LABELS')
		}),
		[t]
	);

	const hasFilled = voice.filledKeys.length > 0;
	let hint = t('voiceFill.HINT_TASK');
	if (hasFilled) {
		hint = t('voiceFill.HINT_AGAIN');
	}

	return { voice, fieldLabels, hint };
}
