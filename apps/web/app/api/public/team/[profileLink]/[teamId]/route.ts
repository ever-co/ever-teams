import {
	getPublicOrganizationTeamMiscDataRequest,
	getPublicOrganizationTeamRequest
} from '@app/services/server/requests/public-organization-team';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const { profileLink, teamId, type }: { profileLink: string; teamId: string; type: string } =
		searchParams as unknown as {
			profileLink: string;
			teamId: string;
			type: string;
		};

	if (type === 'misc') {
		return NextResponse.json(
			await getPublicOrganizationTeamMiscDataRequest({
				profileLink: profileLink,
				teamId
			})
		);
	}
	return NextResponse.json(
		await getPublicOrganizationTeamRequest({
			profileLink: profileLink,
			teamId
		})
	);
}
