import { ACTIVE_LOCAL_LOG_SYSTEM } from '@/core/constants/config/constants';
import { createLogDir } from '@/core/services/logs/logger-server';
import { Logger } from '@/core/services/logs/logger.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
	if (process.env.NODE_ENV !== 'production' && ACTIVE_LOCAL_LOG_SYSTEM.value) {
		try {
			// Check if request has content
			const contentLength = req.headers.get('content-length');
			if (!contentLength || contentLength === '0') {
				console.warn('[Log API] Empty request body received');
				return NextResponse.json({ success: false, error: 'Empty request body' }, { status: 400 });
			}

			// Get raw text first to check if it's valid
			const rawBody = await req.text();
			if (!rawBody || rawBody.trim() === '') {
				console.warn('[Log API] Empty or whitespace-only request body');
				return NextResponse.json({ success: false, error: 'Empty request body' }, { status: 400 });
			}

			// Try to parse JSON
			let body;
			try {
				body = JSON.parse(rawBody);
			} catch (parseError) {
				console.error('[Log API] Invalid JSON in request body:', {
					error: parseError,
					rawBody: rawBody.substring(0, 200) + (rawBody.length > 200 ? '...' : '')
				});
				return NextResponse.json({ success: false, error: 'Invalid JSON format' }, { status: 400 });
			}

			const logger = Logger.getInstance();
			await createLogDir(logger);
			logger.simpleLogToConsole(body);
			logger.logToFile(body);
			return NextResponse.json({ success: true }, { status: 201 });
		} catch (error) {
			console.error('[Log API] Error processing log request:', error);
			return NextResponse.json({ success: false, error: 'Failed to process log request' }, { status: 500 });
		}
	}
	return NextResponse.json({ success: false, message: 'Log system is not active' }, { status: 501 });
}
