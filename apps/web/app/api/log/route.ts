import { ACTIVE_LOCAL_LOG_SYSTEM } from '@/core/constants/config/constants';
import { createLogDir } from '@/core/services/logs/logger-server';
import { Logger } from '@/core/services/logs/logger.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
	if (process.env.NODE_ENV !== 'production' && ACTIVE_LOCAL_LOG_SYSTEM.value) {
		try {
			const contentLength = req.headers.get('content-length');
			if (!contentLength || contentLength === '0') {
				return NextResponse.json({ success: false, error: 'Empty request body', details: 'Content-Length is 0' }, { status: 400 });
			}

			// Get raw text first to check if it's valid
			const rawBody = await req.text();
			if (!rawBody || rawBody.trim() === '') {
				return NextResponse.json({ success: false, error: 'Empty request body', details: 'Body is empty' }, { status: 400 });
			}

			// Try to parse JSON
			let body;
			try {
				body = JSON.parse(rawBody);
			} catch (parseError) {
				return NextResponse.json({ success: false, error: 'Invalid JSON format', details: parseError }, { status: 400 });
			}

			const logger = Logger.getInstance();
			await createLogDir(logger);
			logger.simpleLogToConsole(body);

			// Extract custom log file name if provided
			const customLogFile = body.details?.customLogFile;

			// Log to file with optional custom filename
			logger.logToFile(body, customLogFile);

			return NextResponse.json({ success: true }, { status: 201 });
		} catch (error) {
			return NextResponse.json({ success: false, error: 'Failed to process log request', details: error }, { status: 500 });
		}
	}
	return NextResponse.json({ success: false, message: 'Log system is not active' }, { status: 501 });
}
