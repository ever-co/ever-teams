'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Bell, BellOff, X } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { useChatActions, ChatOutboxMessage } from '@/core/hooks/chat/use-chat-actions';
import { useChatDraft } from '@/core/hooks/chat/use-chat-draft';
import { useChatThread } from '@/core/hooks/chat/use-chat-messages';
import { useChatPeople, useChatScope } from '@/core/hooks/chat/use-chat-scope';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { dayKeyOf, dayLabel, timelineItems } from '@/core/lib/utils/chat-timeline';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import { IChatMessage } from '@/core/types/interfaces/common/chat';
import { ChatErrorState, ChatMessagesSkeleton } from './chat-states';
import { DayDivider, RepliesDivider } from './chat-timeline-parts';
import { BAR_BUTTON } from './conversation-header';
import { CreateTaskFromMessageDialog } from './create-task-dialog';
import { MessageComposer } from './message-composer';
import { MessageItem } from './message-item';

interface ThreadPaneProps {
	conversationId: string;
	rootMessageId: string;
	conversationNames: ReadonlyMap<string, string>;
	canManage: boolean;
	onClose: () => void;
	/** `?m=` of a thread link: the reply to scroll to once the thread is loaded. */
	highlightMessageId?: string | null;
	/** The conversation the thread belongs to, as its header names it (`#general`, a person); shown beside "Thread". */
	conversationLabel?: string;
}

/** Closer to the newest reply than this, the reader is at the bottom and the pane follows new replies. */
const AT_BOTTOM_PX = 40;

/** The right pane (or the full view on a phone): a thread's root, its replies and a composer. */
export function ThreadPane(props: Readonly<ThreadPaneProps>) {
	// What the pane remembers (the edit in progress, where the reader is) belongs to one thread.
	return <ThreadPaneBody key={props.rootMessageId} {...props} />;
}

function ThreadPaneBody({ conversationId, rootMessageId, conversationNames, canManage, onClose, highlightMessageId = null, conversationLabel }: Readonly<ThreadPaneProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const scope = useChatScope();
	const people = useChatPeople();
	const actions = useChatActions();
	const { openTaskDrawer } = useTaskDrawer();
	const tasks = useAtomValue(tasksByTeamState);
	const taskTitles = useMemo(() => new Map(tasks.map((task) => [task.id, task.title])), [tasks]);
	const { root, replies, isLoading, isError, retry } = useChatThread(rootMessageId, true);
	const { draft, setDraft, clearDraft } = useChatDraft(conversationId, rootMessageId);
	const [alsoToConversation, setAlsoToConversation] = useState(false);
	const [editing, setEditing] = useState<IChatMessage | null>(null);
	const [editValue, setEditValue] = useState('');
	const [taskFrom, setTaskFrom] = useState<IChatMessage | null>(null);
	// Opening a thread is most often to answer it: the composer takes the focus where there is a keyboard.
	const [focusComposer] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches);
	const list = useRef<HTMLDivElement | null>(null);
	const content = useRef<HTMLDivElement | null>(null);
	const stickToBottom = useRef(true);
	const highlighted = useRef<string | null>(null);
	const reportFailure = useCallback(() => toast.error(t('teamChat.UPDATE_FAILED')), [t]);
	const channelName = conversationNames.get(conversationId);
	const label = conversationLabel ?? (channelName ? `#${channelName}` : '');

	// The replies as rows, with a divider wherever the day changes. The first reply's day is the root's when they share
	// it: that divider stands above the root.
	const items = useMemo(() => {
		const rows = timelineItems(replies);
		const first = rows[0];
		return root && first?.type === 'day' && first.key === dayKeyOf(root.createdAt) ? rows.slice(1) : rows;
	}, [replies, root]);

	const send = useCallback(
		async (body: string) => {
			clearDraft();
			stickToBottom.current = true;
			await actions.send(conversationId, { body, threadRootId: rootMessageId, alsoInConversation: alsoToConversation }).catch(() => toast.error(t('teamChat.SEND_FAILED')));
		},
		[actions, alsoToConversation, clearDraft, conversationId, rootMessageId, t]
	);

	// The newest reply stays in view while the reader is at the bottom; a link to a reply scrolls it into view once the
	// thread has it, and lights it for a moment.
	useLayoutEffect(() => {
		const element = list.current;
		if (!element) return;
		if (highlightMessageId && highlighted.current !== highlightMessageId) {
			const target = element.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(highlightMessageId)}"]`);
			if (target) {
				highlighted.current = highlightMessageId;
				stickToBottom.current = false;
				target.scrollIntoView({ block: 'center' });
				target.dataset.highlight = 'true';
				window.setTimeout(() => delete target.dataset.highlight, 2000);
				return;
			}
		}
		if (stickToBottom.current) element.scrollTop = element.scrollHeight;
	}, [highlightMessageId, replies, root]);

	// At the bottom the pane stays there when its height changes without a new reply (the composer growing a line).
	useEffect(() => {
		const element = list.current;
		const inner = content.current;
		if (!element || !inner || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(() => {
			if (stickToBottom.current) element.scrollTop = element.scrollHeight;
		});
		observer.observe(element);
		observer.observe(inner);
		return () => observer.disconnect();
	}, []);

	const onScroll = useCallback(() => {
		const element = list.current;
		if (element) stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < AT_BOTTOM_PX;
	}, []);

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
			onReply: () => undefined,
			onEdit: (message: IChatMessage) => {
				setEditing(message);
				setEditValue(message.body);
			},
			onDelete: (message: IChatMessage) => actions.remove(message).catch(reportFailure),
			onPin: (message: IChatMessage, pinned: boolean) => actions.pin(message, pinned).catch(reportFailure),
			onUnreadFrom: (message: IChatMessage) => actions.unreadFrom(message).catch(reportFailure),
			onRetry: (message: ChatOutboxMessage) => actions.retry(conversationId, message).catch(() => toast.error(t('teamChat.SEND_FAILED'))),
			onDiscard: (message: ChatOutboxMessage) => actions.discardFailed(conversationId, message),
			onCopyLink: (message: IChatMessage) => {
				navigator.clipboard?.writeText(`${window.location.origin}/chat/${conversationId}?thread=${rootMessageId}&m=${message.id}`).then(() => toast(t('teamChat.LINK_COPIED'))).catch(() => undefined);
			},
			onOpenTask: (taskId: string) => openTaskDrawer(taskId),
			onCreateTask: (message: IChatMessage) => setTaskFrom(message)
		}),
		[actions, conversationId, openTaskDrawer, reportFailure, rootMessageId, t]
	);

	const authorOf = (message: IChatMessage) =>
		message.authorEmployeeId ? (people.byEmployee.get(String(message.authorEmployeeId)) ?? null) : message.authorUserId ? (people.byUser.get(String(message.authorUserId)) ?? null) : null;
	const itemProps = { people: people.byEmployee, conversationNames, meEmployeeId: scope?.employeeId ?? null, meUserId: scope?.userId ?? null, locale, inTimeline: false, canManage, taskTitles, ...handlers };
	const editComposer = (
		<div className="px-4 py-2">
			<MessageComposer value={editValue} onChange={setEditValue} onSubmit={saveEdit} onCancel={() => setEditing(null)} people={people.list} placeholder={t('teamChat.EDIT')} editing autoFocus />
		</div>
	);
	// The platform's count can trail a reply just sent from here, and the pane's own list can stop at its page budget.
	const replyCount = Math.max(root?.replyCount ?? 0, replies.length);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<header className="flex h-12 shrink-0 items-center gap-1 border-border px-3 hairline-b">
				<div className="flex min-w-0 flex-1 items-baseline gap-2 px-1">
					<h2 className="shrink-0 text-sm font-semibold text-foreground">{t('teamChat.THREAD')}</h2>
					{label && <span className="min-w-0 truncate text-xs text-muted-foreground">{label}</span>}
				</div>
				{root && (
					<Button variant="ghost" size="sm" aria-pressed={!!root.following} onClick={() => actions.setFollow(root, !root.following).catch(reportFailure)}>
						{root.following ? <BellOff className="size-3.5" /> : <Bell className="size-3.5" />}
						{root.following ? t('teamChat.UNFOLLOW') : t('teamChat.FOLLOW')}
					</Button>
				)}
				<button type="button" onClick={onClose} className={BAR_BUTTON} aria-label={t('teamChat.CLOSE')} title={t('teamChat.CLOSE')}>
					<X />
				</button>
			</header>
			<div ref={list} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" role="log" aria-busy={isLoading}>
				<div ref={content} className="pb-2">
					{isLoading && <ChatMessagesSkeleton rows={3} />}
					{isError && !root && <ChatErrorState message={t('teamChat.LOAD_ERROR')} retryLabel={t('teamChat.RETRY')} onRetry={() => retry()} />}
					{root && (
						<>
							<DayDivider label={dayLabel(new Date(root.createdAt), locale)} />
							{editing?.id === root.id ? editComposer : <MessageItem message={root} author={authorOf(root)} continues={false} {...itemProps} />}
							{replyCount > 0 ? (
								<RepliesDivider label={t('teamChat.REPLIES', { count: replyCount })} />
							) : (
								<p className="mx-4 mt-2 border-border pt-3 text-[13px] text-muted-foreground hairline-t">{t('teamChat.NO_REPLIES')}</p>
							)}
							{items.map((item) => {
								if (item.type === 'day') return <DayDivider key={`day:${item.key}`} label={dayLabel(item.date, locale)} />;
								if (item.type === 'new') return null;
								const { message } = item;
								if (editing?.id === message.id) return <div key={message.id}>{editComposer}</div>;
								return <MessageItem key={message.id} message={message} author={authorOf(message)} continues={item.continues} {...itemProps} />;
							})}
						</>
					)}
				</div>
			</div>
			<div className="shrink-0 px-3 pb-3 pt-1">
				<MessageComposer
					value={draft}
					onChange={setDraft}
					onSubmit={send}
					people={people.list}
					placeholder={t('teamChat.REPLY_PLACEHOLDER')}
					alsoToConversation={{ checked: alsoToConversation, onChange: setAlsoToConversation }}
					autoFocus={focusComposer}
				/>
			</div>
			{taskFrom && <CreateTaskFromMessageDialog key={taskFrom.id} message={taskFrom} onClose={() => setTaskFrom(null)} />}
		</div>
	);
}
