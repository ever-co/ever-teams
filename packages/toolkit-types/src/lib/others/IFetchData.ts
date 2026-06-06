export interface IApiCall {
	path: string;
	method: 'POST' | 'GET' | 'PUT' | 'DELETE';
	body?: any;
	bearer_token?: string;
	init?: RequestInit;
	tenantId?: string;
	organizationId?: string;
}

export interface IServerError {
	message: string | string[];
	error: string;
	statusCode: number;
}

export type ChartData = { [key: string]: any };
