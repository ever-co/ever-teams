import {
	EChatConversationKind,
	EChatNotifyLevel,
	type IChatCategory,
	type IChatConversationWithState
} from '@/core/types/interfaces/common/chat';
import { isUnread, type ChatPerson } from './chat-format';
import { conversationSections, otherPeopleOf } from './chat-list';

/**
 * The conversations in the order the list shows them, top to bottom: the channels of each category, the other channels,
 * then the direct conversations. What `Alt+↑` / `Alt+↓` walk.
 */
export function conversationOrder<T extends IChatConversationWithState>(
	conversations: readonly T[],
	categories: readonly IChatCategory[]
): T[] {
	const sections = conversationSections(conversations, categories);
	return [...sections.categorised.flatMap((group) => group.channels), ...sections.channels, ...sections.direct];
}

/** Whether a conversation waits for the reader in the list: unread, and not muted (a mention still counts). */
export function needsReader(conversation: Pick<IChatConversationWithState, 'state'>): boolean {
	if (!isUnread(conversation)) return false;
	const muted = conversation.state?.notifyLevel === EChatNotifyLevel.Muted;
	return !muted || (conversation.state?.mentionCount ?? 0) > 0;
}

/**
 * The conversation before (`-1`) or after (`1`) the open one in the list's order, wrapping around at either end; with
 * `unreadOnly`, the nearest one waiting for the reader. From outside the list (Unreads, Threads) it starts at the top or
 * the bottom. Null when there is none to go to.
 */
export function adjacentConversation(
	ordered: readonly IChatConversationWithState[],
	currentId: string | null,
	direction: 1 | -1,
	unreadOnly = false
): IChatConversationWithState | null {
	const count = ordered.length;
	if (!count) return null;
	const at = currentId ? ordered.findIndex((conversation) => conversation.id === currentId) : -1;
	const start = at === -1 ? (direction === 1 ? -1 : count) : at;
	for (let step = 1; step <= count; step += 1) {
		const index = (((start + direction * step) % count) + count) % count;
		const candidate = ordered[index];
		if (candidate.id === currentId) continue;
		if (!unreadOnly || needsReader(candidate)) return candidate;
	}
	return null;
}

/** How many conversations the palette lists before anything is typed. */
export const PALETTE_RECENT_CONVERSATIONS = 5;

/**
 * The conversations the command palette offers: before anything is typed, the few that wait for the reader first and
 * then the most recent; once something is typed, all of them (the palette filters on their names). Archived ones are
 * left out.
 */
export function paletteConversations<T extends IChatConversationWithState>(
	conversations: readonly T[],
	hasSearch: boolean,
	limit = PALETTE_RECENT_CONVERSATIONS
): T[] {
	const live = conversations.filter((conversation) => !conversation.archivedAt);
	if (hasSearch) return live;
	const waiting = live.filter(needsReader);
	const rest = live.filter((conversation) => !needsReader(conversation));
	return [...waiting, ...rest].slice(0, limit);
}

/**
 * The people the palette offers to write to, when no direct conversation with them is listed yet (one that is listed is
 * offered as the conversation): everyone but the reader, by name.
 */
export function peopleWithoutDirect(
	people: readonly ChatPerson[],
	conversations: readonly IChatConversationWithState[],
	byEmployee: ReadonlyMap<string, ChatPerson>,
	meEmployeeId: string | null
): ChatPerson[] {
	const reached = new Set<string>();
	for (const conversation of conversations) {
		if (conversation.kind !== EChatConversationKind.Direct) continue;
		for (const person of otherPeopleOf(conversation, byEmployee, meEmployeeId)) reached.add(person.employeeId);
	}
	return people
		.filter((person) => person.employeeId !== meEmployeeId && !reached.has(person.employeeId))
		.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The person whose presence a conversation shows: the other one of a direct conversation. A channel or a group shows
 * none (its members show theirs in its member list).
 */
export function directPartnerOf(
	conversation: Pick<IChatConversationWithState, 'kind' | 'members'>,
	meEmployeeId: string | null
): string | null {
	if (conversation.kind !== EChatConversationKind.Direct) return null;
	const others = (conversation.members ?? []).filter(
		(member) => String(member.employeeId) !== String(meEmployeeId ?? '')
	);
	return others.length === 1 ? String(others[0].employeeId) : null;
}

/**
 * Whether `/chat` is about to open the last conversation (or the first of the list): the list is loading, or it holds
 * one. A request carried in the address (`?new=message`) goes along with that redirect, and is dropped only after it.
 */
export function opensLastConversation(state: {
	isConversationView: boolean;
	conversationId: string | null;
	isListLoading: boolean;
	conversationCount: number;
}): boolean {
	if (!state.isConversationView || state.conversationId) return false;
	return state.isListLoading || state.conversationCount > 0;
}
