import { z } from 'zod';
import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createCommentRequest, getCommentsRequest } from '@/core/services/server/requests/comment';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { baseEntityEnumSchema } from '@/core/types/schemas/common/enums.schema';
import { ICommentCreateInput } from '@/core/types/interfaces/common/comment';

// Only the keys of Gauzy's CreateCommentDTO the web sends: the author is never the body's, and the tenant and
// organization come from the session.
const commentBody = z.object({
	comment: z.string().trim().min(1),
	entity: baseEntityEnumSchema,
	entityId: z.guid(),
	entityName: z.string().optional(),
	parentId: z.guid().optional(),
	mentionEmployeeIds: z.array(z.guid()).max(100).optional()
});

export async function GET(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	// The guard's own status: 401 for a refused session, 503 when Gauzy could not answer (no logout then)
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);
	const query = searchParams.toString();

	try {
		const { data } = await getCommentsRequest({ query, bearer_token: access_token, tenantId });

		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Comments request failed');
	}
}

export async function POST(req: Request) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	const requestBody: unknown = await req.json().catch(() => null);
	const parsed = commentBody.safeParse(requestBody);
	if (!parsed.success) {
		return NextResponse.json({ error: 'A comment needs a text, an entity and an entity id' }, { status: 400 });
	}

	const data: ICommentCreateInput = { ...parsed.data, tenantId, organizationId };

	try {
		const response = await createCommentRequest({ data, bearer_token: access_token, tenantId });

		return $res(response.data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Comment post failed');
	}
}
