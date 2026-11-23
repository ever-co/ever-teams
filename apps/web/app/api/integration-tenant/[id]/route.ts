import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteIntegrationTenantRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const integrationId = (await params).id;
	const res = new NextResponse();

	if (!integrationId) {
		return;
	}

	const { $res, user, access_token, tenantId, organizationId, status } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	try {
		const response = await deleteIntegrationTenantRequest(integrationId, tenantId, organizationId, access_token);
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The integration could not be deleted.');
	}
}
