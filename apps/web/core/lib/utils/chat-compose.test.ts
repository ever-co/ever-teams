import {
	ComposeEdit,
	insertAt,
	insertLink,
	insertMentionTrigger,
	ITALIC,
	replacementOf,
	toggleCodeBlock,
	toggleLinePrefix,
	toggleWrap
} from './chat-compose';

/** A text with its selection marked: `|` for a caret, or two `|` around the selected stretch. */
function marked(text: string): { value: string; start: number; end: number } {
	const start = text.indexOf('|');
	const rest = text.slice(0, start) + text.slice(start + 1);
	const second = rest.indexOf('|');
	if (second === -1) return { value: rest, start, end: start };
	return { value: rest.slice(0, second) + rest.slice(second + 1), start, end: second };
}

/** An edit written the same way, to compare with. */
function shown(edit: ComposeEdit): string {
	const { value, selectionStart, selectionEnd } = edit;
	if (selectionStart === selectionEnd) return `${value.slice(0, selectionStart)}|${value.slice(selectionStart)}`;
	return `${value.slice(0, selectionStart)}|${value.slice(selectionStart, selectionEnd)}|${value.slice(selectionEnd)}`;
}

function wrap(text: string, marker: string): string {
	const { value, start, end } = marked(text);
	return shown(toggleWrap(value, start, end, marker));
}

/**
 * The italic cases, one per line: the text with its selection marked (see `marked`), ` → `, and what pressing Italic
 * makes of it. `⏎` stands for a line break; a line starting with `#` says what the cases after it show.
 */
const ITALIC_CASES = `
	# Italic is the asterisk, which Markdown reads inside a word too (\`hel_lo_\` would show its underscores).
	hel|lo| → hel*|lo|*
	say |hello| now → say *|hello|* now
	# Italic around the selection, or held by it, comes off.
	hel*|lo|* → hel|lo|
	|*hello*| → |hello|
	# Bold text gets italic added instead of being taken apart, and loses it again.
	**|bold|** → ***|bold|***
	***|bold|*** → **|bold|**
	|**bold**| → *|**bold**|*
	|***bold***| → |**bold**|
	# A selection over several lines is wrapped line by line.
	|one⏎two| → |*one*⏎*two*|
	|*one*⏎*two*| → |one⏎two|
	# Italic written with underscores, as in messages from before the asterisk, comes off too.
	_|hello|_ → |hello|
	say _|hello|_ now → say |hello| now
	|_hello_| → |hello|
	*_|hello|_* → *|hello|*
	|_one_⏎*two*| → |one⏎two|
	# Underscores inside a word are left alone, as Markdown does.
	snake_|case|_name → snake_*|case|*_name
	a|_b_|c → a*|_b_|*c
	|_snake_case_| → |snake_case|
	# Two italic stretches are not one pair.
	|*one* *two*| → *|*one* *two*|*
	# Markers are read by their whole runs: bold is never split into italic, and bold italic loses its italic.
	*|*bold*|* → **|*bold*|**
	**|*bold*|** → **|bold|**
	# Escaped asterisks stay as they are.
	\\*|hello|* → \\**|hello|**
	*|hello\\|* → **|hello\\|**
	|*a \\* b*| → |a \\* b|
`;

/** The cases of `ITALIC_CASES`, as [before, after]. */
function italicCases(): [string, string][] {
	return ITALIC_CASES.split('\n')
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith('#'))
		.map((line) => {
			const [before, after] = line.split(' → ');
			return [before, after];
		});
}

describe('toggleWrap with the italic marker', () => {
	it('is the asterisk', () => {
		expect(ITALIC).toBe('*');
	});

	it.each(italicCases())('%s → %s', (before, after) => {
		const withBreaks = (text: string) => text.replace(/⏎/g, '\n');
		expect(wrap(withBreaks(before), ITALIC)).toBe(withBreaks(after));
	});
});

describe('toggleWrap', () => {
	it('wraps the selection and keeps the text selected', () => {
		expect(wrap('say |hello| now', '**')).toBe('say **|hello|** now');
		expect(wrap('|hello|', '_')).toBe('_|hello|_');
		expect(wrap('run |npm test|', '`')).toBe('run `|npm test|`');
	});

	it('unwraps a selection whose markers stand around it', () => {
		expect(wrap('say **|hello|** now', '**')).toBe('say |hello| now');
		expect(wrap('_|hello|_', '_')).toBe('|hello|');
	});

	it('unwraps a selection that holds its own markers', () => {
		expect(wrap('say |**hello**| now', '**')).toBe('say |hello| now');
		expect(wrap('|`x`|', '`')).toBe('|x|');
	});

	it('is its own inverse', () => {
		const once = toggleWrap('a word here', 2, 6, '**');
		const twice = toggleWrap(once.value, once.selectionStart, once.selectionEnd, '**');
		expect(twice).toEqual({ value: 'a word here', selectionStart: 2, selectionEnd: 6 });
	});

	it('puts an empty pair at a caret and removes it again', () => {
		expect(wrap('hello |', '**')).toBe('hello **|**');
		expect(wrap('hello **|**', '**')).toBe('hello |');
		expect(wrap('|', '`')).toBe('`|`');
	});

	it('keeps the white space at the ends of the selection outside the markers', () => {
		expect(wrap('say| hello |now', '**')).toBe('say **|hello|** now');
		expect(wrap('a|   |b', '_')).toBe('a   _|_b');
	});

	it('adds italic inside bold instead of reading the bold markers as its own', () => {
		expect(wrap('**|hello|**', '_')).toBe('**_|hello|_**');
	});

	it('wraps a selection over several lines line by line, leaving blank lines alone', () => {
		expect(wrap('|one\n\n  two|', '**')).toBe('|**one**\n\n  **two**|');
		expect(wrap('|**one**\n\n  **two**|', '**')).toBe('|one\n\n  two|');
	});

	it('wraps only the lines that are not wrapped yet', () => {
		expect(wrap('|**one**\ntwo|', '**')).toBe('|**one**\n**two**|');
	});

	it('accepts a selection made backwards or out of range', () => {
		expect(toggleWrap('hello', 5, 0, '_')).toEqual({ value: '_hello_', selectionStart: 1, selectionEnd: 6 });
		expect(toggleWrap('hello', -3, 99, '_')).toEqual({ value: '_hello_', selectionStart: 1, selectionEnd: 6 });
	});

	it('does nothing without a marker', () => {
		expect(toggleWrap('hello', 1, 3, '')).toEqual({ value: 'hello', selectionStart: 1, selectionEnd: 3 });
	});
});

function prefix(text: string, lead = '- '): string {
	const { value, start, end } = marked(text);
	return shown(toggleLinePrefix(value, start, end, lead));
}

describe('toggleLinePrefix', () => {
	it('starts the caret line with the prefix and keeps the caret in its text', () => {
		expect(prefix('one\ntw|o\nthree')).toBe('one\n- tw|o\nthree');
		expect(prefix('|')).toBe('- |');
		expect(prefix('one\n|')).toBe('one\n- |');
	});

	it('removes the prefix from a line that has it', () => {
		expect(prefix('one\n- tw|o')).toBe('one\ntw|o');
		expect(prefix('- |')).toBe('|');
		expect(prefix('-| x')).toBe('|x');
	});

	it('prefixes every line the selection touches, whole lines selected afterwards', () => {
		expect(prefix('on|e\ntwo\nth|ree\nfour')).toBe('|- one\n- two\n- three|\nfour');
	});

	it('leaves the blank lines of a selection alone and prefixes only what lacks it', () => {
		expect(prefix('|one\n\n- two|')).toBe('|- one\n\n- two|');
	});

	it('removes the prefix when every line with text has it', () => {
		expect(prefix('|- one\n\n- two|')).toBe('|one\n\ntwo|');
	});

	it('does not take the line after a selection that ends on a line break', () => {
		expect(prefix('|one\n|two')).toBe('|- one|\ntwo');
	});

	it('works on the first line of a text that starts with a line break', () => {
		expect(prefix('|\nrest')).toBe('- |\nrest');
	});

	it('takes other prefixes', () => {
		expect(prefix('a|b', '> ')).toBe('> a|b');
	});
});

function fence(text: string): string {
	const { value, start, end } = marked(text);
	return shown(toggleCodeBlock(value, start, end));
}

describe('toggleCodeBlock', () => {
	it('puts the selection between fences on their own lines', () => {
		expect(fence('|const a = 1;|')).toBe('```\n|const a = 1;|\n```');
		expect(fence('see |x = 1| here')).toBe('see \n```\n|x = 1|\n```\n here');
	});

	it('does not double the line breaks that are already there', () => {
		expect(fence('before\n|code|\nafter')).toBe('before\n```\n|code|\n```\nafter');
	});

	it('opens an empty block at a caret, the caret on the line between', () => {
		expect(fence('|')).toBe('```\n|\n```');
		expect(fence('text|')).toBe('text\n```\n|\n```');
	});

	it('removes the fences around the selection', () => {
		expect(fence('before\n```\n|code|\n```\nafter')).toBe('before\n|code|\nafter');
		expect(fence('```\n|\n```')).toBe('|');
		expect(fence('```ts\n|a\nb|\n```')).toBe('|a\nb|');
	});

	it('removes the fences a selection holds', () => {
		expect(fence('x\n|```\ncode\n```|\ny')).toBe('x\n|code|\ny');
	});

	it('leaves the line breaks at the ends of the selection outside the block', () => {
		expect(fence('|\ncode\n|')).toBe('\n```\n|code|\n```\n');
	});
});

function link(text: string): string {
	const { value, start, end } = marked(text);
	return shown(insertLink(value, start, end));
}

describe('insertLink', () => {
	it('makes the selected text the link text and waits for the address', () => {
		expect(link('read |the docs| first')).toBe('read [the docs](|) first');
	});

	it('makes a selected address the target and waits for the text', () => {
		expect(link('see |https://example.com/a?b=1|')).toBe('see [|](https://example.com/a?b=1)');
		expect(link('|mailto:ana@example.com|')).toBe('[|](mailto:ana@example.com)');
	});

	it('opens an empty link at a caret', () => {
		expect(link('hello |')).toBe('hello [|]()');
	});

	it('keeps the white space of the selection outside the link', () => {
		expect(link('read| this |now')).toBe('read [this](|) now');
	});
});

describe('insertAt and insertMentionTrigger', () => {
	it('replaces the selection and puts the caret after the text', () => {
		expect(insertAt('hello world', 6, 11, '🎉')).toEqual({ value: 'hello 🎉', selectionStart: 8, selectionEnd: 8 });
		expect(insertAt('ab', 1, 1, 'X')).toEqual({ value: 'aXb', selectionStart: 2, selectionEnd: 2 });
	});

	it('starts a mention on a word boundary', () => {
		expect(insertMentionTrigger('', 0, 0)).toEqual({ value: '@', selectionStart: 1, selectionEnd: 1 });
		expect(insertMentionTrigger('hi ', 3, 3)).toEqual({ value: 'hi @', selectionStart: 4, selectionEnd: 4 });
		expect(insertMentionTrigger('hi', 2, 2)).toEqual({ value: 'hi @', selectionStart: 4, selectionEnd: 4 });
		expect(insertMentionTrigger('a\n', 2, 2)).toEqual({ value: 'a\n@', selectionStart: 3, selectionEnd: 3 });
	});
});

describe('replacementOf', () => {
	const apply = (before: string, after: string) => {
		const { start, end, text } = replacementOf(before, after);
		return before.slice(0, start) + text + before.slice(end);
	};

	it('finds the smallest stretch that turns one text into the other', () => {
		expect(replacementOf('say hello now', 'say **hello** now')).toEqual({ start: 4, end: 9, text: '**hello**' });
		expect(replacementOf('abc', 'abXc')).toEqual({ start: 2, end: 2, text: 'X' });
		expect(replacementOf('abXc', 'abc')).toEqual({ start: 2, end: 3, text: '' });
		expect(replacementOf('same', 'same')).toEqual({ start: 4, end: 4, text: '' });
	});

	it('rebuilds the new text for repeated characters at the edit', () => {
		for (const [before, after] of [
			['aaa', 'aaaa'],
			['**a**', 'a'],
			['', 'x'],
			['x', ''],
			['a\nb', '- a\n- b']
		]) {
			expect(apply(before, after)).toBe(after);
		}
	});

	it('never cuts an emoji in two', () => {
		// Both emoji start with the same half: the whole character is replaced, not its second half.
		expect(replacementOf('😀', '😁')).toEqual({ start: 0, end: 2, text: '😁' });
		expect(replacementOf('a😀b', 'a😁b')).toEqual({ start: 1, end: 3, text: '😁' });
		expect(apply('😀😀', '😀😁😀')).toBe('😀😁😀');
	});
});
