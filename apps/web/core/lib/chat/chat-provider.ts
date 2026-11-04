import { createOpenAI, type OpenAIProvider, type OpenAIProviderSettings } from '@ai-sdk/openai';
import { checkCustomBaseUrl } from './custom-base-url';
import { createGuardedFetch } from './guarded-fetch';

export const DEFAULT_CHAT_MODEL = 'gpt-4o-mini';

const PRESET_BASE_URLS = new Map<string, string>([
	['groq', 'https://api.groq.com/openai/v1'],
	['together', 'https://api.together.xyz/v1']
]);

type ChatProviderInput = {
	apiKey: string;
	provider?: string;
	baseURL?: string;
};

export type ChatProviderResult = { ok: true; openai: OpenAIProvider } | { ok: false; error: string };

function presetBaseUrlOf(provider: string | undefined) {
	if (!provider) {
		return undefined;
	}
	return PRESET_BASE_URLS.get(provider);
}

function customBaseUrlOf(provider: string | undefined, baseURL: string | undefined) {
	if (provider !== 'custom') {
		return undefined;
	}
	return baseURL || undefined;
}

/**
 * The provider behind the user's own AI configuration (the assistant's settings): OpenAI, Groq, Together or any
 * OpenAI-compatible endpoint. A custom base URL is user input the server POSTs to: it must be a public https
 * endpoint, and the requests go through the guarded fetch, which re-checks the address at connect time (SSRF).
 */
export async function createChatProvider({
	apiKey,
	provider,
	baseURL
}: ChatProviderInput): Promise<ChatProviderResult> {
	const settings: OpenAIProviderSettings = { apiKey };
	const customBaseURL = customBaseUrlOf(provider, baseURL);
	if (customBaseURL) {
		const checked = await checkCustomBaseUrl(customBaseURL);
		if (!checked.ok) {
			return { ok: false, error: checked.error };
		}
		settings.baseURL = checked.baseURL;
		settings.fetch = createGuardedFetch({ baseURL: checked.baseURL, allowLoopback: checked.allowLoopback });
	}
	const presetBaseURL = presetBaseUrlOf(provider);
	if (presetBaseURL) {
		settings.baseURL = presetBaseURL;
	}
	return { ok: true, openai: createOpenAI(settings) };
}
