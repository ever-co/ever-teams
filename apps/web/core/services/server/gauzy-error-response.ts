import { NextResponse } from 'next/server';
import { unwrapRejection } from './fetch';

function errorStatusOf(body: unknown): number | null {
	if (typeof body !== 'object' || body === null) {
		return null;
	}
	const statusCode = (body as { statusCode?: unknown }).statusCode;
	if (typeof statusCode !== 'number') {
		return null;
	}
	if (statusCode < 400) {
		return null;
	}

	return statusCode;
}

/**
 * The answer of an `app/api` route whose Gauzy request failed. `serverFetch` rejects a non-2xx answer with
 * `Promise.reject(data)`: Gauzy's status and body are passed on (a 400 or 403 stays one, a 401 still reaches the
 * client's re-authentication). A failure without a readable answer from Gauzy is a 502, never a 500.
 */
export async function gauzyErrorResponse(error: unknown, fallbackMessage: string): Promise<NextResponse> {
	const fallbackBody = { message: fallbackMessage };
	const isGauzyAnswer = error instanceof Promise;
	if (!isGauzyAnswer) {
		return NextResponse.json(fallbackBody, { status: 502 });
	}

	const body = await unwrapRejection(error);
	const status = errorStatusOf(body);
	if (status === null) {
		return NextResponse.json(fallbackBody, { status: 502 });
	}

	return NextResponse.json(body, { status });
}
