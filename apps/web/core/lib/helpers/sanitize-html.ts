/**
 * HTML Sanitizer for rich text content
 * Provides XSS protection by allowing only safe HTML tags and attributes
 *
 * Expected behavior (specification for tests / audits):
 * - Event handlers: onclick, onload, onerror, onmouseover, etc. are stripped (only "class" is in ALLOWED_ATTRIBUTES).
 * - javascript: and data: URLs: removed by tag allowlist; <a>, <img>, <iframe> etc. are not allowed and are unwrapped (content kept, tag and attributes removed).
 * - Dangerous tags: <script>, <iframe>, <object>, <embed>, etc. are removed (unwrapped); nested or obfuscated (e.g. <ScRiPt>) are normalized to lowercase and stripped.
 * - Nested exploits: allowed tags (p, strong, span, …) keep only the class attribute; malicious attributes (onclick, style, href, …) are removed.
 * - Inline style: style attribute is not in ALLOWED_ATTRIBUTES and is removed.
 * - Class attribute: allowlisted and preserved; attribute values are not validated (no allowlist of class names).
 * - SSR path: when DOMParser is undefined (Node/SSR), sanitizeHtml falls back to escapeHtml(html), escaping & < > " ' so behavior is consistent and safe across environments.
 * - Comments: HTML comments are removed.
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
 * Recursively sanitizes a DOM node and its children.
 * Disallowed tags are unwrapped (replaced by their children) to preserve nested allowed formatting.
 */
function sanitizeNode(node: Node): void {
	const nodesToRemove: Node[] = [];
	const children = Array.from(node.childNodes);

	children.forEach((child) => {
		if (child.nodeType === Node.ELEMENT_NODE) {
			const element = child as Element;
			const tagName = element.tagName.toLowerCase();

			if (!ALLOWED_TAGS.has(tagName)) {
				// Unwrap disallowed tag: sanitize its children first, then replace with children
				sanitizeNode(element);
				const fragment = document.createDocumentFragment();
				while (element.firstChild) {
					fragment.appendChild(element.firstChild);
				}
				node.replaceChild(fragment, element);
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
			nodesToRemove.push(child);
		}
	});

	nodesToRemove.forEach((nodeToRemove) => {
		node.removeChild(nodeToRemove);
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
