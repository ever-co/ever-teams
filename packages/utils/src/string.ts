import DOMPurify from "isomorphic-dompurify";

/* -------------------------------------------------------------------------- */
/*                                String Utilities                            */
/* -------------------------------------------------------------------------- */

/**
 * Inserts spaces between camelCase words.
 *
 * @param text - Input camelCase string.
 * @returns String with spaces inserted.
 *
 * @example
 * addSpaceInCamelCase("camelCase") // => "camel Case"
 */
export const addSpaceInCamelCase = (text: string): string => {
	if (!text) return "";
	return text.replace(/([a-z])([A-Z])/g, "$1 $2");
};

/**
 * Replaces underscores with spaces in snake_case strings.
 *
 * @param text - Input snake_case string.
 * @returns String with underscores replaced.
 *
 * @example
 * replaceUnderscores("snake_case_string") // => "snake case string"
 */
export const replaceUnderscores = (text: string): string => {
	return text.replace(/_/g, " ");
};

/**
 * Truncates a string to a maximum length, appending ellipsis if needed.
 *
 * @param text - Input string.
 * @param maxLength - Maximum allowed length.
 * @returns Truncated string.
 *
 * @example
 * truncateText("Hello world!", 5) // => "Hello..."
 */
export const truncateText = (text: string, maxLength: number): string => {
	if (!text) return "";
	return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

/**
 * Randomly shuffles characters in a string.
 *
 * @param text - Input string.
 * @returns Shuffled string.
 *
 * @example
 * shuffleString("abc") // => "cab" or "bca" etc.
 */
export const shuffleString = (text: string): string => {
	return text
		.split("")
		.sort(() => Math.random() - 0.5)
		.join("");
};

/**
 * Returns the initials of a string (first letter of first and second word).
 *
 * @param text - Input string.
 * @returns Initials.
 *
 * @example
 * getInitials("John Doe") // => "JD"
 */
export const getInitials = (text: string): string => {
	const words = text.trim().split(" ");
	return words.length > 1 ? `${words[0][0]}${words[1][0]}` : `${words[0][0]}`;
};

/**
 * Capitalizes the first letter of a string.
 *
 * @param text - Input string.
 * @returns Capitalized string.
 *
 * @example
 * capitalizeFirstLetter("hello") // => "Hello"
 */
export const capitalizeFirstLetter = (text: string): string => {
	if (!text) return "";
	return text.charAt(0).toUpperCase() + text.slice(1);
};

/* -------------------------------------------------------------------------- */
/*                             Clipboard Utilities                            */
/* -------------------------------------------------------------------------- */

/**
 * Copies given text to the user's clipboard.
 *
 * @param text - Text to copy.
 * @returns Promise resolved when the text is copied.
 *
 * @example
 * await copyTextToClipboard("Hello World!")
 */
export const copyTextToClipboard = async (text: string): Promise<void> => {
	if (typeof navigator === "undefined" || !navigator.clipboard) {
		console.error("Clipboard API not available");
		return;
	}
	try {
		await navigator.clipboard.writeText(text);
	} catch (error) {
		console.error("Failed to copy text:", error);
	}
};

/**
 * Copies a full URL (origin + path) to clipboard.
 *
 * @param path - Path to append to the current window origin.
 * @returns Promise resolved when the URL is copied.
 *
 * @example
 * await copyUrlToClipboard("/profile/123")
 */
export const copyUrlToClipboard = async (path: string): Promise<void> => {
	const origin = typeof window !== "undefined" ? window.location.origin : "";
	const fullUrl = new URL(path, origin).toString();
	await copyTextToClipboard(fullUrl);
};

/* -------------------------------------------------------------------------- */
/*                          HTML and Content Utilities                       */
/* -------------------------------------------------------------------------- */

/**
 * Sanitizes an HTML string by removing tags and escaping quotes.
 *
 * @param html - Input HTML string.
 * @returns Clean text string.
 *
 * @example
 * sanitizeHTML("<p>Test</p>") // => "Test"
 */
export const sanitizeHTML = (html: string): string => {
	if (!html) return "";

	const cleanText = DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [],
		ALLOWED_ATTR: [],
	});

	return cleanText.trim().replace(/'/g, "&apos;").replace(/"/g, "&quot;");
};

/**
 * Checks if a sanitized HTML string is effectively empty.
 *
 * @param html - HTML content.
 * @param allowedTags - Tags to allow (optional).
 * @returns True if the cleaned HTML is empty.
 *
 * @example
 * isEmptyHtmlString("<p></p>") // => true
 */
export const isEmptyHtmlString = (html: string, allowedTags: string[] = []): boolean => {
	const cleaned = DOMPurify.sanitize(html, { ALLOWED_TAGS: allowedTags });
	return cleaned.trim() === "";
};

/**
 * Checks whether a comment is effectively empty.
 *
 * @param comment - Input comment.
 * @returns True if empty.
 *
 * @example
 * isCommentEmpty("<p></p>") // => true
 */
export const isCommentEmpty = (comment: string | undefined): boolean => {
	if (!comment) return true;
	return (
		comment.trim() === "" ||
		comment === "<p></p>" ||
		isEmptyHtmlString(comment, ["img", "mention-component", "image-component"])
	);
};

/* -------------------------------------------------------------------------- */
/*                          Color Generation Utility                         */
/* -------------------------------------------------------------------------- */

/**
 * Generates a deterministic HSL color based on the input string.
 *
 * @param text - Input string.
 * @returns HSL color string.
 *
 * @example
 * generateColorFromString("hello") // => "hsl(123, 70%, 60%)"
 */
export const generateColorFromString = (text: string): string => {
	if (!text) return "rgb(var(--color-primary-100))";

	const uniqueSeed = `${text.length}${text}${text}`;
	const hash = Array.from(uniqueSeed).reduce((acc, char) => {
		return (acc << 5) - acc + char.charCodeAt(0);
	}, 0);

	const hue = Math.abs(hash) % 360;
	return `hsl(${hue}, 70%, 60%)`;
};

/* -------------------------------------------------------------------------- */
/*                              Validation Utilities                         */
/* -------------------------------------------------------------------------- */

/**
 * Validates an email address.
 *
 * @param email - Email string.
 * @returns True if valid.
 *
 * @example
 * validateEmail("example@domain.com") // => true
 */
export const validateEmail = (email: string): boolean => {
	if (!email) return false;
	return /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/.test(
		email
	);
};

/**
 * Validates a URL, allowing missing protocol.
 *
 * @param url - URL string.
 * @returns True if valid.
 *
 * @example
 * validateURL("example.com") // => true
 * validateURL("invalid url") // => false
 */
export const validateURL = (url: string): boolean => {
	if (!url) return false;
	return /^(https?:\/\/)?(([a-z\d-]+\.)+[a-z]{2,6}|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/.*)?$/i.test(url);
};

/* -------------------------------------------------------------------------- */
/*                          Object / Query Utilities                         */
/* -------------------------------------------------------------------------- */

/**
 * Converts an object into URL query parameters string.
 *
 * @param obj - Object to convert.
 * @returns Query string.
 *
 * @example
 * objectToQueryParams({ page: 1, search: "test" }) // => "page=1&search=test"
 */
export const objectToQueryParams = (obj: Record<string, any>): string => {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined && value !== null) {
			params.append(key, String(value));
		}
	}

	return params.toString();
};

/**
 * Formats a numeric count, limiting to "99+".
 *
 * @param count - Numeric count.
 * @returns Formatted string.
 *
 * @example
 * formatCount(120) // => "99+"
 */
export const formatCount = (count: number): string => {
	return count > 99 ? "99+" : count.toString();
};
