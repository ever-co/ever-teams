import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { uploadDocumentsRequest } from '@/core/services/server/requests/entity-files';
import { readCappedFormData } from '@/core/lib/auth/ever-id/body';
import { ENTITY_FILE_MAX_BYTES, ENTITY_FILES_PER_UPLOAD } from '@/core/types/schemas/documents/entity-file.schema';

/** Room for the multipart boundaries and part headers around the largest upload Gauzy accepts. */
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

const MAX_UPLOAD_BYTES = ENTITY_FILES_PER_UPLOAD * ENTITY_FILE_MAX_BYTES + MULTIPART_OVERHEAD_BYTES;

function isFile(part: FormDataEntryValue): part is File {
	return part instanceof File;
}

/**
 * Uploads files as documents of the caller's organization. Only the files go through: the tenant and the
 * organization are the session's, and every other part of the form is dropped. Gauzy checks each file's content,
 * type and size.
 */
export async function POST(req: Request) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	const incoming = await readCappedFormData(req, MAX_UPLOAD_BYTES);
	const parts = incoming?.getAll('files') ?? [];
	const files = parts.filter(isFile);
	const hasFiles = files.length > 0;
	const hasTooManyFiles = files.length > ENTITY_FILES_PER_UPLOAD;
	if (!hasFiles || hasTooManyFiles) {
		return NextResponse.json({ error: `Send between 1 and ${ENTITY_FILES_PER_UPLOAD} files` }, { status: 400 });
	}

	const form = new FormData();
	for (const file of files) {
		form.append('files', file, file.name);
	}
	form.append('tenantId', tenantId);
	form.append('organizationId', organizationId);

	try {
		const { data } = await uploadDocumentsRequest({ form, bearer_token: access_token, tenantId });

		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Upload failed');
	}
}
