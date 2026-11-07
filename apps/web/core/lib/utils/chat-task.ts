import {
	CHAT_MESSAGE_MAX_LENGTH,
	IChatConversationWithState,
	IChatMessage,
	IChatTaskReference
} from '@/core/types/interfaces/common/chat';

/** The longest title the platform keeps for a task. */
export const CHAT_TASK_TITLE_MAX = 255;

/** A mention token of the chat (`<@employeeId>`, `<#conversationId>`, `<!channel>`, `<!here>`), as the platform reads them. */
const MENTION_TOKEN = /<[@#!][^>\s]*>/g;

/** Cuts `text` to `max` UTF-16 units with an ellipsis, never leaving half of a surrogate pair. */
function cut(text: string, max: number): string {
	if (text.length <= max) return text;
	let head = text.slice(0, max - 1);
	if (/[\uD800-\uDBFF]$/.test(head)) head = head.slice(0, -1);
	return `${head.trimEnd()}…`;
}

/**
 * The title offered for a task made from a message: the message's first line with its mention tokens dropped and its
 * spaces collapsed, cut to the platform's limit. It is the rule the platform applies when no title is sent, so what
 * the person sees is what they get when they keep it.
 */
export function chatTaskTitleOf(body: string | null | undefined, max = CHAT_TASK_TITLE_MAX): string {
	const first =
		String(body ?? '')
			.replace(/\r\n/g, '\n')
			.split('\n')
			.map((line) => line.replace(MENTION_TOKEN, '').replace(/\s+/g, ' ').trim())
			.find(Boolean) ?? '';
	return cut(first, max);
}

/** What a task sent to chat says above its card: the sender's note, or the task's title when they wrote none. */
export function sendToChatBodyOf(note: string, taskTitle: string, max = CHAT_MESSAGE_MAX_LENGTH): string {
	return (note.trim() || taskTitle.trim()).slice(0, max);
}

/** The conversations a task can be sent to: those not archived, whose title contains the search (any case). */
export function sendableConversations<T extends Pick<IChatConversationWithState, 'archivedAt'>>(
	conversations: readonly T[],
	titleOf: (conversation: T) => string,
	query: string
): T[] {
	const needle = query.trim().toLocaleLowerCase();
	return conversations.filter(
		(conversation) => !conversation.archivedAt && (!needle || titleOf(conversation).toLocaleLowerCase().includes(needle))
	);
}

/** The message with a reference to a task, once (a reference to the same task is replaced). */
export function withTaskReference(message: IChatMessage, reference: IChatTaskReference): IChatMessage {
	const others = (message.taskReferences ?? []).filter((current) => current.taskId !== reference.taskId);
	return { ...message, taskReferences: [...others, reference] };
}
