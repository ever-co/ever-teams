import { z } from 'zod';

export const VOICE_FILL_FORMS = ['task', 'project'] as const;

export type TVoiceFillForm = (typeof VOICE_FILL_FORMS)[number];

export const VOICE_FILL_MAX_TRANSCRIPT = 6000;

const MAX_CHOICES_PER_FIELD = 200;
const MAX_CURRENT_TEXT = 12000;

/** A choice the model may pick, under a short code so the prompt stays small (`P1`, `T12`). */
export const voiceFillChoiceSchema = z.object({
	code: z.string().regex(/^[A-Z]{1,2}\d{1,3}$/),
	label: z.string().trim().min(1).max(120)
});

export type TVoiceFillChoice = z.infer<typeof voiceFillChoiceSchema>;

const currentValueSchema = z.union([
	z.string().max(MAX_CURRENT_TEXT),
	z.number(),
	z.array(z.string().max(120)).max(MAX_CHOICES_PER_FIELD),
	z.null()
]);

export const voiceFillRequestSchema = z.object({
	form: z.enum(VOICE_FILL_FORMS),
	transcript: z.string().trim().min(1).max(VOICE_FILL_MAX_TRANSCRIPT),
	/** The day the person speaks in, so "next Friday" resolves to a date. */
	today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	/** What the form already holds: a new dictation keeps it unless the person changes it. */
	current: z.record(z.string(), currentValueSchema).optional(),
	choices: z.record(z.string(), z.array(voiceFillChoiceSchema).max(MAX_CHOICES_PER_FIELD)).optional()
});

export type TVoiceFillRequest = z.infer<typeof voiceFillRequestSchema>;

export type TVoiceFillValue = string | number | string[];

/** Only the fields the person spoke about; a field left out keeps its value in the form. */
export type TVoiceFillFields = Record<string, TVoiceFillValue>;

export const VOICE_FILL_ERROR_CODES = [
	'invalid_request',
	'not_configured',
	'rate_limited',
	'provider_unavailable',
	'nothing_understood'
] as const;

export type TVoiceFillErrorCode = (typeof VOICE_FILL_ERROR_CODES)[number];

export type TVoiceFillAvailability = {
	available: boolean;
};
