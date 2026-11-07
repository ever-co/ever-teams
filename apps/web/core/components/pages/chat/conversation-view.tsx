'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Bell, BellOff, Lock, Star, Users } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/core/components/common/dropdown-menu';
import { NotificationErrorState, NotificationRowsSkeleton } from '@/core/components/notifications/inbox/notification-states';
import { useChatActions, ChatOutboxMessage } from '@/core/hooks/chat/use-chat-actions';
import { useChatDraft } from '@/core/hooks/chat/use-chat-draft';
import { useChatMessages } from '@/core/hooks/chat/use-chat-messages';
import { useChatPeople, useChatScope } from '@/core/hooks/chat/use-chat-scope';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { cn } from '@/core/lib/helpers';
import { continuesGroup, conversationTitle } from '@/core/lib/utils/chat-format';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import { EChatConversationKind, EChatNotifyLevel, EChatVisibility, IChatConversationWithState, IChatMessage } from '@/core/types/interfaces/common/chat';
import { MessageComposer } from './message-composer';
import { MessageItem } from './message-item';

export interface ConversationViewProps {
	conversation: IChatConversationWithState;
	conversationNames: ReadonlyMap<string, string>;
	canManage: boolean;
	onOpenThread: (rootMessageId: string) => void;
	onBack?: () => void;
	/** `?m=` — the message to scroll to once loaded. */
	jumpToMessageId?: string | null;
}

/** The middle pane: the header, the timeline (older pages above, newest at the bottom) and the composer. */
export function ConversationView({ conversation, conversationNames, canManage, onOpenThread, onBack, jumpToMessageId }: Readonly<ConversationViewProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const scope = useChatScope();
	const people = useChatPeople();
	const actions = useChatActions();
	const { openTaskDrawer } = useTaskDrawer();
	const tasks = useAtomValue(tasksByTeamState);
	const taskTitles = useMemo(() => new Map(tasks.map((task) => [task.id, task.title])), [tasks]);
	const { messages, hasBefore, isLoading, isError, isLoadingOlder, loadOlder, retry, newestId } = useChatMessages(conversation.id, true);
	const { draft, setDraft, clearDraft } = useChatDraft(conversation.id);
	const [editing, setEditing] = useState<IChatMessage | null>(null);
	const [editValue, setEditValue] = useState('');
	const list = useRef<HTMLDivElement | null>(null);
	const stickToBottom = useRef(true);
	const title = conversationTitle(conversation, people.byEmployee, scope?.employeeId ?? null, t('teamChat.UNNAMED'));
	const isChannel = conversation.kind === EChatConversationKind.Channel;
	const archived = !!conversation.archivedAt;
	const reportFailure = useCallback(() => toast.error(t('teamChat.UPDATE_FAILED')), [t]);

	// The newest message stays in view while the reader is at the bottom; a jump target scrolls into view once.
	useEffect(() => {
		const element = list.current;
		if (!element) return;
		if (jumpToMessageId) {
			const target = element.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(jumpToMessageId)}"]`);
			if (target) {
				target.scrollIntoView({ block: 'center' });
				target.classList.add('ring-2', 'ring-primary/40');
				window.setTimeout(() => target.classList.remove('ring-2', 'ring-primary/40'), 2000);
				return;
			}
		}
		if (stickToBottom.current) element.scrollTop = element.scrollHeight;
	}, [newestId, jumpToMessageId, messages.length]);

	// Viewing the conversation reads it (once its first page is there and whenever something new arrives at the bottom).
	useEffect(() => {
		if (!newestId || !conversation.state) return;
		if ((conversation.state.unreadCount ?? 0) > 0 || (conversation.state.mentionCount ?? 0) > 0) {
			actions.read(conversation.id).catch(() => undefined);
		}
	}, [actions, conversation.id, conversation.state, newestId]);

	const onScroll = useCallback(() => {
		const element = list.current;
		if (!element) return;
		stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 40;
		if (element.scrollTop < 80 && hasBefore && !isLoadingOlder) {
			const before = element.scrollHeight;
			void loadOlder().then(() => {
				// Keep what the reader was looking at in place after the older page is prepended.
				requestAnimationFrame(() => {
					if (list.current) list.current.scrollTop += list.current.scrollHeight - before;
				});
			});
		}
	}, [hasBefore, isLoadingOlder, loadOlder]);

	const send = useCallback(
		async (body: string) => {
			clearDraft();
			stickToBottom.current = true;
			await actions.send(conversation.id, { body }).catch(() => toast.error(t('teamChat.SEND_FAILED')));
		},
		[actions, clearDraft, conversation.id, t]
	);

	const saveEdit = useCallback(
		async (body: string) => {
			if (!editing) return;
			try {
				await actions.edit(editing, body);
				setEditing(null);
			} catch {
				reportFailure();
			}
		},
		[actions, editing, reportFailure]
	);

	const handlers = useMemo(
		() => ({
			onReact: (message: IChatMessage, emoji: string) => actions.react(message, emoji).catch(reportFailure),
			onReply: (message: IChatMessage) => onOpenThread(message.threadRootId ?? message.id),
			onEdit: (message: IChatMessage) => {
				setEditing(message);
				setEditValue(message.body);
			},
			onDelete: (message: IChatMessage) => actions.remove(message).catch(reportFailure),
			onPin: (message: IChatMessage, pinned: boolean) => actions.pin(message, pinned).catch(reportFailure),
			onUnreadFrom: (message: IChatMessage) => actions.unreadFrom(message).then(() => toast(t('teamChat.MARKED_UNREAD'))).catch(reportFailure),
			onRetry: (message: ChatOutboxMessage) => actions.retry(conversation.id, message).catch(() => toast.error(t('teamChat.SEND_FAILED'))),
			onDiscard: (message: ChatOutboxMessage) => actions.discardFailed(conversation.id, message.id),
			onCopyLink: (message: IChatMessage) => {
				const url = `${window.location.origin}/chat/${conversation.id}?m=${message.id}`;
				navigator.clipboard?.writeText(url).then(() => toast(t('teamChat.LINK_COPIED'))).catch(() => undefined);
			},
			onOpenTask: (taskId: string) => openTaskDrawer(taskId)
		}),
		[actions, conversation.id, onOpenThread, openTaskDrawer, reportFailure, t]
	);

	const setNotify = (level: EChatNotifyLevel) => actions.setMemberState(conversation.id, { notifyLevel: level }).catch(reportFailure);
	const toggleFavorite = () => actions.setMemberState(conversation.id, { isFavorite: !conversation.state?.isFavorite }).catch(reportFailure);
	const leave = () =>
		actions
			.leave(conversation.id)
			.then(() => router.push('/chat'))
			.catch(reportFailure);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
				{onBack && (
					<Button variant="ghost" size="sm" onClick={onBack} className="lg:hidden">
						{t('teamChat.BACK')}
					</Button>
				)}
				<span className="text-muted-foreground">{isChannel ? conversation.visibility === EChatVisibility.Private ? <Lock className="size-4" /> : '#' : <Users className="size-4" />}</span>
				<h1 className="min-w-0 truncate text-sm font-semibold text-foreground">{title.replace(/^#/, '')}</h1>
				{conversation.topic && <span className="hidden min-w-0 truncate text-xs text-muted-foreground md:inline">{conversation.topic}</span>}
				<span className="ml-auto flex items-center gap-1">
					<span className="hidden text-xs text-muted-foreground sm:inline">{t('teamChat.MEMBER_COUNT', { count: conversation.memberCount })}</span>
					<Button variant="ghost" size="icon-sm" onClick={toggleFavorite} aria-label={t('teamChat.FAVORITE')} title={t('teamChat.FAVORITE')} aria-pressed={!!conversation.state?.isFavorite}>
						<Star className={cn('size-4', conversation.state?.isFavorite && 'fill-amber-500 text-amber-500')} />
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon-sm" aria-label={t('teamChat.NOTIFY_LEVEL')} title={t('teamChat.NOTIFY_LEVEL')}>
								{conversation.state?.notifyLevel === EChatNotifyLevel.Muted ? <BellOff className="size-4" /> : <Bell className="size-4" />}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuRadioGroup value={String(conversation.state?.notifyLevel ?? EChatNotifyLevel.All)} onValueChange={(value) => setNotify(value as EChatNotifyLevel)}>
								<DropdownMenuRadioItem value={EChatNotifyLevel.All}>{t('teamChat.NOTIFY.ALL')}</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value={EChatNotifyLevel.Mentions}>{t('teamChat.NOTIFY.MENTIONS')}</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value={EChatNotifyLevel.Muted}>{t('teamChat.NOTIFY.MUTED')}</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
							{!conversation.isDefault && conversation.kind !== EChatConversationKind.Direct && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={leave} className="text-destructive">
										{t('teamChat.LEAVE')}
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</span>
			</header>

			<div ref={list} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2" role="log" aria-live="polite" aria-busy={isLoading}>
				{isLoading && <NotificationRowsSkeleton rows={8} />}
				{isError && <NotificationErrorState message={t('teamChat.LOAD_ERROR')} retryLabel={t('teamChat.RETRY')} onRetry={() => retry()} />}
				{!isLoading && !isError && hasBefore && (
					<div className="flex justify-center py-2">
						<Button variant="ghost" size="sm" onClick={() => void loadOlder()} disabled={isLoadingOlder}>
							{t('teamChat.LOAD_OLDER')}
						</Button>
					</div>
				)}
				{!isLoading && !isError && messages.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('teamChat.EMPTY_CONVERSATION')}</p>}
				{messages.map((message, index) =>
					editing?.id === message.id ? (
						<div key={message.id} className="px-4 py-2">
							<MessageComposer value={editValue} onChange={setEditValue} onSubmit={saveEdit} onCancel={() => setEditing(null)} people={people.list} placeholder={t('teamChat.EDIT')} editing autoFocus />
						</div>
					) : (
						<MessageItem
							key={message.id}
							message={message}
							author={message.authorEmployeeId ? (people.byEmployee.get(String(message.authorEmployeeId)) ?? null) : message.authorUserId ? (people.byUser.get(String(message.authorUserId)) ?? null) : null}
							people={people.byEmployee}
							conversationNames={conversationNames}
							meEmployeeId={scope?.employeeId ?? null}
							meUserId={scope?.userId ?? null}
							locale={locale}
							continues={continuesGroup(messages[index - 1], message)}
							inTimeline
							canManage={canManage}
							taskTitles={taskTitles}
							{...handlers}
						/>
					)
				)}
			</div>

			<div className="shrink-0 px-4 pb-3 pt-1">
				{archived ? (
					<p className="rounded-md bg-foreground/[0.04] px-3 py-2 text-xs text-muted-foreground">{t('teamChat.ARCHIVED_NOTICE')}</p>
				) : (
					<MessageComposer value={draft} onChange={setDraft} onSubmit={send} people={people.list} placeholder={t('teamChat.COMPOSER_PLACEHOLDER', { name: title.replace(/^#/, '') })} />
				)}
			</div>
		</div>
	);
}
