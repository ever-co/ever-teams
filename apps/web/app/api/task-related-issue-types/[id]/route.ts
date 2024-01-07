import { ITaskRelatedIssueTypeCreate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import {
	deleteTaskRelatedIssueTypeRequest,
	editTaskRelatedIssueTypeRequest
} from '@app/services/server/requests/task-related-issue-type';
import { NextResponse } from 'next/server';

export async function PUT(req: Request,  { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');


	const { id } = params;

	const datas = (await req.json()) as unknown as ITaskRelatedIssueTypeCreate;
	return $res(
		await editTaskRelatedIssueTypeRequest({
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
		await deleteTaskRelatedIssueTypeRequest({
			id,
			bearer_token: access_token,
			tenantId
		})
	);
}
