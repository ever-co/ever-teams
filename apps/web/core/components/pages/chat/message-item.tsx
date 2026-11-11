'use client';

import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, ChevronRight, CircleAlert, Comment, Link, MapPin as Pin, MoreHorizontal, Pencil, Plus, RotateLeft, Smile, Task, Trash, Undo } from '@/core/components/icons';
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
import { clockTime, fullDateTime, relativeTime, shortClockTime } from '@/core/lib/utils/chat-timeline';
import { ChatOutboxMessage, isOutboxMessage } from '@/core/hooks/chat/use-chat-actions';
import { attachmentIdsOf, isFallbackBody } from '@/core/lib/utils/chat-attachments';
import { IChatFile, IChatMessage } from '@/core/types/interfaces/common/chat';
import { MessageAttachments } from './chat-attachments';
import { ChatMarkdown } from './chat-markdown';
import { EmojiPopover } from './emoji-popover';

/** The reactions offered on hover (the first few on the message's toolbar); the picker is one click further. */
export const QUICK_REACTIONS = ['👍', '✅', '👀', '🎉', '❤️'] as const;

/** How many of them the hover toolbar shows before the picker. */
const TOOLBAR_REACTIONS = 3;

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
	/** The present moment, for "last reply 5 minutes ago": the timeline moves it on so the words stay true. */
	now?: number;
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
	/** "Create task" from the message; the item is left out where it is not offered. */
	onCreateTask?: (message: IChatMessage) => void;
	/** The conversation's files by document id: what the message's attachments show. */
	files?: ReadonlyMap<string, IChatFile>;
	/** A picture of the message opened in the lightbox. */
	onOpenImage?: (file: IChatFile) => void;
	/** A picture that did not load (its signed address expired): the files are read again. */
	onBrokenImage?: () => void;
}

const NO_FILES: ReadonlyMap<string, IChatFile> = new Map();
const IGNORE = () => undefined;

/** The placeholder the assistant's name is put at, to split the translated phrase around it. */
const NAME_SLOT = '\u0000';
/** The languages the app reads right to left. */
const RTL_LANGUAGES = new Set(['ar', 'he']);

const TOOLBAR_BUTTON =
	'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.07] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[popup-open]:bg-foreground/[0.07] data-[popup-open]:text-foreground data-[state=open]:bg-foreground/[0.07] data-[state=open]:text-foreground [&_svg]:size-4';

/**
 * The toolbar floats over the top edge of its message. It shows while the pointer is on the message, while a key
 * press has the focus inside it, and while one of its own menus is open; on a touch screen, where nothing hovers, a
 * tap on the message shows it. Hidden, it takes no clicks: a tap never lands on a button nobody can see.
 */
const TOOLBAR = [
	'pointer-events-none absolute -top-3.5 end-4 z-[1] flex items-center gap-0.5 rounded-lg bg-popover p-0.5 opacity-0 shadow-sm shadow-black/5 hairline-ring ring-border transition-opacity',
	'group-hover/message:pointer-events-auto group-hover/message:opacity-100',
	'group-has-[:focus-visible]/message:pointer-events-auto group-has-[:focus-visible]/message:opacity-100',
	'[@media(hover:none)]:group-focus-within/message:pointer-events-auto [@media(hover:none)]:group-focus-within/message:opacity-100'
].join(' ');

const REACTION_PILL = 'inline-flex h-[26px] cursor-pointer items-center justify-center rounded-full px-2 text-xs outline-none hairline-ring transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25';

function MessageItemComponent(props: Readonly<MessageItemProps>) {
	const { message, author, people, conversationNames, meEmployeeId, meUserId, locale, continues, inTimeline, canManage, now } = props;
	const t = useTranslations();
	const [menuOpen, setMenuOpen] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
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
	const pinned = !!message.pinnedAt && !deleted;
	const edited = !!message.editedAt && !deleted;
	const failed = outbox?.outbox === 'failed';
	const canReact = !deleted && !outbox;
	const mentionsMe = (!!meEmployeeId && (message.mentionEmployeeIds ?? []).map(String).includes(meEmployeeId)) || message.mentionsChannel || message.mentionsHere;
	const createdAt = new Date(message.createdAt);
	const sentAt = fullDateTime(createdAt, locale);
	const name = author?.name || message.appName || t('teamChat.SOMEONE');
	const reactions = message.reactions ?? [];
	const files = props.files ?? NO_FILES;
	const attachmentIds = attachmentIdsOf(message);
	const attachedFiles = attachmentIds.map((id) => files.get(id)).filter((file): file is IChatFile => !!file);
	// A message sent with files and no words carries their names as its body: the files say it, the body is not repeated.
	const bodyIsFileNames = !!attachmentIds.length && attachedFiles.length === attachmentIds.length && isFallbackBody(message.body, attachedFiles);

	return (
		<div
			className={cn(
				'group/message relative px-4 outline-none transition-colors hover:bg-foreground/[0.025] data-[highlight=true]:bg-primary/[0.09]',
				continues ? 'py-0.5' : 'mt-1.5 pb-0.5 pt-1.5',
				mentionsMe && 'bg-amber-500/[0.06] hover:bg-amber-500/[0.09]',
				failed && 'bg-destructive/[0.06] hover:bg-destructive/[0.08]'
			)}
			data-message-id={message.id}
			// Focusable by a tap, not by Tab: on a touch screen that is what shows the message's toolbar.
			tabIndex={-1}
		>
			{/* A pinned message says so on a line of its own, above its author. */}
			{pinned && (
				<div className="flex items-center gap-1 pb-0.5 ps-12 text-[11px] font-medium text-muted-foreground">
					<Pin className="size-3 text-primary" aria-hidden="true" />
					{t('teamChat.PINNED')}
				</div>
			)}
			<div className="flex gap-3">
				<div className="flex w-9 shrink-0 justify-center">
					{continues ? (
						// A grouped message has no header: its time shows in the gutter while the pointer is on it.
						<time
							dateTime={message.createdAt}
							title={sentAt}
							className="select-none pt-0.5 text-[10px] tabular-nums leading-5 text-muted-foreground opacity-0 transition-opacity group-hover/message:opacity-100 group-has-[:focus-visible]/message:opacity-100"
						>
							{shortClockTime(createdAt, locale)}
						</time>
					) : author ? (
						<PersonAvatar person={{ id: author.employeeId, name: author.name, imageUrl: author.imageUrl }} size="md" className="mt-0.5 size-9 text-xs ring-0" />
					) : (
						<span className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground" aria-hidden="true">
							{message.appName && <Bot className="size-4" />}
						</span>
					)}
				</div>
				<div className="min-w-0 flex-1">
					{/* A message the author wrote with an assistant says so, and which one; on a grouped message it stands above the body. */}
					{continues && assisted}
					{!continues && (
						<div className="flex flex-wrap items-baseline gap-x-2">
							<span className="text-[13px] font-semibold text-foreground">{name}</span>
							<time dateTime={message.createdAt} title={sentAt} className="text-[11px] text-muted-foreground">
								{clockTime(createdAt, locale)}
							</time>
							{assisted}
						</div>
					)}
					{deleted ? (
						<p className="text-[13px] italic text-muted-foreground">{t('teamChat.DELETED')}</p>
					) : bodyIsFileNames ? null : (
						<>
							{/* An edited message says so right after its last words: its last paragraph runs on into the mark. */}
							<ChatMarkdown
								body={message.body}
								people={people}
								conversations={conversationNames}
								meEmployeeId={meEmployeeId}
								className={cn(outbox?.outbox === 'pending' && 'opacity-60', edited && 'inline [&>p:last-child]:inline')}
							/>
							{edited && (
								<span className="ms-1.5 whitespace-nowrap text-[11px] text-muted-foreground" title={message.editedAt ? fullDateTime(new Date(message.editedAt), locale) : undefined}>
									{t('teamChat.EDITED')}
								</span>
							)}
						</>
					)}
					{attachmentIds.length > 0 && (
						<div className={cn(outbox?.outbox === 'pending' && 'opacity-60')}>
							<MessageAttachments attachmentIds={attachmentIds} files={files} onOpenImage={props.onOpenImage ?? IGNORE} onBrokenImage={props.onBrokenImage} />
						</div>
					)}
					{(message.taskReferences ?? []).map((reference) => (
						<button
							key={reference.taskId}
							type="button"
							onClick={() => props.onOpenTask(reference.taskId)}
							className="group/task mt-1.5 flex w-full max-w-md cursor-pointer items-center gap-2.5 rounded-lg bg-card px-2.5 py-2 text-start text-[13px] outline-none hairline-ring ring-border transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25"
						>
							<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
								<Task className="size-3.5" />
							</span>
							<span className="min-w-0 flex-1 truncate font-medium text-foreground">{props.taskTitles.get(reference.taskId) ?? t('teamChat.TASK_CARD')}</span>
							<span className="shrink-0 text-[11px] text-muted-foreground">{t('teamChat.OPEN_TASK')}</span>
							<ChevronRight className="size-3.5 shrink-0 text-muted-foreground/70 rtl:rotate-180" aria-hidden="true" />
						</button>
					))}
					{reactions.length > 0 && (
						<div className="mt-1.5 flex flex-wrap items-center gap-1">
							{reactions.map((reaction) => (
								<button
									key={reaction.emoji}
									type="button"
									onClick={() => props.onReact(message, reaction.emoji)}
									className={cn(
										REACTION_PILL,
										'min-w-11 gap-1.5',
										reaction.mine ? 'bg-primary/10 font-medium text-primary ring-primary/40 hover:bg-primary/15' : 'bg-foreground/[0.03] text-foreground ring-border hover:bg-foreground/[0.07]'
									)}
									aria-pressed={reaction.mine}
									title={t('teamChat.REACT_WITH', { emoji: reaction.emoji })}
								>
									<span className="text-sm leading-none">{reaction.emoji}</span>
									<span className="tabular-nums">{reaction.count}</span>
								</button>
							))}
							{canReact && (
								<EmojiPopover
									label={t('teamChat.ADD_REACTION')}
									onPick={(emoji) => props.onReact(message, emoji)}
									className={cn(REACTION_PILL, 'gap-px text-muted-foreground ring-border hover:bg-foreground/[0.05] hover:text-foreground data-[popup-open]:bg-foreground/[0.05]')}
								>
									<Smile className="size-3.5" />
									<Plus className="size-2.5" />
								</EmojiPopover>
							)}
						</div>
					)}
					{inTimeline && message.replyCount > 0 && (
						<button
							type="button"
							onClick={() => props.onReply(message)}
							className="group/thread -ms-1.5 mt-1 flex h-8 w-full max-w-md cursor-pointer items-center gap-2 rounded-lg px-1.5 text-start text-[13px] outline-none transition-colors hover:bg-card hover:hairline-ring hover:ring-border focus-visible:ring-[3px] focus-visible:ring-ring/25"
						>
							<Comment className="size-4 shrink-0 text-primary" aria-hidden="true" />
							<span className="shrink-0 font-medium text-primary">{t('teamChat.REPLIES', { count: message.replyCount })}</span>
							{message.lastReplyAt && (
								<span className="min-w-0 truncate text-xs text-muted-foreground" title={fullDateTime(new Date(message.lastReplyAt), locale)}>
									{t('teamChat.LAST_REPLY', { time: relativeTime(new Date(message.lastReplyAt), locale, now ? new Date(now) : undefined) })}
								</span>
							)}
							<ChevronRight
								className="ms-auto size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/thread:opacity-100 group-focus-visible/thread:opacity-100 rtl:rotate-180 [@media(hover:none)]:opacity-100"
								aria-hidden="true"
							/>
						</button>
					)}
					{failed && outbox && (
						<div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-destructive">
							<CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
							<span className="me-1">{t('teamChat.SEND_FAILED')}</span>
							<Button variant="outline" size="sm" onClick={() => props.onRetry(outbox)}>
								<RotateLeft className="size-3.5" /> {t('teamChat.RETRY')}
							</Button>
							<Button variant="ghost" size="sm" onClick={() => props.onDiscard(outbox)}>
								{t('teamChat.DISCARD')}
							</Button>
						</div>
					)}
				</div>
			</div>
			{canReact && (
				<div className={cn(TOOLBAR, (menuOpen || pickerOpen) && 'pointer-events-auto opacity-100')}>
					{QUICK_REACTIONS.slice(0, TOOLBAR_REACTIONS).map((emoji) => (
						<button
							key={emoji}
							type="button"
							onClick={() => props.onReact(message, emoji)}
							className={cn(TOOLBAR_BUTTON, 'text-[15px] leading-none')}
							aria-label={t('teamChat.REACT_WITH', { emoji })}
							title={t('teamChat.REACT_WITH', { emoji })}
						>
							{emoji}
						</button>
					))}
					<EmojiPopover label={t('teamChat.ADD_REACTION')} align="end" onOpenChange={setPickerOpen} onPick={(emoji) => props.onReact(message, emoji)} className={TOOLBAR_BUTTON}>
						<Smile />
					</EmojiPopover>
					{inTimeline && (
						<button type="button" className={TOOLBAR_BUTTON} aria-label={t('teamChat.REPLY_IN_THREAD')} title={t('teamChat.REPLY_IN_THREAD')} onClick={() => props.onReply(message)}>
							<Comment />
						</button>
					)}
					<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
						<DropdownMenuTrigger asChild>
							<button type="button" className={TOOLBAR_BUTTON} aria-label={t('teamChat.MORE')} title={t('teamChat.MORE')}>
								<MoreHorizontal />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-52">
							<DropdownMenuItem onClick={() => props.onCopyLink(message)}>
								<Link /> {t('teamChat.COPY_LINK')}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => props.onPin(message, !message.pinnedAt)}>
								<Pin /> {message.pinnedAt ? t('teamChat.UNPIN') : t('teamChat.PIN')}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => props.onUnreadFrom(message)}>
								<Undo /> {t('teamChat.MARK_UNREAD_FROM')}
							</DropdownMenuItem>
							{props.onCreateTask && message.body.trim() && (
								<DropdownMenuItem onClick={() => props.onCreateTask?.(message)}>
									<Task /> {t('teamChat.CREATE_TASK')}
								</DropdownMenuItem>
							)}
							{(isMine || canManage) && <DropdownMenuSeparator />}
							{isMine && (
								<DropdownMenuItem onClick={() => props.onEdit(message)}>
									<Pencil /> {t('teamChat.EDIT')}
								</DropdownMenuItem>
							)}
							{(isMine || canManage) && (
								<DropdownMenuItem variant="destructive" onClick={() => props.onDelete(message)}>
									<Trash /> {t('teamChat.DELETE')}
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
