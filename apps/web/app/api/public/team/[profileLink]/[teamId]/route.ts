import {
	getPublicOrganizationTeamMiscDataRequest,
	getPublicOrganizationTeamRequest
} from '@/core/services/server/requests/public-organization-team';
import { INextParams } from '@/core/types/interfaces/common/data-response';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: INextParams) {
	const { profileLink, teamId } = await params;
	const { searchParams } = new URL(req.url);

	if (!profileLink || !teamId) {
		return NextResponse.json({ message: 'A profile link and a team are required' }, { status: 400 });
	}

	// Encoding keeps "/" inside one segment, but "." and ".." stay as they are and would still walk the Gauzy path
	if ([profileLink, teamId].some((segment) => segment === '.' || segment === '..')) {
		return NextResponse.json({ message: 'Invalid profile link or team' }, { status: 400 });
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
