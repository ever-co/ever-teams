import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	deleteIssueTypesRequest,
	editIssueTypesRequest,
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(
		req,
		res
	);

	if (!user) return $res();

	const { id } = req.query;

	switch (req.method) {
		case 'DELETE':
			return $res.json(
				await deleteIssueTypesRequest({
					id,
					bearer_token: access_token,
					tenantId,
				})
			);

		case 'PUT':
			return $res.json(
				await editIssueTypesRequest({
					id,
					datas: req.body,
					bearer_token: access_token,
					tenantId,
				})
			);
	}
}
