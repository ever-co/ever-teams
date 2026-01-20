/**
 * HTML Sanitizer for rich text content
 * Provides XSS protection by allowing only safe HTML tags and attributes
 */

// Allowlist of safe tags for rich text content
const ALLOWED_TAGS = new Set(['p', 'strong', 'b', 'em', 'i', 'u', 'code', 'br', 'span']);

// Allowlist of safe attributes (currently none needed for basic formatting)
const ALLOWED_ATTRIBUTES = new Set(['class']);

/**
 * Sanitizes HTML string by removing potentially dangerous tags and attributes
 * Only allows safe formatting tags used by the RichTextEditor
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering with dangerouslySetInnerHTML
 */
export function sanitizeHtml(html: string | null | undefined): string {
	if (!html) return '';

	// If it's plain text (no HTML), return as-is
	if (!html.includes('<')) {
		return html;
	}

	// Check if DOMParser is available (not available in SSR/Node.js)
	if (typeof DOMParser === 'undefined') {
		// Fallback: escape HTML for SSR safety
		return escapeHtml(html);
	}

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');

		// Recursively sanitize the document body
		sanitizeNode(doc.body);

		return doc.body.innerHTML;
	} catch {
		// If parsing fails, escape all HTML and return as plain text
		return escapeHtml(html);
	}
}

/**
 * Recursively sanitizes a DOM node and its children
 */
function sanitizeNode(node: Node): void {
	const nodesToRemove: Node[] = [];

	node.childNodes.forEach((child) => {
		if (child.nodeType === Node.ELEMENT_NODE) {
			const element = child as Element;
			const tagName = element.tagName.toLowerCase();

			if (!ALLOWED_TAGS.has(tagName)) {
				// Replace disallowed tag with its text content
				nodesToRemove.push(child);
			} else {
				// Remove disallowed attributes
				Array.from(element.attributes).forEach((attr) => {
					if (!ALLOWED_ATTRIBUTES.has(attr.name.toLowerCase())) {
						element.removeAttribute(attr.name);
					}
				});

				// Recursively sanitize children
				sanitizeNode(element);
			}
		} else if (child.nodeType === Node.COMMENT_NODE) {
			// Remove comments
			nodesToRemove.push(child);
		}
	});

	// Remove disallowed nodes (replace with their text content)
	nodesToRemove.forEach((nodeToRemove) => {
		if (nodeToRemove.nodeType === Node.ELEMENT_NODE) {
			const textContent = nodeToRemove.textContent || '';
			const textNode = document.createTextNode(textContent);
			node.replaceChild(textNode, nodeToRemove);
		} else {
			node.removeChild(nodeToRemove);
		}
	});
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, (char) => map[char]);
}
