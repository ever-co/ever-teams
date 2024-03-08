import { serverFetch } from '../fetch';

export function getDefaultRequest() {
	return serverFetch({
		path: `/health`,
		method: 'GET'
	});
}
