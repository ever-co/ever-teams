import { APIService } from '../../api.service';
import { type ApiRequestScope, scopedReadConfig } from '../../api-request-scope';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

/** Gauzy writes every table of the workspace and zips them before sending anything: a usual request's minute is short. */
export const WORKSPACE_EXPORT_TIMEOUT_MS = 15 * 60_000;

export interface WorkspaceExportScope extends ApiRequestScope {
	organizationId: string;
}

class WorkspaceExportService extends APIService {
	/**
	 * The ZIP of every table of the workspace, all its organizations included, as Gauzy's `GET /export` builds it (in
	 * proxy mode, through the app's route of the same path). It goes out with the token and tenant of the workspace the
	 * page shows; the organization only stamps the default rows Gauzy adds to the archive.
	 */
	downloadWorkspaceArchive = async (scope: WorkspaceExportScope, signal?: AbortSignal): Promise<Blob> => {
		const response = await this.get<Blob>('/export', {
			...scopedReadConfig({ scope, signal }),
			params: { organizationId: scope.organizationId },
			responseType: 'blob',
			timeout: WORKSPACE_EXPORT_TIMEOUT_MS
		});
		return response.data;
	};
}

export const workspaceExportService = new WorkspaceExportService(GAUZY_API_BASE_SERVER_URL.value);
