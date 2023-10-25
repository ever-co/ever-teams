import { ITaskLinkedIssue, LinkedTaskIssue } from '@app/interfaces/ITask';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { createTaskLinkedIsssue, updateTaskLinkedIssue } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res();

	if (!['POST', 'PUT'].includes(req.method as string)) {
		return res.status(405).json({ status: 'failed' });
	}

	if (req.method === 'PUT') {
		const body = req.body as LinkedTaskIssue;
		const response = await updateTaskLinkedIssue(body, access_token, tenantId);

		$res.json(response.data);
		return;
	}

	const body = req.body as ITaskLinkedIssue;
	const response = await createTaskLinkedIsssue(body, access_token, tenantId);

	$res.json(response.data);
}
