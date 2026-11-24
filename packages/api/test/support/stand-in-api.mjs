// A stand-in Gauzy for the tests of createClient. Each route answers by "METHOD /path" (the path under /api, without
// its query); `requests` keeps what the client sent, with the query read back as the API reads it (qs).
import qs from 'qs';

export const API_URL = 'https://api.example.com/api';

// What GET /user/me?includeEmployee=true&includeOrganization=true answers, cut to the fields the client reads.
export const ME = {
	id: 'user-1',
	tenantId: 'tenant-1',
	timeZone: 'Europe/Paris',
	employee: {
		id: 'employee-1',
		organizationId: 'org-1',
		tenantId: 'tenant-1',
		organization: { id: 'org-1', name: 'Northwind' }
	}
};

export const json = (status, body, headers = {}) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const bodyOf = (init) => {
	if (!init.body) {
		return undefined;
	}
	return JSON.parse(init.body);
};

const answerOf = (route, request) => {
	if (typeof route === 'function') {
		return route(request);
	}
	return json(200, route);
};

export function standInApi(routes) {
	const requests = [];
	const fetch = async (url, init) => {
		const parsed = new URL(url);
		const path = parsed.pathname.replace(/^\/api/, '');
		const request = {
			url,
			route: `${init.method} ${path}`,
			query: qs.parse(parsed.search.slice(1)),
			headers: init.headers,
			body: bodyOf(init)
		};
		requests.push(request);
		const route = routes[request.route];
		if (route === undefined) {
			return json(404, { message: `Cannot ${init.method} /api${path}`, error: 'Not Found', statusCode: 404 });
		}
		return answerOf(route, request);
	};
	const routesSent = () => requests.map((request) => request.route);
	return { fetch, requests, routesSent };
}
