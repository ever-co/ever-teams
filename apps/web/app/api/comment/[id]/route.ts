import { z } from 'zod';
import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteCommentRequest, updateCommentRequest } from '@/core/services/server/requests/comment';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

const commentIdSchema = z.guid();

// Only the keys of Gauzy's UpdateCommentDTO the web sends: the author, the record and the resolver are never the
// body's (Gauzy takes the resolver from the caller). The browser's transport adds the tenant and the organization to
// every PUT: they are accepted and dropped, the session's own are what Gauzy reads.
const commentUpdateBody = z
	.object({
		comment: z.string().trim().min(1).optional(),
		resolved: z.boolean().optional(),
		resolvedAt: z.iso.datetime().nullable().optional(),
		mentionEmployeeIds: z.array(z.guid()).max(100).optional(),
		tenantId: z.string().optional(),
		organizationId: z.string().optional()
	})
	.strict()
	// What goes on is the update alone (an absent key stays out of the JSON).
	.transform(({ comment, resolved, resolvedAt, mentionEmployeeIds }) => ({ comment, resolved, resolvedAt, mentionEmployeeIds }));

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of Gauzy's `PUT /comment/:id` (edit, resolve, reopen). */
export async function PUT(req: Request, { params }: RouteContext) {
	const parsedId = commentIdSchema.safeParse((await params).id);
	if (!parsedId.success) {
		return NextResponse.json({ error: 'A comment id is required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	const requestBody: unknown = await req.json().catch(() => null);
	const parsed = commentUpdateBody.safeParse(requestBody);
	if (!parsed.success) {
		return NextResponse.json({ error: 'A comment update takes a text, a resolved state or mentions' }, { status: 400 });
	}

	try {
		const response = await updateCommentRequest({ id: parsedId.data, data: parsed.data, bearer_token: access_token, tenantId });

		return $res(response.data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Comment update failed');
	}
}

/** Proxy mode twin of Gauzy's `DELETE /comment/:id`. */
export async function DELETE(req: Request, { params }: RouteContext) {
	const parsedId = commentIdSchema.safeParse((await params).id);
	if (!parsedId.success) {
		return NextResponse.json({ error: 'A comment id is required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	try {
		const response = await deleteCommentRequest({ id: parsedId.data, bearer_token: access_token, tenantId });

		return $res(response.data ?? null);
	} catch (error) {
		return gauzyErrorResponse(error, 'Comment delete failed');
	}
}
