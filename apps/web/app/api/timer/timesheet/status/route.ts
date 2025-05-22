import { ID } from '@/core/types/interfaces/to-review';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { updateStatusTimesheetRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	try {
		const { searchParams } = new URL(req.url);

		const rawIds = searchParams.get('ids');
		const status = searchParams.get('status');

		if (!rawIds || !status) {
			return $res({
				success: false,
				message: 'Missing required parameters'
			});
		}
		let ids: ID[];
		try {
			ids = JSON.parse(rawIds);
			if (!Array.isArray(ids) || !ids.length) {
				throw new Error('Invalid ids format');
			}
		} catch (error) {
			return $res({
				success: false,
				message: 'Invalid ids format'
			});
		}
		const validStatuses = ['pending', 'approved', 'rejected'];
		if (!validStatuses.includes(status)) {
			return $res({
				success: false,
				message: 'Invalid status value'
			});
		}
		const { data } = await updateStatusTimesheetRequest(
			{
				ids,
				organizationId,
				status,
				tenantId
			},
			access_token
		);

		return $res({
			success: true,
			data
		});
	} catch (error) {
		console.error('Error updating timesheet status:', error);
		return $res({
			success: false,
			message: 'Failed to update timesheet status'
		});
	}
}
