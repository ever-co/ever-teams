'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { X } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { NotificationErrorState, NotificationRowsSkeleton } from '@/core/components/notifications/inbox/notification-states';
import { useChatActions, ChatOutboxMessage } from '@/core/hooks/chat/use-chat-actions';
import { useChatDraft } from '@/core/hooks/chat/use-chat-draft';
import { useChatThread } from '@/core/hooks/chat/use-chat-messages';
import { useChatPeople, useChatScope } from '@/core/hooks/chat/use-chat-scope';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { continuesGroup } from '@/core/lib/utils/chat-format';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import { IChatMessage } from '@/core/types/interfaces/common/chat';
import { CreateTaskFromMessageDialog } from './create-task-dialog';
import { MessageComposer } from './message-composer';
import { MessageItem } from './message-item';

/** The right pane (or the full view on a phone): a thread's root, its replies and a composer. */
export function ThreadPane({
	conversationId,
	rootMessageId,
	conversationNames,
	canManage,
	onClose,
	highlightMessageId = null
}: Readonly<{
	conversationId: string;
	rootMessageId: string;
	conversationNames: ReadonlyMap<string, string>;
	canManage: boolean;
	onClose: () => void;
	/** `?m=` of a thread link: the reply to scroll to once the thread is loaded. */
	highlightMessageId?: string | null;
}>) {
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
	const list = useRef<HTMLDivElement | null>(null);
	const highlighted = useRef<string | null>(null);
	const reportFailure = useCallback(() => toast.error(t('teamChat.UPDATE_FAILED')), [t]);

	const send = useCallback(
		async (body: string) => {
			clearDraft();
			await actions.send(conversationId, { body, threadRootId: rootMessageId, alsoInConversation: alsoToConversation }).catch(() => toast.error(t('teamChat.SEND_FAILED')));
		},
		[actions, alsoToConversation, clearDraft, conversationId, rootMessageId, t]
	);

	// A link to a reply: it scrolls into view once the thread has it.
	useEffect(() => {
		if (!highlightMessageId || highlighted.current === highlightMessageId || !list.current) return;
		const target = list.current.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(highlightMessageId)}"]`);
		if (!target) return;
		highlighted.current = highlightMessageId;
		target.scrollIntoView({ block: 'center' });
		target.classList.add('ring-2', 'ring-primary/40');
		window.setTimeout(() => target.classList.remove('ring-2', 'ring-primary/40'), 2000);
	}, [highlightMessageId, replies, root]);

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

	return (
		<div className="flex h-full min-h-0 flex-col">
			<header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
				<h2 className="flex-1 text-sm font-semibold text-foreground">{t('teamChat.THREAD')}</h2>
				{root && (
					<Button variant="ghost" size="sm" onClick={() => actions.setFollow(root, !root.following).catch(reportFailure)}>
						{root.following ? t('teamChat.UNFOLLOW') : t('teamChat.FOLLOW')}
					</Button>
				)}
				<Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('teamChat.CLOSE')}>
					<X className="size-4" />
				</Button>
			</header>
			<div ref={list} className="min-h-0 flex-1 overflow-y-auto py-2" role="log" aria-busy={isLoading}>
				{isLoading && <NotificationRowsSkeleton rows={4} />}
				{isError && <NotificationErrorState message={t('teamChat.LOAD_ERROR')} retryLabel={t('teamChat.RETRY')} onRetry={() => retry()} />}
				{root && editing?.id === root.id ? (
					<div className="px-4 py-2">
						<MessageComposer value={editValue} onChange={setEditValue} onSubmit={saveEdit} onCancel={() => setEditing(null)} people={people.list} placeholder={t('teamChat.EDIT')} editing autoFocus />
					</div>
				) : (
					root && <MessageItem message={root} author={authorOf(root)} continues={false} {...itemProps} />
				)}
				{root && <div className="mx-4 my-1 border-t border-border" />}
				{replies.map((message, index) =>
					editing?.id === message.id ? (
						<div key={message.id} className="px-4 py-2">
							<MessageComposer value={editValue} onChange={setEditValue} onSubmit={saveEdit} onCancel={() => setEditing(null)} people={people.list} placeholder={t('teamChat.EDIT')} editing autoFocus />
						</div>
					) : (
						<MessageItem key={message.id} message={message} author={authorOf(message)} continues={continuesGroup(replies[index - 1], message)} {...itemProps} />
					)
				)}
			</div>
			<div className="shrink-0 px-3 pb-3 pt-1">
				<MessageComposer value={draft} onChange={setDraft} onSubmit={send} people={people.list} placeholder={t('teamChat.REPLY_PLACEHOLDER')} alsoToConversation={{ checked: alsoToConversation, onChange: setAlsoToConversation }} />
			</div>
			{taskFrom && <CreateTaskFromMessageDialog key={taskFrom.id} message={taskFrom} onClose={() => setTaskFrom(null)} />}
		</div>
	);
}
