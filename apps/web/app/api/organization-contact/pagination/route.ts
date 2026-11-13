import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of Gauzy's `GET /organization-contact/pagination`: the page of clients the query asks for. */
export function GET(req: Request) {
	return forwardToGauzy(req, '/organization-contact/pagination');
}
