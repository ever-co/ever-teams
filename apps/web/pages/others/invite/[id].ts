/* eslint-disable no-case-declarations */
import { MyInvitationActionEnum } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	getTeamInvitationsRequest,
	removeTeamInvitationsRequest,
	getMyInvitationsRequest,
	acceptRejectMyInvitationsRequest
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId, organizationId, teamId } = await authenticatedGuard(req, res);
	if (!user) return $res();

	const invitationId = req.query.id as string;

	if (!req.query.id) {
		return $res.status(400).json({});
	}

	switch (req.method) {
		case 'GET':
			const { data: invitationData } = await getMyInvitationsRequest(tenantId, access_token);
			return $res.json(invitationData);

		case 'DELETE':
			await removeTeamInvitationsRequest({
				bearer_token: access_token,
				tenantId: tenantId,
				invitationId
			});

			const { data } = await getTeamInvitationsRequest(
				{
					tenantId,
					teamId,
					organizationId,
					role: 'EMPLOYEE'
				},
				access_token
			);

			return $res.json(data);

		case 'PUT':
			if (!req.query.action) {
				return $res.status(400).json({});
			}
			return $res.json(
				await acceptRejectMyInvitationsRequest(
					tenantId,
					access_token,
					invitationId,
					req.query.action as MyInvitationActionEnum
				)
			);
	}
}
