import type { UIMessageChunk } from 'ai';
import { clearProviderPause, isProviderPaused, pauseProviderAfter, unwrapAiError } from './provider-health';

export interface ChainLink<T> {
	id: string;
	group: string;
	run: (signal: AbortSignal) => Promise<T>;
}

export interface ChainBudget {
	attemptMs: number;
	totalMs: number;
	/** A free attempt is not started with less time than this left: the paid path answers instead. */
	minRemainingMs: number;
	paidAttemptMs: number;
}

export const TEXT_CHAIN_BUDGET: ChainBudget = {
	attemptMs: 8_000,
	totalMs: 10_000,
	minRemainingMs: 3_000,
	paidAttemptMs: 45_000
};

/** Thrown by a link whose answer is unusable (empty, unparsable): the next link is tried, nothing is paused. */
export class UnusableAnswerError extends Error {
	constructor(message = 'The provider returned an unusable answer.') {
		super(message);
		this.name = 'UnusableAnswerError';
	}
}

interface ChainStore {
	__everTeamsAiGroupTurns?: Map<string, number>;
}

const store = globalThis as ChainStore;

function groupTurns() {
	if (!store.__everTeamsAiGroupTurns) {
		store.__everTeamsAiGroupTurns = new Map<string, number>();
	}
	return store.__everTeamsAiGroupTurns;
}

/** Groups in their declared order; inside a group the first link changes on every call, so free quotas wear evenly. */
export function inServingOrder<L extends { group: string }>(links: L[]): L[] {
	const groups = new Map<string, L[]>();
	for (const link of links) {
		const members = groups.get(link.group) ?? [];
		members.push(link);
		groups.set(link.group, members);
	}
	const turns = groupTurns();
	const ordered: L[] = [];
	for (const [group, members] of groups) {
		const turn = turns.get(group) ?? 0;
		turns.set(group, turn + 1);
		const start = turn % members.length;
		const fromTurn = members.slice(start);
		const beforeTurn = members.slice(0, start);
		ordered.push(...fromTurn, ...beforeTurn);
	}
	return ordered;
}

function availableFreeLinks<L extends { id: string; group: string }>(links: L[]) {
	const ordered = inServingOrder(links);
	return ordered.filter((link) => !isProviderPaused(link.id));
}

function errorSummaryOf(failure: unknown) {
	const error = unwrapAiError(failure);
	if (error instanceof Error) {
		return error.message.slice(0, 200);
	}
	return String(error).slice(0, 200);
}

function isUnusable(failure: unknown) {
	return failure instanceof UnusableAnswerError;
}

/** Logs the provider's own message, never the request: a failed call says why without carrying user content. */
function recordFailure(linkId: string, failure: unknown, callerSignal: AbortSignal | undefined) {
	const isCallerGone = Boolean(callerSignal?.aborted);
	if (isCallerGone) {
		return;
	}
	if (isUnusable(failure)) {
		console.warn(`[ai] ${linkId} gave an unusable answer, trying the next provider`);
		return;
	}
	const pauseMs = pauseProviderAfter(linkId, failure);
	const pauseSeconds = Math.round(pauseMs / 1000);
	console.warn(`[ai] ${linkId} failed, paused ${pauseSeconds}s: ${errorSummaryOf(failure)}`);
}

function attemptSignal(callerSignal: AbortSignal | undefined, budgetMs: number) {
	const timeout = AbortSignal.timeout(budgetMs);
	if (!callerSignal) {
		return timeout;
	}
	return AbortSignal.any([callerSignal, timeout]);
}

/**
 * The first answer of the free links, each attempt bounded and the whole walk held to the budget, then the paid
 * links, which are never paused so the feature cannot go dark. `null` when nothing answered.
 */
export async function firstAnswer<T>(
	freeLinks: ChainLink<T>[],
	paidLinks: ChainLink<T>[],
	budget: ChainBudget,
	callerSignal?: AbortSignal
): Promise<T | null> {
	const deadline = Date.now() + budget.totalMs;
	for (const link of availableFreeLinks(freeLinks)) {
		const remainingMs = deadline - Date.now();
		if (remainingMs < budget.minRemainingMs) {
			break;
		}
		const budgetMs = Math.min(budget.attemptMs, remainingMs);
		try {
			const answer = await link.run(attemptSignal(callerSignal, budgetMs));
			clearProviderPause(link.id);
			return answer;
		} catch (failure) {
			recordFailure(link.id, failure, callerSignal);
			if (callerSignal?.aborted) {
				throw failure;
			}
		}
	}
	for (const link of paidLinks) {
		try {
			return await link.run(attemptSignal(callerSignal, budget.paidAttemptMs));
		} catch (failure) {
			console.warn(`[ai] paid ${link.id} failed: ${errorSummaryOf(failure)}`);
			if (callerSignal?.aborted) {
				throw failure;
			}
		}
	}
	return null;
}

export interface StreamLink {
	id: string;
	group: string;
	/** Starts the stream; `failure()` returns the error the provider reported, once the stream ended in one. */
	start: (signal: AbortSignal) => { stream: ReadableStream<UIMessageChunk>; failure: () => unknown };
}

const CONFIRMING_CHUNKS = new Set<UIMessageChunk['type']>(['text-delta']);

class StreamAttemptError extends Error {
	constructor(readonly cause: unknown) {
		super('The provider stream failed before its first token.');
	}
}

interface ConfirmedStream {
	buffered: UIMessageChunk[];
	reader: ReadableStreamDefaultReader<UIMessageChunk>;
	stopTimer: () => void;
}

/**
 * Reads a link's stream until its first token. A provider fails at request time, so an error before that token
 * (or a stream that ends without one) moves the call to the next link; after it, the answer is committed.
 */
async function untilFirstToken(
	link: StreamLink,
	callerSignal: AbortSignal,
	budgetMs: number
): Promise<ConfirmedStream> {
	const attempt = new AbortController();
	const timer = setTimeout(() => attempt.abort(new DOMException('First token timeout', 'TimeoutError')), budgetMs);
	const stopTimer = () => clearTimeout(timer);
	const signal = AbortSignal.any([callerSignal, attempt.signal]);
	const { stream, failure } = link.start(signal);
	const reader = stream.getReader();
	const buffered: UIMessageChunk[] = [];
	for (;;) {
		const { done, value } = await reader.read();
		if (done) {
			stopTimer();
			const cause = failure() ?? attempt.signal.reason ?? new UnusableAnswerError();
			throw new StreamAttemptError(cause);
		}
		if (value.type === 'error') {
			stopTimer();
			await reader.cancel();
			const cause = failure() ?? new Error(value.errorText);
			throw new StreamAttemptError(cause);
		}
		buffered.push(value);
		if (CONFIRMING_CHUNKS.has(value.type)) {
			stopTimer();
			return { buffered, reader, stopTimer };
		}
	}
}

async function pipeRest(confirmed: ConfirmedStream, write: (chunk: UIMessageChunk) => void) {
	for (const chunk of confirmed.buffered) {
		write(chunk);
	}
	for (;;) {
		const { done, value } = await confirmed.reader.read();
		if (done) {
			return;
		}
		write(value);
	}
}

async function tryStreamLink(
	link: StreamLink,
	callerSignal: AbortSignal,
	budgetMs: number,
	write: (chunk: UIMessageChunk) => void
) {
	const confirmed = await untilFirstToken(link, callerSignal, budgetMs);
	await pipeRest(confirmed, write);
}

function causeOf(failure: unknown) {
	if (failure instanceof StreamAttemptError) {
		return failure.cause;
	}
	return failure;
}

/**
 * The streaming twin of `firstAnswer`: free links first under the same budget, then the paid links. Returns
 * whether a link answered; the caller writes its own error chunk when none did.
 */
export async function streamFirstAnswer(
	freeLinks: StreamLink[],
	paidLinks: StreamLink[],
	budget: ChainBudget,
	callerSignal: AbortSignal,
	write: (chunk: UIMessageChunk) => void
): Promise<boolean> {
	const deadline = Date.now() + budget.totalMs;
	for (const link of availableFreeLinks(freeLinks)) {
		const remainingMs = deadline - Date.now();
		if (remainingMs < budget.minRemainingMs) {
			break;
		}
		const budgetMs = Math.min(budget.attemptMs, remainingMs);
		try {
			await tryStreamLink(link, callerSignal, budgetMs, write);
			clearProviderPause(link.id);
			return true;
		} catch (failure) {
			if (!(failure instanceof StreamAttemptError)) {
				throw failure;
			}
			recordFailure(link.id, causeOf(failure), callerSignal);
			if (callerSignal.aborted) {
				return false;
			}
		}
	}
	for (const link of paidLinks) {
		try {
			await tryStreamLink(link, callerSignal, budget.paidAttemptMs, write);
			return true;
		} catch (failure) {
			if (!(failure instanceof StreamAttemptError)) {
				throw failure;
			}
			console.warn(`[ai] paid ${link.id} failed: ${errorSummaryOf(causeOf(failure))}`);
			if (callerSignal.aborted) {
				return false;
			}
		}
	}
	return false;
}
