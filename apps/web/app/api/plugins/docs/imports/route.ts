import { NextResponse } from 'next/server';
import { readCappedFormData } from '@/core/lib/auth/ever-id/body';
import { DOCS_IMPORT_PROXY_MAX_BYTES, passedImportFieldsOf } from '@/core/lib/utils/docs-import-fields';
import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { startDocsImportRequest } from '@/core/services/server/requests/docs-import';

/** Proxy mode twin of the platform's `GET /plugins/docs/imports` (the reader's last imports; 404 while import is off). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/plugins/docs/imports');
}

/**
 * Proxy mode twin of `POST /plugins/docs/imports`: one zip (`file`) with the target fields of `passedImportFieldsOf`;
 * the tenant and the organization are the session's, and every other part of the form is dropped. The platform checks
 * the archive, the target and the reader's rights.
 */
export async function POST(req: Request) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	const incoming = await readCappedFormData(req, DOCS_IMPORT_PROXY_MAX_BYTES);
	const file = incoming?.get('file');
	if (!(file instanceof File)) {
		return NextResponse.json({ statusCode: 400, message: 'Send one zip file', code: 'DOCS_IMPORT_FILE_REQUIRED' }, { status: 400 });
	}

	const form = new FormData();
	form.append('file', file, file.name);
	form.append('organizationId', organizationId);
	for (const [name, value] of passedImportFieldsOf(incoming)) {
		form.append(name, value);
	}

	try {
		const { data } = await startDocsImportRequest({ form, bearer_token: access_token, tenantId });

		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Import failed');
	}
}
