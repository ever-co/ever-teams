import { NextResponse } from 'next/server';

export async function GET() {
	return NextResponse.json({
		data: {
			status: 200,
			message: 'Ever Teams Next.js API'
		},
		response: {
			url: `${process.env.NEXT_PUBLIC_WEB_APP_URL || process.env.CLIENT_BASE_URL}/api/`
		}
	});
}
