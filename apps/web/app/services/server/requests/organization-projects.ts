import { serverFetch } from '../fetch';

export function editOrganizationProjectsSettingsRequest({
	id,
	datas,
	bearer_token,
	tenantId
}: {
	id: string | any;
	datas: any;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<any>({
		path: `/organization-projects/setting/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId
	});
}
