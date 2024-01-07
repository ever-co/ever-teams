import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteIntegrationTenantRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { id } = params;

	if (id) {
		const response = await deleteIntegrationTenantRequest(id as string, tenantId, organizationId, access_token);

		return $res(response);
	}
}
