import { IUserOrganization } from '@/core/types/interfaces/organization/user-organization';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import {
	createOrganizationTeamRequest,
	getAllOrganizationTeamRequest,
	getUserOrganizationsRequest
} from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { IOrganizationTeam } from '@/core/types/interfaces/team/organization-team';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId, status } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({}, { status: status ?? 401 });
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
	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({}, { status: status ?? 401 });
	}

	try {
		const { data: organizations } = await getUserOrganizationsRequest(
			{ tenantId: tenantId || '', userId: user.id },
			access_token || ''
		);
		const organizationsItems = organizations.items;

		const filteredOrganization = organizationsItems.reduce((acc, org) => {
			if (!acc.find((o) => o.organizationId === org.organizationId)) {
				acc.push(org);
			}
			return acc;
		}, [] as IUserOrganization[]);

		const call_teams = filteredOrganization.map((item) =>
			getAllOrganizationTeamRequest(
				{ tenantId: tenantId || '', organizationId: item.organizationId || '' },
				access_token || ''
			)
		);

		// Gauzy keeps a member (not a workspace admin) inside the organization of their session, so it refuses the
		// teams of their other organizations: those are left out instead of failing the whole list (#5204).
		const teams = await Promise.allSettled(call_teams).then((reads) =>
			reads.reduce(
				(acc, read) => {
					if (read.status !== 'fulfilled') {
						return acc;
					}
					const { data } = read.value;
					if (data?.items) {
						acc.items.push(...data.items);
						acc.total += data.total;
					}
					return acc;
				},
				{ items: [] as IOrganizationTeam[], total: 0 }
			)
		);

		return $res(teams);
	} catch (error) {
		return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
	}
}
