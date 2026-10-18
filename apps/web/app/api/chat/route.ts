import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { APP_NAME } from '@/core/constants/config/constants';
import { checkCustomBaseUrl } from '@/core/lib/chat/custom-base-url';
import { createGuardedFetch } from '@/core/lib/chat/guarded-fetch';
import { resolveFileUrls } from '@/core/lib/chat/resolve-file-urls';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';

export async function POST(req: Request) {
	// The server calls the provider for the caller: signed-in users only. The guard's own status: 401 for
	// a refused session, 503 when Gauzy could not answer (an outage must not look like a sign-out).
	const guard = await authenticatedGuard(req, new NextResponse());
	if (!guard.user) return guard.deny();

	const { messages, config } = await req.json();

	const { apiKey, provider, model, baseURL } = config ?? {};

	if (!apiKey) {
		return new Response(
			JSON.stringify({ error: 'API key is required. Please configure it in the chat settings.' }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// A custom base URL is user input the server POSTs to: it must be a public https endpoint, and the
	// request goes through the guarded fetch, which re-checks the address at connect time (SSRF).
	let custom: { baseURL: string; fetch: typeof fetch } | null = null;
	if (provider === 'custom' && baseURL) {
		const checked = await checkCustomBaseUrl(baseURL);
		if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
		custom = {
			baseURL: checked.baseURL,
			fetch: createGuardedFetch({ baseURL: checked.baseURL, allowLoopback: checked.allowLoopback })
		};
	}

	// The SDK would download the file URLs of the messages on this server with the global fetch: they are
	// downloaded here instead, through the guarded fetch (SSRF).
	const files = await resolveFileUrls(messages, req.signal);
	if (!files.ok) return NextResponse.json({ error: files.error }, { status: files.status });

	const openai = createOpenAI({
		apiKey,
		...(custom ?? {}),
		...(provider === 'groq' ? { baseURL: 'https://api.groq.com/openai/v1' } : {}),
		...(provider === 'together' ? { baseURL: 'https://api.together.xyz/v1' } : {})
	});

	const result = streamText({
		model: openai(model || 'gpt-4o-mini'),
		// APP_NAME is the deployment's runtime brand (container env), so a rebranded image's assistant
		// introduces the product by its own name.
		system: `You are a helpful AI assistant integrated into ${APP_NAME}, a work and project management platform.
You help users with their tasks, projects, and team collaboration questions.
Be concise, professional, and helpful. You can format your responses using Markdown.`,
		messages: files.messages,
		// The caller leaving (closed tab, Stop) ends the provider request too.
		abortSignal: req.signal
	});

	return result.toDataStreamResponse();
}
