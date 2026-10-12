import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

export function GET(req: Request) {
	return forwardToGauzy(req, '/timesheet/time-log');
}

export function POST(req: Request) {
	return forwardToGauzy(req, '/timesheet/time-log');
}

export function DELETE(req: Request) {
	return forwardToGauzy(req, '/timesheet/time-log');
}
