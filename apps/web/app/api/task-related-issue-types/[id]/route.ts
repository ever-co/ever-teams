import { ITaskRelatedIssueTypeCreate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import {
	deleteTaskRelatedIssueTypeRequest,
	editTaskRelatedIssueTypeRequest
} from '@app/services/server/requests/task-related-issue-type';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);
	const { id } = searchParams as unknown as { id: string };

	const datas = req.body as unknown as ITaskRelatedIssueTypeCreate;
	return $res(
		await editTaskRelatedIssueTypeRequest({
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
		await deleteTaskRelatedIssueTypeRequest({
			id,
			bearer_token: access_token,
			tenantId
		})
	);
}
