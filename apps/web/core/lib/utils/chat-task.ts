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

/** The first `max` UTF-16 units of `text`, never ending on the first half of a surrogate pair. */
function clip(text: string, max: number): string {
	if (text.length <= max) return text;
	const head = text.slice(0, max);
	return /[\uD800-\uDBFF]$/.test(head) ? head.slice(0, -1) : head;
}

/** Cuts `text` to `max` UTF-16 units with an ellipsis, never leaving half of a surrogate pair. */
function cut(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${clip(text, max - 1).trimEnd()}…`;
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
	return clip(note.trim() || taskTitle.trim(), max);
}

function recordOf(value: unknown): Record<string, unknown> | null {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

/**
 * The task a failed "Create task" made anyway: the platform answers 500 with the task's id when the task exists but
 * the message could not be linked to it, so the person opens that task instead of creating a second one.
 */
export function createdTaskIdOf(error: unknown): string | null {
	const root = recordOf(error);
	const bodies = [root, recordOf(root?.details), recordOf(root?.data), recordOf(recordOf(root?.response)?.data)];
	for (const body of bodies) {
		const taskId = body?.taskId;
		if (typeof taskId === 'string' && taskId) return taskId;
	}
	return null;
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
