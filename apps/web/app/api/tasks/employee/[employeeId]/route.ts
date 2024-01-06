import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteEmployeeFromTasksRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token: bearer_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const { employeeId, organizationTeamId } = searchParams as unknown as {
		employeeId: string;
		organizationTeamId: string;
	};

	return $res(
		await deleteEmployeeFromTasksRequest({
			tenantId,
			employeeId,
			organizationTeamId,
			bearer_token
		})
	);
}
