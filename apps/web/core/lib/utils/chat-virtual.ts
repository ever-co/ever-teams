import { attachmentIdsOf } from './chat-attachments';
import type { ChatTimelineItem } from './chat-timeline';

/** A stable key of a timeline row: what the virtual list keeps a row's measured height by, across older pages. */
export function timelineItemKey(item: ChatTimelineItem): string {
	if (item.type === 'day') return `day:${item.key}`;
	if (item.type === 'new') return 'new';
	return `message:${item.message.id}`;
}

/** Characters of a body that fit one line of the timeline, roughly (13 px text in a ~600 px column). */
const CHARS_PER_LINE = 80;
const LINE_PX = 21;

/**
 * The height a row is drawn at before it is measured, close enough that a jump over unmeasured rows lands near its
 * target: a header for a message that opens a group, a line per ~80 characters (and per line break), and room for its
 * files, task cards, reactions and replies.
 */
export function estimateTimelineItemSize(item: ChatTimelineItem): number {
	if (item.type === 'day') return 36;
	if (item.type === 'new') return 26;
	const { message, continues } = item;
	if (message.deletedAt) return continues ? 26 : 50;
	const body = message.body ?? '';
	const lines = body.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / CHARS_PER_LINE)), 0);
	let height = (continues ? 6 : 30) + lines * LINE_PX;
	if (attachmentIdsOf(message).length) height += 70;
	height += (message.taskReferences?.length ?? 0) * 46;
	if (message.reactions?.length) height += 32;
	if (message.replyCount > 0) height += 36;
	if (message.pinnedAt) height += 18;
	return height;
}

/** Where the target of a jump is among the rows, or -1. */
export function indexOfMessage(items: readonly ChatTimelineItem[], messageId: string): number {
	return items.findIndex((item) => item.type === 'message' && item.message.id === messageId);
}
