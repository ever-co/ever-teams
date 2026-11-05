import { z } from 'zod';
import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { deleteEntityFileLinkRequest } from '@/core/services/server/requests/entity-files';

const linkIdSchema = z.guid();

/** Takes a file off a record; the document stays in the organization's documents. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const parsedId = linkIdSchema.safeParse((await params).id);
	if (!parsedId.success) {
		return NextResponse.json({ error: 'A link id is required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	try {
		const { data } = await deleteEntityFileLinkRequest({ id: parsedId.data, bearer_token: access_token, tenantId });

		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'File unlink failed');
	}
}
