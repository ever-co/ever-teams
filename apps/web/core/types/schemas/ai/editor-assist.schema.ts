import { z } from 'zod';

export const EDITOR_AI_MODES = [
	'improve',
	'fix',
	'shorter',
	'longer',
	'simplify',
	'summarize',
	'continue',
	'tone_friendly',
	'tone_professional',
	'tone_direct',
	'custom'
] as const;

export type TEditorAiMode = (typeof EDITOR_AI_MODES)[number];

export const EDITOR_AI_CONTEXTS = ['task', 'project'] as const;

export type TEditorAiContext = (typeof EDITOR_AI_CONTEXTS)[number];

export const EDITOR_AI_PROVIDERS = ['openai', 'groq', 'together', 'custom'] as const;

export const EDITOR_AI_MAX_CHARS = 10_000;

/** Below this there is nothing to rewrite, and "continue" has nothing to follow. */
export const EDITOR_AI_MIN_CHARS = 3;

export const EDITOR_AI_MAX_INSTRUCTION = 300;

export const EDITOR_AI_MAX_TITLE = 200;

export const editorAiProviderConfigSchema = z.object({
	apiKey: z.string().trim().min(1).max(500),
	provider: z.enum(EDITOR_AI_PROVIDERS),
	model: z.string().trim().max(200).optional(),
	baseURL: z.string().trim().max(2048).optional()
});

function hasInstructionWhenCustom(request: { mode: TEditorAiMode; instruction?: string }) {
	const isCustom = request.mode === 'custom';
	if (!isCustom) {
		return true;
	}
	return Boolean(request.instruction);
}

export const editorAssistRequestSchema = z
	.object({
		mode: z.enum(EDITOR_AI_MODES),
		context: z.enum(EDITOR_AI_CONTEXTS),
		text: z.string().trim().min(EDITOR_AI_MIN_CHARS).max(EDITOR_AI_MAX_CHARS),
		instruction: z.string().trim().max(EDITOR_AI_MAX_INSTRUCTION).optional(),
		title: z.string().trim().max(EDITOR_AI_MAX_TITLE).optional(),
		config: editorAiProviderConfigSchema.optional()
	})
	.refine(hasInstructionWhenCustom, { path: ['instruction'] });

export type TEditorAssistRequest = z.infer<typeof editorAssistRequestSchema>;

export const EDITOR_ASSIST_ERROR_CODES = [
	'invalid_request',
	'not_configured',
	'invalid_base_url',
	'provider_auth',
	'provider_rate_limit',
	'provider_unavailable',
	'empty_result'
] as const;

export type TEditorAssistErrorCode = (typeof EDITOR_ASSIST_ERROR_CODES)[number];

/** Whether the server holds its own AI key; when it does not, the request carries the user's configuration. */
export type TEditorAssistAvailability = {
	server: boolean;
};

/** The proposal: Markdown the user may apply, and one sentence on what changed. */
export type TEditorAssistAnswer = {
	text: string;
	note: string | null;
};
