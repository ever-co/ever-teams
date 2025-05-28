import {
	getPublicOrganizationTeamMiscDataRequest,
	getPublicOrganizationTeamRequest
} from '@/core/services/server/requests/public-organization-team';
import { INextParams } from '@/core/types/interfaces/global/data-response';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: INextParams) {
	const { profileLink, teamId } = await params;
	const { searchParams } = new URL(req.url);

	if (!profileLink || !teamId) {
		return;
	}

	const type = searchParams.get('type') as string;

	if (type === 'misc') {
		const response = await getPublicOrganizationTeamMiscDataRequest({
			profileLink,
			teamId
		});

		return NextResponse.json(response.data);
	}

	const response = await getPublicOrganizationTeamRequest({
		profileLink,
		teamId
	});

	return NextResponse.json(response.data);
}
