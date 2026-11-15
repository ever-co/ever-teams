import { NextResponse } from 'next/server';
import { z } from 'zod';
import { INextParams } from '@/core/types/interfaces/common/data-response';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { revokeUserApiTokenRequest } from '@/core/services/server/requests/user-api-tokens';

const tokenIdSchema = z.uuid();

/**
 * Proxy mode twin of Gauzy's `DELETE /user-api-tokens/:id`: revokes one of the caller's own tokens at once. Gauzy
 * answers its 404 for a token that is not among the caller's live ones.
 */
export async function DELETE(req: Request, props: INextParams) {
	const params = await props.params;
	const parsedId = tokenIdSchema.safeParse(params.id);
	if (!parsedId.success) {
		return NextResponse.json({ message: 'A token id is required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	try {
		await revokeUserApiTokenRequest({ id: parsedId.data, bearer_token: access_token, tenantId });
		return new NextResponse(null, { status: 204 });
	} catch (error) {
		return gauzyErrorResponse(error, 'The API token could not be revoked.');
	}
}
