import { ITaskVersionCreate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteTaskVersionRequest, editTaskVersionRequest } from '@app/services/server/requests/task-version';
import { NextResponse } from 'next/server';

export async function PUT(req: Request,  { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const { id } = params;

	const datas = (await req.json()) as unknown as ITaskVersionCreate;
	return $res(
		await editTaskVersionRequest({
			id,
			datas,
			bearer_token: access_token,
			tenantId
		})
	);
}

export async function DELETE(req: Request,  { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const { id } = params;

	return $res(
		await deleteTaskVersionRequest({
			id,
			bearer_token: access_token,
			tenantId
		})
	);
}
