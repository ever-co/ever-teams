import { INextParams } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getPlansByTask } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request, props: INextParams) {
    const params = await props.params;
    const res = new NextResponse();
    const { taskId } = params;
    if (!taskId) {
		return;
	}

    const {
		$res,
		user,
		tenantId,
		organizationId,
		teamId: organizationTeamId,
		access_token
	} = await authenticatedGuard(req, res);

    if (!user) return $res('Unauthorized');

    const response = await getPlansByTask({
		taskId,
		bearer_token: access_token,
		organizationId,
		tenantId,
		organizationTeamId
	});

    return $res(response.data);
}
