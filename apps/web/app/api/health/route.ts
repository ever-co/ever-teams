import { NextResponse } from 'next/server';
import { readRuntimeEnv } from '@/env-config';

export async function GET() {
	// NEXT_PUBLIC_WEB_APP_URL is also a next.config `env` key, so the literal is frozen at build time:
	// the container env wins.
	const webAppOrigin =
		readRuntimeEnv('NEXT_PUBLIC_WEB_APP_URL') || process.env.NEXT_PUBLIC_WEB_APP_URL || process.env.CLIENT_BASE_URL;

	return NextResponse.json({
		data: {
			status: 200,
			message: 'Ever Teams Next.js API'
		},
		response: {
			url: `${webAppOrigin}/api/`
		}
	});
}
