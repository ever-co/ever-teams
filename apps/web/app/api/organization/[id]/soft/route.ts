import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseWithoutPermission } from '@/core/services/server/refuse-without-permission';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { ORGANIZATION_DELETE_PERMISSIONS } from '@/core/lib/utils/organization-deletion';

/**
 * Proxy mode twin of Gauzy's `DELETE /organization/:id/soft`, which hides the organization with its teams, memberships
 * and invitations. Refused here, before Gauzy is asked, for a role the danger zone is not shown to, and for a request
 * that does not come from this app's own pages.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const { id } = await params;
	const refusal = await refuseWithoutPermission(req, ORGANIZATION_DELETE_PERMISSIONS);
	if (refusal) {
		return refusal;
	}
	// Encoded, so an id such as `../user` stays one path segment instead of reaching another endpoint
	const encodedId = encodeURIComponent(id);
	return forwardToGauzy(req, `/organization/${encodedId}/soft`);
}
