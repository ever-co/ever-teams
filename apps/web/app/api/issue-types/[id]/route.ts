import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteIssueTypesRequest, editIssueTypesRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const res = new NextResponse();
	const id = (await params).id;
	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const body = await req.json();

	const response = await editIssueTypesRequest({
		id: id,
		datas: body,
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const res = new NextResponse();
	const id = (await params).id;
	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const response = await deleteIssueTypesRequest({
		id: id,
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}
