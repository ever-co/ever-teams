import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createOrganizationTeamRequest, getAllOrganizationTeamRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({}, { status: 401 });
	}

	try {
		const body = (await req.json()) as { name?: string };
		const $name = body.name?.trim() || '';

		if ($name.length < 2) {
			return NextResponse.json({ errors: { name: 'Invalid team name !' } }, { status: 400 });
		}

		await createOrganizationTeamRequest(
			{
				name: $name,
				tenantId,
				organizationId,
				managerIds: user?.employee?.id ? [user.employee.id] : [],
				public: true // By default team should be public
			},
			access_token || ''
		);

		// Return updated teams list after creation
		const teams = await getAllOrganizationTeamRequest({ tenantId, organizationId }, access_token || '');
		return $res(teams.data);
	} catch (error) {
		return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
	}
}

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({}, { status: 401 });
	}

	try {
		const teams = await getAllOrganizationTeamRequest({ tenantId, organizationId }, access_token || '');

		return $res(teams.data);
	} catch (error) {
		return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
	}
}
