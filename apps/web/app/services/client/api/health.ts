import { get } from '../axios';

export async function healthCheckAPI() {
	const endpoint = '/health';
	const data = await get(endpoint, true);

	return data;
}
