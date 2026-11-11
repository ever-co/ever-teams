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
/** The platform's `CHAT_MESSAGE_MAX_ATTACHMENTS`: a message carries at most this many files. */
export const CHAT_MESSAGE_MAX_ATTACHMENTS = 10;

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

/** Someone of the organization, as `/chat/people` lists them. */
export interface IChatPersonSummary {
	employeeId: ID;
	userId?: ID | null;
	name?: string | null;
	imageUrl?: string | null;
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
	/** The assistant the author wrote the message with (an AI client posting in their name), when one did. */
	assistedBy?: string | null;
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

/** `POST /chat/messages/:id/create-task`: a task from a message (its first line as the title when none is sent). */
export interface IChatCreateTaskInput {
	projectId?: ID;
	/** The team the task belongs to, so the team's lists show it (a platform that predates the field ignores it). */
	organizationTeamId?: ID;
	title?: string;
	assigneeEmployeeIds?: ID[];
}

/** The task made from a message, the message's reference to it, and the events the change caused. */
export interface IChatCreateTaskResult {
	task: { id: ID; title: string; number?: number | null; prefix?: string | null };
	reference: IChatTaskReference;
	events: IChatEvent[];
}

export interface IChatMessageUpdateInput {
	body: string;
	attachmentIds?: ID[];
	mentionEmployeeIds?: ID[];
}

/**
 * One file of a conversation (`GET /chat/conversations/:id/files`): the document a message carries, with where and by
 * whom it was attached. `fileUrl` / `thumbUrl` are what a browser opens (signed, so short-lived, on cloud storage).
 */
export interface IChatFile {
	documentId: ID;
	messageId: ID;
	conversationId: ID;
	name: string;
	originalFilename?: string | null;
	mimeType?: string | null;
	fileSize?: number | null;
	status?: string | null;
	fileUrl?: string | null;
	thumbUrl?: string | null;
	authorEmployeeId?: ID | null;
	authorUserId?: ID | null;
	attachedAt: string;
}

export interface IChatFilesQuery {
	limit?: number;
	skip?: number;
}

/**
 * Where a link preview stands (`GET /chat/link-preview?url=`), as the platform's `ChatLinkPreviewStatusEnum` says it:
 * `pending` while its worker fetches the page (ask again in a moment), `ready` once fetched, `unavailable` when there
 * is nothing to show (show the plain link).
 */
export enum EChatLinkPreviewStatus {
	Pending = 'pending',
	Ready = 'ready',
	Unavailable = 'unavailable'
}

/**
 * A link preview the platform fetched (the browser fetches none itself), as its `IChatLinkPreview` contract says it.
 * Every string is plain text the platform sanitized, rendered as text and never as HTML; `image` and `icon` are
 * absolute `https:` addresses.
 */
export interface IChatLinkPreview {
	/** The link, normalized (no fragment). */
	url: string;
	status: EChatLinkPreviewStatus;
	title?: string | null;
	description?: string | null;
	siteName?: string | null;
	image?: string | null;
	imageAlt?: string | null;
	imageWidth?: number | null;
	imageHeight?: number | null;
	icon?: string | null;
	/** When the platform last fetched the page. */
	fetchedAt?: string | null;
}

/** A page of the files of a conversation, newest first. */
export interface IChatFilesResult {
	files: IChatFile[];
	hasMore: boolean;
}

export interface IChatMessagesQuery {
	before?: ID;
	after?: ID;
	around?: ID;
	limit?: number;
}
