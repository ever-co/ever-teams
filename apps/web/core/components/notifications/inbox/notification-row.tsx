'use client';

import { memo, type ReactNode } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Archive, Mail, MailOpen } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { NotificationTypeBadge } from '../notification-type-badge';
import { formatNotificationAge, formatNotificationDate, NotificationEntry } from '@/core/lib/utils/notification-inbox';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';

/** What the loaded team tasks know about the notification's task, to lead the row like a task row does. */
export interface NotificationTaskContext {
	number: string | number | null;
	issueType: string | null;
	title: string;
}

interface NotificationRowProps {
	entry: NotificationEntry;
	task: NotificationTaskContext | null;
	locale: string;
	now: Date;
	onOpen: (entry: NotificationEntry) => void;
	onToggleRead: (entry: NotificationEntry) => void;
	onArchive: (entry: NotificationEntry) => void;
}

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

const TYPE_KEYS: Record<EEmployeeNotificationType, DottedLanguageObjectStringPaths> = {
	[EEmployeeNotificationType.Assignment]: 'notifications.TYPES.ASSIGNMENT',
	[EEmployeeNotificationType.Mention]: 'notifications.TYPES.MENTION',
	[EEmployeeNotificationType.Comment]: 'notifications.TYPES.COMMENT',
	[EEmployeeNotificationType.Invitation]: 'notifications.TYPES.INVITATION',
	[EEmployeeNotificationType.Message]: 'notifications.TYPES.MESSAGE',
	[EEmployeeNotificationType.Broadcast]: 'notifications.TYPES.BROADCAST',
	[EEmployeeNotificationType.Payment]: 'notifications.TYPES.PAYMENT',
	[EEmployeeNotificationType.RateChangeRequest]: 'notifications.TYPES.RATE_CHANGE_REQUEST'
};

const ROW_ACTION_CLASS =
	'inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.07] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3.5';

/** Hover and keyboard focus swap the age for the row's actions in the same slot; touch screens keep both. */
const ACTIONS_SLOT_CLASS =
	'absolute right-2.5 top-2 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100';

const AGE_IN_SLOT_CLASS =
	'w-13 shrink-0 text-right text-xs tabular-nums text-muted-foreground transition-opacity duration-150 group-hover/row:opacity-0 group-focus-within/row:opacity-0 [@media(hover:none)]:hidden';

const AGE_INLINE_CLASS = 'hidden text-xs tabular-nums text-muted-foreground [@media(hover:none)]:inline';

type Translate = ReturnType<typeof useTranslations>;

function readToggleLabelOf(isUnread: boolean, t: Translate): string {
	if (isUnread) {
		return t('notifications.MARK_READ');
	}

	return t('notifications.MARK_UNREAD');
}

function ReadToggleIcon({ isUnread }: Readonly<{ isUnread: boolean }>) {
	if (isUnread) {
		return <MailOpen />;
	}

	return <Mail />;
}

function SenderName({ children }: Readonly<{ children: ReactNode }>) {
	return <span className="font-medium text-foreground">{children}</span>;
}

function useEventSentence(entry: NotificationEntry): ReactNode {
	const t = useTranslations();
	if (!entry.type) {
		return entry.rawTitle;
	}
	const name = entry.senderName ?? t('notifications.SOMEONE');

	return t.rich(EVENT_KEYS[entry.type], { name, b: (chunks) => <SenderName>{chunks}</SenderName> });
}

function useSubject(entry: NotificationEntry, task: NotificationTaskContext | null): string {
	const t = useTranslations();
	if (task) {
		return task.title;
	}
	if (entry.subject) {
		return entry.subject;
	}
	if (entry.type) {
		return t(TYPE_KEYS[entry.type]);
	}

	return entry.rawTitle;
}

function TaskLead({ task }: Readonly<{ task: NotificationTaskContext }>) {
	const hasNumber = task.number !== null;

	return (
		<>
			{task.issueType && (
				<TaskPropertyIcon kind="issueType" name={task.issueType} className="mr-1.5 inline-flex align-[-3px]" />
			)}
			{hasNumber && <span className="mr-1 font-normal tabular-nums text-muted-foreground">#{task.number}</span>}
		</>
	);
}

/**
 * One notification, Linear's way: the task first, then the event in the reader's language, the age at the right.
 * Unread rows carry a dot in the gutter; read rows only turn their subject grey, so nothing moves.
 */
export const NotificationRow = memo(function NotificationRow({
	entry,
	task,
	locale,
	now,
	onOpen,
	onToggleRead,
	onArchive
}: NotificationRowProps) {
	const t = useTranslations();
	const sentence = useEventSentence(entry);
	const subject = useSubject(entry, task);
	const age = formatNotificationAge(entry.createdAt, locale, now);
	const fullDate = formatNotificationDate(entry.createdAt, locale);
	const sender = { id: entry.id, name: entry.senderName ?? '', imageUrl: entry.senderImageUrl };
	const readToggleLabel = readToggleLabelOf(entry.isUnread, t);
	const isRead = !entry.isUnread;

	return (
		<li className="group/row relative">
			<button
				type="button"
				data-notification-row=""
				onClick={() => onOpen(entry)}
				className="flex w-full cursor-pointer items-start gap-3 rounded-lg py-2.5 pl-4 pr-3 text-left outline-none transition-colors hover:bg-foreground/[0.035] focus-visible:bg-foreground/[0.035] focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				{entry.isUnread && (
					<span
						aria-hidden="true"
						className="absolute left-1.5 top-[23px] size-1.5 rounded-full bg-primary"
					/>
				)}
				<span className="relative mt-px shrink-0">
					<PersonAvatar person={sender} size="md" className="ring-0" />
					<span className="absolute -bottom-1 -right-1 rounded-full bg-popover p-px">
						<NotificationTypeBadge type={entry.type} />
					</span>
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex items-baseline gap-2">
						<span
							className={cn(
								'min-w-0 flex-1 truncate text-[13px] font-medium leading-5 text-foreground',
								isRead && 'text-muted-foreground'
							)}
						>
							{task && <TaskLead task={task} />}
							{subject}
						</span>
						<time dateTime={entry.createdAt.toISOString()} title={fullDate} className={AGE_IN_SLOT_CLASS}>
							{age}
						</time>
					</span>
					<span className="flex items-baseline gap-1.5 text-xs leading-snug text-muted-foreground">
						<span className="min-w-0 truncate">{sentence}</span>
						<time dateTime={entry.createdAt.toISOString()} className={AGE_INLINE_CLASS}>
							· {age}
						</time>
					</span>
					{entry.message && (
						<span className="mt-1 line-clamp-2 rounded-md bg-foreground/[0.025] px-2 py-1.5 text-xs leading-snug text-foreground/80 hairline-ring ring-border">
							{entry.message}
						</span>
					)}
					{entry.isUnread && <span className="sr-only">{t('notifications.UNREAD')}</span>}
				</span>
			</button>
			<div className={ACTIONS_SLOT_CLASS}>
				<button
					type="button"
					onClick={() => onToggleRead(entry)}
					aria-label={readToggleLabel}
					title={readToggleLabel}
					className={ROW_ACTION_CLASS}
				>
					<ReadToggleIcon isUnread={entry.isUnread} />
				</button>
				<button
					type="button"
					onClick={() => onArchive(entry)}
					aria-label={t('notifications.ARCHIVE')}
					title={t('notifications.ARCHIVE')}
					className={ROW_ACTION_CLASS}
				>
					<Archive />
				</button>
			</div>
		</li>
	);
});
