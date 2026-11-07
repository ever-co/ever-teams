'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight, Inbox } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { formatNotificationDate } from '@/core/lib/utils/notification-inbox';
import { InboxEntry } from '@/core/lib/utils/inbox-entry';

/**
 * The pane beside the list: the entry's sentence, its target and its body, with the way to the target. A task
 * opens in the task drawer; anything else follows its link.
 */
export function InboxDetail({
	entry,
	taskTitle,
	onOpenTarget,
	onArchive
}: Readonly<{
	entry: InboxEntry | null;
	taskTitle: string | null;
	onOpenTarget: (entry: InboxEntry) => void;
	onArchive: (entry: InboxEntry) => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();

	if (!entry) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
				<Inbox className="size-6" aria-hidden="true" />
				<p>{t('inbox.DETAIL.NO_SELECTION')}</p>
			</div>
		);
	}

	const hasTarget = !!entry.taskId || !!entry.href;
	const title = taskTitle ?? entry.subject ?? entry.rawTitle;

	return (
		<div className="flex h-full flex-col gap-4 p-5">
			<div className="flex flex-col gap-1">
				<p className="text-xs text-muted-foreground">{formatNotificationDate(entry.createdAt, locale)}</p>
				<h2 className="text-base font-semibold text-foreground text-balance">{title}</h2>
				{entry.senderName && <p className="text-sm text-muted-foreground">{entry.senderName}</p>}
			</div>
			{entry.message && <p className="whitespace-pre-wrap text-sm text-foreground">{entry.message}</p>}
			{!entry.message && entry.subject && entry.rawTitle !== entry.subject && (
				<p className="text-sm text-muted-foreground">{entry.rawTitle}</p>
			)}
			<div className="mt-auto flex flex-wrap gap-2">
				{hasTarget ? (
					<Button size="sm" onClick={() => onOpenTarget(entry)}>
						<ArrowUpRight className="size-4" />
						{entry.taskId ? t('inbox.DETAIL.OPEN_TASK') : t('inbox.DETAIL.OPEN')}
					</Button>
				) : (
					<p className="text-xs text-muted-foreground">{t('inbox.DETAIL.NO_TARGET')}</p>
				)}
				{!entry.isArchived && (
					<Button size="sm" variant="outline" onClick={() => onArchive(entry)}>
						{t('notifications.ARCHIVE')}
					</Button>
				)}
			</div>
		</div>
	);
}
