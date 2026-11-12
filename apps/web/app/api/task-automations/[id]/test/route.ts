import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RuleRouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of the platform's `POST /task-automations/:id/test` (a dry run: nothing is written). */
export async function POST(req: Request, { params }: RuleRouteContext) {
	const { id } = await params;
	return forwardToGauzy(req, `/task-automations/${encodeURIComponent(id)}/test`);
}
