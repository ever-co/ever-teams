import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getIntegrationTenantRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId, status } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const { searchParams } = new URL(req.url);
	const name = searchParams.get('name') || undefined;

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
