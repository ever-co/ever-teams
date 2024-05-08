import { IDataResponse } from '@app/interfaces';
import { get } from '../axios';
import moment from 'moment';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import qs from 'qs';

export function getPublicOrganizationTeamsAPI(profile_link: string, team_id: string) {
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

	return get<IDataResponse>(endpoint);
}

export function getPublicOrganizationTeamsMiscDataAPI(profile_link: string, team_id: string) {
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

	return get<IDataResponse>(endpoint);
}
