import { ACTIVE_LOCAL_LOG_SYSTEM } from '@/core/constants/config/constants';
import { createLogDir } from '@/core/services/logs/logger-server';
import { Logger } from '@/core/services/logs/logger.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
	if (process.env.NODE_ENV !== 'production' && ACTIVE_LOCAL_LOG_SYSTEM.value) {
		try {
			const body = await req.json();
			const logger = Logger.getInstance();
			await createLogDir(logger);
			logger.simpleLogToConsole(body);
			logger.logToFile(body);
			return NextResponse.json({ success: true }, { status: 201 });
		} catch (error) {
			console.error('Error processing log request:', error);
			return NextResponse.json({ success: false, error: 'Failed to process log request' }, { status: 500 });
		}
	}
	return NextResponse.json({ success: false, message: 'Log system is not active' }, { status: 501 });
}
