import { NextResponse } from 'next/server';
import { decode } from 'clarity-decode';

type ITeamsSession = {
	sessionId: string;
	payloads: string[];
	createdAt: string;
	updatedAt: string;
	employeeId: string;
	organizationId: string;
	tenantId: string;
};
// In-memory temp DB for session replays - now stores sessions grouped by sessionId
const sessionDB: ITeamsSession[] = [];

// Helper function to find or create a session
function findOrCreateSession(
	sessionId: string,
	employeeId: string,
	organizationId: string,
	tenantId: string
): ITeamsSession {
	let session = sessionDB.find(
		(s) =>
			s.sessionId === sessionId &&
			s.employeeId === employeeId &&
			s.organizationId === organizationId &&
			s.tenantId === tenantId
	);

	if (!session) {
		session = {
			sessionId,
			payloads: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			employeeId,
			organizationId,
			tenantId
		};
		sessionDB.push(session);
	}

	return session;
}

// Add CORS headers to allow any origin and any method
function withCors(response: Response) {
	response.headers.set('Access-Control-Allow-Origin', '*');
	response.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,tenant-id,organization-id,Accept');
	return response;
}

export async function OPTIONS() {
	const response = new Response(null, { status: 204 });
	return withCors(response);
}

export async function POST(request: Request) {
	try {
		const data: { payload: string; timestamp: string } = await request.json();
		if (!data?.payload) {
			return withCors(
				NextResponse.json(
					{
						success: false,
						error: 'Missing required field: payload is required'
					},
					{ status: 400 }
				)
			);
		}

		const organizationId = request.headers.get('organization-id') || '';
		const tenantId = request.headers.get('tenant-id') || '';

		const employeeId = '0a78cc7b-ac45-4683-b289-018268d16843'; // Will get employeeId from Token

		// Decode the payload to extract sessionId
		let sessionId: string;
		try {
			// Import decode function

			const decodedPayload = decode(data.payload);
			sessionId = decodedPayload?.envelope?.sessionId || `fallback-${Date.now()}`;
		} catch (decodeError) {
			console.warn('Failed to decode payload for sessionId extraction, using fallback:', decodeError);
			sessionId = `fallback-${Date.now()}`;
		}

		// Find or create session and add the payload
		const session = findOrCreateSession(sessionId, employeeId, organizationId, tenantId);

		// Add the new payload to the session
		session.payloads.push(data.payload);

		// Update the session's updatedAt timestamp
		session.updatedAt = new Date().toISOString();

		return withCors(
			NextResponse.json({
				success: true,
				data: session
			})
		);
	} catch (error) {
		console.error('Error processing tracking events:', error);
		const message = error instanceof Error ? error.message : 'An unknown error occurred.';
		const errorStack = error instanceof Error ? error.stack : undefined;
		return withCors(
			NextResponse.json(
				{ error: 'Failed to process tracking events', details: message, errorStack },
				{ status: 500 }
			)
		);
	}
}

export async function GET(request: Request) {
	try {
		const url = new URL(request.url);
		const searchParams = url.searchParams;

		// Extract and validate required headers
		const authHeader = request.headers.get('authorization');
		const organizationId = request.headers.get('organization-id');
		const tenantId = request.headers.get('tenant-id');

		// Validate Authorization header
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return withCors(
				NextResponse.json(
					{
						success: false,
						error: 'Missing or invalid Authorization header',
						details: 'Authorization header must be in format: Bearer <token>'
					},
					{ status: 401 }
				)
			);
		}

		// Validate required headers
		if (!organizationId) {
			return withCors(
				NextResponse.json(
					{
						success: false,
						error: 'Missing required header: organization-id'
					},
					{ status: 400 }
				)
			);
		}

		if (!tenantId) {
			return withCors(
				NextResponse.json(
					{
						success: false,
						error: 'Missing required header: tenant-id'
					},
					{ status: 400 }
				)
			);
		}

		// Extract and validate query parameters
		const from = searchParams.get('from');
		const to = searchParams.get('to');
		const employeeIdsParam = searchParams.get('employeeIds');

		// Validate required query parameters
		if (!from) {
			return withCors(
				NextResponse.json(
					{
						success: false,
						error: 'Missing required query parameter: from',
						details: 'from parameter must be a valid ISO 8601 date string'
					},
					{ status: 400 }
				)
			);
		}

		if (!to) {
			return withCors(
				NextResponse.json(
					{
						success: false,
						error: 'Missing required query parameter: to',
						details: 'to parameter must be a valid ISO 8601 date string'
					},
					{ status: 400 }
				)
			);
		}

		// Parse and validate date parameters
		let fromDate: Date;
		let toDate: Date;

		try {
			fromDate = new Date(from);
			if (isNaN(fromDate.getTime())) {
				throw new Error('Invalid from date');
			}
		} catch (error) {
			return withCors(
				NextResponse.json(
					{
						success: false,
						error: 'Invalid from date format',
						details:
							'from parameter must be a valid ISO 8601 date string (e.g., "2024-01-01T00:00:00.000Z")'
					},
					{ status: 400 }
				)
			);
		}

		try {
			toDate = new Date(to);
			if (isNaN(toDate.getTime())) {
				throw new Error('Invalid to date');
			}
		} catch (error) {
			return withCors(
				NextResponse.json(
					{
						success: false,
						error: 'Invalid to date format',
						details: 'to parameter must be a valid ISO 8601 date string (e.g., "2024-01-31T23:59:59.999Z")'
					},
					{ status: 400 }
				)
			);
		}

		// Validate date range
		if (fromDate >= toDate) {
			return withCors(
				NextResponse.json(
					{
						success: false,
						error: 'Invalid date range',
						details: 'from date must be earlier than to date'
					},
					{ status: 400 }
				)
			);
		}

		// Parse and validate employeeIds parameter (optional)
		let employeeIds: string[] | null = null;
		if (employeeIdsParam) {
			try {
				employeeIds = JSON.parse(employeeIdsParam);
				if (!Array.isArray(employeeIds)) {
					throw new Error('employeeIds must be an array');
				}
				if (employeeIds.length === 0) {
					throw new Error('employeeIds array cannot be empty');
				}
				if (!employeeIds.every((id) => typeof id === 'string' && id.trim().length > 0)) {
					throw new Error('All employee IDs must be non-empty strings');
				}
			} catch (error) {
				return withCors(
					NextResponse.json(
						{
							success: false,
							error: 'Invalid employeeIds format',
							details:
								'employeeIds parameter must be a JSON array of non-empty strings (e.g., ["emp1", "emp2"])'
						},
						{ status: 400 }
					)
				);
			}
		}

		// Filter sessions based on criteria
		const filteredSessions = sessionDB.filter((session) => {
			// Match organization and tenant
			if (session.organizationId !== organizationId || session.tenantId !== tenantId) {
				return false;
			}

			// Match employee IDs (only filter if employeeIds is provided)
			if (employeeIds && !employeeIds.includes(session.employeeId)) {
				return false;
			}

			// Check if session falls within date range
			// Use session.updatedAt as the primary timestamp for filtering
			const sessionDate = new Date(session.updatedAt);
			if (sessionDate < fromDate || sessionDate > toDate) {
				return false;
			}

			return true;
		});

		return withCors(
			NextResponse.json({
				success: true,
				data: filteredSessions
			})
		);
	} catch (error) {
		console.error('Error retrieving tracking sessions:', error);
		const message = error instanceof Error ? error.message : 'An unknown error occurred.';
		const errorStack = error instanceof Error ? error.stack : undefined;
		return withCors(
			NextResponse.json(
				{
					success: false,
					error: 'Failed to retrieve tracking sessions',
					details: message,
					errorStack
				},
				{ status: 500 }
			)
		);
	}
}
