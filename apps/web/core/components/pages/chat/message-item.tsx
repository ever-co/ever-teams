'use client';

import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Comment, MapPin as Pin, MoreHorizontal, RotateLeft, Undo } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import { ChatOutboxMessage, isOutboxMessage } from '@/core/hooks/chat/use-chat-actions';
import { IChatMessage } from '@/core/types/interfaces/common/chat';
import { ChatMarkdown } from './chat-markdown';

/** The reactions offered on hover; the picker is one click further. */
export const QUICK_REACTIONS = ['👍', '✅', '👀', '🎉', '❤️'] as const;

function timeOf(createdAt: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(createdAt));
}

export interface MessageItemProps {
	message: IChatMessage;
	author: ChatPerson | null;
	people: ReadonlyMap<string, ChatPerson>;
	conversationNames: ReadonlyMap<string, string>;
	meEmployeeId: string | null;
	meUserId: string | null;
	locale: string;
	/** Whether the message continues the previous one's group (no author header). */
	continues: boolean;
	/** Whether the thread controls show (not inside a thread pane). */
	inTimeline: boolean;
	canManage: boolean;
	onReact: (message: IChatMessage, emoji: string) => void;
	onReply: (message: IChatMessage) => void;
	onEdit: (message: IChatMessage) => void;
	onDelete: (message: IChatMessage) => void;
	onPin: (message: IChatMessage, pinned: boolean) => void;
	onUnreadFrom: (message: IChatMessage) => void;
	onRetry: (message: ChatOutboxMessage) => void;
	onDiscard: (message: ChatOutboxMessage) => void;
	onCopyLink: (message: IChatMessage) => void;
	taskTitles: ReadonlyMap<string, string>;
	onOpenTask: (taskId: string) => void;
}

/** The placeholder the assistant's name is put at, to split the translated phrase around it. */
const NAME_SLOT = '\u0000';
/** The languages the app reads right to left. */
const RTL_LANGUAGES = new Set(['ar', 'he']);

function MessageItemComponent(props: Readonly<MessageItemProps>) {
	const { message, author, people, conversationNames, meEmployeeId, meUserId, locale, continues, inTimeline, canManage } = props;
	const t = useTranslations();
	const [menuOpen, setMenuOpen] = useState(false);
	const isMine = !!meUserId && String(message.authorUserId ?? '') === String(meUserId);
	const outbox = isOutboxMessage(message) ? message : null;
	// The attribution reads in the locale's direction, and the assistant's name is isolated (`<bdi>`), so a Latin
	// name in an Arabic or Hebrew phrase (or a name mixing both) keeps its place; a long name wraps.
	const assisted = message.assistedBy
		? (() => {
				const [before, after = ''] = t('teamChat.ASSISTED_BY', { name: NAME_SLOT }).split(NAME_SLOT);
				return (
					<span
						className="min-w-0 text-[11px] italic text-muted-foreground [overflow-wrap:anywhere]"
						dir={RTL_LANGUAGES.has(locale.split('-')[0]) ? 'rtl' : 'ltr'}
						data-assisted-by={message.assistedBy}
					>
						{before}
						<bdi>{message.assistedBy}</bdi>
						{after}
					</span>
				);
			})()
		: null;
	const deleted = !!message.deletedAt;
	const mentionsMe = (!!meEmployeeId && (message.mentionEmployeeIds ?? []).map(String).includes(meEmployeeId)) || message.mentionsChannel || message.mentionsHere;

	return (
		<div
			className={cn(
				'group/message relative flex gap-3 px-4 py-1',
				!continues && 'mt-2',
				mentionsMe && 'bg-amber-500/[0.06]',
				outbox?.outbox === 'failed' && 'bg-destructive/[0.06]'
			)}
			data-message-id={message.id}
		>
			<div className="w-7 shrink-0 pt-0.5">
				{!continues && (author ? <PersonAvatar person={{ id: author.employeeId, name: author.name, imageUrl: author.imageUrl }} size="sm" /> : <span className="block size-7 rounded-full bg-foreground/[0.06]" />)}
			</div>
			<div className="min-w-0 flex-1">
				{/* A message the author wrote with an assistant says so, and which one; on a grouped message it stands above the body. */}
				{continues && assisted}
				{!continues && (
					<div className="flex flex-wrap items-baseline gap-x-2">
						<span className="text-[13px] font-semibold text-foreground">{author?.name ?? (message.appName || t('teamChat.SOMEONE'))}</span>
						<time dateTime={message.createdAt} className="text-[11px] text-muted-foreground">
							{timeOf(message.createdAt, locale)}
						</time>
						{assisted}
						{message.pinnedAt && (
							<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
								<Pin className="size-3" /> {t('teamChat.PINNED')}
							</span>
						)}
					</div>
				)}
				{deleted ? (
					<p className="text-[13px] italic text-muted-foreground">{t('teamChat.DELETED')}</p>
				) : (
					<ChatMarkdown body={message.body} people={people} conversations={conversationNames} meEmployeeId={meEmployeeId} className={cn(outbox?.outbox === 'pending' && 'opacity-60')} />
				)}
				{message.editedAt && !deleted && <span className="text-[11px] text-muted-foreground">{t('teamChat.EDITED')}</span>}
				{(message.taskReferences ?? []).map((reference) => (
					<button
						key={reference.taskId}
						type="button"
						onClick={() => props.onOpenTask(reference.taskId)}
						className="mt-1 flex w-full max-w-md cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-[13px] hover:bg-foreground/[0.03]"
					>
						<span className="truncate font-medium text-foreground">{props.taskTitles.get(reference.taskId) ?? t('teamChat.TASK_CARD')}</span>
						<span className="ml-auto text-[11px] text-muted-foreground">{t('teamChat.OPEN_TASK')}</span>
					</button>
				))}
				{!!message.reactions?.length && (
					<div className="mt-1 flex flex-wrap gap-1">
						{message.reactions.map((reaction) => (
							<button
								key={reaction.emoji}
								type="button"
								onClick={() => props.onReact(message, reaction.emoji)}
								className={cn(
									'inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-px text-xs',
									reaction.mine ? 'border-primary/40 bg-primary/10' : 'border-border hover:bg-foreground/[0.04]'
								)}
								aria-pressed={reaction.mine}
							>
								<span>{reaction.emoji}</span>
								<span className="tabular-nums">{reaction.count}</span>
							</button>
						))}
					</div>
				)}
				{inTimeline && message.replyCount > 0 && (
					<button type="button" onClick={() => props.onReply(message)} className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline">
						<Comment className="size-3.5" />
						{t('teamChat.REPLIES', { count: message.replyCount })}
					</button>
				)}
				{outbox?.outbox === 'failed' && (
					<div className="mt-1 flex items-center gap-2 text-xs text-destructive">
						<span>{t('teamChat.SEND_FAILED')}</span>
						<Button variant="ghost" size="sm" onClick={() => props.onRetry(outbox)}>
							<RotateLeft className="size-3.5" /> {t('teamChat.RETRY')}
						</Button>
						<Button variant="ghost" size="sm" onClick={() => props.onDiscard(outbox)}>
							{t('teamChat.DISCARD')}
						</Button>
					</div>
				)}
			</div>
			{!deleted && !outbox && (
				<div
					className={cn(
						'absolute -top-3 right-4 flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 shadow-sm',
						menuOpen ? 'opacity-100' : 'opacity-0 group-hover/message:opacity-100 group-focus-within/message:opacity-100'
					)}
				>
					{QUICK_REACTIONS.map((emoji) => (
						<button key={emoji} type="button" onClick={() => props.onReact(message, emoji)} className="cursor-pointer rounded-sm px-1 text-sm hover:bg-foreground/[0.06]" aria-label={emoji}>
							{emoji}
						</button>
					))}
					{inTimeline && (
						<Button variant="ghost" size="icon-sm" aria-label={t('teamChat.REPLY_IN_THREAD')} title={t('teamChat.REPLY_IN_THREAD')} onClick={() => props.onReply(message)}>
							<Comment className="size-4" />
						</Button>
					)}
					<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon-sm" aria-label={t('teamChat.MORE')}>
								<MoreHorizontal className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => props.onCopyLink(message)}>{t('teamChat.COPY_LINK')}</DropdownMenuItem>
							<DropdownMenuItem onClick={() => props.onPin(message, !message.pinnedAt)}>{message.pinnedAt ? t('teamChat.UNPIN') : t('teamChat.PIN')}</DropdownMenuItem>
							<DropdownMenuItem onClick={() => props.onUnreadFrom(message)}>
								<Undo className="size-4" /> {t('teamChat.MARK_UNREAD_FROM')}
							</DropdownMenuItem>
							{(isMine || canManage) && <DropdownMenuSeparator />}
							{isMine && <DropdownMenuItem onClick={() => props.onEdit(message)}>{t('teamChat.EDIT')}</DropdownMenuItem>}
							{(isMine || canManage) && (
								<DropdownMenuItem onClick={() => props.onDelete(message)} className="text-destructive">
									{t('teamChat.DELETE')}
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)}
		</div>
	);
}

export const MessageItem = memo(MessageItemComponent);
