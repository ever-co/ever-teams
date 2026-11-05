/** Body fields that carry a password in clear text: `hash` is the new password of `PUT /user/:id`. */
const SECRET_BODY_FIELDS = new Set(['hash', 'password', 'confirmPassword']);

const HIDDEN = '[hidden]';

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

function hiddenWhenSecret([field, value]: [string, unknown]): [string, unknown] {
	if (SECRET_BODY_FIELDS.has(field)) {
		return [field, HIDDEN];
	}
	return [field, value];
}

/** A request body as the development log shows it: same fields, never a password. */
export function requestBodyForLog(data: unknown): unknown {
	if (!isPlainObject(data)) {
		return data;
	}
	const entries = Object.entries(data).map(hiddenWhenSecret);
	return Object.fromEntries(entries);
}
