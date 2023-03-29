import { IOrganizationTeamWithMStatus } from '@app/interfaces';
import { serverFetch } from '../fetch';

export function getPublicOrganizationTeamRequest({
	profileLink,
	teamId,
	relations = [
		'members',
		// 'members.role',
		'members.employee',
		'members.employee.user',
		'tasks',
		'tasks.members',
		'tasks.teams',
	],
}: {
	profileLink: string;
	teamId: string;
	relations?: string[];
}) {
	const params = {
		withLaskWorkedTask: 'true',
	} as { [x: string]: string };

	relations.forEach((rl, i) => {
		params[`relations[${i}]`] = rl;
	});

	const queries = new URLSearchParams(params || {});
	return serverFetch<IOrganizationTeamWithMStatus>({
		path: `/public/team/${profileLink}/${teamId}?${queries.toString()}`,
		method: 'GET',
	});
}
