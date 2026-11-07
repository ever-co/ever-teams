'use client';

import { memo, type ReactNode } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Archive, Check, Clock, Mail, MailOpen, RotateLeft } from '@/core/components/icons';
import { Checkbox } from '@/core/components/common/checkbox';
import { cn } from '@/core/lib/helpers';
import { PersonAvatar, type Person } from '@/core/components/teams/people-avatars';
import { formatNotificationAge, formatNotificationDate } from '@/core/lib/utils/notification-inbox';
import { InboxEntry, InboxSourceGroup } from '@/core/lib/utils/inbox-entry';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { INBOX_ROW_ATTRIBUTE } from '@/core/hooks/inbox/use-inbox-keyboard';
import { SnoozeMenu } from './snooze-menu';

const EVENT_KEYS: Record<EEmployeeNotificationType, DottedLanguageObjectStringPaths> = {
	[EEmployeeNotificationType.Assignment]: 'notifications.EVENTS.ASSIGNMENT',
	[EEmployeeNotificationType.Mention]: 'notifications.EVENTS.MENTION',
	[EEmployeeNotificationType.Comment]: 'notifications.EVENTS.COMMENT',
	[EEmployeeNotificationType.Invitation]: 'notifications.EVENTS.INVITATION',
	[EEmployeeNotificationType.Message]: 'notifications.EVENTS.MESSAGE',
	[EEmployeeNotificationType.Broadcast]: 'notifications.EVENTS.BROADCAST',
	[EEmployeeNotificationType.Payment]: 'notifications.EVENTS.PAYMENT',
	[EEmployeeNotificationType.RateChangeRequest]: 'notifications.EVENTS.RATE_CHANGE_REQUEST'
};

const SOURCE_KEYS: Record<InboxSourceGroup, DottedLanguageObjectStringPaths> = {
	tasks: 'inbox.SOURCES.TASKS',
	chat: 'inbox.SOURCES.CHAT',
	docs: 'inbox.SOURCES.DOCS',
	email: 'inbox.SOURCES.EMAIL',
	integrations: 'inbox.SOURCES.INTEGRATIONS',
	people: 'inbox.SOURCES.PEOPLE',
	other: 'inbox.SOURCES.OTHER'
};

const ACTION_CLASS =
	'inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.07] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-4';

function SenderName({ children }: Readonly<{ children: ReactNode }>) {
	return <span className="font-medium text-foreground">{children}</span>;
}

/** The event sentence in the reader's language, or the platform's own title when the kind is not a known one. */
function useSentence(entry: InboxEntry): ReactNode {
	const t = useTranslations();
	if (!entry.type) return entry.rawTitle;
	const name = entry.senderName ?? t('notifications.SOMEONE');
	return t.rich(EVENT_KEYS[entry.type], { name, b: (chunks) => <SenderName>{chunks}</SenderName> });
}

export interface InboxRowProps {
	entry: InboxEntry;
	person: Person | null;
	taskTitle: string | null;
	locale: string;
	now: Date;
	isSelected: boolean;
	isCurrent: boolean;
	/** Snooze and done exist only on a platform with the inbox extension. */
	canTriage: boolean;
	onOpen: (entry: InboxEntry) => void;
	onToggleSelect: (entry: InboxEntry) => void;
	onToggleRead: (entry: InboxEntry) => void;
	onArchive: (entry: InboxEntry) => void;
	onSnooze: (entry: InboxEntry, until: Date | null) => void;
	onDone: (entry: InboxEntry) => void;
}

function InboxRowComponent({
	entry,
	person,
	taskTitle,
	locale,
	now,
	isSelected,
	isCurrent,
	canTriage,
	onOpen,
	onToggleSelect,
	onToggleRead,
	onArchive,
	onSnooze,
	onDone
}: Readonly<InboxRowProps>) {
	const t = useTranslations();
	const sentence = useSentence(entry);
	const subject = taskTitle ?? entry.subject ?? (entry.type ? null : entry.rawTitle);
	const age = formatNotificationAge(entry.createdAt, locale, now);
	const rowAttributes = { [INBOX_ROW_ATTRIBUTE]: entry.id };

	return (
		<div
			className={cn(
				'group/row relative flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
				isCurrent ? 'bg-foreground/[0.05]' : 'hover:bg-foreground/[0.035]',
				isSelected && 'bg-primary/[0.06]'
			)}
		>
			<div className="flex shrink-0 items-center gap-2 pt-1">
				<Checkbox
					checked={isSelected}
					onCheckedChange={() => onToggleSelect(entry)}
					aria-label={t('inbox.ACTIONS.SELECT')}
					className={cn('transition-opacity', !isSelected && 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100')}
				/>
				{person ? (
					<PersonAvatar person={person} size="sm" />
				) : (
					<span aria-hidden="true" className="size-7 rounded-full bg-foreground/[0.06]" />
				)}
			</div>
			<button
				type="button"
				{...rowAttributes}
				onClick={() => onOpen(entry)}
				className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
				aria-current={isCurrent ? 'true' : undefined}
			>
				<span className="flex items-center gap-2">
					{entry.isUnread && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary" />}
					<span className={cn('min-w-0 truncate text-[13px]', entry.isUnread ? 'text-foreground' : 'text-muted-foreground')}>
						{sentence}
					</span>
				</span>
				{subject && <span className="truncate text-[13px] font-medium text-foreground">{subject}</span>}
				{entry.message && <span className="line-clamp-2 text-xs text-muted-foreground">{entry.message}</span>}
				<span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
					<span className="rounded-sm bg-foreground/[0.06] px-1.5 py-px">{t(SOURCE_KEYS[entry.sourceGroup])}</span>
					{entry.snoozedUntil && (
						<span className="inline-flex items-center gap-1">
							<Clock className="size-3" />
							{formatNotificationDate(entry.snoozedUntil, locale)}
						</span>
					)}
					<time dateTime={entry.createdAt.toISOString()} title={formatNotificationDate(entry.createdAt, locale)} className="tabular-nums">
						{age}
					</time>
				</span>
			</button>
			<div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100">
				<button
					type="button"
					className={ACTION_CLASS}
					aria-label={entry.isUnread ? t('notifications.MARK_READ') : t('notifications.MARK_UNREAD')}
					title={entry.isUnread ? t('notifications.MARK_READ') : t('notifications.MARK_UNREAD')}
					onClick={() => onToggleRead(entry)}
				>
					{entry.isUnread ? <MailOpen /> : <Mail />}
				</button>
				{canTriage && (
					<>
						<SnoozeMenu isSnoozed={!!entry.snoozedUntil} onSnooze={(until) => onSnooze(entry, until)} onUnsnooze={() => onSnooze(entry, null)}>
							<button type="button" className={ACTION_CLASS} aria-label={t('inbox.ACTIONS.SNOOZE')} title={t('inbox.ACTIONS.SNOOZE')}>
								<Clock />
							</button>
						</SnoozeMenu>
						<button
							type="button"
							className={ACTION_CLASS}
							aria-label={entry.isDone ? t('inbox.ACTIONS.NOT_DONE') : t('inbox.ACTIONS.DONE')}
							title={entry.isDone ? t('inbox.ACTIONS.NOT_DONE') : t('inbox.ACTIONS.DONE')}
							onClick={() => onDone(entry)}
						>
							{entry.isDone ? <RotateLeft /> : <Check />}
						</button>
					</>
				)}
				<button
					type="button"
					className={ACTION_CLASS}
					aria-label={entry.isArchived ? t('inbox.ACTIONS.UNARCHIVE') : t('notifications.ARCHIVE')}
					title={entry.isArchived ? t('inbox.ACTIONS.UNARCHIVE') : t('notifications.ARCHIVE')}
					onClick={() => onArchive(entry)}
				>
					{entry.isArchived ? <RotateLeft /> : <Archive />}
				</button>
			</div>
		</div>
	);
}

export const InboxRow = memo(InboxRowComponent);
