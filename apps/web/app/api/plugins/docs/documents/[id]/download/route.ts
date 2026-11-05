import { z } from 'zod';
import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { getDocumentDownloadRequest } from '@/core/services/server/requests/entity-files';

const documentIdSchema = z.guid();

/** A short-lived address of the stored file; Gauzy checks that the caller may read the document. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const parsedId = documentIdSchema.safeParse((await params).id);
	if (!parsedId.success) {
		return NextResponse.json({ error: 'A document id is required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	try {
		const { data } = await getDocumentDownloadRequest({ id: parsedId.data, bearer_token: access_token, tenantId });

		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Download request failed');
	}
}
