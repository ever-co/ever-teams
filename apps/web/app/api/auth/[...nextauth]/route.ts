import type { NextRequest } from 'next/server';
import { setFramingPolicy } from '@/core/lib/helpers/frame-ancestors';
import { handlers } from '../../../../auth';

type AuthHandler = (request: NextRequest) => Promise<Response>;

/**
 * Auth.js answers its own sign-in and sign-out pages here, where the proxy does not run: they say who may frame them,
 * as every page does (ever-co/ever-teams#5527).
 *
 * The policy goes on a copy of Auth.js's answer: Auth.js sends a person to its error page with `Response.redirect()`
 * (a social sign-in the person cancelled, for one), whose headers cannot be changed, and setting one there would answer
 * with a server error instead.
 */
async function answerWithFramingPolicy(handler: AuthHandler, request: NextRequest): Promise<Response> {
	const answer = await handler(request);
	const response = new Response(answer.body, answer);
	setFramingPolicy(response, request.nextUrl.pathname);
	return response;
}

export const GET = (request: NextRequest) => answerWithFramingPolicy(handlers.GET, request);
export const POST = (request: NextRequest) => answerWithFramingPolicy(handlers.POST, request);
