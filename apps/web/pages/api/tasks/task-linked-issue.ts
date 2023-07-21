import { ITaskLinkedIssue } from '@app/interfaces/ITask';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { createTaskLinkedIsssue } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, tenantId, access_token } = await authenticatedGuard(
		req,
		res
	);
	if (!user) return $res();

	if (req.method !== 'POST') {
		return res.status(405).json({ status: 'fail' });
	}

	const body = req.body as ITaskLinkedIssue;

	const response = await createTaskLinkedIsssue(body, access_token, tenantId);

	$res.json(response.data);
}
