import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getIntegrationTenantRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { searchParams } = new URL(req.url);
	const { name } = searchParams as unknown as { name: string };

	const response = await getIntegrationTenantRequest(
		{
			tenantId,
			organizationId,
			name: name as string
		},
		access_token
	);

	return $res(response.data);
}
