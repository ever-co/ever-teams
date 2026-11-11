import qs from 'qs';
import type { AxiosProgressEvent } from 'axios';
import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type {
	IDocumentImport,
	IDocumentImportList,
	IDocumentImportTarget,
	IDocumentPdfExportCapabilities
} from '@/core/types/interfaces/common/docs-import';

const path = (id: string) => encodeURIComponent(id);

/** What a PDF download covers. */
export interface IDocsPdfOptions {
	/** The page and the sub-pages the reader may read: one PDF with a table of contents. */
	subtree?: boolean;
	/** With `subtree`: a zip with one PDF per page instead. */
	zip?: boolean;
}

/** A downloaded file. */
export interface IDocsDownload {
	blob: Blob;
	/** The `Content-Disposition` the platform answered with (the file's name). */
	disposition: string | null;
}

/**
 * Client of the platform's import of exported workspaces into Docs and of its PDF export (ever-gauzy
 * `docs-import-export`), through both transports (this app's `/api/plugins/docs/*` proxies, or the platform directly).
 * Both platform features are off by default, their routes then answering 404: the probes let the pages hide them.
 */
class DocsImportService extends APIService {
	private scopedQuery(extra: Record<string, unknown> = {}) {
		return qs.stringify({ organizationId: this.organizationId, tenantId: this.tenantId, ...extra }, { skipNulls: true });
	}

	/** The reader's last imports and the largest zip the import takes; 404 while import is off. */
	probeImport = async (signal?: AbortSignal): Promise<IDocumentImportList> => {
		const response = await this.get<IDocumentImportList>(`/plugins/docs/imports?${this.scopedQuery()}`, { signal });
		return response.data;
	};

	/** The PDF export's capabilities; 404 while it is off. */
	probePdf = async (signal?: AbortSignal): Promise<IDocumentPdfExportCapabilities> => {
		const response = await this.get<IDocumentPdfExportCapabilities>('/plugins/docs/exports/pdf', { signal });
		return response.data;
	};

	/**
	 * Uploads a zip and starts its import. Only the fields the platform's DTO takes: a parent, or a space (the parent's
	 * space wins on the platform, so none is sent with one), and the session's organization.
	 */
	startImport = async (file: File, target: IDocumentImportTarget, onProgress?: (percent: number) => void): Promise<IDocumentImport> => {
		const form = new FormData();
		form.append('file', file, file.name);
		if (target.parentId) {
			form.append('parentId', target.parentId);
		} else {
			if (target.visibility) form.append('visibility', target.visibility);
			if (target.organizationTeamId) form.append('organizationTeamId', target.organizationTeamId);
		}
		if (this.organizationId) form.append('organizationId', this.organizationId);
		const response = await this.post<IDocumentImport>('/plugins/docs/imports', form, {
			onUploadProgress: (event: AxiosProgressEvent) => {
				if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
			}
		});
		return response.data;
	};

	/** One import: its state, progress and report. */
	getImport = async (id: string, signal?: AbortSignal): Promise<IDocumentImport> => {
		const response = await this.get<IDocumentImport>(`/plugins/docs/imports/${path(id)}?${this.scopedQuery()}`, { signal });
		return response.data;
	};

	/** A page (or a subtree) as PDF, or a zip of PDFs, with the name the platform gives it. */
	downloadPdf = async (id: string, options: IDocsPdfOptions = {}): Promise<IDocsDownload> => {
		const query = this.scopedQuery({
			...(options.subtree ? { subtree: 'true' } : {}),
			...(options.subtree && options.zip ? { format: 'zip' } : {})
		});
		const response = await this.get<Blob>(`/plugins/docs/documents/${path(id)}/export.pdf?${query}`, { responseType: 'blob' });
		const header = response.headers?.['content-disposition'];
		return { blob: response.data, disposition: typeof header === 'string' ? header : null };
	};
}

export const docsImportService = new DocsImportService(GAUZY_API_BASE_SERVER_URL.value);
