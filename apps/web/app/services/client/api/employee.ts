import { get } from '../axios';

export async function getWorkingEmployeesAPI(tenantId: string, organizationId: string) {
	const params = {
		'where[tenantId]': tenantId,
		'where[organizationId]': organizationId,
		'relations[0]': 'user'
	};
	const query = new URLSearchParams(params);
	// return api.get<PaginationResponse<IWorkingEmployee>>('/employee/working');

	const endpoint = process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL
		? `/employee/pagination?${query.toString()}`
		: '/employee/working';
	const data = await get(endpoint, true, { tenantId });

	return process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL ? data.data : data;
}
