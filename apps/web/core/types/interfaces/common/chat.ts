import type { ID } from './base-interfaces';

/** The platform's chat (`/chat/*`): conversations between the employees of an organization. */

export enum EChatConversationKind {
	Channel = 'channel',
	Direct = 'direct',
	Group = 'group'
}

export enum EChatVisibility {
	Public = 'public',
	Private = 'private'
}

export enum EChatMemberRole {
	Member = 'member',
	Manager = 'manager'
}

export enum EChatNotifyLevel {
	All = 'all',
	Mentions = 'mentions',
	Muted = 'muted'
}

export enum EChatMessageKind {
	Message = 'message',
	System = 'system',
	App = 'app'
}

export enum EChatTaskReferenceKind {
	Mention = 'mention',
	Sent = 'sent',
	Created = 'created'
}

export const CHAT_MESSAGE_MAX_LENGTH = 4000;
export const CHAT_GROUP_MAX_MEMBERS = 50;

/** Mention tokens inside a body: `<@employeeId>`, `<#conversationId>`, `<!channel>`, `<!here>`. */
export const CHAT_MENTION_TOKEN_PATTERN = /<(@|#)([0-9a-fA-F-]{36})>|<!(channel|here)>/g;

export interface IChatCategory {
	id: ID;
	name: string;
	position: number;
}

export interface IChatConversation {
	id: ID;
	kind: EChatConversationKind | string;
	name?: string | null;
	topic?: string | null;
	visibility: EChatVisibility | string;
	categoryId?: ID | null;
	position: number;
	isDefault: boolean;
	archivedAt?: string | null;
	createdByEmployeeId?: ID | null;
	messageCount: number;
	lastMessageAt?: string | null;
	organizationId?: ID | null;
	createdAt?: string;
}

export interface IChatMemberState {
	conversationId: ID;
	role: EChatMemberRole | string;
	notifyLevel: EChatNotifyLevel | string;
	isFavorite: boolean;
	unreadCount: number;
	mentionCount: number;
	lastReadMessageId: ID | null;
	lastReadAt: string | null;
}

export interface IChatMemberSummary {
	employeeId: ID;
	userId: ID;
	role: EChatMemberRole | string;
	joinedAt?: string | null;
}

export interface IChatConversationWithState extends IChatConversation {
	state: IChatMemberState | null;
	memberCount: number;
	members?: IChatMemberSummary[];
}

export interface IChatReactionSummary {
	emoji: string;
	count: number;
	mine: boolean;
}

export interface IChatTaskReference {
	messageId: ID;
	taskId: ID;
	kind: EChatTaskReferenceKind | string;
}

export interface IChatMessage {
	id: ID;
	conversationId: ID;
	authorEmployeeId?: ID | null;
	authorUserId?: ID | null;
	kind: EChatMessageKind | string;
	/** Markdown subset with mention tokens; empty for a deleted message. */
	body: string;
	mentionEmployeeIds?: ID[] | null;
	mentionsChannel: boolean;
	mentionsHere: boolean;
	replyToId?: ID | null;
	threadRootId?: ID | null;
	alsoInConversation: boolean;
	replyCount: number;
	lastReplyAt?: string | null;
	pinnedAt?: string | null;
	pinnedByEmployeeId?: ID | null;
	editedAt?: string | null;
	attachmentIds?: ID[] | null;
	nonce?: string | null;
	appName?: string | null;
	deletedAt?: string | null;
	createdAt: string;
	reactions?: IChatReactionSummary[];
	taskReferences?: IChatTaskReference[];
	following?: boolean;
}

export interface IChatMessagePage {
	messages: IChatMessage[];
	hasBefore: boolean;
	hasAfter: boolean;
}

export interface IChatThreadPage extends IChatMessagePage {
	root: IChatMessage;
}

export interface IChatConversationList {
	conversations: IChatConversationWithState[];
	categories: IChatCategory[];
}

export interface IChatStates {
	states: IChatMemberState[];
	threads: Array<{ rootMessageId: ID; conversationId: ID; unreadReplies: number }>;
}

export interface IChatEvent {
	name: string;
	data: Record<string, unknown>;
}

export interface IChatSendResult {
	message: IChatMessage;
	events: IChatEvent[];
}

export interface IChatReadAllResult {
	updated: number;
	snapshotId: string;
	events: IChatEvent[];
}

export interface IChatConversationCreateInput {
	name: string;
	topic?: string | null;
	visibility?: EChatVisibility;
	categoryId?: ID | null;
	memberEmployeeIds?: ID[];
}

export interface IChatConversationUpdateInput {
	name?: string;
	topic?: string | null;
	visibility?: EChatVisibility;
	categoryId?: ID | null;
	position?: number;
}

export interface IChatMemberStateInput {
	notifyLevel?: EChatNotifyLevel;
	isFavorite?: boolean;
}

export interface IChatMessageCreateInput {
	body: string;
	nonce?: string;
	replyToId?: ID;
	threadRootId?: ID;
	alsoInConversation?: boolean;
	attachmentIds?: ID[];
	mentionEmployeeIds?: ID[];
	taskId?: ID;
}

export interface IChatMessageUpdateInput {
	body: string;
	attachmentIds?: ID[];
	mentionEmployeeIds?: ID[];
}

export interface IChatMessagesQuery {
	before?: ID;
	after?: ID;
	around?: ID;
	limit?: number;
}
