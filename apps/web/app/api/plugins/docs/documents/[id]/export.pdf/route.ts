import { z } from 'zod';
import { NextResponse } from 'next/server';
import { forwardDownloadToGauzy } from '@/core/services/server/forward-download-to-gauzy';

const documentIdSchema = z.guid();

/**
 * Proxy mode twin of the platform's `GET /plugins/docs/documents/:id/export.pdf` (`subtree`, `format=zip`): the PDF
 * (or the zip of PDFs) streams back with the name the platform gives it.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const parsed = documentIdSchema.safeParse((await params).id);
	if (!parsed.success) return NextResponse.json({ error: 'A document id is required' }, { status: 400 });
	return forwardDownloadToGauzy(req, `/plugins/docs/documents/${parsed.data}/export.pdf`);
}
