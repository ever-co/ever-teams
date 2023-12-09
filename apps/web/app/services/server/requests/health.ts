import { IApiHealth } from '@app/interfaces';
import { serverFetch } from '../fetch';

export function healthCheckRequest() {
	return serverFetch<IApiHealth>({
		path: `/health`,
		method: 'GET'
	});
}
