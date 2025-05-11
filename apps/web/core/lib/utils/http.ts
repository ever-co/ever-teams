export function extractHttpCode(str: string): number | null {
	const match = str?.match(/\d+/);
	const code = match ? Number(match[0]) : null;
	return code && code >= 100 && code <= 599 ? code : null;
}
