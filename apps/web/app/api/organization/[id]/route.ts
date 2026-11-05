import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type OrganizationRouteContext = { params: Promise<{ id: string }> };

// Encoded, so an id such as `../user` stays one path segment instead of reaching another endpoint
async function organizationPathOf({ params }: OrganizationRouteContext): Promise<string> {
	const { id } = await params;
	const encodedId = encodeURIComponent(id);
	return `/organization/${encodedId}`;
}

/** Proxy mode twin of Gauzy's `GET /organization/:id`, which the weekly limit report needs before it renders. */
export async function GET(req: Request, context: OrganizationRouteContext) {
	const gauzyPath = await organizationPathOf(context);
	return forwardToGauzy(req, gauzyPath);
}

/** Proxy mode twin of Gauzy's `PUT /organization/:id`; Gauzy checks that the caller may edit the organization. */
export async function PUT(req: Request, context: OrganizationRouteContext) {
	const gauzyPath = await organizationPathOf(context);
	return forwardToGauzy(req, gauzyPath);
}
