import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteIntegrationTenantRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const integrationId = (await params).id;
	const res = new NextResponse();

	if (!integrationId) {
		return;
	}

	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const response = await deleteIntegrationTenantRequest(integrationId, tenantId, organizationId, access_token);

	return $res(response.data);
}
