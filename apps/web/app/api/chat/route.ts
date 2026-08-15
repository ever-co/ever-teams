import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
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

	const openai = createOpenAI({
		apiKey,
		...(provider === 'custom' && baseURL ? { baseURL } : {}),
		...(provider === 'groq' ? { baseURL: 'https://api.groq.com/openai/v1' } : {}),
		...(provider === 'together' ? { baseURL: 'https://api.together.xyz/v1' } : {})
	});

	const result = streamText({
		model: openai(model || 'gpt-4o-mini'),
		system: `You are a helpful AI assistant integrated into Ever Teams, a work and project management platform.
You help users with their tasks, projects, and team collaboration questions.
Be concise, professional, and helpful. You can format your responses using Markdown.`,
		messages
	});

	return result.toDataStreamResponse();
}
