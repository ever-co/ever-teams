import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode: finishes the connect flow with the token Trello returned and the flow's state (the body). */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/integration/trello/connect');
}
