import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseWithoutPermission } from '@/core/services/server/refuse-without-permission';
import { ORGANIZATION_DELETE_PERMISSIONS } from '@/core/lib/utils/organization-deletion';

/** Proxy mode twin of Gauzy's `GET /organization/:id/counts`, which the confirmation of its deletion shows. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const refusal = await refuseWithoutPermission(req, ORGANIZATION_DELETE_PERMISSIONS);
	if (refusal) {
		return refusal;
	}
	// Encoded, so an id such as `../user` stays one path segment instead of reaching another endpoint
	const encodedId = encodeURIComponent(id);
	return forwardToGauzy(req, `/organization/${encodedId}/counts`);
}
