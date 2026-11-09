import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twins of the platform's `/task-views` (GET, POST). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/task-views');
}

export async function POST(req: Request) {
	return forwardToGauzy(req, '/task-views');
}
