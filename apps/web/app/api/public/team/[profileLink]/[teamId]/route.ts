import { INextParams } from '@app/interfaces';
import {
	getPublicOrganizationTeamMiscDataRequest,
	getPublicOrganizationTeamRequest
} from '@app/services/server/requests/public-organization-team';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: INextParams) {
	const { searchParams } = new URL(req.url);

	if (!params.profileLink || !params.teamId) {
		return;
	}

	const type = searchParams.get('type') as string;

	if (type === 'misc') {
		const response = await getPublicOrganizationTeamMiscDataRequest({
			profileLink: params.profileLink,
			teamId: params.teamId
		});

		return NextResponse.json(response.data);
	}

	const response = await getPublicOrganizationTeamRequest({
		profileLink: params.profileLink,
		teamId: params.teamId
	});

	return NextResponse.json(response.data);
}
