import { ACTIVE_LOCAL_LOG_SYSTEM } from '@/core/constants/config/constants';
import { createLogDir } from '@/core/services/logs/logger-server';
import { Logger } from '@/core/services/logs/logger.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
	if (process.env.NODE_ENV !== 'production' && ACTIVE_LOCAL_LOG_SYSTEM.value) {
		const body = await req.json();
		const logger = Logger.getInstance();
		await createLogDir(logger);
		logger.simpleLogToConsole(body);
		logger.logToFile(body);
		return NextResponse.json({ success: true }, { status: 201 });
	}
	return NextResponse.json({ success: false }, { status: 400 });
}
