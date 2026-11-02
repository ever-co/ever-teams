import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteTaskLinkedIssue } from '@/core/services/server/requests';
import { INextParams } from '@/core/types/interfaces/common/data-response';

const linkedIssueIdSchema = z.uuid();

export async function DELETE(req: Request, props: INextParams) {
	const params = await props.params;
	const parsedId = linkedIssueIdSchema.safeParse(params.id);
	if (!parsedId.success) {
		return NextResponse.json({ error: 'Invalid linked issue ID' }, { status: 400 });
	}

	const res = new NextResponse();
	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);
	if (!user) {
		return $res('Unauthorized');
	}

	const response = await deleteTaskLinkedIssue(parsedId.data, access_token || '', tenantId || '');

	return $res(response.data);
}
