import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getDayPlansByEmployee } from '@/core/services/server/requests';

export async function GET(req: Request, { params }: { params: Promise<{ employeeId: string }> }) {
	const { employeeId } = await params;

	const {
		$res,
		user,
		tenantId,
		organizationId,
		teamId: organizationTeamId,
		access_token
	} = await authenticatedGuard(req, new NextResponse());

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const response = await getDayPlansByEmployee({
		bearer_token: access_token || '',
		employeeId,
		organizationId,
		tenantId,
		organizationTeamId
	});

	return $res(response.data);
}
