export interface ReadBody {
	isJson: boolean;
	value: unknown;
}

// An empty body is the API's answer of null (a stop with nothing to stop).
export function parseBody(text: string): ReadBody {
	if (!text) {
		return { isJson: true, value: null };
	}
	try {
		return { isJson: true, value: JSON.parse(text) };
	} catch {
		return { isJson: false, value: null };
	}
}
