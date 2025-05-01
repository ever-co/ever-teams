import { getDesktopConfig } from '@/core/services/server/requests/desktop-source';
import { NextResponse } from 'next/server';

export async function GET() {
	return NextResponse.json(await getDesktopConfig());
}
