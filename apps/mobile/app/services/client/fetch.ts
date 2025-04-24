import Config from '../../config';

export function serverFetch<T>({
	path,
	method,
	body,
	init,
	bearer_token,
	tenantId
  }: {
	path: string;
	method: 'POST' | 'GET' | 'PUT' | 'DELETE';
	body?: any;
	bearer_token?: string;
	init?: RequestInit;
	tenantId?: string;
  }) {
	const headers: HeadersInit = {
	  'Content-Type': 'application/json',
	  Accept: 'application/json'
	};

	if (bearer_token) {
	  headers.authorization = `Bearer ${bearer_token}`;
	}

	if (tenantId) {
	  headers['tenant-id'] = tenantId;
	}

	const datas: { body?: string } = {};
	if (body) {
	  datas.body = JSON.stringify(body);
	}

	// console.log(`Making ${method} request to: ${Config.API_URL + path}`);
	// console.log('Request headers:', headers);

	return fetch((Config.API_URL || '') + path, {
	  ...datas,
	  ...(init || {}),
	  headers: {
		...headers,
		...(init?.headers || {})
	  },
	  method
	}).then(async (res) => {
	  console.log(`Response status: ${res.status} ${res.statusText}`);

	  const data = await res.json().catch(error => {
		console.error('Error parsing JSON response:', error);
		return null;
	  }) as T;

	  // Log the complete response for debugging
	//   console.log('Response data:', data);

	  // Add error handling like the web version
	  if (!res.ok) {
		console.error(`Request failed: ${res.status} ${res.statusText}`);
		throw Promise.reject(data);
	  }

	  return {
		data,
		response: res
	  };
	});
  }
