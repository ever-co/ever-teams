import { z } from 'zod';
import { NextResponse } from 'next/server';
import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

const importIdSchema = z.guid();

/** Proxy mode twin of the platform's `GET /plugins/docs/imports/:id` (state, progress, report). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const parsed = importIdSchema.safeParse((await params).id);
	if (!parsed.success) return NextResponse.json({ error: 'An import id is required' }, { status: 400 });
	return forwardToGauzy(req, `/plugins/docs/imports/${parsed.data}`);
}
