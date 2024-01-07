import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteIssueTypesRequest, editIssueTypesRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { id } = params;
	const body = await req.json();

	return $res(
		await editIssueTypesRequest({
			id,
			datas: body,
			bearer_token: access_token,
			tenantId
		})
	);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { id } = params;
	return $res(
		await deleteIssueTypesRequest({
			id,
			bearer_token: access_token,
			tenantId
		})
	);
}
