'use client';

import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { LazyRichEditor } from '@/core/components/common/rich-editor/lazy-rich-editor';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import { useUpdateTask } from '@/core/hooks';
import { useTeamMentionCandidates } from '@/core/hooks/organizations/teams/use-team-mention-candidates';
import { detailedTaskState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export type TaskDescriptionEditorProps = {
	/** Called once the user is done: after a successful save, or after Cancel. The host shows its read view again. */
	onDone?: () => void;
	/** Puts the caret at the end of the text as soon as the editor loads. Defaults to true. */
	autoFocus?: boolean;
};

type UpdateDescription = ReturnType<typeof useUpdateTask>['updateDescription'];

type PendingEdit = {
	draft: string | null;
	task: TTask | null;
	updateDescription: UpdateDescription;
};

function editorValueOf(draft: string | null, task: TTask | null) {
	if (draft !== null) {
		return draft;
	}
	return task?.description ?? '';
}

/**
 * Leaving the editor with unsaved text (Done in the drawer, another task, another page) saves it: a description is
 * never lost because the user closed the editor instead of pressing Save.
 */
function useSaveOnLeave(pending: { current: PendingEdit }) {
	useEffect(() => {
		const edit = pending;
		return () => {
			const { draft, task, updateDescription } = edit.current;
			if (draft === null || !task) {
				return;
			}
			void updateDescription({ newDescription: draft, task, loader: false, isDetailedTask: true });
		};
	}, [pending]);
}

/**
 * The task description in edit mode, on the rich editor with writing help, "@" for the team and pictures. It reads
 * the detailed task (`detailedTaskState`) and saves through the task update hook, as the previous editor did. The
 * host owns the read mode: the task page and the drawer show `RichTextView` and mount this only while editing.
 */
export default function TaskDescriptionEditor({ onDone, autoFocus = true }: TaskDescriptionEditorProps) {
	const t = useTranslations();
	const task = useAtomValue(detailedTaskState);
	const { updateDescription } = useUpdateTask();
	const mentions = useTeamMentionCandidates();
	const [draft, setDraft] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const pending = useRef<PendingEdit>({ draft: null, task, updateDescription });

	useEffect(() => {
		pending.current = { draft, task, updateDescription };
	});

	useSaveOnLeave(pending);

	if (!task) {
		return null;
	}

	const forgetDraft = () => {
		pending.current.draft = null;
		setDraft(null);
	};

	const save = async () => {
		if (draft === null) {
			onDone?.();
			return;
		}
		setSaving(true);
		try {
			await updateDescription({ newDescription: draft, task, loader: true, isDetailedTask: true });
			forgetDraft();
			onDone?.();
		} catch {
			toast.error(t('richEditor.SAVE_FAILED'));
		} finally {
			setSaving(false);
		}
	};

	const cancel = () => {
		forgetDraft();
		onDone?.();
	};

	const cancelWhenUnchanged = () => {
		if (draft !== null) {
			return false;
		}
		cancel();
		return true;
	};

	return (
		<div className="flex flex-col">
			<LazyRichEditor
				value={editorValueOf(draft, task)}
				onChange={(html) => setDraft(html)}
				chrome="bare"
				ai={{ context: 'task', title: task.title }}
				mentions={mentions}
				autoFocus={autoFocus}
				disabled={saving}
				onModEnter={() => void save()}
				onEscape={cancelWhenUnchanged}
				aria-label={t('pages.taskDetails.DESCRIPTION')}
				contentClassName="min-h-40"
			/>
			<div className="flex items-center justify-end gap-2 hairline-t border-border px-2 pt-2 pb-1">
				<Button type="button" variant="outline" size="default" disabled={saving} onClick={cancel}>
					{t('common.CANCEL')}
				</Button>
				<Button type="button" size="default" disabled={saving} onClick={() => void save()}>
					{saving && <Spinner className="size-3.5 animate-spin" aria-hidden="true" />}
					{t('common.SAVE')}
				</Button>
			</div>
		</div>
	);
}
