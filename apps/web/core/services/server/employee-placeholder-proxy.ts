import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canManagePlaceholders } from '@/core/lib/utils/member-placeholder';
import { enabledPermissionsOf } from '@/core/lib/utils/member-access';
import { gauzyErrorResponse } from './gauzy-error-response';
import { authenticatedGuard } from './guards/authenticated-guard-app';
import {
	claimEmployeePlaceholderRequest,
	createEmployeePlaceholderRequest,
	createEmployeePlaceholdersRequest,
	mergeEmployeePlaceholderRequest,
	previewEmployeePlaceholderMergeRequest
} from './requests/employee-placeholder';
import { getMyRolePermissionsRequest } from './requests/role-permissions';

/**
 * Proxy mode twins (no NEXT_PUBLIC_GAUZY_API_SERVER_URL) of Gauzy's `/employee-placeholder` routes, members without
 * an account. Refused here, before Gauzy, without the permission Gauzy asks for them (`ORG_EMPLOYEES_EDIT`); Gauzy's
 * answers and refusals pass through unchanged (a 409 says what to do next).
 */

const placeholderIdSchema = z.guid();

/** The query a merge preview takes: nothing else goes on to Gauzy. */
const PREVIEW_QUERY_KEYS = ['tenantId', 'organizationId', 'targetEmployeeId'];

type Session = { bearer_token: string; tenantId: string };

type Forward = (session: Session, body: unknown) => Promise<{ data: unknown }>;

function invalid(message: string): NextResponse {
	return NextResponse.json({ message }, { status: 400 });
}

async function objectBodyOf(req: Request): Promise<Record<string, unknown> | null> {
	const body: unknown = await req.json().catch(() => null);
	const isObject = typeof body === 'object' && body !== null && !Array.isArray(body);
	if (!isObject) {
		return null;
	}
	return body as Record<string, unknown>;
}

/** Signs the caller in, checks the permission, then forwards: the shared path of every route below. */
async function forwardAllowed(
	req: Request,
	body: unknown,
	forward: Forward,
	fallbackMessage: string,
	status = 200
): Promise<NextResponse> {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');
	const session = { bearer_token: access_token, tenantId };
	try {
		const { data: permissions } = await getMyRolePermissionsRequest(session);
		const mayManage = canManagePlaceholders(enabledPermissionsOf(permissions ?? []));
		if (!mayManage) {
			return NextResponse.json({ message: 'You may not add, claim or merge members.' }, { status: 403 });
		}
		const { data } = await forward(session, body);
		return NextResponse.json(data, { status });
	} catch (error) {
		return gauzyErrorResponse(error, fallbackMessage);
	}
}

/** `POST /api/employee-placeholder`: one member without an account. */
export async function proxyCreateEmployeePlaceholder(req: Request): Promise<NextResponse> {
	const body = await objectBodyOf(req);
	if (!body) return invalid('A member is required');
	return forwardAllowed(
		req,
		body,
		(session, input) => createEmployeePlaceholderRequest({ ...session, body: input }),
		'The member could not be added.',
		201
	);
}

/** `POST /api/employee-placeholder/bulk`: many, for an import. */
export async function proxyCreateEmployeePlaceholders(req: Request): Promise<NextResponse> {
	const body = await objectBodyOf(req);
	if (!body) return invalid('Members are required');
	return forwardAllowed(
		req,
		body,
		(session, input) => createEmployeePlaceholdersRequest({ ...session, body: input }),
		'The members could not be added.',
		201
	);
}

/** `POST /api/employee-placeholder/[id]/claim`: the invitation to claim the member's time. */
export async function proxyClaimEmployeePlaceholder(req: Request, placeholderId: string): Promise<NextResponse> {
	const parsedId = placeholderIdSchema.safeParse(placeholderId);
	if (!parsedId.success) return invalid('A member id is required');
	const body = await objectBodyOf(req);
	if (!body) return invalid('An email is required');
	return forwardAllowed(
		req,
		body,
		(session, input) => claimEmployeePlaceholderRequest({ ...session, placeholderId: parsedId.data, body: input }),
		'The claim invitation could not be sent.',
		201
	);
}

/** `GET /api/employee-placeholder/[id]/merge-preview`: what a merge would move. */
export async function proxyPreviewEmployeePlaceholderMerge(req: Request, placeholderId: string): Promise<NextResponse> {
	const parsedId = placeholderIdSchema.safeParse(placeholderId);
	if (!parsedId.success) return invalid('A member id is required');
	const searchParams = new URL(req.url).searchParams;
	const kept = new URLSearchParams();
	for (const key of PREVIEW_QUERY_KEYS) {
		const value = searchParams.get(key);
		if (value) {
			kept.set(key, value);
		}
	}
	return forwardAllowed(
		req,
		null,
		(session) =>
			previewEmployeePlaceholderMergeRequest({
				...session,
				placeholderId: parsedId.data,
				query: kept.toString()
			}),
		'What the merge would move could not be read.'
	);
}

/** `POST /api/employee-placeholder/[id]/merge`: the merge itself. */
export async function proxyMergeEmployeePlaceholder(req: Request, placeholderId: string): Promise<NextResponse> {
	const parsedId = placeholderIdSchema.safeParse(placeholderId);
	if (!parsedId.success) return invalid('A member id is required');
	const body = await objectBodyOf(req);
	if (!body) return invalid('The member to merge into is required');
	return forwardAllowed(
		req,
		body,
		(session, input) => mergeEmployeePlaceholderRequest({ ...session, placeholderId: parsedId.data, body: input }),
		'The members could not be merged.'
	);
}
