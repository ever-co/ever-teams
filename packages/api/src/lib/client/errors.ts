export interface EverTeamsErrorInit {
	status: number;
	message: string;
	nextStep: string;
	code?: string;
	body?: unknown;
	cause?: unknown;
}

/**
 * An error of a client made with `createClient`: what happened (`message`), the HTTP status of the answer (`status`,
 * 0 when there was no answer), the API's code when its answer has one (`code`) and what to do next (`nextStep`).
 */
export class EverTeamsError extends Error {
	readonly status: number;
	readonly code: string | undefined;
	readonly nextStep: string;
	/** The API's answer, read as JSON when it was JSON. */
	readonly body: unknown;
	readonly cause: unknown;

	constructor(init: EverTeamsErrorInit) {
		super(init.message);
		this.name = 'EverTeamsError';
		this.status = init.status;
		this.code = init.code;
		this.nextStep = init.nextStep;
		this.body = init.body;
		this.cause = init.cause;
	}
}

/** 401: the token expired, was revoked or is not one this API issued. */
export class EverTeamsAuthError extends EverTeamsError {
	constructor(init: EverTeamsErrorInit) {
		super(init);
		this.name = 'EverTeamsAuthError';
	}
}

/** 403: the token may not do this. `code` names the reason when the API gives one (`EMBED_SCOPE`, ...). */
export class EverTeamsForbiddenError extends EverTeamsError {
	constructor(init: EverTeamsErrorInit) {
		super(init);
		this.name = 'EverTeamsForbiddenError';
	}
}

/** 404: no such route or record at this address. */
export class EverTeamsNotFoundError extends EverTeamsError {
	constructor(init: EverTeamsErrorInit) {
		super(init);
		this.name = 'EverTeamsNotFoundError';
	}
}

export interface EverTeamsValidationErrorInit extends EverTeamsErrorInit {
	messages: string[];
}

/** 400 or 422: the API refused the values sent. `messages` holds its messages, each naming a field. */
export class EverTeamsValidationError extends EverTeamsError {
	readonly messages: string[];

	constructor(init: EverTeamsValidationErrorInit) {
		super(init);
		this.name = 'EverTeamsValidationError';
		this.messages = init.messages;
	}
}

/** 409: the request conflicts with the current state, for example a stop that names another running timer. */
export class EverTeamsConflictError extends EverTeamsValidationError {
	constructor(init: EverTeamsValidationErrorInit) {
		super(init);
		this.name = 'EverTeamsConflictError';
	}
}

export interface EverTeamsRateLimitErrorInit extends EverTeamsErrorInit {
	retryAfter: number | undefined;
}

/** 429: too many requests. `retryAfter` is the wait in seconds when the answer's Retry-After header was readable. */
export class EverTeamsRateLimitError extends EverTeamsError {
	readonly retryAfter: number | undefined;

	constructor(init: EverTeamsRateLimitErrorInit) {
		super(init);
		this.name = 'EverTeamsRateLimitError';
		this.retryAfter = init.retryAfter;
	}
}

/** 5xx: the API, or a gateway in front of it, failed. */
export class EverTeamsServerError extends EverTeamsError {
	constructor(init: EverTeamsErrorInit) {
		super(init);
		this.name = 'EverTeamsServerError';
	}
}

/** No answer: the address is wrong, the network is down, or a browser blocked the answer (CORS). `status` is 0. */
export class EverTeamsNetworkError extends EverTeamsError {
	constructor(init: EverTeamsErrorInit) {
		super(init);
		this.name = 'EverTeamsNetworkError';
	}
}
