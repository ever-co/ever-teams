import { ITaskLabelsCreate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteTaskLabelsRequest, editTaskLabelsRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
	const { searchParams } = new URL(req.url);
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

	const { id } = searchParams as unknown as { id: string };

	return $res(
		await deleteTaskLabelsRequest({
			id,
			bearer_token: access_token,
			tenantId
		})
	);
}

export async function PUT(req: Request) {
	const { searchParams } = new URL(req.url);
	const body = (await req.json()) as unknown as ITaskLabelsCreate;
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

	const { id } = searchParams as unknown as { id: string };

	return $res(
		await editTaskLabelsRequest({
			id,
			datas: body,
			bearer_token: access_token,
			tenantId
		})
	);
}
