import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { get } from '../axios';

export async function getLanguageListAPI(is_system: boolean) {
	const endpoint = `/languages?is_system=${is_system}`;
	const data = await get(endpoint, true);

	return GAUZY_API_BASE_SERVER_URL.value ? data.data : data;
}
