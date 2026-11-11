'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { chatService } from '@/core/services/client/api/chat';
import {
	EChatMessageKind,
	EChatTaskReferenceKind,
	IChatConversationList,
	IChatMessage,
	IChatMessageCreateInput,
	IChatMemberStateInput,
	IChatConversationCreateInput,
	IChatConversationWithState,
	IChatCreateTaskInput,
	IChatThreadPage
} from '@/core/types/interfaces/common/chat';
import { mentionedEmployeeIds, mergeMessages, newNonce, nextMessageOrder, withMessageOrder } from '@/core/lib/utils/chat-format';
import { createdTaskIdOf, withTaskReference } from '@/core/lib/utils/chat-task';
import type { ChatMessagesCache } from './use-chat-messages';
import { useChatScope } from './use-chat-scope';

/** A message the sender sees before the platform answers (`pending`), or one it refused (`failed`). */
export interface ChatOutboxMessage extends IChatMessage {
	outbox: 'pending' | 'failed';
	/** The task sent with the message ("Send to chat"), kept so a retry sends the card again. */
	outboxTaskId?: string | null;
}

export function isOutboxMessage(message: IChatMessage): message is ChatOutboxMessage {
	return 'outbox' in message && !!(message as ChatOutboxMessage).outbox;
}

/**
 * The writes of chat: send (optimistic, with an idempotency key kept for the retry), edit, delete, pin, react,
 * read state, follows, membership and conversation creation. Each write patches the caches it concerns at once and
 * refetches them afterwards; the platform's own answer wins.
 */
export function useChatActions() {
	const scope = useChatScope();
	const queryClient = useQueryClient();
	const tenantId = scope?.tenantId;

	const conversationsKey = queryKeys.chat.conversations(scope?.tenantId, scope?.organizationId, scope?.userId);
	const messagesKey = useCallback((conversationId: string) => queryKeys.chat.messages(tenantId, conversationId), [tenantId]);
	const threadKey = useCallback((rootMessageId: string) => queryKeys.chat.thread(tenantId, rootMessageId), [tenantId]);

	const patchMessages = useCallback(
		(conversationId: string, patch: (messages: IChatMessage[]) => IChatMessage[]) => {
			queryClient.setQueryData<ChatMessagesCache>(messagesKey(conversationId), (cache) => (cache ? { ...cache, messages: patch(cache.messages) } : cache));
		},
		[messagesKey, queryClient]
	);

	/** A thread's cached page: its replies, and its root. */
	const patchThread = useCallback(
		(rootMessageId: string | null | undefined, patch: (page: IChatThreadPage) => IChatThreadPage) => {
			if (!rootMessageId) return;
			queryClient.setQueryData<IChatThreadPage>(threadKey(rootMessageId), (page) => (page ? patch(page) : page));
		},
		[queryClient, threadKey]
	);

	/** One message wherever it is cached: the timeline, its thread (as a reply), its own thread (as the root). */
	const patchEverywhere = useCallback(
		(message: IChatMessage, replace: (current: IChatMessage) => IChatMessage) => {
			// Stamped as applied now: a page read started before this write cannot put the older copy back.
			const order = nextMessageOrder();
			const apply = (m: IChatMessage) => (m.id === message.id ? withMessageOrder([replace(m)], order)[0] : m);
			patchMessages(message.conversationId, (messages) => messages.map(apply));
			for (const root of [message.threadRootId, message.id]) {
				patchThread(root, (page) => ({ ...page, root: page.root ? apply(page.root) : page.root, messages: page.messages.map(apply) }));
			}
		},
		[patchMessages, patchThread]
	);

	const patchConversation = useCallback(
		(conversationId: string, patch: (conversation: IChatConversationWithState) => IChatConversationWithState) => {
			queryClient.setQueryData<IChatConversationList>(conversationsKey, (list) =>
				list ? { ...list, conversations: list.conversations.map((c) => (c.id === conversationId ? patch(c) : c)) } : list
			);
		},
		[conversationsKey, queryClient]
	);

	const refetchLists = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: conversationsKey });
		void queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads(scope?.tenantId, scope?.userId) });
		void queryClient.invalidateQueries({ queryKey: queryKeys.chat.states(scope?.tenantId, scope?.organizationId, scope?.userId) });
	}, [conversationsKey, queryClient, scope?.organizationId, scope?.tenantId, scope?.userId]);

	/**
	 * Sends a message: it shows at once as pending, then as the platform answered it; a refusal leaves it marked
	 * failed with the same key, so a retry never duplicates.
	 */
	const send = useCallback(
		async (conversationId: string, input: Omit<IChatMessageCreateInput, 'nonce'> & { nonce?: string }, options: { threadRootId?: string | null } = {}) => {
			const nonce = input.nonce ?? newNonce();
			const now = new Date().toISOString();
			const pending: ChatOutboxMessage = {
				id: `pending:${nonce}`,
				conversationId,
				authorUserId: scope?.userId ?? null,
				authorEmployeeId: scope?.employeeId ?? null,
				kind: EChatMessageKind.Message,
				body: input.body,
				mentionEmployeeIds: mentionedEmployeeIds(input.body),
				mentionsChannel: /<!channel>/.test(input.body),
				mentionsHere: /<!here>/.test(input.body),
				replyToId: input.replyToId ?? null,
				threadRootId: input.threadRootId ?? options.threadRootId ?? null,
				alsoInConversation: !!input.alsoInConversation,
				replyCount: 0,
				attachmentIds: input.attachmentIds ?? null,
				// A task sent with the message shows as its card at once, and stays with a failed message for the retry.
				taskReferences: input.taskId ? [{ messageId: `pending:${nonce}`, taskId: input.taskId, kind: EChatTaskReferenceKind.Sent }] : undefined,
				outboxTaskId: input.taskId ?? null,
				nonce,
				createdAt: now,
				outbox: 'pending'
			};
			const inTimeline = !pending.threadRootId || pending.alsoInConversation;
			if (inTimeline) patchMessages(conversationId, (messages) => mergeMessages(messages.filter((m) => m.nonce !== nonce), [pending]));
			if (pending.threadRootId) {
				queryClient.setQueryData(threadKey(pending.threadRootId), (page: { messages: IChatMessage[] } | undefined) =>
					page ? { ...page, messages: mergeMessages(page.messages.filter((m) => m.nonce !== nonce), [pending]) } : page
				);
			}
			try {
				const answer = await chatService.send(conversationId, { ...input, nonce, mentionEmployeeIds: input.mentionEmployeeIds ?? mentionedEmployeeIds(input.body) });
				const message = answer.message;
				if (inTimeline) patchMessages(conversationId, (messages) => mergeMessages(messages.filter((m) => m.id !== pending.id), [message]));
				if (message.threadRootId) {
					queryClient.setQueryData(threadKey(message.threadRootId), (page: { messages: IChatMessage[] } | undefined) =>
						page ? { ...page, messages: mergeMessages(page.messages.filter((m) => m.id !== pending.id), [message]) } : page
					);
					void queryClient.invalidateQueries({ queryKey: threadKey(message.threadRootId) });
				}
				patchConversation(conversationId, (c) => ({
					...c,
					messageCount: inTimeline ? c.messageCount + 1 : c.messageCount,
					lastMessageAt: inTimeline ? message.createdAt : c.lastMessageAt
				}));
				return message;
			} catch (error) {
				const failed = { ...pending, outbox: 'failed' as const };
				if (inTimeline) patchMessages(conversationId, (messages) => messages.map((m) => (m.id === pending.id ? failed : m)));
				// A reply stays in its thread, marked failed, with Retry and Discard (its draft is already cleared).
				patchThread(pending.threadRootId, (page) => ({ ...page, messages: page.messages.map((m) => (m.id === pending.id ? failed : m)) }));
				throw error;
			}
		},
		[patchConversation, patchMessages, patchThread, queryClient, scope?.employeeId, scope?.userId, threadKey]
	);

	const retry = useCallback(
		(conversationId: string, failed: ChatOutboxMessage) =>
			send(conversationId, {
				body: failed.body,
				nonce: failed.nonce ?? undefined,
				replyToId: failed.replyToId ?? undefined,
				threadRootId: failed.threadRootId ?? undefined,
				alsoInConversation: failed.alsoInConversation,
				attachmentIds: failed.attachmentIds ?? undefined,
				taskId: failed.outboxTaskId ?? undefined
			}),
		[send]
	);

	const discardFailed = useCallback(
		(conversationId: string, failed: ChatOutboxMessage) => {
			patchMessages(conversationId, (messages) => messages.filter((m) => m.id !== failed.id));
			patchThread(failed.threadRootId, (page) => ({ ...page, messages: page.messages.filter((m) => m.id !== failed.id) }));
		},
		[patchMessages, patchThread]
	);

	const edit = useCallback(
		async (message: IChatMessage, body: string) => {
			const answer = await chatService.edit(message.id, { body, mentionEmployeeIds: mentionedEmployeeIds(body) });
			patchEverywhere(message, () => answer.message);
			if (message.threadRootId) void queryClient.invalidateQueries({ queryKey: threadKey(message.threadRootId) });
			return answer.message;
		},
		[patchEverywhere, queryClient, threadKey]
	);

	const remove = useCallback(
		async (message: IChatMessage) => {
			await chatService.remove(message.id);
			const deleted = { ...message, body: '', attachmentIds: null, mentionEmployeeIds: null, deletedAt: new Date().toISOString() };
			patchMessages(message.conversationId, (messages) =>
				message.replyCount > 0 ? messages.map((m) => (m.id === message.id ? deleted : m)) : messages.filter((m) => m.id !== message.id)
			);
			if (message.threadRootId) void queryClient.invalidateQueries({ queryKey: threadKey(message.threadRootId) });
			refetchLists();
		},
		[patchMessages, queryClient, refetchLists, threadKey]
	);

	const pin = useCallback(
		async (message: IChatMessage, pinned: boolean) => {
			const answer = await chatService.pin(message.id, pinned);
			patchEverywhere(message, () => answer.message);
		},
		[patchEverywhere]
	);

	/** An app's reply to a click on one of its buttons replaced the message: it shows as the reply left it, everywhere. */
	const applyAppReply = useCallback(
		(message: IChatMessage, replaced: IChatMessage) => {
			patchEverywhere(message, () => replaced);
		},
		[patchEverywhere]
	);

	/** A task from a message: the message shows its card at once, and the task lists read again (the task is new). */
	const createTask = useCallback(
		async (message: IChatMessage, input: IChatCreateTaskInput) => {
			const answer = await chatService.createTask(message.id, input).catch((error: unknown) => {
				// Created but not linked: the task exists, so the lists read again (the caller offers to open it).
				if (createdTaskIdOf(error)) void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
				throw error;
			});
			patchEverywhere(message, (current) => withTaskReference(current, answer.reference));
			void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
			return answer.task;
		},
		[patchEverywhere, queryClient]
	);

	const react = useCallback(
		async (message: IChatMessage, emoji: string) => {
			const mine = message.reactions?.find((reaction) => reaction.emoji === emoji)?.mine ?? false;
			// At once: the count and the reader's own mark move before the platform answers.
			const optimistic = (m: IChatMessage): IChatMessage => {
				if (m.id !== message.id) return m;
				const reactions = [...(m.reactions ?? [])];
				const index = reactions.findIndex((reaction) => reaction.emoji === emoji);
				if (mine) {
					if (index >= 0) {
						const next = { ...reactions[index], count: reactions[index].count - 1, mine: false };
						if (next.count <= 0) reactions.splice(index, 1);
						else reactions[index] = next;
					}
				} else if (index >= 0) reactions[index] = { ...reactions[index], count: reactions[index].count + 1, mine: true };
				else reactions.push({ emoji, count: 1, mine: true });
				return { ...m, reactions };
			};
			patchEverywhere(message, optimistic);
			try {
				const answer = await chatService.react(message.id, emoji, !mine);
				patchEverywhere(message, () => answer.message);
			} catch (error) {
				// Refused: the message goes back to what it was, in every cache it is in.
				patchEverywhere(message, () => message);
				throw error;
			}
		},
		[patchEverywhere]
	);

	/** Marks the conversation read (up to a message, or all): the badges clear at once. */
	const read = useCallback(
		async (conversationId: string, messageId?: string) => {
			patchConversation(conversationId, (c) =>
				c.state ? { ...c, state: { ...c.state, unreadCount: messageId ? c.state.unreadCount : 0, mentionCount: messageId ? c.state.mentionCount : 0, lastReadAt: new Date().toISOString() } } : c
			);
			await chatService.read(conversationId, messageId);
			refetchLists();
		},
		[patchConversation, refetchLists]
	);

	const unreadFrom = useCallback(
		async (message: IChatMessage) => {
			await chatService.unreadFrom(message.id);
			refetchLists();
		},
		[refetchLists]
	);

	/** Marks every conversation read; answers the undo. */
	const readAll = useCallback(async () => {
		const answer = await chatService.readAll();
		refetchLists();
		return {
			updated: answer.updated,
			undo: async () => {
				await chatService.restoreRead(answer.snapshotId);
				refetchLists();
			}
		};
	}, [refetchLists]);

	const setFollow = useCallback(
		async (root: IChatMessage, following: boolean) => {
			await chatService.setFollow(root.id, following);
			patchMessages(root.conversationId, (messages) => messages.map((m) => (m.id === root.id ? { ...m, following } : m)));
			void queryClient.invalidateQueries({ queryKey: threadKey(root.id) });
			refetchLists();
		},
		[patchMessages, queryClient, refetchLists, threadKey]
	);

	const setMemberState = useCallback(
		async (conversationId: string, input: IChatMemberStateInput) => {
			patchConversation(conversationId, (c) => (c.state ? { ...c, state: { ...c.state, ...input } } : c));
			await chatService.setMemberState(conversationId, input);
			refetchLists();
		},
		[patchConversation, refetchLists]
	);

	const createChannel = useCallback(
		async (input: IChatConversationCreateInput) => {
			const answer = await chatService.createChannel(input);
			refetchLists();
			return answer.conversation;
		},
		[refetchLists]
	);

	const direct = useCallback(
		async (employeeIds: string[]) => {
			const answer = await chatService.direct(employeeIds);
			refetchLists();
			return answer.conversation;
		},
		[refetchLists]
	);

	const join = useCallback(
		async (conversationId: string) => {
			const answer = await chatService.join(conversationId);
			refetchLists();
			void queryClient.invalidateQueries({ queryKey: queryKeys.chat.browse(scope?.tenantId, scope?.organizationId, scope?.userId) });
			return answer.conversation;
		},
		[queryClient, refetchLists, scope?.organizationId, scope?.tenantId, scope?.userId]
	);

	const leave = useCallback(
		async (conversationId: string) => {
			await chatService.leave(conversationId);
			refetchLists();
			void queryClient.invalidateQueries({ queryKey: queryKeys.chat.browse(scope?.tenantId, scope?.organizationId, scope?.userId) });
		},
		[queryClient, refetchLists, scope?.organizationId, scope?.tenantId, scope?.userId]
	);

	// One object while the callbacks stay the same: the effects that depend on it do not run on every render.
	return useMemo(
		() => ({ send, retry, discardFailed, edit, remove, pin, applyAppReply, createTask, react, read, unreadFrom, readAll, setFollow, setMemberState, createChannel, direct, join, leave }),
		[send, retry, discardFailed, edit, remove, pin, applyAppReply, createTask, react, read, unreadFrom, readAll, setFollow, setMemberState, createChannel, direct, join, leave]
	);
}
