import { NextResponse } from 'next/server';

/**
 * Root API endpoint - Returns basic status without calling external APIs
 * This endpoint should remain stable and not depend on Gauzy API availability
 * For health checks that include Gauzy API status, use /api/health instead
 */
export async function GET() {
	return NextResponse.json(
		{
			data: {
				status: 200,
				message: 'Ever Teams API'
			},
			response: {}
		},
		{ status: 200 }
	);
}
