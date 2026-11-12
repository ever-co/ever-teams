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
/** The platform's `CHAT_TYPING_TTL_MS`: how long "is typing" shows when a signal says nothing of it. */
export const CHAT_TYPING_TTL_MS = 6000;
/** The platform's `CHAT_TYPING_MIN_INTERVAL_MS`: one place's typing is told at most this often. */
export const CHAT_TYPING_MIN_INTERVAL_MS = 2500;

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

/** The blocks an app message (an incoming webhook's post) renders; every text is plain text. */
export type TChatAppBlockType = 'header' | 'section' | 'divider' | 'context' | 'actions' | 'text';

/** A button of an app message: with `url` it opens that https page, otherwise a click calls the app back. */
export interface IChatAppButton {
	actionId: string;
	text: string;
	value?: string | null;
	url?: string | null;
	style?: 'primary' | 'danger' | null;
}

export type IChatAppBlock =
	| { type: 'header'; text: string }
	| { type: 'section'; text?: string | null; fields?: string[] | null }
	| { type: 'divider' }
	| { type: 'context'; elements: string[] }
	| { type: 'actions'; blockId?: string | null; elements: IChatAppButton[] }
	| { type: 'text'; text: string };

/** Where the app's callback of a click stands. */
export type TChatInteractionStatus = 'pending' | 'delivered' | 'retrying' | 'failed';

/** One click on a button of an app message (`POST /chat/messages/:id/interactions`). */
export interface IChatInteraction {
	interactionId: ID;
	messageId: ID;
	conversationId: ID;
	actionId: string;
	status: TChatInteractionStatus;
	attempts: number;
	/** Whether the app's reply replaced the message. */
	replyApplied: boolean;
	error?: string | null;
}

export interface IChatInteractionResult {
	interaction: IChatInteraction;
	/** The message as the app's reply left it, when it replied. */
	message?: IChatMessage;
	events: IChatEvent[];
}

export interface IChatMessage {
	id: ID;
	conversationId: ID;
	authorEmployeeId?: ID | null;
	authorUserId?: ID | null;
	kind: EChatMessageKind | string;
	/**
	 * Markdown subset with mention tokens; empty for a deleted message (`deletedAt` set) and for a message of files
	 * only (`attachmentIds` not empty).
	 */
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
	/**
	 * The names the files had when the message was sent or last edited, one per line: what a message of files only
	 * reads as in a preview. Null without files, and absent from a platform older than the field.
	 */
	attachmentNames?: string | null;
	nonce?: string | null;
	appName?: string | null;
	/** The incoming webhook that posted an app message (`kind: app`). */
	webhookId?: ID | null;
	/** The icon of the app that posted the message (https). */
	appIconUrl?: string | null;
	/** The layout of an app message, plain text throughout; `body` is its text fallback. */
	blocks?: IChatAppBlock[] | null;
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
	/** The text; may be empty (or left out) when the message carries at least one attachment. */
	body?: string;
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
	/** The new text; may be empty when the message, after the edit, carries at least one attachment. */
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
	/** A picture's size in pixels as shown (orientation applied), read when it was uploaded; null when unknown. */
	width?: number | null;
	height?: number | null;
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

/**
 * `PATCH /chat/messages/:id/tasks/:taskId`: change a task from its card in a message (its status, its priority, its
 * assignees), through the platform's task update and its task permissions. Only what is named changes.
 */
export interface IChatTaskUpdateInput {
	/** The status's name (a board column), as the task page writes it; with `taskStatusId` when the status is a record. */
	status?: string;
	taskStatusId?: ID | null;
	/** The priority's name; with `taskPriorityId` when the priority is a record; null clears it. */
	priority?: string | null;
	taskPriorityId?: ID | null;
	/** The assignees, all of them (an empty list unassigns everyone). */
	assigneeEmployeeIds?: ID[];
}

/** What a change from a task card answers: the task as it is now, and the events the change caused. */
export interface IChatTaskUpdateResult {
	task: { id: ID; status?: string | null; priority?: string | null; [key: string]: unknown };
	events: IChatEvent[];
}

/** `POST /chat/conversations/:id/typing`: I am typing in the conversation (or in one of its threads). */
export interface IChatTypingInput {
	threadRootId?: ID;
}

/** Whether the signal was told (a repeat within the platform's interval is not), and how long the members show it. */
export interface IChatTypingResult {
	sent: boolean;
	expiresInMs: number;
}

/** The real-time channel's `typing.signalled` signal: someone is typing in a conversation, or in one of its threads. */
export interface IChatTypingSignal {
	conversationId: ID;
	threadRootId?: ID | null;
	employeeId?: ID | null;
	userId: ID;
	at: string;
	/** How long to show it unless the typist signals again (absent from a signal not sent by the chat's own route). */
	expiresInMs?: number;
}

/** The channels of one category in the order the sidebar shows them; `categoryId` null for the uncategorized. */
export interface IChatCategoryChannelOrder {
	categoryId: ID | null;
	conversationIds: ID[];
}

/** `POST /chat/categories/reorder`: every category of the organization first to last, and optionally their channels. */
export interface IChatCategoryReorderInput {
	categoryIds: ID[];
	channels?: IChatCategoryChannelOrder[];
}

export interface IChatCategoryReorderResult {
	categories: IChatCategory[];
	/** The channels whose category or place changed. */
	conversations: Array<{ id: ID; categoryId: ID | null; position: number }>;
	events: IChatEvent[];
}

/** `DELETE /chat/attachments/:documentId`: whether the file, uploaded and never sent, was discarded. */
export interface IChatDraftDiscardResult {
	discarded: boolean;
}
