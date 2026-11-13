import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseWithoutPermission } from '@/core/services/server/refuse-without-permission';
import { CLIENT_ARCHIVE_PERMISSIONS } from '@/core/lib/utils/clients';

/** Proxy mode twin of Gauzy's `PUT /organization-contact/:id/recover`, which restores an archived client. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const refusal = await refuseWithoutPermission(req, CLIENT_ARCHIVE_PERMISSIONS);
	if (refusal) {
		return refusal;
	}
	// Encoded, so an id such as `../employee` stays one path segment instead of reaching another endpoint
	const encodedId = encodeURIComponent(id);
	return forwardToGauzy(req, `/organization-contact/${encodedId}/recover`);
}
