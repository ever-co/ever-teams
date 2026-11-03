'use client';

import { useState, type KeyboardEvent } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { useUpdateTask } from '@/core/hooks/organizations/teams/use-update-task';
import { useTaskQueries } from '@/core/hooks/organizations/teams/use-task-queries';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { keepKeyInside } from '@/core/lib/utils/keep-key-inside';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useFocusOnMount } from '@/core/hooks/common/use-focus-on-mount';

const TITLE_MAX_LENGTH = 255;

const TITLE_TEXT = 'text-[26px] font-semibold leading-8 text-balance text-foreground';

export function TaskDetailTitle({ task, className }: Readonly<{ task: TTask; className?: string }>) {
	const t = useTranslations();
	const focusOnMount = useFocusOnMount<HTMLTextAreaElement>();
	const { updateTitle } = useUpdateTask();
	const { getTaskById } = useTaskQueries();
	const [draft, setDraft] = useState<string | null>(null);
	const isEditing = draft !== null;

	const save = async () => {
		if (draft === null) {
			return;
		}
		const trimmedTitle = draft.trim();
		const isTooLong = trimmedTitle.length > TITLE_MAX_LENGTH;
		if (isTooLong) {
			toast.warning(t('toasts.tasks.TITLE_TOO_LONG'), { id: 'task-title-too-long' });
			return;
		}
		setDraft(null);
		const isUnchanged = trimmedTitle === task.title;
		const isEmpty = trimmedTitle.length === 0;
		if (isUnchanged || isEmpty) {
			return;
		}
		try {
			await updateTitle({ newTitle: trimmedTitle, task, isDetailedTask: true });
		} catch (error) {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.tasks.TITLE_SAVE_FAILED'), { description: t(reasonKey) });
			getTaskById(task.id);
		}
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			void save();
			return;
		}
		if (event.key === 'Escape') {
			keepKeyInside(event);
			setDraft(null);
		}
	};

	if (isEditing) {
		return (
			<textarea
				ref={focusOnMount}
				rows={1}
				value={draft}
				aria-label={t('common.EDIT_TASK')}
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={() => void save()}
				className={cn(
					TITLE_TEXT,
					'-mx-1.5 w-[calc(100%+0.75rem)] resize-none rounded-lg bg-transparent px-1.5 py-0.5 outline-none field-sizing-content hairline-ring ring-foreground/20',
					className
				)}
			/>
		);
	}

	return (
		<h1 className={cn(TITLE_TEXT, className)}>
			<button
				type="button"
				onClick={() => setDraft(task.title)}
				title={t('common.EDIT_TASK')}
				className="-mx-1.5 rounded-lg px-1.5 py-0.5 text-left outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				{task.title}
			</button>
		</h1>
	);
}
