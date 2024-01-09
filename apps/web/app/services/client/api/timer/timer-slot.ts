import { get } from '../../axios';

export async function getTimerLogsRequestAPI(todayStart: string, todayEnd: string) {
	const endpoint = `/timer/slot?todayStart=${todayStart}&todayEnd=${todayEnd}`;

	const data = await get(endpoint, true);

	return data;
}
