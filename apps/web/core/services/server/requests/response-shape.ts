/**
 * The response shape a client asks the API for (ever-co/ever-gauzy#11730): `lean` trims the people and projects to what
 * the pages show, `full` (the API's default) answers everything. The /api proxy routes read it from the browser's query
 * and forward it unchanged; an absent or unknown value is forwarded as absent, so the API keeps its default.
 */
export type ResponseShape = 'full' | 'lean';

export function readResponseShape(searchParams: URLSearchParams): ResponseShape | undefined {
	const shape = searchParams.get('shape');
	return shape === 'lean' || shape === 'full' ? shape : undefined;
}
