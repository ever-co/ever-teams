import {
	getPublicOrganizationTeamMiscDataRequest,
	getPublicOrganizationTeamRequest
} from '@app/services/server/requests/public-organization-team';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { profileLink: string; teamId: string } }) {
	const { searchParams } = new URL(req.url);

	const { profileLink, teamId } = params;
	const { type } = searchParams as unknown as { type: string };

	if (type === 'misc') {
		const response = await getPublicOrganizationTeamMiscDataRequest({
			profileLink: profileLink,
			teamId
		});

		return NextResponse.json(response.data);
	}

	const response = await getPublicOrganizationTeamRequest({
		profileLink: profileLink,
		teamId
	});
	return NextResponse.json(response.data);
}
