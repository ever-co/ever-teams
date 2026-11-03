import { generateText, Output } from 'ai';
import { z } from 'zod';
import { APP_NAME } from '@/core/constants/config/constants';
import type {
	TVoiceFillChoice,
	TVoiceFillFields,
	TVoiceFillForm,
	TVoiceFillRequest
} from '@/core/types/schemas/ai/voice-fill.schema';
import { firstAnswer, TEXT_CHAIN_BUDGET, UnusableAnswerError, type ChainLink } from './provider-chain';
import { freeLanguageLinks, paidLanguageLinks, type LanguageLink } from './server-providers';

type FieldKind = 'title' | 'longText' | 'text' | 'choice' | 'choices' | 'date' | 'number' | 'url' | 'currency';

interface FieldSpec {
	key: string;
	kind: FieldKind;
	/** What the field holds, read by the model. */
	meaning: string;
}

const TITLE_MAX_LENGTH = 120;
const TEXT_MAX_LENGTH = 6000;
const MAX_OUTPUT_TOKENS = 2000;

/**
 * The fields each form takes from a dictation. Only fields the form really saves are listed: a value the form
 * would drop is never proposed.
 */
const FORM_FIELDS: Record<TVoiceFillForm, FieldSpec[]> = {
	task: [
		{ key: 'title', kind: 'title', meaning: 'the task title' },
		{ key: 'description', kind: 'longText', meaning: 'the task description: context, steps, acceptance details' },
		{ key: 'issueType', kind: 'choice', meaning: 'the kind of work (task, bug, story, epic)' },
		{ key: 'priority', kind: 'choice', meaning: 'how urgent it is' },
		{ key: 'size', kind: 'choice', meaning: 'how big the work is' },
		{ key: 'labels', kind: 'choices', meaning: 'labels that describe the task' }
	],
	project: [
		{ key: 'name', kind: 'title', meaning: 'the project name' },
		{ key: 'description', kind: 'longText', meaning: 'the project description: goal, scope, deliverables' },
		{ key: 'status', kind: 'choice', meaning: 'the project status' },
		{ key: 'startDate', kind: 'date', meaning: 'the start date' },
		{ key: 'endDate', kind: 'date', meaning: 'the end date or deadline' },
		{ key: 'teams', kind: 'choices', meaning: 'the teams working on it' },
		{ key: 'managers', kind: 'choices', meaning: 'the people who manage it' },
		{ key: 'members', kind: 'choices', meaning: 'the other people working on it' },
		{ key: 'tags', kind: 'choices', meaning: 'tags that describe it' },
		{ key: 'budgetType', kind: 'choice', meaning: 'whether the budget counts hours or money' },
		{ key: 'budget', kind: 'number', meaning: 'the budget amount, a number of hours or of money' },
		{
			key: 'currency',
			kind: 'currency',
			meaning: 'the budget currency as an ISO 4217 code, for example USD or EUR'
		},
		{ key: 'billing', kind: 'choice', meaning: 'how the client is billed' },
		{ key: 'projectUrl', kind: 'url', meaning: 'the project website address' }
	]
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

function choicesOf(request: TVoiceFillRequest, key: string): TVoiceFillChoice[] {
	return request.choices?.[key] ?? [];
}

function enumOfCodes(choices: TVoiceFillChoice[]) {
	const codes = choices.map((choice) => choice.code);
	return z.enum(codes as [string, ...string[]]);
}

function fieldSchema(spec: FieldSpec, choices: TVoiceFillChoice[]) {
	if (spec.kind === 'choice') {
		return enumOfCodes(choices).nullable();
	}
	if (spec.kind === 'choices') {
		return z.array(enumOfCodes(choices)).nullable();
	}
	if (spec.kind === 'number') {
		return z.number().nullable();
	}
	return z.string().nullable();
}

function needsChoices(kind: FieldKind) {
	const isChoice = kind === 'choice';
	const isChoices = kind === 'choices';
	return isChoice || isChoices;
}

/** The fields this request can fill: a choice field without any choice is left out of the answer. */
function usableFields(request: TVoiceFillRequest) {
	return FORM_FIELDS[request.form].filter((spec) => {
		if (!needsChoices(spec.kind)) {
			return true;
		}
		return choicesOf(request, spec.key).length > 0;
	});
}

/** Every field required and nullable, no other key: the strict shape the free providers accept. */
function answerSchema(request: TVoiceFillRequest, fields: FieldSpec[]) {
	const shape: Record<string, z.ZodType> = {};
	for (const spec of fields) {
		shape[spec.key] = fieldSchema(spec, choicesOf(request, spec.key));
	}
	return z.object(shape).strict();
}

function choiceLines(choices: TVoiceFillChoice[]) {
	return choices.map((choice) => `${choice.code} = ${choice.label}`).join('; ');
}

function fieldLine(request: TVoiceFillRequest, spec: FieldSpec) {
	const choices = choicesOf(request, spec.key);
	if (spec.kind === 'choice') {
		return `- ${spec.key}: ${spec.meaning}. One code among: ${choiceLines(choices)}.`;
	}
	if (spec.kind === 'choices') {
		return `- ${spec.key}: ${spec.meaning}. A list of codes among: ${choiceLines(choices)}.`;
	}
	if (spec.kind === 'date') {
		return `- ${spec.key}: ${spec.meaning}, as YYYY-MM-DD.`;
	}
	return `- ${spec.key}: ${spec.meaning}.`;
}

function isBlank(value: unknown) {
	if (value === null || value === undefined) {
		return true;
	}
	if (Array.isArray(value)) {
		return value.length === 0;
	}
	return value === '';
}

function currentLines(request: TVoiceFillRequest, fields: FieldSpec[]) {
	const current = request.current ?? {};
	const lines: string[] = [];
	for (const spec of fields) {
		const value = current[spec.key];
		if (isBlank(value)) {
			continue;
		}
		lines.push(`- ${spec.key}: ${JSON.stringify(value)}`);
	}
	return lines;
}

function systemPrompt(form: TVoiceFillForm) {
	return `You fill the "create ${form}" form of ${APP_NAME}, a work and project management app, from what a person said aloud.
Rules:
- Write every text in the language the person spoke.
- The title or name is short and specific (at most 80 characters), written as a heading: no trailing period, no filler words such as "I need" or "can you".
- The description keeps every useful detail the person gave, cleaned of hesitations and repetitions. Use short paragraphs, and lines starting with "- " when they listed several items. Never add facts they did not say.
- Pick a code only when the speech clearly implies it. Never guess a person, a team or a label that was not mentioned.
- Resolve relative dates ("tomorrow", "next Friday", "end of the month") from today's date.
- A field the person did not talk about is null.
- When the form already holds values, keep them: return a field only when the person changes it or adds to it, and then return its complete new value.`;
}

function userPrompt(request: TVoiceFillRequest, fields: FieldSpec[]) {
	const sections = [
		`Today is ${request.today}.`,
		`Fields:\n${fields.map((spec) => fieldLine(request, spec)).join('\n')}`
	];
	const current = currentLines(request, fields);
	if (current.length > 0) {
		sections.push(`The form already holds:\n${current.join('\n')}`);
	}
	sections.push(`What the person said:\n"""\n${request.transcript}\n"""`);
	return sections.join('\n\n');
}

function cleanText(value: unknown, maxLength: number) {
	if (typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	return trimmed.slice(0, maxLength);
}

function isDotOrSpace(character: string) {
	return /[.\s]/.test(character);
}

/** Same result as `text.replace(/[.\s]+$/, '')`, without the regex rescanning every run of dots and spaces. */
function withoutTrailingDotsAndSpaces(text: string) {
	let end = text.length;
	while (end > 0 && isDotOrSpace(text[end - 1])) {
		end--;
	}
	return text.slice(0, end);
}

function cleanTitle(value: unknown) {
	const text = cleanText(value, TITLE_MAX_LENGTH);
	if (!text) {
		return null;
	}
	return withoutTrailingDotsAndSpaces(text);
}

function cleanDate(value: unknown) {
	const text = cleanText(value, 10);
	if (!text || !DATE_PATTERN.test(text)) {
		return null;
	}
	const isValidDate = !Number.isNaN(Date.parse(text));
	if (!isValidDate) {
		return null;
	}
	return text;
}

function cleanNumber(value: unknown) {
	if (typeof value !== 'number') {
		return null;
	}
	const isUsable = Number.isFinite(value) && value >= 0;
	if (!isUsable) {
		return null;
	}
	return value;
}

function withProtocolOf(text: string) {
	const hasProtocol = /^https?:\/\//i.test(text);
	if (hasProtocol) {
		return text;
	}
	return `https://${text}`;
}

function cleanUrl(value: unknown) {
	const text = cleanText(value, 500);
	if (!text) {
		return null;
	}
	try {
		const url = new URL(withProtocolOf(text));
		return url.href;
	} catch {
		return null;
	}
}

function cleanCurrency(value: unknown) {
	const text = cleanText(value, 3);
	if (!text) {
		return null;
	}
	const code = text.toUpperCase();
	if (!CURRENCY_PATTERN.test(code)) {
		return null;
	}
	return code;
}

function cleanCodes(value: unknown) {
	if (!Array.isArray(value)) {
		return null;
	}
	const codes = value.filter((code): code is string => typeof code === 'string');
	const unique = [...new Set(codes)];
	if (unique.length === 0) {
		return null;
	}
	return unique;
}

const CLEANERS: Record<FieldKind, (value: unknown) => string | number | string[] | null> = {
	title: cleanTitle,
	longText: (value) => cleanText(value, TEXT_MAX_LENGTH),
	text: (value) => cleanText(value, TEXT_MAX_LENGTH),
	choice: (value) => cleanText(value, 6),
	choices: cleanCodes,
	date: cleanDate,
	number: cleanNumber,
	url: cleanUrl,
	currency: cleanCurrency
};

/** The answer reduced to the fields that hold a usable value; the schema already kept codes to the choices given. */
function cleanAnswer(answer: Record<string, unknown>, fields: FieldSpec[]): TVoiceFillFields {
	const cleaned: TVoiceFillFields = {};
	for (const spec of fields) {
		const value = CLEANERS[spec.kind](answer[spec.key]);
		if (value === null) {
			continue;
		}
		cleaned[spec.key] = value;
	}
	return cleaned;
}

function voiceFillLink(
	link: LanguageLink,
	request: TVoiceFillRequest,
	fields: FieldSpec[]
): ChainLink<TVoiceFillFields> {
	const schema = answerSchema(request, fields);
	return {
		id: link.id,
		group: link.group,
		run: async (signal) => {
			const { output } = await generateText({
				model: link.model,
				system: systemPrompt(request.form),
				prompt: userPrompt(request, fields),
				output: Output.object({ schema }),
				maxOutputTokens: MAX_OUTPUT_TOKENS,
				maxRetries: 0,
				reasoning: 'low',
				temperature: 0,
				abortSignal: signal
			});
			if (!output) {
				throw new UnusableAnswerError('The model returned no fields.');
			}
			return cleanAnswer(output as Record<string, unknown>, fields);
		}
	};
}

/**
 * Turns what a person said into the fields of a form, through the free chain then the paid path. `null` when no
 * provider answered.
 */
export async function voiceFill(request: TVoiceFillRequest, signal: AbortSignal): Promise<TVoiceFillFields | null> {
	const fields = usableFields(request);
	const freeLinks = freeLanguageLinks().map((link) => voiceFillLink(link, request, fields));
	const paidLinks = paidLanguageLinks().map((link) => voiceFillLink(link, request, fields));
	return firstAnswer(freeLinks, paidLinks, TEXT_CHAIN_BUDGET, signal);
}
