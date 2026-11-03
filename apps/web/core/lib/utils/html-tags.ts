/**
 * Same result as `html.replace(/<[^>]*>/g, replacement)`, in one pass: the regex rescans to the end of the text from
 * every `<` that has no closing `>`.
 */
export function replaceHtmlTags(html: string, replacement: string) {
	let result = '';
	let cursor = 0;
	while (cursor < html.length) {
		const tagStart = html.indexOf('<', cursor);
		if (tagStart < 0) {
			break;
		}
		const tagEnd = html.indexOf('>', tagStart + 1);
		if (tagEnd < 0) {
			break;
		}
		result += html.slice(cursor, tagStart);
		result += replacement;
		cursor = tagEnd + 1;
	}
	result += html.slice(cursor);
	return result;
}
