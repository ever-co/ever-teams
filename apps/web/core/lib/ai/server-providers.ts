import { createDeepgram } from '@ai-sdk/deepgram';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel, TranscriptionModel } from 'ai';
import { createCloudflareWhisper } from './cloudflare-whisper';

/**
 * The deployment's own AI providers, server env only (never NEXT_PUBLIC). Each one joins the chain only when its
 * key is set, so the code ships before any account exists. Every free provider kept here does not train on the
 * requests (checked on their official terms on 2026-10-31): Groq (Services Agreement 4.2, zero data retention on
 * by default), Cloudflare Workers AI (data-usage page), Deepgram only with `mip_opt_out=true` on each request.
 * A `*_BASE_URL` override only exists so tests can point a provider at a stand-in.
 */

export type FreeProviderId = 'groq' | 'cloudflare';

const DEFAULT_FREE_ORDER: FreeProviderId[] = ['groq', 'cloudflare'];

const GPT_OSS_120B = 'gpt-oss-120b';
const GPT_OSS_20B = 'gpt-oss-20b';
const WHISPER_TURBO = 'whisper-large-v3-turbo';
const WHISPER_LARGE = 'whisper-large-v3';

const GROQ_CHAT_MODELS: Record<string, string> = {
	[GPT_OSS_120B]: 'openai/gpt-oss-120b',
	[GPT_OSS_20B]: 'openai/gpt-oss-20b'
};

const CLOUDFLARE_CHAT_MODELS: Record<string, string> = {
	[GPT_OSS_120B]: '@cf/openai/gpt-oss-120b',
	[GPT_OSS_20B]: '@cf/openai/gpt-oss-20b'
};

const CHAT_GROUPS = [GPT_OSS_120B, GPT_OSS_20B];

const DEFAULT_OPENAI_CHAT_MODEL = 'gpt-5-mini';
const DEFAULT_OPENAI_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';
const OPENROUTER_CHAT_MODEL = 'openai/gpt-4o-mini';
const DEEPGRAM_TRANSCRIPTION_MODEL = 'nova-3';

export interface LanguageLink {
	id: string;
	group: string;
	model: LanguageModel;
}

export interface TranscriptionLink {
	id: string;
	group: string;
	model: TranscriptionModel;
	/** Whisper models answer `verbose_json` with the per-segment silence scores the chain reads. */
	isWhisper: boolean;
}

function envOf(name: string) {
	const value = process.env[name]?.trim();
	if (!value) {
		return undefined;
	}
	return value;
}

function isFreeProviderId(value: string): value is FreeProviderId {
	return DEFAULT_FREE_ORDER.includes(value as FreeProviderId);
}

/** `AI_FREE_PROVIDERS` orders (or narrows) the free chain, for example `cloudflare,groq` or `groq`. */
function freeProviderOrder(): FreeProviderId[] {
	const configured = envOf('AI_FREE_PROVIDERS');
	if (!configured) {
		return DEFAULT_FREE_ORDER;
	}
	const ids = configured.split(',').map((id) => id.trim().toLowerCase());
	return ids.filter(isFreeProviderId);
}

/** Groups in their declared order, whatever the order of the providers that serve them. */
function sortedByGroup<L extends { group: string }>(links: L[], groups: string[]) {
	const ranked = links.map((link) => ({ link, rank: groups.indexOf(link.group) }));
	ranked.sort((a, b) => a.rank - b.rank);
	return ranked.map((entry) => entry.link);
}

function groqProvider() {
	const apiKey = envOf('GROQ_API_KEY');
	if (!apiKey) {
		return null;
	}
	return createGroq({ apiKey, baseURL: envOf('GROQ_BASE_URL') });
}

interface CloudflareAccess {
	accountId: string;
	apiToken: string;
	accountBaseURL: string;
}

function cloudflareAccess(): CloudflareAccess | null {
	const accountId = envOf('CLOUDFLARE_AI_ACCOUNT_ID');
	const apiToken = envOf('CLOUDFLARE_AI_API_TOKEN');
	if (!accountId || !apiToken) {
		return null;
	}
	const apiBaseURL = envOf('CLOUDFLARE_AI_BASE_URL') ?? 'https://api.cloudflare.com/client/v4';
	const accountBaseURL = `${apiBaseURL}/accounts/${accountId}/ai`;
	return { accountId, apiToken, accountBaseURL };
}

function cloudflareChatProvider(access: CloudflareAccess) {
	return createOpenAICompatible({
		name: 'cloudflare-workers-ai',
		baseURL: `${access.accountBaseURL}/v1`,
		apiKey: access.apiToken,
		supportsStructuredOutputs: true
	});
}

function freeChatLinksOf(provider: FreeProviderId): LanguageLink[] {
	if (provider === 'groq') {
		const groq = groqProvider();
		if (!groq) {
			return [];
		}
		return CHAT_GROUPS.map((group) => ({ id: `groq:${group}`, group, model: groq(GROQ_CHAT_MODELS[group]) }));
	}
	const access = cloudflareAccess();
	if (!access) {
		return [];
	}
	const cloudflare = cloudflareChatProvider(access);
	return CHAT_GROUPS.map((group) => ({
		id: `cloudflare:${group}`,
		group,
		model: cloudflare.chatModel(CLOUDFLARE_CHAT_MODELS[group])
	}));
}

/** Free chat links, grouped by model so two providers serving the same open model take turns. */
export function freeLanguageLinks(): LanguageLink[] {
	const links = freeProviderOrder().flatMap(freeChatLinksOf);
	return sortedByGroup(links, CHAT_GROUPS);
}

/**
 * The paid path, outside the free chain and never paused. OpenRouter keeps serving the deployments that already
 * set its key for the editor's writing help; OpenAI is the last resort.
 */
export function paidLanguageLinks(): LanguageLink[] {
	const links: LanguageLink[] = [];
	const openRouterKey = envOf('OPENROUTER_API_KEY');
	if (openRouterKey) {
		const baseURL = envOf('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1';
		const openRouter = createOpenAI({ apiKey: openRouterKey, baseURL });
		links.push({ id: 'openrouter', group: 'paid', model: openRouter.chat(OPENROUTER_CHAT_MODEL) });
	}
	const openAiKey = envOf('OPENAI_API_KEY');
	if (openAiKey) {
		const openai = createOpenAI({ apiKey: openAiKey, baseURL: envOf('OPENAI_BASE_URL') });
		const modelId = envOf('OPENAI_CHAT_MODEL') ?? DEFAULT_OPENAI_CHAT_MODEL;
		links.push({ id: 'openai', group: 'paid', model: openai.chat(modelId) });
	}
	return links;
}

export function hasServerLanguageModel() {
	const hasFree = freeLanguageLinks().length > 0;
	const hasPaid = paidLanguageLinks().length > 0;
	return hasFree || hasPaid;
}

/**
 * Deepgram trains on requests by default and its provider only offers the opt-out for speech synthesis: every
 * transcription request gets `mip_opt_out=true` here. Do not remove it, the user's voice must never train a model.
 */
function deepgramWithoutTraining(baseURL: string | undefined): typeof fetch {
	const origin = baseURL ?? 'https://api.deepgram.com';
	return (input, init) => {
		const requested = new URL(String(input));
		const target = new URL(`${origin}${requested.pathname}${requested.search}`);
		target.searchParams.set('mip_opt_out', 'true');
		return fetch(target, init);
	};
}

function freeTranscriptionLinksOf(provider: FreeProviderId): TranscriptionLink[] {
	if (provider === 'groq') {
		const groq = groqProvider();
		if (!groq) {
			return [];
		}
		return [
			{
				id: `groq:${WHISPER_TURBO}`,
				group: WHISPER_TURBO,
				model: groq.transcription(WHISPER_TURBO),
				isWhisper: true
			},
			{
				id: `groq:${WHISPER_LARGE}`,
				group: WHISPER_LARGE,
				model: groq.transcription(WHISPER_LARGE),
				isWhisper: true
			}
		];
	}
	const access = cloudflareAccess();
	if (!access) {
		return [];
	}
	const model = createCloudflareWhisper({ accountBaseURL: access.accountBaseURL, apiToken: access.apiToken });
	return [{ id: `cloudflare:${WHISPER_TURBO}`, group: WHISPER_TURBO, model, isWhisper: true }];
}

const TRANSCRIPTION_GROUPS = [WHISPER_TURBO, WHISPER_LARGE];

/**
 * Speech to text: the same Whisper model on two free providers first, then the other Whisper model, then
 * Deepgram's one-off credit, kept last so it lasts.
 */
export function freeTranscriptionLinks(): TranscriptionLink[] {
	const providerLinks = freeProviderOrder().flatMap(freeTranscriptionLinksOf);
	const links = sortedByGroup(providerLinks, TRANSCRIPTION_GROUPS);
	const deepgramKey = envOf('DEEPGRAM_API_KEY');
	if (deepgramKey) {
		const fetchWithoutTraining = deepgramWithoutTraining(envOf('DEEPGRAM_BASE_URL'));
		const deepgram = createDeepgram({ apiKey: deepgramKey, fetch: fetchWithoutTraining });
		const model = deepgram.transcription(DEEPGRAM_TRANSCRIPTION_MODEL);
		links.push({ id: `deepgram:${DEEPGRAM_TRANSCRIPTION_MODEL}`, group: 'deepgram', model, isWhisper: false });
	}
	return links;
}

export function paidTranscriptionLinks(): TranscriptionLink[] {
	const openAiKey = envOf('OPENAI_API_KEY');
	if (!openAiKey) {
		return [];
	}
	const openai = createOpenAI({ apiKey: openAiKey, baseURL: envOf('OPENAI_BASE_URL') });
	const modelId = envOf('OPENAI_TRANSCRIPTION_MODEL') ?? DEFAULT_OPENAI_TRANSCRIPTION_MODEL;
	return [{ id: 'openai:transcription', group: 'paid', model: openai.transcription(modelId), isWhisper: false }];
}

export function hasServerTranscription() {
	const hasFree = freeTranscriptionLinks().length > 0;
	const hasPaid = paidTranscriptionLinks().length > 0;
	return hasFree || hasPaid;
}
