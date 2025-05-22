import { ITaskLinkedIssue, LinkedTaskIssue } from '@/core/types/interfaces/to-review/ITask';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createTaskLinkedIssue, updateTaskLinkedIssue } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as ITaskLinkedIssue;
	const response = await createTaskLinkedIssue(body, access_token, tenantId);

	return $res(response.data);
}

export async function PUT(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as LinkedTaskIssue;
	const response = await updateTaskLinkedIssue(body, access_token, tenantId);

	return $res(response.data);
}
