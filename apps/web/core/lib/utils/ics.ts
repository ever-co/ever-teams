// iCalendar (RFC 5545) building blocks, shared by every calendar file Ever Teams writes
// cspell:ignore DTSTAMP

/** A moment as an iCalendar UTC date-time: `20261112T093000Z`. */
export function icsDateOf(date: Date): string {
	return date
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');
}

/** A C0 control character or DEL: a line break, a tab, or anything else that has no place in a property line. */
function isControlCharacter(character: string): boolean {
	const code = character.codePointAt(0) ?? 0;
	return code < 0x20 || code === 0x7f;
}

/**
 * An iCalendar TEXT value: escaped, every line break (CR, LF or both) written as `\n`, and no other control
 * character, so no value can end its line and start a property of its own.
 */
export function icsTextOf(value: string): string {
	const escaped = value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, String.raw`\;`)
		.replace(/,/g, String.raw`\,`)
		.replace(/\r\n|\r|\n/g, String.raw`\n`);
	return Array.from(escaped)
		.filter((character) => !isControlCharacter(character))
		.join('');
}

/**
 * The meeting's link as an iCalendar URI value, or null: Gauzy keeps the location as free text, and only an http(s)
 * URL with no space or control character goes into a property written as it is.
 */
export function icsUriOf(link: string): string | null {
	const hasBreak = Array.from(link).some((character) => isControlCharacter(character) || /\s/.test(character));
	if (hasBreak) {
		return null;
	}
	try {
		const url = new URL(link);
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
	} catch {
		return null;
	}
}

/** RFC 5545 folds a line longer than 75 octets: the rest goes on lines that start with a space. */
export function foldIcsLine(line: string): string {
	const encoder = new TextEncoder();
	if (encoder.encode(line).length <= 75) {
		return line;
	}
	const parts: string[] = [];
	let current = '';
	for (const character of line) {
		const limit = parts.length === 0 ? 75 : 74;
		if (encoder.encode(current + character).length > limit) {
			parts.push(current);
			current = character;
		} else {
			current += character;
		}
	}
	parts.push(current);
	return parts.join('\r\n ');
}
