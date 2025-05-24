import { IRemoveTaskFromManyPlansRequest } from '@/core/types/interfaces/to-review';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteDailyPlansManyRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	const res = new NextResponse();
	if (!id) {
		return;
	}
	const { $res, user, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');
	const body = (await req.json()) as unknown as IRemoveTaskFromManyPlansRequest;
	const response = await deleteDailyPlansManyRequest({
		data: body,
		taskId: id,
		bearer_token: access_token
	});
	return $res(response.data);
}
