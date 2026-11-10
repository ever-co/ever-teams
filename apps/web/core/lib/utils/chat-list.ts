import { EChatConversationKind, IChatCategory, IChatConversationWithState } from '@/core/types/interfaces/common/chat';
import { ChatPerson, sortConversations } from './chat-format';

/** The conversation list as its sections: the categories that hold channels, the other channels, the direct conversations. */
interface ChatListSections<T> {
	categorised: Array<{ category: IChatCategory; channels: T[] }>;
	channels: T[];
	direct: T[];
}

/**
 * Sorts the conversations into the list's sections, favourites first and then the most recent inside each. Archived
 * conversations are left out; a channel whose category is not known (removed, or not sent) stays with the plain
 * channels, so it never disappears from the list.
 */
export function conversationSections<T extends IChatConversationWithState>(conversations: readonly T[], categories: readonly IChatCategory[]): ChatListSections<T> {
	const live = sortConversations(conversations.filter((conversation) => !conversation.archivedAt)) as T[];
	const known = new Set(categories.map((category) => String(category.id)));
	const byCategory = new Map<string, T[]>();
	const channels: T[] = [];
	const direct: T[] = [];
	for (const conversation of live) {
		if (conversation.kind !== EChatConversationKind.Channel) {
			direct.push(conversation);
			continue;
		}
		const categoryId = conversation.categoryId ? String(conversation.categoryId) : '';
		if (!categoryId || !known.has(categoryId)) {
			channels.push(conversation);
			continue;
		}
		byCategory.set(categoryId, [...(byCategory.get(categoryId) ?? []), conversation]);
	}
	const categorised = [...categories]
		.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
		.map((category) => ({ category, channels: byCategory.get(String(category.id)) ?? [] }))
		.filter((group) => group.channels.length > 0);
	return { categorised, channels, direct };
}

/**
 * The conversations whose name holds what was typed (any case), those that start with it first; archived ones are left
 * out. An empty search answers nothing: the list shows its sections then.
 */
export function filterConversations<T extends Pick<IChatConversationWithState, 'archivedAt'>>(conversations: readonly T[], titleOf: (conversation: T) => string, query: string): T[] {
	const needle = query.trim().toLocaleLowerCase();
	if (!needle) return [];
	const named = (conversation: T) => titleOf(conversation).replace(/^#/, '').toLocaleLowerCase();
	const wanted = needle.replace(/^#/, '');
	return conversations
		.filter((conversation) => !conversation.archivedAt && named(conversation).includes(wanted))
		.map((conversation, index) => ({ conversation, index, starts: named(conversation).startsWith(wanted) }))
		.sort((a, b) => Number(b.starts) - Number(a.starts) || a.index - b.index)
		.map((entry) => entry.conversation);
}

/** The other people of a direct or group conversation (everyone but the reader), those the team knows. */
export function otherPeopleOf(conversation: Pick<IChatConversationWithState, 'members'>, people: ReadonlyMap<string, ChatPerson>, meEmployeeId: string | null): ChatPerson[] {
	return (conversation.members ?? [])
		.filter((member) => String(member.employeeId) !== String(meEmployeeId ?? ''))
		.map((member) => people.get(String(member.employeeId)))
		.filter((person): person is ChatPerson => !!person);
}

/** A count as a badge shows it: capped, so a busy channel does not stretch its row. */
export function badgeCount(count: number): string {
	return count > 99 ? '99+' : String(Math.max(0, count));
}
