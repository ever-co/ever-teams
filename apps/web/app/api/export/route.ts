import { holdsWorkspaceExportPermission } from '@/core/lib/utils/workspace-data-export';
import { forwardDownloadToGauzy } from '@/core/services/server/forward-download-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';

/** Gauzy writes every table of the workspace to CSV and zips them before it sends anything: give it time. */
const EXPORT_TIMEOUT_MS = 15 * 60_000;

/**
 * Proxy mode twin of Gauzy's `GET /export`, the ZIP of every table of the session's workspace. A role without the
 * permission Gauzy guards it with is refused here, and the archive streams back without being held in memory.
 */
export async function GET(req: Request) {
	const refusal = await refuseUnlessPermitted(req, holdsWorkspaceExportPermission);
	if (refusal) {
		return refusal;
	}
	return forwardDownloadToGauzy(req, '/export', { timeoutMs: EXPORT_TIMEOUT_MS });
}
