import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	streamText,
	type LanguageModel,
	type ModelMessage,
	type UIMessage
} from 'ai';
import { NextResponse } from 'next/server';
import { APP_NAME } from '@/core/constants/config/constants';
import { createChatProvider, DEFAULT_CHAT_MODEL } from '@/core/lib/chat/chat-provider';
import { createGuardedDownload, refuseImageUrls, resolveFileUrls } from '@/core/lib/chat/resolve-file-urls';
import { streamFirstAnswer, TEXT_CHAIN_BUDGET, type StreamLink } from '@/core/lib/ai/provider-chain';
import { rateLimitedResponse, takeAiCall, type AiRateLimit } from '@/core/lib/ai/rate-limit';
import {
	freeLanguageLinks,
	hasServerLanguageModel,
	paidLanguageLinks,
	type LanguageLink
} from '@/core/lib/ai/server-providers';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';

export const runtime = 'nodejs';

const MAX_OUTPUT_TOKENS = 4000;

const ASSISTANT_RATE_LIMIT: AiRateLimit = {
	surface: 'assistant',
	perUser: 40,
	perIp: 80,
	windowMs: 10 * 60 * 1000
};

const NO_KEY_MESSAGE = 'API key is required. Please configure it in the chat settings.';
const INVALID_MESSAGES = 'The chat messages are not valid.';
const NO_PROVIDER_ANSWERED = 'The assistant could not reach an AI provider right now. Please try again in a moment.';

type ChatRequestConfig = {
	apiKey?: string;
	provider?: string;
	model?: string;
	baseURL?: string;
};

type ChatRequestBody = {
	messages?: unknown;
	config?: ChatRequestConfig | null;
};

// APP_NAME is the deployment's runtime brand (container env), so a rebranded image's assistant introduces the
// product by its own name.
function systemPrompt() {
	return `You are a helpful AI assistant integrated into ${APP_NAME}, a work and project management platform.
You help users with their tasks, projects, and team collaboration questions.
Be concise, professional, and helpful. You can format your responses using Markdown.`;
}

async function readBody(req: Request): Promise<ChatRequestBody> {
	try {
		const body: unknown = await req.json();
		if (typeof body === 'object' && body !== null) {
			return body as ChatRequestBody;
		}
		return {};
	} catch {
		return {};
	}
}

type IncomingMessage = { id?: unknown; role?: unknown; content?: unknown; parts?: unknown };

function isConversationRole(role: unknown): role is 'user' | 'assistant' | 'system' {
	const isUser = role === 'user';
	const isAssistant = role === 'assistant';
	const isSystem = role === 'system';
	return isUser || isAssistant || isSystem;
}

function messageIdOf(message: IncomingMessage, index: number) {
	if (typeof message.id === 'string') {
		return message.id;
	}
	return `message-${index}`;
}

/** A message from the chat (parts) or from a client that still sends a plain `content` string. */
function toUiMessage(message: IncomingMessage, index: number): UIMessage | null {
	if (!isConversationRole(message.role)) {
		return null;
	}
	const id = messageIdOf(message, index);
	if (Array.isArray(message.parts)) {
		return { id, role: message.role, parts: message.parts } as UIMessage;
	}
	if (typeof message.content === 'string') {
		return { id, role: message.role, parts: [{ type: 'text', text: message.content }] };
	}
	return null;
}

function uiMessagesOf(messages: unknown): UIMessage[] | null {
	if (!Array.isArray(messages)) {
		return null;
	}
	const converted = messages.map((message, index) => toUiMessage(message as IncomingMessage, index));
	const valid = converted.filter((message): message is UIMessage => message !== null);
	const hasInvalid = valid.length !== converted.length;
	const isEmpty = valid.length === 0;
	if (hasInvalid || isEmpty) {
		return null;
	}
	return valid;
}

async function modelMessagesOf(messages: UIMessage[]): Promise<ModelMessage[] | null> {
	try {
		return await convertToModelMessages(messages);
	} catch {
		return null;
	}
}

/**
 * In the chain, moving to the next provider is the retry, so the SDK retries nothing, and reasoning models think
 * briefly; the user's own provider keeps the SDK defaults, as before.
 */
const CHAIN_CALL = { maxRetries: 0, reasoning: 'low' } as const;
const OWN_PROVIDER_CALL = {} as const;

function streamFrom(
	model: LanguageModel,
	prompt: ModelMessage[],
	signal: AbortSignal,
	callSettings: typeof CHAIN_CALL | typeof OWN_PROVIDER_CALL
) {
	let failure: unknown = null;
	const result = streamText({
		...callSettings,
		model,
		system: systemPrompt(),
		messages: prompt,
		maxOutputTokens: MAX_OUTPUT_TOKENS,
		abortSignal: signal,
		experimental_download: createGuardedDownload(signal),
		onError: ({ error }) => {
			failure = error;
		}
	});
	const stream = result.toUIMessageStream({ sendReasoning: false });
	return { stream, failure: () => failure };
}

function streamLinkOf(link: LanguageLink, prompt: ModelMessage[]): StreamLink {
	return {
		id: link.id,
		group: link.group,
		start: (signal) => streamFrom(link.model, prompt, signal, CHAIN_CALL)
	};
}

/** The deployment's chain: free providers first, each tried until one gives a first token, then the paid path. */
function serverChainResponse(prompt: ModelMessage[], callerSignal: AbortSignal) {
	const freeLinks = freeLanguageLinks().map((link) => streamLinkOf(link, prompt));
	const paidLinks = paidLanguageLinks().map((link) => streamLinkOf(link, prompt));
	const stream = createUIMessageStream({
		execute: async ({ writer }) => {
			const answered = await streamFirstAnswer(freeLinks, paidLinks, TEXT_CHAIN_BUDGET, callerSignal, (chunk) =>
				writer.write(chunk)
			);
			if (!answered && !callerSignal.aborted) {
				writer.write({ type: 'error', errorText: NO_PROVIDER_ANSWERED });
			}
		},
		onError: () => NO_PROVIDER_ANSWERED
	});
	return createUIMessageStreamResponse({ stream });
}

/** The user's own provider (the assistant's settings), as before: their key, their model, their endpoint. */
async function ownProviderResponse(config: ChatRequestConfig, prompt: ModelMessage[], req: Request) {
	const chatProvider = await createChatProvider({
		apiKey: config.apiKey ?? '',
		provider: config.provider,
		baseURL: config.baseURL
	});
	if (!chatProvider.ok) return NextResponse.json({ error: chatProvider.error }, { status: 400 });

	const modelId = config.model || DEFAULT_CHAT_MODEL;
	const images = refuseImageUrls(prompt, modelId);
	if (images && !images.ok) return NextResponse.json({ error: images.error }, { status: images.status });

	// The SDK would download the file URLs of the messages on this server: they are downloaded here instead,
	// through the guarded fetch (SSRF).
	const files = await resolveFileUrls(prompt, req.signal);
	if (!files.ok) return NextResponse.json({ error: files.error }, { status: files.status });

	const model = chatProvider.openai.chat(modelId);
	const { stream } = streamFrom(model, files.messages, req.signal, OWN_PROVIDER_CALL);
	return createUIMessageStreamResponse({ stream });
}

/**
 * The assistant's answers. A user who set their own key keeps using it; otherwise the deployment's providers
 * answer, free ones first. Signed-in users only, and the caller leaving (closed tab, Stop) ends the provider
 * request too.
 */
export async function POST(req: Request) {
	// The guard's own status: 401 for a refused session, 503 when Gauzy could not answer (an outage must not look
	// like a sign-out).
	const guard = await authenticatedGuard(req, new NextResponse());
	if (!guard.user) return guard.deny();

	const body = await readBody(req);
	const config = body.config ?? null;
	const usesOwnKey = Boolean(config?.apiKey);
	const usesServerChain = !usesOwnKey && hasServerLanguageModel();
	const canAnswer = usesOwnKey || usesServerChain;
	if (!canAnswer) return NextResponse.json({ error: NO_KEY_MESSAGE }, { status: 400 });

	const messages = uiMessagesOf(body.messages);
	if (!messages) return NextResponse.json({ error: INVALID_MESSAGES }, { status: 400 });
	const prompt = await modelMessagesOf(messages);
	if (!prompt) return NextResponse.json({ error: INVALID_MESSAGES }, { status: 400 });

	if (usesOwnKey && config) {
		return ownProviderResponse(config, prompt, req);
	}

	const verdict = takeAiCall(ASSISTANT_RATE_LIMIT, guard.user.id, req.headers);
	if (!verdict.allowed) return rateLimitedResponse(verdict);

	const files = await resolveFileUrls(prompt, req.signal);
	if (!files.ok) return NextResponse.json({ error: files.error }, { status: files.status });

	return serverChainResponse(files.messages, req.signal);
}
