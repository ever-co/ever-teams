import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteDailyPlansManyRequest } from '@/core/services/server/requests';
import { IRemoveTaskFromManyPlansRequest } from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const id = (await params).id;
	const res = new NextResponse();
	if (!id) {
		return;
	}
	const { $res, user, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');
	const body = (await req.json()) as unknown as IRemoveTaskFromManyPlansRequest;
	try {
		const response = await deleteDailyPlansManyRequest({
			data: body,
			taskId: id,
			bearer_token: access_token
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The task could not be removed from the plans.');
	}
}
