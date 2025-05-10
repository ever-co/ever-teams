import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import axios from 'axios';

export async function getDefaultAPI() {
	const response = await axios.get('/api', {
		baseURL: GAUZY_API_BASE_SERVER_URL.value
	});
	return response;
}
