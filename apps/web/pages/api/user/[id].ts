import { IUser } from '@app/interfaces/IUserData';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	getTaskCreator,
	updateUserAvatarRequest
} from '@app/services/server/requests';
import { deleteUserRequest } from '@app/services/server/requests/user';
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

	const body = req.body as IUser;
	const userId = req.query?.id;
	switch (req.method) {
		case 'GET':
			return $res.json(
				await getTaskCreator({
					userId: userId as string,
					bearer_token: access_token
				})
			);
		case 'PUT':
			return $res.json(
				await updateUserAvatarRequest(
					{
						data: body,
						id: user.id as string,
						tenantId
					},
					access_token
				)
			);
		case 'DELETE':
			return $res.json(
				await deleteUserRequest({
					id: user.id,
					bearer_token: access_token,
					tenantId
				})
			);
	}
}
