import {
	IOrganizationTeamList,
	CreateReponse,
	IDataResponse
} from '@app/interfaces';
import api from '../axios';

export function getPublicOrganizationTeamsAPI(
	profile_link: string,
	team_id: string
) {
	return api.get<CreateReponse<IOrganizationTeamList> | IDataResponse>(
		`/public/team/${profile_link}/${team_id}?type=team`
	);
}

export function getPublicOrganizationTeamsMiscDataAPI(
	profile_link: string,
	team_id: string
) {
	return api.get<CreateReponse<IOrganizationTeamList> | IDataResponse>(
		`/public/team/${profile_link}/${team_id}?type=misc`
	);
}
