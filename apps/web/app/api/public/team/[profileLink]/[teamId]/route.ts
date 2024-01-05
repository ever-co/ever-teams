import {
	getPublicOrganizationTeamMiscDataRequest,
	getPublicOrganizationTeamRequest
} from '@app/services/server/requests/public-organization-team';

export default async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const { profileLink, teamId, type }: { profileLink: string; teamId: string; type: string } =
		searchParams as unknown as {
			profileLink: string;
			teamId: string;
			type: string;
		};

	if (type === 'misc') {
		return Response.json(
			await getPublicOrganizationTeamMiscDataRequest({
				profileLink: profileLink,
				teamId
			})
		);
	}
	return Response.json(
		await getPublicOrganizationTeamRequest({
			profileLink: profileLink,
			teamId
		})
	);
}
