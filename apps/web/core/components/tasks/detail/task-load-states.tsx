'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components';
import { FileSearch } from '@/core/components/icons';

function TaskStatePanel({
	title,
	description,
	action
}: Readonly<{ title: string; description: string; action: ReactNode }>) {
	return (
		<div className="flex min-h-100 flex-col items-center justify-center p-8 text-center">
			<div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-foreground/5">
				<FileSearch className="size-5 text-muted-foreground" />
			</div>
			<h2 className="mb-1 text-sm font-semibold text-balance text-foreground">{title}</h2>
			<p className="mb-4 max-w-md text-sm text-muted-foreground">{description}</p>
			{action}
		</div>
	);
}

/** The task does not exist or was deleted; the action is where the reader goes from there. */
export function TaskNotFoundState({ action }: Readonly<{ action: ReactNode }>) {
	const t = useTranslations();
	return (
		<TaskStatePanel
			title={t('pages.taskDetails.TASK_NOT_FOUND')}
			description={t('pages.taskDetails.TASK_NOT_FOUND_DESCRIPTION')}
			action={action}
		/>
	);
}

export function TaskLoadFailedState({ onRetry, isRetrying }: Readonly<{ onRetry: () => void; isRetrying: boolean }>) {
	const t = useTranslations();
	const retryButton = (
		<Button variant="outline" size="default" onClick={onRetry} loading={isRetrying} disabled={isRetrying}>
			{t('pages.unauthorized.TRY_AGAIN')}
		</Button>
	);
	return (
		<TaskStatePanel
			title={t('pages.error.HEADING_TITLE')}
			description={t('pages.error.HEADING_DESCRIPTION')}
			action={retryButton}
		/>
	);
}
