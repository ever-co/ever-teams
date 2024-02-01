import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { projectRepositorySyncRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const body = await req.json();

	const response = await projectRepositorySyncRequest(
		{
			...body,
			tenantId,
			organizationId
		},
		access_token
	);

	return $res(response.data);
}
