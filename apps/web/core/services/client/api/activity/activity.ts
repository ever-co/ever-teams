import { get } from '@/core/services/client/axios';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ITimerApps } from '@/core/types/interfaces/timer/ITimerApp';
import qs from 'qs';

export async function getTimerDailyRequestAPI({
	tenantId,
	organizationId,
	employeeId,
	todayEnd,
	todayStart,
	type,
	title
}: {
	tenantId: string;
	organizationId: string;
	employeeId: string;
	todayEnd: Date;
	todayStart: Date;
	type?: string | undefined;
	title?: string;
}) {
	const params: {
		tenantId: string;
		organizationId: string;
		'employeeIds[0]': string;
		startDate: string;
		endDate: string;
		'types[0]'?: string;
		'title[0]'?: string;
	} = {
		tenantId: tenantId,
		organizationId: organizationId,
		'employeeIds[0]': employeeId,
		startDate: todayStart.toISOString(),
		endDate: todayEnd.toISOString()
	};
	if (type) params['types[0]'] = type;
	if (title) params['title[0]'] = title;
	const query = qs.stringify(params);
	console.log('QUERY', query);

	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/timesheet/activity/daily?${query}` : `/timer/daily?${query}`;

	return get<ITimerApps[]>(endpoint);
}
