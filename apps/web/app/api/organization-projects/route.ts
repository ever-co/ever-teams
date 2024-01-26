import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';

import { createOrganizationProjectRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const body: {
		name: string;
		tenantId: string;
		organizationId: string;
	} = await req.json();

	const response = await createOrganizationProjectRequest(body, access_token);

	return $res(response.data);
}
