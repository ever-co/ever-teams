import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RuleRouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of the platform's `GET /task-automations/:id/runs` (the rule's last runs, newest first). */
export async function GET(req: Request, { params }: RuleRouteContext) {
	const { id } = await params;
	return forwardToGauzy(req, `/task-automations/${encodeURIComponent(id)}/runs`);
}
