import { createLogDir } from '@/core/services/logs/logger-server';
import { Logger } from '@/core/services/logs/logger.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
	const body = await req.json();
	const logger = Logger.getInstance();
	await createLogDir(logger);
	if (process.env.NODE_ENV !== 'production') {
		logger.simpleLogToConsole(body);
	}
	logger.logToFile(body);
	return NextResponse.json({ success: true }, { status: 201 });
}
