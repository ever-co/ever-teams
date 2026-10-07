import { NextResponse } from 'next/server';
import { readRuntimeEnv } from '@/env-config';
import { APP_NAME } from '@/core/constants/config/constants';

export async function GET() {
	// NEXT_PUBLIC_WEB_APP_URL is also a next.config `env` key, so the literal is frozen at build time:
	// the container env wins.
	const webAppOrigin =
		readRuntimeEnv('NEXT_PUBLIC_WEB_APP_URL') ||
		process.env.NEXT_PUBLIC_WEB_APP_URL?.trim() ||
		process.env.CLIENT_BASE_URL;

	return NextResponse.json({
		data: {
			status: 200,
			// Deployment brand (runtime APP_NAME): 'Ever Teams Next.js API' by default, which uptime checks match.
			message: `${APP_NAME} Next.js API`
		},
		response: {
			url: `${webAppOrigin}/api/`
		}
	});
}
