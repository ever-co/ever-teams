import moment from 'moment';
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	validateApiResponse,
	publicTeamDataResponseSchema,
	TPublicTeamDataResponse,
	TDataResponse
} from '@/core/types/schemas';

class PublicOrganizationTeamService extends APIService {
	getPublicOrganizationTeams = async (profile_link: string, team_id: string): Promise<TPublicTeamDataResponse> => {
		const relations = [
			'tasks',
			'tasks.members',
			'tasks.teams',
			'tasks.tags',
			'members',
			'members.employee',
			'members.employee.user'
		];

		const params = {
			withLastWorkedTask: 'true',
			startDate: moment().startOf('day').toISOString(),
			endDate: moment().endOf('day').toISOString()
		} as { [x: string]: string };

		relations.forEach((rl, i) => {
			params[`relations[${i}]`] = rl;
		});

		const queries = qs.stringify(params);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/public/team/${profile_link}/${team_id}?${queries}`
			: `/public/team/${profile_link}/${team_id}?type=team`;

		return this.executeWithValidation(
			() => this.get<TDataResponse>(endpoint),
			(data) => validateApiResponse(publicTeamDataResponseSchema, data, 'getPublicOrganizationTeams API response') as TPublicTeamDataResponse,
			{ method: 'getPublicOrganizationTeams', service: 'PublicOrganizationTeamService', profile_link, team_id }
		);
	};

	getPublicOrganizationTeamsMiscData = async (
		profile_link: string,
		team_id: string
	): Promise<TPublicTeamDataResponse> => {
		const relations = ['statuses', 'priorities', 'sizes', 'labels', 'issueTypes'];

		const params = {
			withLastWorkedTask: 'true',
			startDate: moment().startOf('day').toISOString(),
			endDate: moment().endOf('day').toISOString()
		} as { [x: string]: string };

		relations.forEach((rl, i) => {
			params[`relations[${i}]`] = rl;
		});

		const queries = qs.stringify(params);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/public/team/${profile_link}/${team_id}?${queries}`
			: `/public/team/${profile_link}/${team_id}?type=misc`;

		return this.executeWithValidation(
			() => this.get<TDataResponse>(endpoint),
			(data) => validateApiResponse(publicTeamDataResponseSchema, data, 'getPublicOrganizationTeamsMiscData API response') as TPublicTeamDataResponse,
			{ method: 'getPublicOrganizationTeamsMiscData', service: 'PublicOrganizationTeamService', profile_link, team_id }
		);
	};
}

export const publicOrganizationTeamService = new PublicOrganizationTeamService(GAUZY_API_BASE_SERVER_URL.value);
