import { INextParams } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteIntegrationTenantRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, props: INextParams) {
    const params = await props.params;
    const res = new NextResponse();
    const integrationId = params.id;

    if (!integrationId) {
		return;
	}

    const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const response = await deleteIntegrationTenantRequest(integrationId, tenantId, organizationId, access_token);

    return $res(response.data);
}
