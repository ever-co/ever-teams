/**
 * The description a new task is sent with. Gauzy stores one string and every client reads it as HTML. What reaches the
 * create call is either text typed by hand or HTML already: the rich editor of the create form writes HTML, and a
 * copy of a task carries the description of the original, which is HTML too.
 */

/** A description that already starts with a block element: it is HTML and needs no paragraph around it. */
const STARTS_WITH_BLOCK_TAG = /^\s*<(p|div|h[1-6]|ul|ol|pre|blockquote|table|hr)[\s>/]/i;

/**
 * The description as HTML for a new task, or null for none. Text gets one paragraph around it; HTML is kept as it is,
 * since a paragraph around a paragraph is not valid: the editor opens it as an empty paragraph before the text and one
 * after it, and each copy of a task would add another pair.
 */
export function newTaskDescriptionOf(description: string | null | undefined): string | null {
	if (!description) {
		return null;
	}
	if (STARTS_WITH_BLOCK_TAG.test(description)) {
		return description;
	}
	return `<p>${description}</p>`;
}
