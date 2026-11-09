import type { ID } from './base-interfaces';

/** The tabs the platform inbox filters on. */
export enum EInboxTab {
	All = 'all',
	Decisions = 'decisions',
	Email = 'email',
	Snoozed = 'snoozed',
	Done = 'done',
	Archived = 'archived'
}

/** What an inbox item is. */
export enum EInboxItemKind {
	Question = 'QUESTION',
	Approval = 'APPROVAL',
	Escalation = 'ESCALATION',
	Notice = 'NOTICE',
	Email = 'EMAIL',
	/** A platform notification (an assignment, a mention, a comment, a message…) filed as an item. */
	Notification = 'NOTIFICATION'
}

/** Where an inbox item comes from. */
export enum EInboxItemSource {
	EverWorks = 'EVER_WORKS',
	Email = 'EMAIL',
	Gauzy = 'GAUZY',
	System = 'SYSTEM'
}

export enum EInboxItemStatus {
	Open = 'OPEN',
	Answered = 'ANSWERED',
	Resolved = 'RESOLVED',
	Cancelled = 'CANCELLED'
}

/** The `externalSource` of an item filed from a platform notification. */
export const INBOX_NOTIFICATION_EXTERNAL_SOURCE = 'gauzy-notification';

/** The signed-in user's own state of an item. */
export interface IInboxRecipientState {
	isRead: boolean;
	readAt?: string | null;
	isArchived?: boolean | null;
	archivedAt?: string | null;
	snoozedUntil?: string | null;
	doneAt?: string | null;
	isDone?: boolean | null;
}

/** An inbox item as the platform answers it, with the caller's state. */
export interface IInboxItem {
	id: ID;
	kind: EInboxItemKind | string;
	source: EInboxItemSource | string;
	status: EInboxItemStatus | string;
	title: string;
	body?: string | null;
	bodyFormat?: 'plain' | 'markdown' | string;
	priority?: 'low' | 'normal' | 'high' | 'urgent' | string;
	dueAt?: string | null;
	entity?: string | null;
	entityId?: ID | null;
	taskId?: ID | null;
	projectId?: ID | null;
	externalSource?: string | null;
	externalId?: string | null;
	metadata?: Record<string, unknown> | null;
	createdAt: string;
	updatedAt?: string;
	recipient: IInboxRecipientState | null;
	/** A question's or an approval's choices. */
	options?: IInboxItemOption[] | null;
	/** Whether an answer needs a reason (a text). */
	requireReason?: boolean;
	/** The answer the item received. */
	response?: IInboxItemResponse | null;
}

/** One choice of a question or an approval. */
export interface IInboxItemOption {
	id: string;
	label: string;
	description?: string;
	/** Highlighted in the reply pane. */
	recommended?: boolean;
}

/** The answer an item received. */
export interface IInboxItemResponse {
	text?: string | null;
	optionId?: string | null;
	answeredByUserId?: string;
	answeredAt?: string;
}

/** `POST /inbox/items/:id/reply`: an option, a text, or both (a reason). */
export interface IInboxReplyInput {
	text?: string;
	optionId?: string;
}

/** A page of items; `nextCursor` goes back as `cursor` for the next one, `null` on the last page. */
export interface IInboxItemPage {
	items: IInboxItem[];
	nextCursor: string | null;
}

export interface IInboxCounts {
	unread: number;
	decisionsOpen: number;
}

/** `GET /inbox/items` filters. */
export interface IInboxQuery {
	tab?: EInboxTab;
	kind?: EInboxItemKind | string;
	source?: string;
	unread?: boolean;
	q?: string;
	cursor?: string;
	limit?: number;
}

/** `PATCH /inbox/items/:id/state`. */
export interface IInboxStateInput {
	isRead?: boolean;
	isArchived?: boolean;
	/** ISO date-time; `null` un-snoozes. */
	snoozedUntil?: string | null;
	isDone?: boolean;
}

/** `POST /inbox/items/mark-all-read`. */
export interface IInboxMarkAllReadInput {
	tab?: EInboxTab;
	kind?: string;
	source?: string;
	q?: string;
}
