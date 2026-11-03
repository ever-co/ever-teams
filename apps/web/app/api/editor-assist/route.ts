import { APICallError, generateText, RetryError, type LanguageModel } from 'ai';
import { NextResponse } from 'next/server';
import { APP_NAME } from '@/core/constants/config/constants';
import { createChatProvider, DEFAULT_CHAT_MODEL } from '@/core/lib/chat/chat-provider';
import {
	editorAssistSystemPrompt,
	editorAssistUserPrompt,
	parseEditorAssistAnswer
} from '@/core/lib/chat/editor-assist-prompt';
import { hasServerAiProvider } from '@/core/lib/chat/server-ai-provider';
import { firstAnswer, TEXT_CHAIN_BUDGET, UnusableAnswerError, type ChainLink } from '@/core/lib/ai/provider-chain';
import { takeAiCall, type AiRateLimit } from '@/core/lib/ai/rate-limit';
import { freeLanguageLinks, paidLanguageLinks, type LanguageLink } from '@/core/lib/ai/server-providers';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import {
	editorAssistRequestSchema,
	type TEditorAssistAvailability,
	type TEditorAssistErrorCode,
	type TEditorAssistRequest
} from '@/core/types/schemas/ai/editor-assist.schema';

const MAX_OUTPUT_TOKENS = 3000;

const EDITOR_ASSIST_RATE_LIMIT: AiRateLimit = {
	surface: 'editor-assist',
	perUser: 40,
	perIp: 80,
	windowMs: 10 * 60 * 1000
};

type EditorAssistAnswer = ReturnType<typeof parseEditorAssistAnswer>;

function errorResponse(code: TEditorAssistErrorCode, status: number) {
	return NextResponse.json({ error: code }, { status });
}

async function readJson(req: Request): Promise<unknown> {
	try {
		return await req.json();
	} catch {
		return null;
	}
}

function lastAttemptError(error: unknown) {
	if (RetryError.isInstance(error)) {
		return error.lastError;
	}
	return error;
}

function isRefusedKey(statusCode: number | undefined) {
	const isUnauthorized = statusCode === 401;
	const isForbidden = statusCode === 403;
	return isUnauthorized || isForbidden;
}

/** The provider's own message can quote part of the key or of the text: only a code leaves this server. */
function providerFailure(error: unknown) {
	const cause = lastAttemptError(error);
	if (!APICallError.isInstance(cause)) {
		return errorResponse('provider_unavailable', 502);
	}
	if (isRefusedKey(cause.statusCode)) {
		return errorResponse('provider_auth', 502);
	}
	if (cause.statusCode === 429) {
		return errorResponse('provider_rate_limit', 429);
	}
	return errorResponse('provider_unavailable', 502);
}

async function proposeWith(model: LanguageModel, request: TEditorAssistRequest, signal: AbortSignal) {
	const { text } = await generateText({
		model,
		system: editorAssistSystemPrompt(APP_NAME),
		prompt: editorAssistUserPrompt(request),
		maxOutputTokens: MAX_OUTPUT_TOKENS,
		maxRetries: 1,
		abortSignal: signal
	});
	return parseEditorAssistAnswer(text);
}

/** In the chain the next provider is the retry, and an empty proposal moves on without pausing anyone. */
function chainLinkOf(link: LanguageLink, request: TEditorAssistRequest): ChainLink<EditorAssistAnswer> {
	return {
		id: link.id,
		group: link.group,
		run: async (signal) => {
			const { text } = await generateText({
				model: link.model,
				system: editorAssistSystemPrompt(APP_NAME),
				prompt: editorAssistUserPrompt(request),
				maxOutputTokens: MAX_OUTPUT_TOKENS,
				maxRetries: 0,
				reasoning: 'low',
				abortSignal: signal
			});
			const answer = parseEditorAssistAnswer(text);
			if (!answer.text) {
				throw new UnusableAnswerError();
			}
			return answer;
		}
	};
}

/** The deployment's chain: free providers first, then the paid path; `null` when none answered. */
async function proposeWithServerKeys(request: TEditorAssistRequest, signal: AbortSignal) {
	const freeLinks = freeLanguageLinks().map((link) => chainLinkOf(link, request));
	const paidLinks = paidLanguageLinks().map((link) => chainLinkOf(link, request));
	return firstAnswer(freeLinks, paidLinks, TEXT_CHAIN_BUDGET, signal);
}

async function proposeWithUserConfig(request: TEditorAssistRequest, signal: AbortSignal) {
	const config = request.config;
	if (!config) {
		return null;
	}
	const chatProvider = await createChatProvider(config);
	if (!chatProvider.ok) {
		return 'invalid_base_url' as const;
	}
	const modelId = config.model || DEFAULT_CHAT_MODEL;
	const model = chatProvider.openai.chat(modelId);
	return proposeWith(model, request, signal);
}

/** Tells the editor whether the deployment has its own AI key, so it asks for the user's only when it does not. */
export async function GET(req: Request) {
	const guard = await authenticatedGuard(req, new NextResponse());
	if (!guard.user) return guard.deny();

	const availability: TEditorAssistAvailability = { server: hasServerAiProvider() };
	return NextResponse.json(availability);
}

/**
 * One writing-help operation of the rich editor. The deployment's own providers come first (free chain, then paid);
 * without them the request carries the user's assistant configuration, as the chat does. Nothing is stored: the
 * proposal goes back to the editor, which applies it only when the user accepts it.
 */
export async function POST(req: Request) {
	const guard = await authenticatedGuard(req, new NextResponse());
	if (!guard.user) return guard.deny();

	const body = await readJson(req);
	const parsed = editorAssistRequestSchema.safeParse(body);
	if (!parsed.success) return errorResponse('invalid_request', 400);
	const request = parsed.data;

	try {
		const usesServerKeys = hasServerAiProvider();
		if (usesServerKeys) {
			const verdict = takeAiCall(EDITOR_ASSIST_RATE_LIMIT, guard.user.id, req.headers);
			if (!verdict.allowed) return errorResponse('provider_rate_limit', 429);
			const answer = await proposeWithServerKeys(request, req.signal);
			if (!answer) return errorResponse('provider_unavailable', 502);
			return NextResponse.json(answer);
		}
		const answer = await proposeWithUserConfig(request, req.signal);
		if (answer === null) return errorResponse('not_configured', 400);
		if (answer === 'invalid_base_url') return errorResponse('invalid_base_url', 400);
		if (!answer.text) return errorResponse('empty_result', 502);
		return NextResponse.json(answer);
	} catch (error) {
		return providerFailure(error);
	}
}
