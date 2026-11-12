import { serverFetch } from '../fetch';
import type { IDocumentImport } from '@/core/types/interfaces/common/docs-import';

interface IGauzyCall {
	bearer_token: string;
	tenantId: string;
}

/** Starts an import of an exported workspace into Docs (multipart: the zip and the target fields). */
export function startDocsImportRequest({ form, bearer_token, tenantId }: IGauzyCall & { form: FormData }) {
	return serverFetch<IDocumentImport>({
		path: '/plugins/docs/imports',
		method: 'POST',
		body: form,
		bearer_token,
		tenantId
	});
}
