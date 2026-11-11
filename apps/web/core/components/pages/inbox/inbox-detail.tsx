'use client';

import type { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import {
	Archive,
	ArrowUpRight,
	Check,
	Clock,
	Inbox,
	Mail,
	MailOpen,
	RotateLeft,
	Stop,
	X
} from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import type { Person } from '@/core/components/teams/people-avatars';
import { formatNotificationDate } from '@/core/lib/utils/notification-inbox';
import { InboxEntry, hasInboxTarget } from '@/core/lib/utils/inbox-entry';
import { timerReminderTargetState } from '@/core/stores/timer/timer-reminder';
import { InboxDecisionPanel } from './inbox-decision';
import { InboxAvatar, useInboxMessage, useInboxSentence } from './inbox-row';
import { SnoozeMenu } from './snooze-menu';

const BAR_BUTTON =
	'inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-4';

/** The keys of the list, as the empty pane teaches them. */
const SHORTCUTS: ReadonlyArray<{ keys: readonly string[]; label: 'OPEN' | 'MOVE' | 'READ' | 'ARCHIVE' | 'SNOOZE' | 'DONE' | 'SELECT' }> = [
	{ keys: ['J', 'K'], label: 'MOVE' },
	{ keys: ['Enter'], label: 'OPEN' },
	{ keys: ['U'], label: 'READ' },
	{ keys: ['E'], label: 'ARCHIVE' },
	{ keys: ['H'], label: 'SNOOZE' },
	{ keys: ['D'], label: 'DONE' },
	{ keys: ['X'], label: 'SELECT' }
];

interface InboxDetailProps {
	entry: InboxEntry | null;
	person: Person | null;
	taskTitle: string | null;
	/** Snooze and done exist only on a platform with the inbox extension. */
	canTriage: boolean;
	onOpenTarget: (entry: InboxEntry) => void;
	onToggleRead: (entry: InboxEntry) => void;
	onArchive: (entry: InboxEntry) => void;
	onSnooze: (entry: InboxEntry, until: Date | null) => void;
	onDone: (entry: InboxEntry) => void;
	/** Answers a question, an approval or an escalation. */
	onReply?: (entry: InboxEntry, input: { optionId?: string; text?: string }) => Promise<boolean>;
	/** Closes the pane where it covers the list (a phone). */
	onClose?: () => void;
}

/**
 * The pane beside the list: who did what and when, what it is about, the text, and every action of the row. A task
 * opens in the task drawer; a chat message opens its conversation at the message; anything else follows its link.
 */
export function InboxDetail(props: Readonly<InboxDetailProps>) {
	const t = useTranslations();
	if (!props.entry) return <InboxDetailEmpty />;
	return <InboxDetailEntry {...props} entry={props.entry} openLabel={openLabelOf(props.entry, t)} />;
}

function openLabelOf(entry: InboxEntry, t: ReturnType<typeof useTranslations>): string {
	if (entry.taskId) return t('inbox.DETAIL.OPEN_TASK');
	if (entry.timerReminder) return t('notifications.TIMER_REMINDER.OPEN');
	return t('inbox.DETAIL.OPEN');
}

/**
 * The "Stop timer" of a timer reminder, while the run it is about still runs. It stops it through the app's timer
 * owner, as the reminder's toast does (`timerReminderTargetState`).
 */
function TimerReminderStop({ entry }: Readonly<{ entry: InboxEntry }>) {
	const t = useTranslations();
	const target = useAtomValue(timerReminderTargetState);
	const timeLogId = entry.timerReminder?.timeLogId;
	if (!timeLogId || !target || target.runKey !== timeLogId) return null;
	return (
		<Button size="sm" variant="outline" onClick={() => void Promise.resolve(target.stop()).catch(() => undefined)}>
			<Stop className="size-4" />
			{t('notifications.TIMER_REMINDER.STOP')}
		</Button>
	);
}

function InboxDetailEmpty() {
	const t = useTranslations();
	return (
		<div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
			<div className="flex flex-col items-center gap-2">
				<span className="mb-1 flex size-11 items-center justify-center rounded-xl bg-foreground/[0.05] text-muted-foreground" aria-hidden="true">
					<Inbox className="size-5" />
				</span>
				<p className="text-sm font-medium text-foreground">{t('inbox.DETAIL.NO_SELECTION')}</p>
			</div>
			<dl className="grid grid-cols-[auto_auto] items-center gap-x-4 gap-y-1.5 text-start text-xs text-muted-foreground">
				{SHORTCUTS.map((shortcut) => (
					<div key={shortcut.label} className="contents">
						<dt className="flex justify-end gap-1">
							{shortcut.keys.map((key) => (
								<kbd key={key} className="keycap-3d inline-flex h-5 min-w-5 items-center justify-center rounded px-1 font-sans text-[10px] font-medium text-foreground/80">
									{key}
								</kbd>
							))}
						</dt>
						<dd>{t(`inbox.KEYBOARD.${shortcut.label}`)}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

function InboxDetailEntry({
	entry,
	person,
	taskTitle,
	canTriage,
	onOpenTarget,
	onToggleRead,
	onArchive,
	onSnooze,
	onDone,
	onReply,
	onClose,
	openLabel
}: Readonly<InboxDetailProps & { entry: InboxEntry; openLabel: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const sentence = useInboxSentence(entry, person);
	const message = useInboxMessage(entry);
	const hasTarget = hasInboxTarget(entry);
	const title = taskTitle ?? entry.subject ?? (entry.type ? null : entry.rawTitle);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex h-12 shrink-0 items-center gap-1 px-3 hairline-b border-border">
				{hasTarget && (
					<Button size="sm" onClick={() => onOpenTarget(entry)}>
						<ArrowUpRight className="size-4" />
						{openLabel}
					</Button>
				)}
				{entry.timerReminder && <TimerReminderStop entry={entry} />}
				<span className="ms-auto flex items-center gap-0.5">
					<BarAction label={entry.isUnread ? t('notifications.MARK_READ') : t('notifications.MARK_UNREAD')} onClick={() => onToggleRead(entry)}>
						{entry.isUnread ? <MailOpen /> : <Mail />}
					</BarAction>
					{canTriage && (
						<>
							<SnoozeMenu isSnoozed={!!entry.snoozedUntil} onSnooze={(until) => onSnooze(entry, until)} onUnsnooze={() => onSnooze(entry, null)}>
								<button type="button" className={BAR_BUTTON} aria-label={t('inbox.ACTIONS.SNOOZE')} title={t('inbox.ACTIONS.SNOOZE')}>
									<Clock />
								</button>
							</SnoozeMenu>
							<BarAction label={entry.isDone ? t('inbox.ACTIONS.NOT_DONE') : t('inbox.ACTIONS.DONE')} onClick={() => onDone(entry)}>
								{entry.isDone ? <RotateLeft /> : <Check />}
							</BarAction>
						</>
					)}
					<BarAction label={entry.isArchived ? t('inbox.ACTIONS.UNARCHIVE') : t('notifications.ARCHIVE')} onClick={() => onArchive(entry)}>
						{entry.isArchived ? <RotateLeft /> : <Archive />}
					</BarAction>
					{onClose && (
						<BarAction label={t('inbox.DETAIL.CLOSE')} onClick={onClose}>
							<X />
						</BarAction>
					)}
				</span>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-6 py-8">
					<div className="flex items-center gap-3">
						<InboxAvatar entry={entry} person={person} size="lg" />
						<div className="min-w-0 flex-1">
							<p className="text-sm text-foreground text-balance">{sentence}</p>
							<p className="text-xs text-muted-foreground">
								<time dateTime={entry.createdAt.toISOString()}>{formatNotificationDate(entry.createdAt, locale)}</time>
							</p>
						</div>
					</div>

					{title && <h2 className="text-xl font-semibold tracking-tight text-foreground text-balance">{title}</h2>}

					{message && (
						<blockquote className="rounded-xl bg-card px-4 py-3 text-sm leading-relaxed text-foreground hairline-ring ring-border">
							<p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message}</p>
						</blockquote>
					)}
					{!message && !title && entry.rawTitle && (
						<p className="text-sm text-muted-foreground">{entry.rawTitle}</p>
					)}

					{entry.snoozedUntil && (
						<p className="inline-flex items-center gap-1.5 self-start rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs text-muted-foreground">
							<Clock className="size-3.5" aria-hidden="true" />
							{formatNotificationDate(entry.snoozedUntil, locale)}
						</p>
					)}

					{entry.decision && onReply && (
						<InboxDecisionPanel key={entry.id} decision={entry.decision} isOpen={entry.awaitsDecision} onReply={(input) => onReply(entry, input)} />
					)}

					{!hasTarget && !entry.decision && <p className="text-xs text-muted-foreground">{t('inbox.DETAIL.NO_TARGET')}</p>}
				</div>
			</div>
		</div>
	);
}

function BarAction({ label, onClick, children }: Readonly<{ label: string; onClick: () => void; children: ReactNode }>) {
	return (
		<button type="button" className={BAR_BUTTON} aria-label={label} title={label} onClick={onClick}>
			{children}
		</button>
	);
}
