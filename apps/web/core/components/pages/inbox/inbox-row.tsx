'use client';

import { memo, type ReactNode } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Archive, Check, Clock, FileText, Integration, Mail, MailOpen, MessageCircle, RotateLeft, Task, Users } from '@/core/components/icons';
import { Checkbox } from '@/core/components/common/checkbox';
import { cn } from '@/core/lib/helpers';
import { NotificationTypeBadge } from '@/core/components/notifications/notification-type-badge';
import { PersonAvatar, type Person } from '@/core/components/teams/people-avatars';
import { formatNotificationAge, formatNotificationDate } from '@/core/lib/utils/notification-inbox';
import { InboxEntry, InboxSourceGroup } from '@/core/lib/utils/inbox-entry';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { INBOX_ROW_ATTRIBUTE } from '@/core/hooks/inbox/use-inbox-keyboard';
import { SnoozeMenu } from './snooze-menu';

const INBOX_EVENT_KEYS: Record<EEmployeeNotificationType, DottedLanguageObjectStringPaths> = {
	[EEmployeeNotificationType.Assignment]: 'notifications.EVENTS.ASSIGNMENT',
	[EEmployeeNotificationType.Mention]: 'notifications.EVENTS.MENTION',
	[EEmployeeNotificationType.Comment]: 'notifications.EVENTS.COMMENT',
	[EEmployeeNotificationType.Invitation]: 'notifications.EVENTS.INVITATION',
	[EEmployeeNotificationType.Message]: 'notifications.EVENTS.MESSAGE',
	[EEmployeeNotificationType.Broadcast]: 'notifications.EVENTS.BROADCAST',
	[EEmployeeNotificationType.Payment]: 'notifications.EVENTS.PAYMENT',
	[EEmployeeNotificationType.RateChangeRequest]: 'notifications.EVENTS.RATE_CHANGE_REQUEST'
};

/** The glyph of an entry that has no sender to show: what it came from. */
const SOURCE_GLYPHS: Record<InboxSourceGroup, ReactNode> = {
	tasks: <Task />,
	chat: <MessageCircle />,
	docs: <FileText />,
	email: <Mail />,
	integrations: <Integration />,
	people: <Users />,
	other: <Mail />
};

const ACTION_CLASS =
	'inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.08] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-4';

function SenderName({ children }: Readonly<{ children: ReactNode }>) {
	return <span className="font-semibold text-foreground">{children}</span>;
}

/** The event sentence in the reader's language, or the platform's own title when the kind is not a known one. */
export function useInboxSentence(entry: InboxEntry, person: Person | null): ReactNode {
	const t = useTranslations();
	if (!entry.type) return entry.rawTitle;
	const name = person?.name || entry.senderName || t('notifications.SOMEONE');
	return t.rich(INBOX_EVENT_KEYS[entry.type], { name, b: (chunks) => <SenderName>{chunks}</SenderName> });
}

/** Who an entry is from: the team member, or just the name the platform gave (drawn as initials). */
function inboxSenderOf(entry: InboxEntry, person: Person | null): Person | null {
	if (person) return person;
	return entry.senderName ? { id: entry.sentByEmployeeId ?? entry.id, name: entry.senderName, imageUrl: null } : null;
}

/** The sender's face with the kind of event on its corner; without a sender, the glyph of where the entry came from. */
export function InboxAvatar({ entry, person, size = 'md' }: Readonly<{ entry: InboxEntry; person: Person | null; size?: 'md' | 'lg' }>) {
	const sender = inboxSenderOf(entry, person);
	const box = size === 'lg' ? 'size-10' : 'size-8';
	return (
		<span className={cn('relative inline-flex shrink-0', box)}>
			{sender ? (
				<PersonAvatar person={sender} size="md" className={cn(box, 'text-xs ring-0')} />
			) : (
				<span aria-hidden="true" className={cn('inline-flex items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground [&_svg]:size-4', box)}>
					{SOURCE_GLYPHS[entry.sourceGroup]}
				</span>
			)}
			{entry.type && <NotificationTypeBadge type={entry.type} className="absolute -bottom-0.5 -right-0.5 ring-2 ring-background" />}
		</span>
	);
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
	const sentence = useInboxSentence(entry, person);
	const subject = taskTitle ?? entry.subject ?? (entry.type ? null : entry.rawTitle);
	const age = formatNotificationAge(entry.createdAt, locale, now);
	const rowAttributes = { [INBOX_ROW_ATTRIBUTE]: entry.id };

	return (
		<div
			className={cn(
				'group/row relative flex items-start gap-x-3 rounded-xl py-2.5 pe-2 ps-3 transition-colors [@media(hover:none)]:flex-wrap',
				isCurrent ? 'bg-foreground/[0.06]' : 'hover:bg-foreground/[0.035]',
				isSelected && 'bg-primary/[0.07]'
			)}
		>
			{/* The unread mark stands in the row's margin, so the text of read and unread rows lines up. */}
			{entry.isUnread && <span aria-hidden="true" className="absolute start-1 top-[1.4rem] size-1.5 rounded-full bg-primary" />}
			<div className="relative flex shrink-0 items-center pt-0.5">
				<span
					className={cn(
						'transition-opacity [@media(hover:none)]:opacity-100',
						isSelected ? 'opacity-0' : 'group-hover/row:opacity-0 group-focus-within/row:opacity-0'
					)}
				>
					<InboxAvatar entry={entry} person={person} />
				</span>
				<span
					className={cn(
						'absolute inset-0 flex items-center justify-center transition-opacity [@media(hover:none)]:hidden',
						isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100'
					)}
				>
					<Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(entry)} aria-label={t('inbox.ACTIONS.SELECT')} />
				</span>
			</div>
			<button
				type="button"
				{...rowAttributes}
				onClick={() => onOpen(entry)}
				className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 rounded-md text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
				aria-current={isCurrent ? 'true' : undefined}
			>
				<span className="flex items-baseline gap-2">
					<span className={cn('min-w-0 flex-1 truncate text-[13px]', entry.isUnread ? 'text-foreground' : 'text-muted-foreground [&_.font-semibold]:font-medium')}>{sentence}</span>
					<time
						dateTime={entry.createdAt.toISOString()}
						title={formatNotificationDate(entry.createdAt, locale)}
						className="shrink-0 text-[11px] tabular-nums text-muted-foreground transition-opacity group-hover/row:opacity-0 group-focus-within/row:opacity-0 [@media(hover:none)]:opacity-100"
					>
						{age}
					</time>
				</span>
				{subject && <span className={cn('truncate text-[13px] text-foreground', entry.isUnread ? 'font-medium' : 'font-normal')}>{subject}</span>}
				{entry.message && <span className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">{entry.message}</span>}
				{(entry.snoozedUntil || entry.awaitsDecision || entry.isDone) && (
					<span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
						{entry.awaitsDecision && <span className="rounded-full bg-primary/10 px-2 py-px font-medium text-primary">{t('inbox.DECISION.TITLE')}</span>}
						{entry.snoozedUntil && (
							<span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2 py-px">
								<Clock className="size-3" aria-hidden="true" />
								{formatNotificationDate(entry.snoozedUntil, locale)}
							</span>
						)}
						{entry.isDone && (
							<span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2 py-px">
								<Check className="size-3" aria-hidden="true" />
								{t('inbox.FILTERS.DONE')}
							</span>
						)}
					</span>
				)}
			</button>
			{/* Over the row's end on hover; on a touch screen, a line of its own under the text, since nothing hovers there. */}
			<div className="absolute end-2 top-1.5 flex items-center gap-0.5 rounded-lg bg-card p-0.5 opacity-0 shadow-sm shadow-black/10 hairline-ring ring-border transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:static [@media(hover:none)]:basis-full [@media(hover:none)]:justify-end [@media(hover:none)]:bg-transparent [@media(hover:none)]:p-0 [@media(hover:none)]:opacity-100 [@media(hover:none)]:[box-shadow:none]">
				{/* Where nothing hovers, the checkbox over the avatar never shows: selecting starts here, under the avatar. */}
				<span className="me-auto hidden size-8 items-center justify-center [@media(hover:none)]:flex">
					<Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(entry)} aria-label={t('inbox.ACTIONS.SELECT')} />
				</span>
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
