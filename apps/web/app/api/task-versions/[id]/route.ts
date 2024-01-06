import { ITaskVersionCreate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteTaskVersionRequest, editTaskVersionRequest } from '@app/services/server/requests/task-version';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);
	const { id } = searchParams as unknown as { id: string };

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

export async function DELETE(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);
	const { id } = searchParams as unknown as { id: string };

	return $res(
		await deleteTaskVersionRequest({
			id,
			bearer_token: access_token,
			tenantId
		})
	);
}
