import { NextResponse } from 'next/server';
import { unwrapRejection } from '@/core/services/server/fetch';

const DEFAULT_REFUSAL_STATUS = 400;
const NO_ANSWER_STATUS = 502;

/** The status a refusal's body names; 400 when it names none, or one that is no error status. */
function refusalStatusOf(body: object): number {
	const statusCode = (body as { statusCode?: unknown }).statusCode;
	if (typeof statusCode !== 'number') {
		return DEFAULT_REFUSAL_STATUS;
	}
	const isErrorStatus = statusCode >= 400 && statusCode <= 599;
	if (!isErrorStatus) {
		return DEFAULT_REFUSAL_STATUS;
	}
	return statusCode;
}

/**
 * What a route answers when its call to the Gauzy API failed. serverFetch rejects a refusal with a rejected promise
 * of Gauzy's error body: that body goes back to the browser with the status it names, so the page can tell a wrong
 * password from a missing permission. Anything else (Gauzy unreachable, a body that is not JSON) is a 502.
 *
 * @param error What the call threw.
 * @param routeName The route, as the server log names it (`POST /auth/signin-email-password`).
 */
export async function apiRefusalResponse(error: unknown, routeName: string): Promise<NextResponse> {
	const isRefusal = error instanceof Promise;
	const body = await unwrapRejection(error);
	const hasBody = typeof body === 'object' && body !== null;
	if (!isRefusal || !hasBody) {
		console.error(`[WEB][API] ${routeName}: no usable answer from the Gauzy API`, error);
		const noAnswer = { statusCode: NO_ANSWER_STATUS, message: 'The Gauzy API gave no usable answer' };
		return NextResponse.json(noAnswer, { status: NO_ANSWER_STATUS });
	}

	return NextResponse.json(body, { status: refusalStatusOf(body) });
}
