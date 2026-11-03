import type {
	TEditorAiContext,
	TEditorAssistAnswer,
	TEditorAssistRequest
} from '@/core/types/schemas/ai/editor-assist.schema';

const CONTEXT_LINES: Record<TEditorAiContext, string> = {
	task: "Context: the description of a task in a team's work tracker: what to do, why, and how to know it is done.",
	project: 'Context: the description of a project: its goal, its scope, and what done looks like.'
};

const TITLE_LABELS: Record<TEditorAiContext, string> = {
	task: 'Task title',
	project: 'Project name'
};

/** Kept free of per-request data so providers that cache prompt prefixes can reuse it. */
export function editorAssistSystemPrompt(appName: string) {
	return `You are the writing help inside the rich text editor of ${appName}, a work and project management platform. The user selected part of a task or project description (or the whole description) and asked for ONE operation on it. You return the replacement text.

Rules:
- Same language as the input. Keep every fact, name, number, date, estimate, link, image and mention exactly; never add facts, never drop a link, an image or a mention. Mentions are written [@ id="..." label="..."]: copy each one unchanged.
- The input is Markdown and the output is Markdown. Keep the structure (headings, lists, to-do items with their [ ] or [x] state, quotes, code blocks) unless the operation is about structure. Never wrap the whole output in a code fence. No preamble, no closing remark, no emojis.
- improve: clearer and easier to act on, roughly the same length.
- fix: correct spelling, grammar and punctuation only. Do not rephrase.
- shorter: about half the length, keeping every requirement, constraint and acceptance criterion.
- longer: expand with detail the text already implies. Never invent specifics such as versions, dates, names, estimates or amounts.
- simplify: plain words, short sentences, same meaning.
- summarize: one short paragraph, or three to five bullets when the input lists distinct points.
- continue: return ONLY the new text to append after the input (one to three sentences, or the next list items or to-do items), in the same voice. Never repeat the input.
- tone_friendly, tone_professional, tone_direct: rewrite in that register with the same content.
- custom: follow the user's instruction as long as it is about this text. If it asks for something unrelated, or to invent facts, return the input unchanged and say why in the note.

Answer in exactly this shape, with nothing before or after it:
<result>
the resulting Markdown
</result>
<note>one short sentence saying what changed, in the language of the input</note>`;
}

export function editorAssistUserPrompt(request: TEditorAssistRequest) {
	const lines = [CONTEXT_LINES[request.context]];
	if (request.title) {
		lines.push(`${TITLE_LABELS[request.context]}: ${request.title}`);
	}
	lines.push(`Operation: ${request.mode}`);
	if (request.mode === 'custom') {
		lines.push(`Instruction: ${request.instruction ?? ''}`);
	}
	lines.push('', 'Text (Markdown):', request.text);
	return lines.join('\n');
}

const RESULT_TAG = /<result>\s*([\s\S]*?)\s*<\/result>/i;
const NOTE_TAG = /<note>\s*([\s\S]*?)\s*<\/note>/i;
const WHOLE_CODE_FENCE = /^```[a-z]*\n([\s\S]*?)\n```$/i;

function withoutWholeCodeFence(text: string) {
	const fenced = WHOLE_CODE_FENCE.exec(text);
	if (!fenced) {
		return text;
	}
	return fenced[1].trim();
}

function resultTextOf(answer: string) {
	const tagged = RESULT_TAG.exec(answer);
	if (tagged) {
		return tagged[1];
	}
	return answer.replace(NOTE_TAG, '');
}

function noteOf(answer: string) {
	const tagged = NOTE_TAG.exec(answer);
	if (!tagged) {
		return null;
	}
	const note = tagged[1].trim();
	return note || null;
}

/** A model that ignores the answer shape still returns usable text: everything outside a note becomes the result. */
export function parseEditorAssistAnswer(answer: string): TEditorAssistAnswer {
	const rawText = resultTextOf(answer).trim();
	const text = withoutWholeCodeFence(rawText);
	return { text, note: noteOf(answer) };
}
