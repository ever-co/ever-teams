import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type EstimationRouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of Gauzy's `PUT /task-estimation/:id`: edits a member's estimate of a task. */
export async function PUT(req: Request, { params }: EstimationRouteContext) {
	const { id } = await params;
	return forwardToGauzy(req, estimationPath(id));
}

/** Proxy mode twin of Gauzy's `DELETE /task-estimation/:id`: removes a member's estimate of a task. */
export async function DELETE(req: Request, { params }: EstimationRouteContext) {
	const { id } = await params;
	return forwardToGauzy(req, estimationPath(id));
}

// Encoded, so an id such as `../x` stays one path segment instead of reaching another endpoint
function estimationPath(id: string) {
	return `/task-estimation/${encodeURIComponent(id)}`;
}
