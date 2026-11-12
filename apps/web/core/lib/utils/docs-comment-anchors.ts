import type {
	IDocumentCommentAnchorInput,
	IDocumentCommentAnchorPosition,
	IDocumentCommentAnchorResolved,
	IDocumentNode,
	TDocumentCommentAnchorMethod,
	TDocumentCommentAnchorStatus
} from '@/core/types/interfaces/common/docs';

/**
 * Text-range anchors of page comments, as the platform stores and finds them again (its `document-comment-anchor.ts`
 * rules, written here alike so a range is found in the same place in the editor, in the panel and on the platform).
 *
 * A block is a node of the page's JSON with a `blockId`; its text is every text node under it, in order, with nothing
 * between them. An anchor is found again in this order:
 *
 * 1. the live relative positions, when the anchor has them and the page is edited live;
 * 2. the stored offsets, when the block's text there still is the quote;
 * 3. the quote in its block (the occurrence whose context and place fit best), then in the other blocks;
 * 4. the quote with small differences in its block (at most a quarter of it edited);
 * 5. the block alone; else the anchor is orphaned.
 */

/** The longest quote an anchor keeps. */
export const DOCS_ANCHOR_QUOTE_MAX_LENGTH = 1000;
/** The longest context (`prefix` / `suffix`) an anchor keeps. */
export const DOCS_ANCHOR_CONTEXT_MAX_LENGTH = 32;
/** An approximate match is looked for only for quotes at least this long (a shorter one is too ambiguous). */
export const DOCS_ANCHOR_FUZZY_MIN_LENGTH = 6;
/** The approximate match compares at most this many characters of the quote (its beginning). */
export const DOCS_ANCHOR_FUZZY_MAX_LENGTH = 256;
/** The approximate match reads at most this many characters of a block. */
export const DOCS_ANCHOR_FUZZY_MAX_TEXT = 20_000;
/** At most this share of an approximate match may differ from the quote. */
export const DOCS_ANCHOR_FUZZY_MAX_ERROR_RATE = 0.25;

/** A block of a page: its anchor and its text (text nodes only). */
export interface DocsAnchorBlock {
	blockId: string;
	text: string;
}

/** Where a live relative position is: a block and an offset into its text. */
export interface DocsLiveAnchorPoint {
	blockId: string;
	offset: number;
}

/** Reads an anchor's relative position (base64) in the page's shared document; null when it is not in it. */
export type DocsLiveAnchorResolver = (relative: string) => DocsLiveAnchorPoint | null;

function blockIdOf(node: IDocumentNode): string | null {
	const value = node.attrs?.['blockId'];
	return typeof value === 'string' && value.length > 0 ? value : null;
}

/** The text of a node: every text node under it, in order, with nothing between them. */
export function blockTextOf(node: IDocumentNode | null | undefined): string {
	if (!node || typeof node !== 'object') return '';
	if (node.type === 'text') return typeof node.text === 'string' ? node.text : '';
	if (!Array.isArray(node.content)) return '';
	let text = '';
	for (const child of node.content) text += blockTextOf(child);
	return text;
}

/** The blocks of a page's JSON in document order (an outer block before those inside it); a copied anchor is the first one's. */
export function anchorBlocksOf(json: IDocumentNode | null | undefined): DocsAnchorBlock[] {
	const blocks: DocsAnchorBlock[] = [];
	const seen = new Set<string>();
	const visit = (node: IDocumentNode | null | undefined, depth: number): void => {
		if (!node || typeof node !== 'object' || depth > 200) return;
		const blockId = blockIdOf(node);
		if (blockId && !seen.has(blockId)) {
			seen.add(blockId);
			blocks.push({ blockId, text: blockTextOf(node) });
		}
		if (Array.isArray(node.content)) for (const child of node.content) visit(child, depth + 1);
	};
	visit(json, 0);
	return blocks;
}

function position(
	status: TDocumentCommentAnchorStatus,
	method: TDocumentCommentAnchorMethod | null,
	blockId: string | null,
	start: number | null,
	end: number | null,
	text: string | null
): IDocumentCommentAnchorPosition {
	return { status, method, blockId, start, end, text };
}

/** Every start of `quote` in `text`. */
export function occurrencesOf(text: string, quote: string): number[] {
	const found: number[] = [];
	if (!quote) return found;
	for (let at = text.indexOf(quote); at >= 0; at = text.indexOf(quote, at + 1)) found.push(at);
	return found;
}

type AnchorContext = Pick<IDocumentCommentAnchorInput, 'prefix' | 'suffix'>;

/** How well the text around an occurrence matches the anchor's prefix and suffix (characters in common). */
function contextScore(text: string, at: number, length: number, anchor: AnchorContext): number {
	const prefix = anchor.prefix ?? '';
	const suffix = anchor.suffix ?? '';
	let score = 0;
	for (let n = 1; n <= prefix.length && at - n >= 0 && text[at - n] === prefix[prefix.length - n]; n += 1) score += 1;
	for (let n = 0; n < suffix.length && at + length + n < text.length && text[at + length + n] === suffix[n]; n += 1) score += 1;
	return score;
}

/** The occurrence of `quote` that fits best: the most context in common, then the nearest to `near`, then the first. */
function bestOccurrence(text: string, quote: string, anchor: AnchorContext, near: number | null): number | null {
	const found = occurrencesOf(text, quote);
	if (!found.length) return null;
	let best = found[0];
	let bestScore = contextScore(text, best, quote.length, anchor);
	for (const at of found.slice(1)) {
		const score = contextScore(text, at, quote.length, anchor);
		const closer = near !== null && Math.abs(at - near) < Math.abs(best - near);
		if (score > bestScore || (score === bestScore && closer)) {
			best = at;
			bestScore = score;
		}
	}
	return best;
}

/**
 * The substring of `text` closest to `quote` by edit distance, when at most {@link DOCS_ANCHOR_FUZZY_MAX_ERROR_RATE}
 * of the quote differs. Of equally close substrings, the first, run on for as long as it stays as close.
 */
export function approximateMatch(text: string, quote: string): { start: number; end: number; distance: number } | null {
	if (quote.length < DOCS_ANCHOR_FUZZY_MIN_LENGTH || !text) return null;
	const pattern = quote.slice(0, DOCS_ANCHOR_FUZZY_MAX_LENGTH);
	const haystack = text.slice(0, DOCS_ANCHOR_FUZZY_MAX_TEXT);
	const m = pattern.length;
	const limit = Math.floor(m * DOCS_ANCHOR_FUZZY_MAX_ERROR_RATE);
	// Sellers' algorithm: a match may start anywhere (row 0 is all zeroes); each cell keeps where its match started.
	let cost = new Array<number>(m + 1);
	let from = new Array<number>(m + 1);
	for (let i = 0; i <= m; i += 1) {
		cost[i] = i;
		from[i] = 0;
	}
	let best: { start: number; end: number; distance: number } | null = null;
	for (let j = 1; j <= haystack.length; j += 1) {
		const nextCost = new Array<number>(m + 1);
		const nextFrom = new Array<number>(m + 1);
		nextCost[0] = 0;
		nextFrom[0] = j;
		for (let i = 1; i <= m; i += 1) {
			const substitution = cost[i - 1] + (pattern[i - 1] === haystack[j - 1] ? 0 : 1);
			const deletion = cost[i] + 1; // a character of the text that the quote has not
			const insertion = nextCost[i - 1] + 1; // a character of the quote that the text has not
			if (substitution <= deletion && substitution <= insertion) {
				nextCost[i] = substitution;
				nextFrom[i] = from[i - 1];
			} else if (insertion <= deletion) {
				nextCost[i] = insertion;
				nextFrom[i] = nextFrom[i - 1];
			} else {
				nextCost[i] = deletion;
				nextFrom[i] = from[i];
			}
		}
		cost = nextCost;
		from = nextFrom;
		if (cost[m] <= limit && (!best || cost[m] < best.distance)) {
			best = { start: from[m], end: j, distance: cost[m] };
			if (cost[m] === 0) break;
		} else if (best && cost[m] === best.distance && from[m] === best.start && j === best.end + 1) {
			// As close and from the same start, one character on: the longer match covers the quote's tail too.
			best.end = j;
		}
	}
	if (!best || best.end <= best.start) return null;
	if (quote.length === pattern.length) return best;
	// A quote longer than the compared part: the match runs on by what was not compared, inside the text, and the whole
	// run must be as close to the whole quote (a tail edited past the limit is not the quote any more).
	const end = Math.min(text.length, best.end + (quote.length - pattern.length));
	const distance = editDistanceWithin(text.slice(best.start, end), quote, Math.floor(quote.length * DOCS_ANCHOR_FUZZY_MAX_ERROR_RATE));
	return distance === null ? null : { start: best.start, end, distance };
}

/**
 * The edit distance (insertions, deletions, substitutions) between `a` and `b` when it is at most `limit`, else null.
 * Only a band of `limit` cells around the diagonal is computed, so it costs O(|a| · limit).
 */
export function editDistanceWithin(a: string, b: string, limit: number): number | null {
	if (limit < 0 || Math.abs(a.length - b.length) > limit) return null;
	const beyond = limit + 1;
	let previous = new Array<number>(b.length + 1);
	for (let j = 0; j <= b.length; j += 1) previous[j] = j <= limit ? j : beyond;
	for (let i = 1; i <= a.length; i += 1) {
		const current = new Array<number>(b.length + 1).fill(beyond);
		current[0] = i <= limit ? i : beyond;
		let rowBest = current[0];
		for (let j = Math.max(1, i - limit); j <= Math.min(b.length, i + limit); j += 1) {
			const cost = Math.min(previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), previous[j] + 1, current[j - 1] + 1);
			current[j] = Math.min(cost, beyond);
			if (current[j] < rowBest) rowBest = current[j];
		}
		if (rowBest > limit) return null;
		previous = current;
	}
	return previous[b.length] <= limit ? previous[b.length] : null;
}

/**
 * Where an anchor is in the page as it is now.
 *
 * @param anchor The stored anchor.
 * @param blocks The page's blocks ({@link anchorBlocksOf}, or the editor's).
 * @param live The relative positions in the page's shared document, while it is edited live.
 */
export function resolveCommentAnchor(
	anchor: IDocumentCommentAnchorInput,
	blocks: readonly DocsAnchorBlock[],
	live?: DocsLiveAnchorResolver | null
): IDocumentCommentAnchorPosition {
	const quote = String(anchor.quote ?? '');
	const byId = new Map<string, DocsAnchorBlock>();
	for (const block of blocks) if (!byId.has(block.blockId)) byId.set(block.blockId, block);
	const own = byId.get(anchor.blockId) ?? null;

	// 1. The live positions follow every edit: their range is the comment's even when its text was edited.
	if (live && anchor.relativeStart && anchor.relativeEnd) {
		const from = live(anchor.relativeStart);
		const to = live(anchor.relativeEnd);
		const block = from ? byId.get(from.blockId) : undefined;
		if (from && to && block && from.blockId === to.blockId && to.offset > from.offset && to.offset <= block.text.length) {
			const text = block.text.slice(from.offset, to.offset);
			return position(text === quote ? 'exact' : 'moved', 'relative', block.blockId, from.offset, to.offset, text);
		}
	}

	if (quote.length > 0) {
		// 2. The offsets, when they still cover the quote.
		const start = Number(anchor.start);
		const end = Number(anchor.end);
		if (own && Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end <= own.text.length && own.text.slice(start, end) === quote) {
			return position('exact', 'offsets', own.blockId, start, end, quote);
		}
		// 3. The quote, in its block first.
		if (own) {
			const at = bestOccurrence(own.text, quote, anchor, Number.isInteger(start) ? start : null);
			if (at !== null) return position('moved', 'quote', own.blockId, at, at + quote.length, quote);
		}
		// … then in the other blocks: the one whose context fits best, the first of equals.
		let best: { block: DocsAnchorBlock; at: number; score: number } | null = null;
		for (const block of blocks) {
			if (block === own || block.text.length < quote.length) continue;
			const at = bestOccurrence(block.text, quote, anchor, null);
			if (at === null) continue;
			const score = contextScore(block.text, at, quote.length, anchor);
			if (!best || score > best.score) best = { block, at, score };
		}
		if (best) return position('moved', 'quote', best.block.blockId, best.at, best.at + quote.length, quote);
		// 4. The quote with small differences, in its block.
		if (own) {
			const match = approximateMatch(own.text, quote);
			if (match) return position('moved', 'fuzzy', own.blockId, match.start, match.end, own.text.slice(match.start, match.end));
		}
	}

	// 5. The block alone.
	if (own) return position('block', 'block', own.blockId, null, null, null);
	return position('orphaned', null, null, null, null, null);
}

/** The context stored beside a quote: the block's text right before and after the range. */
export function anchorContextOf(text: string, start: number, end: number): { prefix: string; suffix: string } {
	return {
		prefix: text.slice(Math.max(0, start - DOCS_ANCHOR_CONTEXT_MAX_LENGTH), start),
		suffix: text.slice(end, end + DOCS_ANCHOR_CONTEXT_MAX_LENGTH)
	};
}

/**
 * The anchor of a selection in a block: the offsets clamped to the block's text (at most
 * {@link DOCS_ANCHOR_QUOTE_MAX_LENGTH} characters from the start), the quote their slice, the context around it, and
 * the live relative positions when there are both. Null for an empty range (the comment is on the block).
 */
export function commentAnchorInputOf(
	blockId: string,
	blockText: string,
	start: number,
	end: number,
	relative?: { relativeStart: string; relativeEnd: string } | null
): IDocumentCommentAnchorInput | null {
	const from = Math.max(0, Math.min(Math.trunc(start), blockText.length));
	const to = Math.max(from, Math.min(Math.trunc(end), blockText.length, from + DOCS_ANCHOR_QUOTE_MAX_LENGTH));
	if (!blockId || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
	const { prefix, suffix } = anchorContextOf(blockText, from, to);
	// The live ends name the selection; a range cut to the block or to the quote's limit no longer ends where they do.
	const relativeStart = relative?.relativeStart ?? '';
	const relativeEnd = relative?.relativeEnd ?? '';
	const keepsRelative = relativeStart.length > 0 && relativeEnd.length > 0 && from === Math.trunc(start) && to === Math.trunc(end);
	return {
		blockId,
		start: from,
		end: to,
		quote: blockText.slice(from, to),
		...(prefix ? { prefix } : {}),
		...(suffix ? { suffix } : {}),
		...(keepsRelative ? { relativeStart, relativeEnd } : {})
	};
}

/** Only the stored fields of an anchor (the platform's answer also carries ids, times and its own position). */
export function storedAnchorOf(anchor: IDocumentCommentAnchorInput): IDocumentCommentAnchorInput {
	return {
		blockId: anchor.blockId,
		start: anchor.start,
		end: anchor.end,
		quote: anchor.quote,
		prefix: anchor.prefix ?? null,
		suffix: anchor.suffix ?? null,
		relativeStart: anchor.relativeStart ?? null,
		relativeEnd: anchor.relativeEnd ?? null
	};
}

/** The anchors of a page's comments by comment. */
export function anchorsByComment(items: readonly IDocumentCommentAnchorResolved[] | null | undefined): Map<string, IDocumentCommentAnchorResolved> {
	const byComment = new Map<string, IDocumentCommentAnchorResolved>();
	for (const item of items ?? []) if (item?.commentId) byComment.set(String(item.commentId), item);
	return byComment;
}

/**
 * Where a thread is shown:
 * - `page`: a comment on the page as a whole;
 * - `range`: on a range of text (`text` is what it covers now);
 * - `block`: on a block (a thread made before ranges, or on a platform without them);
 * - `block-fallback`: its text is gone but its block is there;
 * - `orphaned`: neither its text nor its block is on the page.
 */
export type DocsThreadPlaceKind = 'page' | 'range' | 'block' | 'block-fallback' | 'orphaned';

export interface DocsThreadPlace {
	kind: DocsThreadPlaceKind;
	blockId: string | null;
	start: number | null;
	end: number | null;
	text: string | null;
	/** How the range was found again (null without an anchor). */
	position: IDocumentCommentAnchorPosition | null;
}

/**
 * The place of a thread on the page as it is now: by its range when it has an anchor, else by the block its first
 * line names.
 *
 * @param thread The thread's block (from its anchor line).
 * @param anchor The thread's stored anchor, when the platform has one.
 * @param blocks The page's blocks now; null when the page's JSON is not known (the platform's own position stands).
 */
export function threadPlaceOf(
	thread: { blockId: string | null },
	anchor: IDocumentCommentAnchorResolved | IDocumentCommentAnchorInput | null | undefined,
	blocks: readonly DocsAnchorBlock[] | null,
	live?: DocsLiveAnchorResolver | null
): DocsThreadPlace {
	if (anchor) {
		const stored = 'position' in anchor ? anchor.position : null;
		const found = blocks ? resolveCommentAnchor(anchor, blocks, live) : stored;
		if (found) {
			const kind: DocsThreadPlaceKind =
				found.status === 'orphaned' ? 'orphaned' : found.status === 'block' || found.start === null || found.end === null ? 'block-fallback' : 'range';
			return { kind, blockId: found.blockId, start: found.start, end: found.end, text: found.text, position: found };
		}
	}
	if (!thread.blockId) return { kind: 'page', blockId: null, start: null, end: null, text: null, position: null };
	const isThere = !blocks || blocks.some((block) => block.blockId === thread.blockId);
	return { kind: isThere ? 'block' : 'orphaned', blockId: isThere ? thread.blockId : null, start: null, end: null, text: null, position: null };
}
