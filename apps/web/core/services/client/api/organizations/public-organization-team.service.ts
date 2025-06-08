import moment from 'moment';
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	validateApiResponse,
	publicTeamDataResponseSchema,
	TPublicTeamDataResponse,
	ZodValidationError,
	TDataResponse
} from '@/core/types/schemas';

class PublicOrganizationTeamService extends APIService {
	getPublicOrganizationTeams = async (profile_link: string, team_id: string): Promise<TPublicTeamDataResponse> => {
		try {
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

			const response = await this.get<TDataResponse>(endpoint);

			// Validate the API response with Zod
			const validatedData = validateApiResponse(
				publicTeamDataResponseSchema,
				response.data,
				'getPublicOrganizationTeams API response'
			) as TPublicTeamDataResponse;

			return validatedData;
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Get public organization teams validation failed:',
					{
						message: error.message,
						issues: error.issues,
						profile_link,
						team_id
					},
					'PublicOrganizationTeamService'
				);
			}
			throw error;
		}
	};

	getPublicOrganizationTeamsMiscData = async (
		profile_link: string,
		team_id: string
	): Promise<TPublicTeamDataResponse> => {
		try {
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

			const response = await this.get<TDataResponse>(endpoint);

			// Validate the API response with Zod
			const validatedData = validateApiResponse(
				publicTeamDataResponseSchema,
				response.data,
				'getPublicOrganizationTeamsMiscData API response'
			) as TPublicTeamDataResponse;

			return validatedData;
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Get public organization teams misc data validation failed:',
					{
						message: error.message,
						issues: error.issues,
						profile_link,
						team_id
					},
					'PublicOrganizationTeamService'
				);
			}
			throw error;
		}
	};
}

export const publicOrganizationTeamService = new PublicOrganizationTeamService(GAUZY_API_BASE_SERVER_URL.value);
