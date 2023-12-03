import { get } from '../axios';

export async function getLanguageListAPI(is_system: boolean) {
	const endpoint = `/languages?is_system=${is_system}`;
	const data = await get(endpoint, true);

	return process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL ? data.data : data;
}
