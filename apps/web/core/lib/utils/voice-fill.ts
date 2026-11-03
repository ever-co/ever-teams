import type { TVoiceFillChoice, TVoiceFillValue } from '@/core/types/schemas/ai/voice-fill.schema';
import { replaceHtmlTags } from './html-tags';

export interface VoiceChoiceItem {
	value: string;
	label: string;
}

export interface VoiceChoiceSet {
	choices: TVoiceFillChoice[];
	valueOf: (code: string) => string | undefined;
	codeOf: (value: string | null | undefined) => string | undefined;
}

const MAX_LABEL_LENGTH = 120;

/** The request schema's limit per field; options past it are left out rather than failing the whole dictation. */
const MAX_CHOICES = 200;

/**
 * A form's options under short codes (`P1`, `P2`): the prompt stays small, and the answer can only name an option
 * the form really has.
 */
export function voiceChoiceSetOf(items: VoiceChoiceItem[], prefix: string): VoiceChoiceSet {
	const choices: TVoiceFillChoice[] = [];
	const valueByCode = new Map<string, string>();
	const codeByValue = new Map<string, string>();
	for (const item of items) {
		const isFull = choices.length >= MAX_CHOICES;
		if (isFull) {
			break;
		}
		const label = item.label.trim().slice(0, MAX_LABEL_LENGTH);
		const hasLabel = label.length > 0;
		const isKnownValue = codeByValue.has(item.value);
		if (!hasLabel || isKnownValue) {
			continue;
		}
		const number = choices.length + 1;
		const code = `${prefix}${number}`;
		choices.push({ code, label });
		valueByCode.set(code, item.value);
		codeByValue.set(item.value, code);
	}
	return {
		choices,
		valueOf: (code) => valueByCode.get(code),
		codeOf: (value) => {
			if (!value) {
				return undefined;
			}
			return codeByValue.get(value);
		}
	};
}

export function codesOf(set: VoiceChoiceSet, values: string[]) {
	const codes: string[] = [];
	for (const value of values) {
		const code = set.codeOf(value);
		if (code) {
			codes.push(code);
		}
	}
	return codes;
}

export function voiceText(value: TVoiceFillValue | undefined) {
	if (typeof value !== 'string') {
		return undefined;
	}
	return value;
}

export function voiceNumber(value: TVoiceFillValue | undefined) {
	if (typeof value !== 'number') {
		return undefined;
	}
	return value;
}

export function voiceChoice(set: VoiceChoiceSet, value: TVoiceFillValue | undefined) {
	if (typeof value !== 'string') {
		return undefined;
	}
	return set.valueOf(value);
}

export function voiceChoices(set: VoiceChoiceSet, value: TVoiceFillValue | undefined) {
	if (!Array.isArray(value)) {
		return undefined;
	}
	const values: string[] = [];
	for (const code of value) {
		const choice = set.valueOf(code);
		if (choice) {
			values.push(choice);
		}
	}
	return values;
}

/** `YYYY-MM-DD` read as a local day, the way the date pickers show it. */
export function voiceDate(value: TVoiceFillValue | undefined) {
	if (typeof value !== 'string') {
		return undefined;
	}
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(year, month - 1, day);
	if (Number.isNaN(date.getTime())) {
		return undefined;
	}
	return date;
}

const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#039;'
};

function escapeHtml(text: string) {
	return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

const BULLET_PATTERN = /^\s*[-*•]\s+/;

function isBulletLine(line: string) {
	return BULLET_PATTERN.test(line);
}

function listItemHtml(line: string) {
	const text = line.replace(BULLET_PATTERN, '');
	return `<li><p>${escapeHtml(text)}</p></li>`;
}

function blockHtml(block: string) {
	const lines = block.split('\n').filter((line) => line.trim().length > 0);
	const isList = lines.length > 0 && lines.every(isBulletLine);
	if (isList) {
		const items = lines.map(listItemHtml);
		return `<ul>${items.join('')}</ul>`;
	}
	const escapedLines = lines.map(escapeHtml);
	return `<p>${escapedLines.join('<br>')}</p>`;
}

/**
 * The dictated description as editor HTML. Everything is escaped first, so a model or a speech that "says" markup
 * produces text; only paragraphs and "- " lists become structure.
 */
export function dictatedTextToHtml(text: string) {
	const blocks = text.split(/\n{2,}/).filter((block) => block.trim().length > 0);
	return blocks.map(blockHtml).join('');
}

/** The editor's HTML as the plain text the model reads back on a second dictation. */
export function htmlToDictationText(html: string) {
	const withBreaks = html.replace(/<\/(p|li|h[1-6])>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
	const withoutTags = replaceHtmlTags(withBreaks, '');
	const decoded = withoutTags
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'")
		.replace(/&amp;/g, '&');
	return decoded.replace(/\n{3,}/g, '\n\n').trim();
}
