import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { createEntityFileLinkRequest, getEntityFileLinksRequest } from '@/core/services/server/requests/entity-files';
import {
	createEntityFileLinkSchema,
	entityFileLinksQuerySchema
} from '@/core/types/schemas/documents/entity-file.schema';

/** The files linked to a task, a project or a comment of the caller's organization. */
export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const parsed = entityFileLinksQuerySchema.safeParse({
		entity: searchParams.get('entity'),
		entityId: searchParams.get('entityId')
	});
	if (!parsed.success) {
		return NextResponse.json({ error: 'A record type and id are required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	try {
		const { data } = await getEntityFileLinksRequest({
			...parsed.data,
			organizationId,
			bearer_token: access_token,
			tenantId
		});

		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Files request failed');
	}
}

export async function POST(req: Request) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	const requestBody: unknown = await req.json().catch(() => null);
	const parsed = createEntityFileLinkSchema.safeParse(requestBody);
	if (!parsed.success) {
		return NextResponse.json({ error: 'A document, a record type and a record id are required' }, { status: 400 });
	}

	try {
		const { data } = await createEntityFileLinkRequest({
			...parsed.data,
			organizationId,
			bearer_token: access_token,
			tenantId
		});

		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'File link failed');
	}
}
