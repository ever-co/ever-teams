import qs from 'qs';
import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type {
	IChatCategory,
	IChatConversationCreateInput,
	IChatConversationList,
	IChatConversationUpdateInput,
	IChatConversationWithState,
	IChatCreateTaskInput,
	IChatCreateTaskResult,
	IChatEvent,
	IChatMemberState,
	IChatMemberStateInput,
	IChatMemberSummary,
	IChatMessage,
	IChatMessageCreateInput,
	IChatMessagePage,
	IChatMessagesQuery,
	IChatMessageUpdateInput,
	IChatReadAllResult,
	IChatSendResult,
	IChatStates,
	IChatThreadPage
} from '@/core/types/interfaces/common/chat';

/** The newest page a conversation opens with (the platform's default is 50, its maximum 200). */
export const CHAT_PAGE_SIZE = 50;

type Events = { events: IChatEvent[] };
type ConversationAnswer = { conversation: IChatConversationWithState } & Events;

const path = (id: string) => encodeURIComponent(id);

/**
 * Client of the platform chat (`/chat/*`): conversations, messages, threads, reactions and the caller's read
 * state. Both transports (this app's `/api/chat/*` proxies, or the platform directly). Every write answers the
 * events it caused, so the caller can apply them at once.
 */
class ChatService extends APIService {
	// ---------------------------------------------------------------- conversations

	listMine = async (signal?: AbortSignal): Promise<IChatConversationList> => {
		const response = await this.get<IChatConversationList>('/chat/conversations', { signal });
		return response.data;
	};

	browse = async (signal?: AbortSignal): Promise<IChatConversationWithState[]> => {
		const response = await this.get<IChatConversationWithState[]>('/chat/conversations/browse', { signal });
		return response.data;
	};

	states = async (signal?: AbortSignal): Promise<IChatStates> => {
		const response = await this.get<IChatStates>('/chat/states', { signal });
		return response.data;
	};

	getConversation = async (id: string, signal?: AbortSignal): Promise<IChatConversationWithState> => {
		const response = await this.get<IChatConversationWithState>(`/chat/conversations/${path(id)}`, { signal });
		return response.data;
	};

	createChannel = async (input: IChatConversationCreateInput): Promise<ConversationAnswer> => {
		const response = await this.post<ConversationAnswer>('/chat/conversations', { ...input }, undefined, false);
		return response.data;
	};

	updateConversation = async (id: string, input: IChatConversationUpdateInput): Promise<ConversationAnswer> => {
		const response = await this.patch<ConversationAnswer>(`/chat/conversations/${path(id)}`, { ...input });
		return response.data;
	};

	/** The direct (two people) or group (three or more) conversation of these employees and me: found or created. */
	direct = async (employeeIds: string[]): Promise<ConversationAnswer & { created: boolean }> => {
		const response = await this.post<ConversationAnswer & { created: boolean }>('/chat/direct', { employeeIds }, undefined, false);
		return response.data;
	};

	archive = async (id: string, archived: boolean): Promise<ConversationAnswer> => {
		const response = await this.post<ConversationAnswer>(`/chat/conversations/${path(id)}/${archived ? 'archive' : 'unarchive'}`, {}, undefined, false);
		return response.data;
	};

	join = async (id: string): Promise<ConversationAnswer> => {
		const response = await this.post<ConversationAnswer>(`/chat/conversations/${path(id)}/join`, {}, undefined, false);
		return response.data;
	};

	leave = async (id: string): Promise<Events> => {
		const response = await this.post<Events>(`/chat/conversations/${path(id)}/leave`, {}, undefined, false);
		return response.data;
	};

	members = async (id: string, signal?: AbortSignal): Promise<IChatMemberSummary[]> => {
		const response = await this.get<IChatMemberSummary[]>(`/chat/conversations/${path(id)}/members`, { signal });
		return response.data;
	};

	addMembers = async (id: string, employeeIds: string[]): Promise<{ members: IChatMemberSummary[] } & Events> => {
		const response = await this.post<{ members: IChatMemberSummary[] } & Events>(`/chat/conversations/${path(id)}/members`, { employeeIds }, undefined, false);
		return response.data;
	};

	removeMember = async (id: string, employeeId: string): Promise<Events> => {
		const response = await this.delete<Events>(`/chat/conversations/${path(id)}/members/${path(employeeId)}`);
		return response.data;
	};

	setMemberState = async (id: string, input: IChatMemberStateInput): Promise<{ state: IChatMemberState } & Events> => {
		const response = await this.patch<{ state: IChatMemberState } & Events>(`/chat/conversations/${path(id)}/state`, { ...input });
		return response.data;
	};

	// ---------------------------------------------------------------- categories

	listCategories = async (signal?: AbortSignal): Promise<IChatCategory[]> => {
		const response = await this.get<IChatCategory[]>('/chat/categories', { signal });
		return response.data;
	};

	// ---------------------------------------------------------------- messages

	messages = async (conversationId: string, query: IChatMessagesQuery = {}, signal?: AbortSignal): Promise<IChatMessagePage> => {
		const search = qs.stringify({ ...query, limit: query.limit ?? CHAT_PAGE_SIZE }, { skipNulls: true });
		const response = await this.get<IChatMessagePage>(`/chat/conversations/${path(conversationId)}/messages?${search}`, { signal });
		return response.data;
	};

	pins = async (conversationId: string, signal?: AbortSignal): Promise<IChatMessage[]> => {
		const response = await this.get<IChatMessage[]>(`/chat/conversations/${path(conversationId)}/pins`, { signal });
		return response.data;
	};

	send = async (conversationId: string, input: IChatMessageCreateInput): Promise<IChatSendResult> => {
		const response = await this.post<IChatSendResult>(`/chat/conversations/${path(conversationId)}/messages`, { ...input }, undefined, false);
		return response.data;
	};

	edit = async (messageId: string, input: IChatMessageUpdateInput): Promise<IChatSendResult> => {
		const response = await this.patch<IChatSendResult>(`/chat/messages/${path(messageId)}`, { ...input });
		return response.data;
	};

	remove = async (messageId: string): Promise<Events> => {
		const response = await this.delete<Events>(`/chat/messages/${path(messageId)}`);
		return response.data;
	};

	pin = async (messageId: string, pinned: boolean): Promise<IChatSendResult> => {
		const response = await this.post<IChatSendResult>(`/chat/messages/${path(messageId)}/${pinned ? 'pin' : 'unpin'}`, {}, undefined, false);
		return response.data;
	};

	/** A task from a message; the message keeps a `created` reference to it. Needs the task permission as well. */
	createTask = async (messageId: string, input: IChatCreateTaskInput): Promise<IChatCreateTaskResult> => {
		const response = await this.post<IChatCreateTaskResult>(`/chat/messages/${path(messageId)}/create-task`, input, undefined, false);
		return response.data;
	};

	react = async (messageId: string, emoji: string, add: boolean): Promise<IChatSendResult> => {
		const url = `/chat/messages/${path(messageId)}/reactions/${encodeURIComponent(emoji)}`;
		const response = add ? await this.post<IChatSendResult>(url, {}, undefined, false) : await this.delete<IChatSendResult>(url);
		return response.data;
	};

	// ---------------------------------------------------------------- threads

	thread = async (rootMessageId: string, query: IChatMessagesQuery = {}, signal?: AbortSignal): Promise<IChatThreadPage> => {
		const search = qs.stringify({ ...query, limit: query.limit ?? CHAT_PAGE_SIZE }, { skipNulls: true });
		const response = await this.get<IChatThreadPage>(`/chat/messages/${path(rootMessageId)}/thread?${search}`, { signal });
		return response.data;
	};

	followedThreads = async (signal?: AbortSignal): Promise<Array<IChatMessage & { unreadReplies: number }>> => {
		const response = await this.get<Array<IChatMessage & { unreadReplies: number }>>('/chat/threads', { signal });
		return response.data;
	};

	setFollow = async (rootMessageId: string, following: boolean): Promise<{ following: boolean } & Events> => {
		const response = await this.post<{ following: boolean } & Events>(`/chat/messages/${path(rootMessageId)}/${following ? 'follow' : 'unfollow'}`, {}, undefined, false);
		return response.data;
	};

	// ---------------------------------------------------------------- read state

	read = async (conversationId: string, messageId?: string): Promise<Events> => {
		const response = await this.post<Events>(`/chat/conversations/${path(conversationId)}/read`, messageId ? { messageId } : {}, undefined, false);
		return response.data;
	};

	unreadFrom = async (messageId: string): Promise<Events> => {
		const response = await this.post<Events>(`/chat/messages/${path(messageId)}/unread`, {}, undefined, false);
		return response.data;
	};

	readAll = async (): Promise<IChatReadAllResult> => {
		const response = await this.post<IChatReadAllResult>('/chat/read-all', {}, undefined, false);
		return response.data;
	};

	restoreRead = async (snapshotId: string): Promise<{ restored: number } & Events> => {
		const response = await this.post<{ restored: number } & Events>('/chat/read-restore', { snapshotId }, undefined, false);
		return response.data;
	};
}

export const chatService = new ChatService(GAUZY_API_BASE_SERVER_URL.value);
