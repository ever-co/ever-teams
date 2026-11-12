import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RuleRouteContext = { params: Promise<{ id: string }> };

// Encoded, so an id such as `../templates` stays one path segment instead of reaching another endpoint.
async function rulePathOf({ params }: RuleRouteContext): Promise<string> {
	const { id } = await params;
	return `/task-automations/${encodeURIComponent(id)}`;
}

/** Proxy mode twin of the platform's `GET /task-automations/:id`. */
export async function GET(req: Request, context: RuleRouteContext) {
	return forwardToGauzy(req, await rulePathOf(context));
}

/** Proxy mode twin of the platform's `PUT /task-automations/:id` (only the fields stated change). */
export async function PUT(req: Request, context: RuleRouteContext) {
	return forwardToGauzy(req, await rulePathOf(context));
}

/** Proxy mode twin of the platform's `DELETE /task-automations/:id` (with its run history). */
export async function DELETE(req: Request, context: RuleRouteContext) {
	return forwardToGauzy(req, await rulePathOf(context));
}
