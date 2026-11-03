'use client';

import { KeyboardEvent, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { useUpdateTask } from '@/core/hooks/organizations';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** Mounted only while the title is being edited, so idle cards carry no mutation hook. */
export function KanbanTaskTitleEditor({ task, onDone }: Readonly<{ task: TTask; onDone: () => void }>) {
	const t = useTranslations();
	const { updateTitle } = useUpdateTask();
	const [title, setTitle] = useState(task.title);
	const [isSaving, setIsSaving] = useState(false);

	const save = async () => {
		const trimmedTitle = title.trim();
		const isUnchanged = trimmedTitle === task.title;
		const isEmpty = trimmedTitle.length === 0;
		if (isUnchanged || isEmpty) {
			onDone();
			return;
		}
		setIsSaving(true);
		try {
			await updateTitle({ newTitle: trimmedTitle, task });
		} catch (error) {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.tasks.TITLE_SAVE_FAILED'), { description: t(reasonKey) });
		} finally {
			setIsSaving(false);
			onDone();
		}
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		const isSubmit = event.key === 'Enter' && !event.shiftKey;
		if (isSubmit) {
			event.preventDefault();
			void save();
			return;
		}
		if (event.key === 'Escape') {
			event.preventDefault();
			onDone();
		}
	};

	return (
		<textarea
			autoFocus
			rows={2}
			value={title}
			disabled={isSaving}
			aria-label={t('common.EDIT_TASK')}
			onChange={(event) => setTitle(event.target.value)}
			onKeyDown={handleKeyDown}
			onBlur={save}
			onPointerDown={(event) => event.stopPropagation()}
			className="w-full resize-none rounded-md bg-card px-1.5 py-1 text-[13px] font-medium leading-5 text-foreground outline-none hairline-ring ring-foreground/25 disabled:opacity-60"
		/>
	);
}
