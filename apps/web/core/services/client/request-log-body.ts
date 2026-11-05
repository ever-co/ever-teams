/** Body fields that carry a password in clear text: `hash` is the new password of `PUT /user/:id`. */
const SECRET_BODY_FIELDS = new Set(['hash', 'password', 'confirmPassword']);

const HIDDEN = '[hidden]';

/** A text body that is not JSON, or an object that is not plain data, cannot be checked for a password. */
const UNREADABLE_BODY = '[not logged]';

const ALREADY_SHOWN = '[circular]';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object') {
		return false;
	}
	if (value === null) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	const isObjectLiteral = prototype === Object.prototype;
	const hasNoPrototype = prototype === null;
	return isObjectLiteral || hasNoPrototype;
}

function isPrimitive(value: unknown): boolean {
	if (value === null) {
		return true;
	}
	const kind = typeof value;
	const isObjectLike = kind === 'object';
	const isFunction = kind === 'function';
	return !isObjectLike && !isFunction;
}

function hideSecrets(value: unknown, seen: WeakSet<object>): unknown {
	if (isPrimitive(value)) {
		return value;
	}
	const isArray = Array.isArray(value);
	const isObject = isPlainObject(value);
	const isContainer = isArray || isObject;
	if (!isContainer) {
		return UNREADABLE_BODY;
	}
	const container = value as object;
	if (seen.has(container)) {
		return ALREADY_SHOWN;
	}
	seen.add(container);
	if (isArray) {
		return (value as unknown[]).map((item) => hideSecrets(item, seen));
	}
	const entries = Object.entries(value as Record<string, unknown>).map(([field, item]) =>
		hiddenEntryOf(field, item, seen)
	);
	return Object.fromEntries(entries);
}

function hiddenEntryOf(field: string, item: unknown, seen: WeakSet<object>): [string, unknown] {
	if (SECRET_BODY_FIELDS.has(field)) {
		return [field, HIDDEN];
	}
	const shown = hideSecrets(item, seen);
	return [field, shown];
}

function textBodyForLog(body: string): unknown {
	let parsed: unknown;
	try {
		parsed = JSON.parse(body);
	} catch {
		return UNREADABLE_BODY;
	}
	return hideSecrets(parsed, new WeakSet());
}

/** A request body as the development log shows it: same fields at any depth, never a password. */
export function requestBodyForLog(data: unknown): unknown {
	if (typeof data === 'string') {
		return textBodyForLog(data);
	}
	return hideSecrets(data, new WeakSet());
}
