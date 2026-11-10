/**
 * The composer's formatting, as pure text edits: each takes the text and its selection and answers the new text and
 * where the selection lands. They write the Markdown subset a message renders (see `chat-markdown.tsx`): `**bold**`,
 * `*italic*`, `` `code` ``, fenced code blocks, `- ` lists and `[text](url)` links.
 */

/** A composer's text and its selection after an edit. */
export interface ComposeEdit {
	value: string;
	selectionStart: number;
	selectionEnd: number;
}

const FENCE = '```';

/** The selection inside the text, start first (a selection made backwards arrives reversed on some browsers). */
function rangeOf(value: string, selectionStart: number, selectionEnd: number): [number, number] {
	const clamp = (position: number) =>
		Math.max(0, Math.min(value.length, Number.isFinite(position) ? Math.trunc(position) : value.length));
	const a = clamp(selectionStart);
	const b = clamp(selectionEnd);
	return a <= b ? [a, b] : [b, a];
}

/** The selection without the characters matching `skip` at its ends; one of only such characters collapses to its end. */
function trimRange(value: string, start: number, end: number, skip: RegExp): [number, number] {
	let from = start;
	let to = end;
	while (from < to && skip.test(value[from])) from += 1;
	while (to > from && skip.test(value[to - 1])) to -= 1;
	return from === to ? [end, end] : [from, to];
}

/**
 * The italic marker. `_` would read the same at word boundaries, but CommonMark does not take it inside a word
 * (`hel_lo_` shows its underscores), while `*` works anywhere.
 */
export const ITALIC = '*';

/**
 * The ways italic is written, for taking it off: `*`, which the composer writes, and `_`, which it wrote before (an
 * edited message keeps its body as it was saved).
 */
const ITALIC_MARKERS = [ITALIC, '_'];

/** How many `char` stand in a row from `index`, walking in `step` (1 forward, -1 back). */
function runOf(value: string, index: number, step: 1 | -1, char: string): number {
	let count = 0;
	for (let at = index; at >= 0 && at < value.length && value[at] === char; at += step) count++;
	return count;
}

/** `*` is italic and `**` bold: a run holds an italic marker when its length is odd (`*`, `***`). */
function holdsItalic(run: number): boolean {
	return run % 2 === 1;
}

/** A letter or a digit (an underscore next to one is part of the word, not a marker). */
function isWordCharacter(char: string | undefined): boolean {
	return !!char && (/[0-9]/.test(char) || char.toLowerCase() !== char.toUpperCase());
}

/**
 * Whether a text holds a run of `char` that would open or close italic on its own: an odd run that is not escaped
 * (`\*`) and, for `_`, not inside a word.
 */
function hasLoneMarker(text: string, char: string): boolean {
	for (let at = 0; at < text.length; ) {
		const run = runOf(text, at, 1, char);
		if (!run) {
			at += 1;
			continue;
		}
		const insideWord = char !== ITALIC && isWordCharacter(text[at - 1]) && isWordCharacter(text[at + run]);
		if (holdsItalic(run) && text[at - 1] !== '\\' && !insideWord) return true;
		at += run;
	}
	return false;
}

/**
 * Whether italic written with `char` opens right before `open` and closes right at `close`: a whole odd run on each
 * side, neither escaped, and nothing between that one of them would pair with instead (a lone marker of its own).
 * `_` also needs no letter or digit right outside its runs, since CommonMark ignores underscores inside a word.
 */
function italicPair(char: string, value: string, open: number, close: number): boolean {
	const lead = runOf(value, open - 1, -1, char);
	const trail = runOf(value, close, 1, char);
	if (!holdsItalic(lead) || !holdsItalic(trail)) return false;
	const before = value[open - 1 - lead];
	const after = value[close + trail];
	if (before === '\\' || (close > open && value[close - 1] === '\\')) return false;
	if (char !== ITALIC && (isWordCharacter(before) || isWordCharacter(after))) return false;
	const inner = value.slice(open, close);
	if (!inner) return true;
	// A marker opens only before text and closes only after it (`* *` is no pair), and a run that goes on into the
	// stretch is longer than it looks.
	const first = inner[0];
	const last = inner[inner.length - 1];
	if (/\s/.test(first) || /\s/.test(last) || first === char || last === char) return false;
	return !hasLoneMarker(inner, char);
}

/** Whether `value[start, end)` holds its own markers at its ends (italic: `*` or `_`). */
function holdsMarkers(value: string, start: number, end: number, marker: string): boolean {
	if (marker === ITALIC) {
		return ITALIC_MARKERS.some((char) => {
			const open = start + runOf(value, start, 1, char);
			const close = end - runOf(value, end - 1, -1, char);
			return open > start && close < end && open < close && italicPair(char, value, open, close);
		});
	}
	const text = value.slice(start, end);
	return text.length >= marker.length * 2 && text.startsWith(marker) && text.endsWith(marker);
}

/** Whether italic markers stand right around `start`–`end` (around a caret too, for an empty pair). */
function italicAround(value: string, start: number, end: number): boolean {
	return ITALIC_MARKERS.some((char) => italicPair(char, value, start, end));
}

/** Replaces the selection with a text; the caret lands after it. */
export function insertAt(value: string, selectionStart: number, selectionEnd: number, text: string): ComposeEdit {
	const [start, end] = rangeOf(value, selectionStart, selectionEnd);
	const caret = start + text.length;
	return { value: value.slice(0, start) + text + value.slice(end), selectionStart: caret, selectionEnd: caret };
}

/**
 * `@` at the caret, so the member suggestions open: after a space when the caret follows a word (the suggestions
 * only open on an `@` that starts a word).
 */
export function insertMentionTrigger(value: string, selectionStart: number, selectionEnd: number): ComposeEdit {
	const [start] = rangeOf(value, selectionStart, selectionEnd);
	const followsWord = start > 0 && !/\s/.test(value[start - 1]);
	return insertAt(value, selectionStart, selectionEnd, followsWord ? ' @' : '@');
}

/** One stretch of text without a line break: its markers are removed when it has them, added otherwise. */
function toggleSegment(value: string, start: number, end: number, marker: string): ComposeEdit {
	const size = marker.length;
	const selected = value.slice(start, end);
	// The selection holds its own markers: they go, the text stays selected.
	if (holdsMarkers(value, start, end, marker)) {
		const inner = selected.slice(size, selected.length - size);
		return {
			value: value.slice(0, start) + inner + value.slice(end),
			selectionStart: start,
			selectionEnd: start + inner.length
		};
	}
	// The markers stand right around the selection (or around the caret, for an empty pair): they go. For italic the
	// asterisks around it must hold one (an odd run): inside `**bold**` they are bold's, and italic is added.
	const markersAround =
		marker === ITALIC
			? italicAround(value, start, end)
			: start >= size && value.slice(start - size, start) === marker && value.slice(end, end + size) === marker;
	if (markersAround) {
		return {
			value: value.slice(0, start - size) + selected + value.slice(end + size),
			selectionStart: start - size,
			selectionEnd: end - size
		};
	}
	// Otherwise the text is wrapped and stays selected; with nothing selected the caret waits between the markers.
	return {
		value: value.slice(0, start) + marker + selected + marker + value.slice(end),
		selectionStart: start + size,
		selectionEnd: end + size
	};
}

/**
 * Wraps the selection in a marker (`**`, `*`, `` ` ``), or removes the marker when the selection already has it.
 * The markers hug the text (white space at the ends of the selection stays outside, or the Markdown would not
 * render), and a selection over several lines is wrapped line by line, since a marker pair does not hold across a
 * blank line.
 */
export function toggleWrap(value: string, selectionStart: number, selectionEnd: number, marker: string): ComposeEdit {
	const [from, to] = rangeOf(value, selectionStart, selectionEnd);
	if (!marker) return { value, selectionStart: from, selectionEnd: to };
	const [start, end] = from === to ? [from, to] : trimRange(value, from, to, /\s/);
	const selected = value.slice(start, end);
	if (!selected.includes('\n')) return toggleSegment(value, start, end, marker);

	const size = marker.length;
	const lines = selected.split('\n').map((line) => {
		const text = line.trim();
		const lead = line.slice(0, line.length - line.trimStart().length);
		return { lead, text, trail: line.slice(lead.length + text.length) };
	});
	const everyLineWrapped = lines.every((line) => !line.text || holdsMarkers(line.text, 0, line.text.length, marker));
	const next = lines
		.map((line) => {
			if (!line.text) return line.lead + line.trail;
			if (everyLineWrapped) return line.lead + line.text.slice(size, line.text.length - size) + line.trail;
			return (
				line.lead +
				(holdsMarkers(line.text, 0, line.text.length, marker) ? line.text : marker + line.text + marker) +
				line.trail
			);
		})
		.join('\n');
	return {
		value: value.slice(0, start) + next + value.slice(end),
		selectionStart: start,
		selectionEnd: start + next.length
	};
}

/**
 * Starts every line the selection touches with a prefix (`- ` for a list), or removes it when they all have it.
 * Blank lines inside a selection are left alone; a caret keeps its place in the text of its line.
 */
export function toggleLinePrefix(
	value: string,
	selectionStart: number,
	selectionEnd: number,
	prefix: string
): ComposeEdit {
	const [from, to] = rangeOf(value, selectionStart, selectionEnd);
	if (!prefix) return { value, selectionStart: from, selectionEnd: to };
	const blockStart = from === 0 ? 0 : value.lastIndexOf('\n', from - 1) + 1;
	// A selection that ends right after a line break does not take the next line with it.
	const lastAt = to > from && value[to - 1] === '\n' ? to - 1 : to;
	const nextBreak = value.indexOf('\n', lastAt);
	const blockEnd = nextBreak === -1 ? value.length : nextBreak;
	const lines = value.slice(blockStart, blockEnd).split('\n');
	const filled = lines.filter((line) => line.trim());
	const everyLinePrefixed = filled.length > 0 && filled.every((line) => line.startsWith(prefix));
	const block = lines
		.map((line) => {
			if (everyLinePrefixed) return line.startsWith(prefix) ? line.slice(prefix.length) : line;
			if (line.startsWith(prefix) || (!line.trim() && lines.length > 1)) return line;
			return prefix + line;
		})
		.join('\n');
	const next = value.slice(0, blockStart) + block + value.slice(blockEnd);
	if (from === to) {
		const caret = Math.max(blockStart, from + block.length - (blockEnd - blockStart));
		return { value: next, selectionStart: caret, selectionEnd: caret };
	}
	return { value: next, selectionStart: blockStart, selectionEnd: blockStart + block.length };
}

/**
 * Puts the selection between code fences on lines of their own, or removes the fences when the selection has them
 * (inside it, or on the lines right around it). With nothing selected the caret waits on the empty line between.
 */
export function toggleCodeBlock(value: string, selectionStart: number, selectionEnd: number): ComposeEdit {
	const [from, to] = rangeOf(value, selectionStart, selectionEnd);
	const [start, end] = from === to ? [from, to] : trimRange(value, from, to, /\n/);
	const selected = value.slice(start, end);
	const before = value.slice(0, start);
	const after = value.slice(end);

	// The selection holds its fences: they go.
	const fenced = /^```[^\n]*\n([\s\S]*?)\n?```$/.exec(selected);
	if (fenced) {
		return { value: before + fenced[1] + after, selectionStart: start, selectionEnd: start + fenced[1].length };
	}
	// The fences stand on the lines right around the selection: they go.
	const opening = /(^|\n)```[^\n]*\n$/.exec(before);
	const closing = /^\n```(?=\n|$)/.exec(after);
	if (opening && closing) {
		const head = before.slice(0, opening.index + opening[1].length);
		return {
			value: head + selected + after.slice(closing[0].length),
			selectionStart: head.length,
			selectionEnd: head.length + selected.length
		};
	}
	const head = `${before}${before && !before.endsWith('\n') ? '\n' : ''}${FENCE}\n`;
	const tail = `\n${FENCE}${after && !after.startsWith('\n') ? '\n' : ''}${after}`;
	return { value: head + selected + tail, selectionStart: head.length, selectionEnd: head.length + selected.length };
}

/** An address on its own: it becomes the target of a link, not its text. */
const ADDRESS = /^(https?:\/\/|mailto:)\S+$/i;

/**
 * Turns the selection into a link, `[text](url)`. Selected text becomes the link's text and the caret waits between
 * the parentheses for the address; a selected address becomes the target and the caret waits for the text; with
 * nothing selected the caret waits for the text.
 */
export function insertLink(value: string, selectionStart: number, selectionEnd: number): ComposeEdit {
	const [from, to] = rangeOf(value, selectionStart, selectionEnd);
	const [start, end] = from === to ? [from, to] : trimRange(value, from, to, /\s/);
	const selected = value.slice(start, end);
	const before = value.slice(0, start);
	const after = value.slice(end);
	if (ADDRESS.test(selected)) {
		return { value: `${before}[](${selected})${after}`, selectionStart: start + 1, selectionEnd: start + 1 };
	}
	const caret = selected ? start + selected.length + 3 : start + 1;
	return { value: `${before}[${selected}]()${after}`, selectionStart: caret, selectionEnd: caret };
}

function isHighSurrogate(code: number): boolean {
	return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
	return code >= 0xdc00 && code <= 0xdfff;
}

/**
 * The smallest stretch of a text to replace so it becomes another: what the composer hands to the browser as one
 * typed edit, so its own undo history keeps working. An emoji is never cut in two.
 */
export function replacementOf(before: string, after: string): { start: number; end: number; text: string } {
	const shortest = Math.min(before.length, after.length);
	let head = 0;
	while (head < shortest && before[head] === after[head]) head += 1;
	if (head > 0 && isHighSurrogate(before.charCodeAt(head - 1))) head -= 1;
	let tail = 0;
	while (tail < shortest - head && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail += 1;
	if (tail > 0 && isLowSurrogate(before.charCodeAt(before.length - tail))) tail -= 1;
	return { start: head, end: before.length - tail, text: after.slice(head, after.length - tail) };
}
