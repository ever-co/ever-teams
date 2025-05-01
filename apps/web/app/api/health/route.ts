import { getDefaultRequest } from '@/core/services/server/requests/default';
import { NextResponse } from 'next/server';

export async function GET() {
	return NextResponse.json(await getDefaultRequest());
}
