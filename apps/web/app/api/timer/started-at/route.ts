import { holdsTimerStartMovePermissions } from '@/core/lib/utils/timer/timer-start-move';
import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';

/**
 * Proxy mode twin of Gauzy's `PUT /timesheet/timer/started-at`: moves the start of the caller's running timer. A role
 * that does not run the timer or may not change tracked time is refused here, before Gauzy is asked to change it.
 */
export async function PUT(req: Request) {
	const refusal = await refuseUnlessPermitted(req, holdsTimerStartMovePermissions);
	if (refusal) {
		return refusal;
	}
	return forwardToGauzy(req, '/timesheet/timer/started-at');
}
