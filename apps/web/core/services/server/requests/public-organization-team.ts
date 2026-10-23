import { IOrganizationTeam } from '@/core/types/interfaces/team/organization-team';
import moment from 'moment';
import { serverFetch } from '../fetch';
import qs from 'qs';

export function getPublicOrganizationTeamRequest({
	profileLink,
	teamId,
	relations = [
		'tasks',
		'tasks.members',
		'tasks.teams',
		'tasks.tags',
		'members',
		// 'members.role',
		'members.employee',
		'members.employee.user'
	]
}: {
	profileLink: string;
	teamId: string;
	relations?: string[];
}) {
	return publicTeamRequest(profileLink, teamId, relations);
}

export function getPublicOrganizationTeamMiscDataRequest({
	profileLink,
	teamId,
	relations = ['statuses', 'priorities', 'sizes', 'labels', 'issueTypes']
}: {
	profileLink: string;
	teamId: string;
	relations?: string[];
}) {
	return publicTeamRequest(profileLink, teamId, relations);
}

/**
 * `GET /public/team/:profileLink/:teamId` with today's window and the given relations. The two identifiers come from
 * the URL of an unauthenticated route, decoded: they are encoded here as single path segments, so they cannot walk
 * the request out of `/public/team`.
 */
function publicTeamRequest(profileLink: string, teamId: string, relations: string[]) {
	const params = {
		withLastWorkedTask: 'true',
		startDate: moment().startOf('day').toISOString(),
		endDate: moment().endOf('day').toISOString()
	} as { [x: string]: string };

	relations.forEach((rl, i) => {
		params[`relations[${i}]`] = rl;
	});

	const queries = qs.stringify(params);

	return serverFetch<IOrganizationTeam>({
		path: `/public/team/${encodeURIComponent(profileLink)}/${encodeURIComponent(teamId)}?${queries.toString()}`,
		method: 'GET'
	});
}
