import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { installGitHubIntegration } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const { installation_id, setup_action } = await req.json();

	const response = await installGitHubIntegration(
		{
			tenantId,
			organizationId,
			installation_id,
			setup_action
		},
		access_token
	);

	return $res(response);
}
